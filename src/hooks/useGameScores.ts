import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { GameScoreRow } from '../types/database';

// Ported from the web app's useGameScores.ts without react-query -- see
// useOnlineGameSession.ts for why.
export function useGameScores(coupleId: string | null | undefined, gameKey: string) {
  const [scores, setScores] = useState<GameScoreRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!coupleId) return;
    const { data } = await supabase
      .from('game_scores')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('game_key', gameKey)
      .order('created_at', { ascending: false })
      .limit(200);
    setScores((data as GameScoreRow[]) ?? []);
    setIsLoading(false);
  }, [coupleId, gameKey]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const recordScore = useCallback(
    async (input: { winnerUserId?: string | null; userId?: string | null; score?: number | null; metadata?: unknown }) => {
      if (!coupleId) return;
      await supabase.from('game_scores').insert({
        couple_id: coupleId,
        game_key: gameKey,
        user_id: input.userId ?? null,
        winner_user_id: input.winnerUserId ?? null,
        score: input.score ?? null,
        metadata: input.metadata ?? null,
      });
      await refetch();
    },
    [coupleId, gameKey, refetch]
  );

  return { data: scores, isLoading, recordScore };
}
