import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useGameScores } from '../../hooks/useGameScores';
import { useOnlineGameSession } from '../../hooks/useOnlineGameSession';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

interface TapBattleState {
  startedAt: string | null;
  p1Taps: number;
  p2Taps: number;
}

const COUNTDOWN_MS = 3000;
const PLAY_MS = 10000;
const PUSH_INTERVAL_MS = 700;
// Extra wait after locally detecting "done" before player_x records the
// winner -- gives the last throttled tap pushes + one more poll time to
// land. Tap Battle is the only online game here where both clients write
// concurrently (every other one is turn-gated), so precision is inherently
// coarser than local pass-and-play.
const SETTLE_MS = 3000;

const INITIAL_STATE: TapBattleState = { startedAt: null, p1Taps: 0, p2Taps: 0 };

export function TapBattleOnline({ coupleId }: { coupleId?: string | null }) {
  const { data: session, isLoading, userId, startGame, joinGame, updateSession } = useOnlineGameSession(
    coupleId,
    'tapbattle',
    INITIAL_STATE
  );
  const { recordScore } = useGameScores(coupleId, 'tapbattle');
  const [now, setNow] = useState(Date.now());
  const [myTaps, setMyTaps] = useState(0);
  const [starting, setStarting] = useState(false);
  const [joining, setJoining] = useState(false);
  const lastPushedRef = useRef(0);
  const scoreRecordedRef = useRef(false);

  const state = (session?.state as TapBattleState | undefined) ?? INITIAL_STATE;
  const isPlayerX = session?.player_x === userId;
  const elapsed = state.startedAt ? now - new Date(state.startedAt).getTime() : 0;
  const phase: 'countdown' | 'playing' | 'done' =
    elapsed < COUNTDOWN_MS ? 'countdown' : elapsed < COUNTDOWN_MS + PLAY_MS ? 'playing' : 'done';

  // Read fresh inside the delayed callback instead of closing over values
  // captured when the timer was scheduled.
  const stateRef = useRef(state);
  const myTapsRef = useRef(myTaps);
  stateRef.current = state;
  myTapsRef.current = myTaps;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (state.startedAt) {
      setMyTaps(0);
      lastPushedRef.current = 0;
      scoreRecordedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.startedAt]);

  useEffect(() => {
    if (!session || phase !== 'playing') return;
    if (myTaps === lastPushedRef.current) return;
    const id = setTimeout(() => {
      lastPushedRef.current = myTaps;
      const nextState: TapBattleState = isPlayerX ? { ...state, p1Taps: myTaps } : { ...state, p2Taps: myTaps };
      updateSession({ id: session.id, state: nextState, turn: null, winner: null, status: 'active' });
    }, PUSH_INTERVAL_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myTaps, phase]);

  useEffect(() => {
    if (!session || !isPlayerX || phase !== 'done' || scoreRecordedRef.current) return;
    scoreRecordedRef.current = true;
    const sessionId = session.id;
    const player_x = session.player_x;
    const player_o = session.player_o;
    const id = setTimeout(() => {
      const finalState: TapBattleState = { ...stateRef.current, p1Taps: myTapsRef.current };
      const p1 = finalState.p1Taps;
      const p2 = finalState.p2Taps;
      const winnerUserId = p1 === p2 ? null : p1 > p2 ? player_x : player_o;
      updateSession({ id: sessionId, state: finalState, turn: null, winner: null, status: 'active' });
      if (winnerUserId) recordScore({ winnerUserId });
    }, SETTLE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isPlayerX, session?.id]);

  if (isLoading) {
    return (
      <GameCard>
        <Text style={styles.muted}>Memuat...</Text>
      </GameCard>
    );
  }

  const handleStart = async () => {
    setStarting(true);
    await startGame({ startedAt: new Date().toISOString(), p1Taps: 0, p2Taps: 0 });
    setStarting(false);
  };

  if (!session) {
    return (
      <GameCard>
        <Text style={styles.muted}>
          Siapa paling banyak tap dalam {PLAY_MS / 1000} detik — kamu cuma lihat hitungan kamu sendiri
          sampai waktu habis.
        </Text>
        <GameButton onPress={handleStart} loading={starting}>
          Mulai
        </GameButton>
      </GameCard>
    );
  }

  const waitingForPartner = !session.player_o && !isPlayerX;
  const waitingForOpponentToJoin = !session.player_o && isPlayerX;

  const handleJoin = async () => {
    setJoining(true);
    await joinGame(session.id);
    setJoining(false);
  };

  if (waitingForPartner) {
    return (
      <GameCard>
        <Text style={styles.text}>Pasangan memulai ronde baru. Gabung yuk!</Text>
        <GameButton onPress={handleJoin} loading={joining}>
          Gabung
        </GameButton>
      </GameCard>
    );
  }
  if (waitingForOpponentToJoin) {
    return (
      <GameCard>
        <Text style={styles.muted}>Menunggu pasangan bergabung...</Text>
      </GameCard>
    );
  }

  async function restart() {
    if (!session) return;
    await updateSession({
      id: session.id,
      state: { startedAt: new Date().toISOString(), p1Taps: 0, p2Taps: 0 },
      turn: null,
      winner: null,
      status: 'active',
    });
  }

  const opponentTaps = isPlayerX ? state.p2Taps : state.p1Taps;

  return (
    <GameCard>
      {phase === 'countdown' && (
        <Text style={styles.countdown}>{Math.max(1, Math.ceil((COUNTDOWN_MS - elapsed) / 1000))}</Text>
      )}

      {phase === 'playing' && (
        <>
          <Text style={styles.timer}>
            Sisa waktu: {Math.max(0, Math.ceil((COUNTDOWN_MS + PLAY_MS - elapsed) / 1000))}s
          </Text>
          <Pressable onPress={() => setMyTaps((t) => t + 1)} style={styles.tapButton}>
            <Text style={styles.tapCount}>{myTaps}</Text>
            <Text style={styles.tapLabel}>ketukanmu</Text>
          </Pressable>
        </>
      )}

      {phase === 'done' && (
        <View style={styles.center}>
          <Text style={styles.resultText}>
            Kamu: {myTaps} · Pasangan: {opponentTaps}
          </Text>
          <Text style={styles.muted}>
            {myTaps === opponentTaps ? 'Seri!' : myTaps > opponentTaps ? 'Kamu menang! 🎉' : 'Pasangan menang.'}
          </Text>
          <GameButton onPress={restart}>Main Lagi</GameButton>
        </View>
      )}
    </GameCard>
  );
}

const styles = StyleSheet.create({
  muted: {
    fontSize: 13,
    color: '#767676',
    textAlign: 'center',
  },
  text: {
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
  },
  countdown: {
    fontSize: 48,
    fontWeight: '700',
    color: '#e11d74',
    textAlign: 'center',
  },
  timer: {
    fontSize: 13,
    fontWeight: '600',
    color: '#767676',
    textAlign: 'center',
  },
  tapButton: {
    height: 160,
    borderRadius: 16,
    backgroundColor: '#fdeef4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapCount: {
    fontSize: 40,
    fontWeight: '700',
    color: '#e11d74',
  },
  tapLabel: {
    fontSize: 11,
    color: '#767676',
    marginTop: 4,
  },
  center: {
    alignItems: 'center',
    gap: 8,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
});
