import { useCallback, useEffect, useRef, useState } from 'react';

import {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
} from '../lib/backgroundLocation';
import { distanceMeters } from '../lib/geo';
import { getCurrentCoords } from '../lib/location';
import { supabase } from '../lib/supabase';
import type { DateSession } from '../types/database';

interface EndSessionInput {
  title: string;
  summary: string;
}

async function computeRouteDistanceMeters(sessionId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('date_session_locations')
    .select('lat, lng')
    .eq('session_id', sessionId)
    .order('recorded_at', { ascending: true });

  if (error || !data || data.length < 2) return null;

  let total = 0;
  for (let i = 1; i < data.length; i++) {
    total += distanceMeters(data[i - 1], data[i]);
  }
  return total;
}

export function useDateSession() {
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [session, setSession] = useState<DateSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<DateSession | null>(null);
  sessionRef.current = session;

  useEffect(() => {
    (async () => {
      const { data: coupleRows, error: coupleError } = await supabase
        .from('couple')
        .select('id')
        .limit(1);

      if (coupleError || !coupleRows?.[0]) {
        setError(coupleError?.message ?? 'Tidak ditemukan data couple.');
        setLoading(false);
        return;
      }

      const id = coupleRows[0].id as string;
      setCoupleId(id);

      const { data: activeSessions, error: sessionError } = await supabase
        .from('date_sessions')
        .select('*')
        .eq('couple_id', id)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1);

      if (sessionError) {
        setError(sessionError.message);
      } else {
        const active = (activeSessions?.[0] as DateSession) ?? null;
        setSession(active);
        // Re-arm background tracking in case the app process was restarted
        // while a date was still active (startX is idempotent).
        if (active) {
          startBackgroundLocationTracking(active.id, id);
        }
      }
      setLoading(false);
    })();
  }, []);

  const startSession = useCallback(async () => {
    if (!coupleId) return;
    setStarting(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();
    const coords = await getCurrentCoords();

    const { data, error: insertError } = await supabase
      .from('date_sessions')
      .insert({
        couple_id: coupleId,
        created_by: userData.user?.id ?? null,
        start_lat: coords?.lat ?? null,
        start_lng: coords?.lng ?? null,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setStarting(false);
      return;
    }

    const newSession = data as DateSession;
    setSession(newSession);

    // Drop an immediate breadcrumb so the trail doesn't wait for the first interval tick.
    if (coords) {
      await supabase.from('date_session_locations').insert({
        session_id: newSession.id,
        couple_id: coupleId,
        lat: coords.lat,
        lng: coords.lng,
      });
    }

    await startBackgroundLocationTracking(newSession.id, coupleId);
    setStarting(false);
  }, [coupleId]);

  const endSession = useCallback(
    async ({ title, summary }: EndSessionInput): Promise<number | null> => {
      const current = sessionRef.current;
      if (!current || !coupleId) return null;
      setEnding(true);
      setError(null);

      const coords = await getCurrentCoords();
      const endedAt = new Date();

      const { error: updateError } = await supabase
        .from('date_sessions')
        .update({
          ended_at: endedAt.toISOString(),
          end_lat: coords?.lat ?? null,
          end_lng: coords?.lng ?? null,
          title: title || current.title,
          summary,
        })
        .eq('id', current.id);

      if (updateError) {
        setError(updateError.message);
        setEnding(false);
        return null;
      }

      const { data: userData } = await supabase.auth.getUser();
      const startedAt = new Date(current.started_at);

      const { error: scheduleError } = await supabase.from('schedules').insert({
        couple_id: coupleId,
        title: title || 'Kencan',
        description: summary,
        scheduled_date: startedAt.toISOString().slice(0, 10),
        scheduled_time: startedAt.toISOString().slice(11, 16),
        status: 'completed',
        created_by: userData.user?.id ?? null,
      });

      if (scheduleError) {
        setError(scheduleError.message);
      }

      const routeMeters = await computeRouteDistanceMeters(current.id);

      await stopBackgroundLocationTracking();
      setSession(null);
      setEnding(false);
      return routeMeters;
    },
    [coupleId]
  );

  return {
    coupleId,
    session,
    loading,
    starting,
    ending,
    error,
    startSession,
    endSession,
  };
}
