import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { GameScoreRow } from '../types/database';

// GameScreen.tsx renders the active game component and <Leaderboard> as
// siblings, each calling this hook independently for the same
// coupleId+gameKey -- they don't share state by default, so the game
// component recording a new score only refetched its own copy, leaving the
// Leaderboard's separate instance stuck showing whatever it fetched on
// mount. This registry lets recordScore() notify every mounted instance for
// the same key, not just its own, so the leaderboard updates immediately.
const refetchRegistry = new Map<string, Set<() => void>>();

function registryKey(coupleId: string, gameKey: string) {
  return `${coupleId}:${gameKey}`;
}

function notifyRefetch(coupleId: string, gameKey: string) {
  refetchRegistry.get(registryKey(coupleId, gameKey))?.forEach((fn) => fn());
}

// Ported from the web app's useGameScores.ts without react-query -- see
// useOnlineGameSession.ts for why.
export function useGameScores(coupleId: string | null | undefined, gameKey: string) {
  const [scores, setScores] = useState<GameScoreRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!coupleId) return;
    const { data, error } = await supabase
      .from('game_scores')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('game_key', gameKey)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      console.warn('[michsya] failed to fetch game_scores:', error);
      setIsLoading(false);
      return;
    }
    setScores((data as GameScoreRow[]) ?? []);
    setIsLoading(false);
  }, [coupleId, gameKey]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!coupleId) return;
    const key = registryKey(coupleId, gameKey);
    const set = refetchRegistry.get(key) ?? new Set();
    set.add(refetch);
    refetchRegistry.set(key, set);
    return () => {
      set.delete(refetch);
      if (set.size === 0) refetchRegistry.delete(key);
    };
  }, [coupleId, gameKey, refetch]);

  const recordScore = useCallback(
    async (input: { winnerUserId?: string | null; userId?: string | null; score?: number | null; metadata?: unknown }): Promise<boolean> => {
      if (!coupleId) return false;
      const { error } = await supabase.from('game_scores').insert({
        couple_id: coupleId,
        game_key: gameKey,
        user_id: input.userId ?? null,
        winner_user_id: input.winnerUserId ?? null,
        score: input.score ?? null,
        metadata: input.metadata ?? null,
      });
      if (error) {
        console.warn('[michsya] failed to record game score:', error);
        return false;
      }
      notifyRefetch(coupleId, gameKey);
      return true;
    },
    [coupleId, gameKey]
  );

  return { data: scores, isLoading, recordScore };
}
