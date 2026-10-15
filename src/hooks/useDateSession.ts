import { useCallback, useEffect, useRef, useState } from 'react';

import { endDateSessionCore, startDateSessionCore } from '../lib/autoDate';
import { startBackgroundLocationTracking } from '../lib/backgroundLocation';
import { friendlyError } from '../lib/friendlyError';
import { supabase } from '../lib/supabase';
import type { DateSession } from '../types/database';

interface EndSessionInput {
  title: string;
  summary: string;
}

// `routeMeters` alone can't distinguish "ended successfully with no route
// data" from "the update failed" -- both are `null`. HomeScreen.tsx's
// handleEndSubmit was showing a "date ended" recap regardless, because it
// gated that purely on a locally-captured `sessionRef.current` snapshot
// taken *before* calling endSession(), which is truthy whether or not the
// call actually succeeded.
export interface EndSessionResult {
  success: boolean;
  routeMeters: number | null;
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
        setError(friendlyError(coupleError?.message ?? 'Tidak ditemukan data couple.'));
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
        setError(friendlyError(sessionError.message));
      } else {
        const active = (activeSessions?.[0] as DateSession) ?? null;
        setSession(active);
        // Re-arm background tracking in case the app process was restarted
        // while a date was still active (startX is idempotent).
        if (active) {
          startBackgroundLocationTracking(active.id, id).catch(() => {});
        }
      }
      setLoading(false);
    })();
  }, []);

  const startSession = useCallback(async () => {
    if (!coupleId) return;
    setStarting(true);
    setError(null);

    const result = await startDateSessionCore(coupleId);
    if (result.error) setError(result.error);
    else if (result.session) setSession(result.session);
    setStarting(false);
  }, [coupleId]);

  const endSession = useCallback(
    async ({ title, summary }: EndSessionInput): Promise<EndSessionResult> => {
      const current = sessionRef.current;
      if (!current || !coupleId) return { success: false, routeMeters: null };
      setEnding(true);
      setError(null);

      const result = await endDateSessionCore(coupleId, current, { title, summary });
      if (result.error) setError(result.error);
      if (!result.success) {
        setEnding(false);
        return { success: false, routeMeters: null };
      }

      setSession(null);
      setEnding(false);
      return { success: true, routeMeters: result.routeMeters };
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
