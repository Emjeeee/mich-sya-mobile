import { useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import { localDateString } from '../lib/time';

interface CoupleStats {
  datesThisMonth: number;
  totalMemories: number;
}

export function useCoupleStats(coupleId: string | null) {
  const [stats, setStats] = useState<CoupleStats | null>(null);

  useEffect(() => {
    if (!coupleId) return;

    // toISOString() converts back to UTC -- during the first ~5-8 hours of
    // local time on the 1st of a month, that can roll monthStartStr back to
    // the last day of the *previous* month, letting a late-previous-month
    // completed schedule leak into "this month"'s count.
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = localDateString(monthStart);

    (async () => {
      const [datesResult, memoriesResult] = await Promise.all([
        supabase
          .from('schedules')
          .select('id', { count: 'exact', head: true })
          .eq('couple_id', coupleId)
          .eq('status', 'completed')
          .gte('scheduled_date', monthStartStr),
        supabase
          .from('memories')
          .select('id', { count: 'exact', head: true })
          .eq('couple_id', coupleId),
      ]);

      setStats({
        datesThisMonth: datesResult.count ?? 0,
        totalMemories: memoriesResult.count ?? 0,
      });
    })();
  }, [coupleId]);

  return stats;
}
