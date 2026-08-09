import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { GameSessionRow, GameStatus, GameType, GameWinner } from '../types/database';

const POLL_INTERVAL_MS = 2500;

/**
 * Generic online turn-based game session, shared by every dual-mode game.
 * Ported from the web app's useOnlineGameSession.ts, but reimplemented
 * without react-query (not otherwise used in this app) -- plain
 * useEffect + setInterval polling instead, same "sync, not instant" model
 * (2.5s), matching the app's existing hook style (e.g. useFindPartner.ts).
 * Each game owns its own move-validation/win-check logic and just hands
 * this hook the next `state` blob to persist.
 */
export function useOnlineGameSession(coupleId: string | null | undefined, gameType: GameType, initialState: unknown) {
  const [userId, setUserId] = useState<string | null>(null);
  const [session, setSession] = useState<GameSessionRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const refetch = useCallback(async () => {
    if (!coupleId) return;
    const { data } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('game_type', gameType)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setSession((data as GameSessionRow) ?? null);
    setIsLoading(false);
  }, [coupleId, gameType]);

  useEffect(() => {
    if (!coupleId) return;
    refetch();
    const interval = setInterval(refetch, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [coupleId, refetch]);

  const startGame = useCallback(
    // Pass a state override for games where the starting player sets it up
    // (e.g. Hangman's secret word); omit it to use the game's fixed initialState.
    async (overrideState?: unknown) => {
      if (!coupleId || !userId) return;
      await supabase.from('game_sessions').insert({
        couple_id: coupleId,
        game_type: gameType,
        state: overrideState ?? initialState,
        turn: userId,
        player_x: userId,
        created_by: userId,
      });
      await refetch();
    },
    [coupleId, userId, gameType, initialState, refetch]
  );

  const joinGame = useCallback(
    async (sessionId: string) => {
      if (!userId) return;
      await supabase.from('game_sessions').update({ player_o: userId }).eq('id', sessionId);
      await refetch();
    },
    [userId, refetch]
  );

  const updateSession = useCallback(
    async (input: { id: string; state: unknown; turn: string | null; winner: GameWinner | null; status: GameStatus }) => {
      await supabase
        .from('game_sessions')
        .update({
          state: input.state,
          turn: input.turn,
          winner: input.winner,
          status: input.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id);
      await refetch();
    },
    [refetch]
  );

  return { data: session, isLoading, startGame, joinGame, updateSession, userId, coupleId };
}
