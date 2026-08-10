import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useGameScores } from '../../hooks/useGameScores';
import { useOnlineGameSession } from '../../hooks/useOnlineGameSession';
import { DICE_FACES, rollDie, TARGET_SCORE } from '../../lib/games/dice';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

interface DiceState {
  p1Score: number;
  p2Score: number;
  lastRoll: number | null;
}

const INITIAL_STATE: DiceState = { p1Score: 0, p2Score: 0, lastRoll: null };

export function DiceBattleOnline({ coupleId }: { coupleId?: string | null }) {
  const { data: session, isLoading, userId, startGame, joinGame, updateSession } = useOnlineGameSession(
    coupleId,
    'dice',
    INITIAL_STATE
  );
  const { recordScore } = useGameScores(coupleId, 'dice');
  const [starting, setStarting] = useState(false);
  const [joining, setJoining] = useState(false);

  if (isLoading) {
    return (
      <GameCard>
        <Text style={styles.muted}>Memuat...</Text>
      </GameCard>
    );
  }

  const noActiveGame = !session || session.status === 'finished';

  const handleStart = async () => {
    setStarting(true);
    await startGame();
    setStarting(false);
  };

  if (noActiveGame) {
    return (
      <GameCard>
        {session?.status === 'finished' && (
          <Text style={styles.text}>
            {(session.winner === 'x' ? session.player_x : session.player_o) === userId ? 'Kamu' : 'Pasangan'} menang ronde terakhir.
          </Text>
        )}
        <Text style={styles.muted}>Target skor {TARGET_SCORE} — belum ada ronde aktif.</Text>
        <GameButton onPress={handleStart} loading={starting}>
          Mulai Ronde Baru
        </GameButton>
      </GameCard>
    );
  }

  const isPlayerX = session.player_x === userId;
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
        <Text style={styles.text}>Pasangan membuat ronde baru. Gabung yuk!</Text>
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

  const state = session.state as DiceState;
  const isMyTurn = session.turn === userId;

  async function roll() {
    if (!session) return;
    const value = rollDie();
    const nextState: DiceState = isPlayerX
      ? { ...state, p1Score: state.p1Score + value, lastRoll: value }
      : { ...state, p2Score: state.p2Score + value, lastRoll: value };

    const myScore = isPlayerX ? nextState.p1Score : nextState.p2Score;
    const finished = myScore >= TARGET_SCORE;
    const nextTurn = isPlayerX ? session.player_o : session.player_x;

    await updateSession({
      id: session.id,
      state: nextState,
      turn: finished ? null : nextTurn,
      winner: finished ? (isPlayerX ? 'x' : 'o') : null,
      status: finished ? 'finished' : 'active',
    });
    if (finished) await recordScore({ winnerUserId: userId });
  }

  return (
    <GameCard>
      <View style={styles.row}>
        <View style={styles.scoreBlock}>
          <Text style={[styles.scoreValue, styles.p1Color]}>{state.p1Score}</Text>
          <Text style={styles.scoreLabel}>{session.player_x === userId ? 'Kamu' : 'Pasangan'}</Text>
        </View>
        <Text style={styles.diceFace}>{state.lastRoll ? DICE_FACES[state.lastRoll] : '🎲'}</Text>
        <View style={styles.scoreBlock}>
          <Text style={[styles.scoreValue, styles.p2Color]}>{state.p2Score}</Text>
          <Text style={styles.scoreLabel}>{session.player_o === userId ? 'Kamu' : 'Pasangan'}</Text>
        </View>
      </View>

      {isMyTurn ? (
        <GameButton onPress={roll}>Lempar Dadu</GameButton>
      ) : (
        <Text style={styles.muted}>Menunggu giliran pasangan...</Text>
      )}
    </GameCard>
  );
}

const styles = StyleSheet.create({
  muted: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  text: {
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  scoreBlock: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  p1Color: {
    color: '#e11d74',
  },
  p2Color: {
    color: '#3b82f6',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#999',
  },
  diceFace: {
    fontSize: 40,
  },
});
