import { useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import { localDateString, parseLocalDateOnly } from '../lib/time';
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
      .gte('scheduled_date', localDateString())
      .order('scheduled_date', { ascending: true })
      .limit(1)
      .then(({ data }) => {
        setNextSchedule((data?.[0] as Schedule) ?? null);
      });
  }, [coupleId]);

  if (!nextSchedule) return { nextSchedule: null, daysUntil: null };

  // scheduled_date is a plain "YYYY-MM-DD" -- new Date(string) would parse
  // it as UTC midnight, not local midnight, throwing this off by the local
  // UTC offset against the local-midnight comparison below.
  const daysUntil = Math.round(
    (parseLocalDateOnly(nextSchedule.scheduled_date).getTime() - new Date().setHours(0, 0, 0, 0)) /
      (24 * 60 * 60 * 1000)
  );

  return { nextSchedule, daysUntil };
}
