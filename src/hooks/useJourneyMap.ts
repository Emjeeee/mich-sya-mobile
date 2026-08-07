import { useEffect, useState } from 'react';

import { getSignedUrl } from '../lib/storage';
import { supabase } from '../lib/supabase';
import type { JourneyMapEntry } from '../types/database';

export interface JourneyPin {
  id: string;
  placeName: string;
  description: string | null;
  lat: number;
  lng: number;
  visitedDate: string | null;
  photoUrl: string | null;
}

export interface RoutePoint {
  lat: number;
  lng: number;
}

export function useJourneyMap(coupleId: string | null) {
  const [pins, setPins] = useState<JourneyPin[]>([]);
  const [route, setRoute] = useState<RoutePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coupleId) return;

    (async () => {
      setLoading(true);

      const { data: journeyRows } = await supabase
        .from('journey_map')
        .select('*')
        .eq('couple_id', coupleId);

      const resolvedPins = await Promise.all(
        ((journeyRows as JourneyMapEntry[]) ?? []).map(async (row) => ({
          id: row.id,
          placeName: row.place_name,
          description: row.description,
          lat: row.lat,
          lng: row.lng,
          visitedDate: row.visited_date,
          photoUrl: row.photo_url ? await getSignedUrl(row.photo_url) : null,
        }))
      );
      setPins(resolvedPins);

      const { data: lastSessionRows } = await supabase
        .from('date_sessions')
        .select('id')
        .eq('couple_id', coupleId)
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(1);

      const sessionId = lastSessionRows?.[0]?.id as string | undefined;
      if (sessionId) {
        const { data: breadcrumbs } = await supabase
          .from('date_session_locations')
          .select('lat, lng')
          .eq('session_id', sessionId)
          .order('recorded_at', { ascending: true });
        setRoute((breadcrumbs as RoutePoint[]) ?? []);
      }

      setLoading(false);
    })();
  }, [coupleId]);

  return { pins, route, loading };
}
