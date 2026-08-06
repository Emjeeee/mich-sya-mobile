import { useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { Schedule } from '../types/database';

export function useNextSchedule(coupleId: string | null) {
  const [nextSchedule, setNextSchedule] = useState<Schedule | null>(null);

  useEffect(() => {
    if (!coupleId) return;

    supabase
      .from('schedules')
      .select('*')
      .eq('couple_id', coupleId)
      .in('status', ['planned', 'confirmed'])
      .gte('scheduled_date', new Date().toISOString().slice(0, 10))
      .order('scheduled_date', { ascending: true })
      .limit(1)
      .then(({ data }) => {
        setNextSchedule((data?.[0] as Schedule) ?? null);
      });
  }, [coupleId]);

  if (!nextSchedule) return { nextSchedule: null, daysUntil: null };

  const daysUntil = Math.round(
    (new Date(nextSchedule.scheduled_date).getTime() - new Date().setHours(0, 0, 0, 0)) /
      (24 * 60 * 60 * 1000)
  );

  return { nextSchedule, daysUntil };
}
