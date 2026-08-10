import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useGameScores } from '../../hooks/useGameScores';
import { useOnlineGameSession } from '../../hooks/useOnlineGameSession';
import { MOVES, roundWinner, type Move } from '../../lib/games/rps';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

interface RpsState {
  p1Move: Move | null;
  p2Move: Move | null;
}

const INITIAL_STATE: RpsState = { p1Move: null, p2Move: null };

export function RockPaperScissorsOnline({ coupleId }: { coupleId?: string | null }) {
  const { data: session, isLoading, userId, startGame, joinGame, updateSession, refetch } = useOnlineGameSession(
    coupleId,
    'rps',
    INITIAL_STATE
  );
  const { recordScore } = useGameScores(coupleId, 'rps');
  const [starting, setStarting] = useState(false);
  const [picking, setPicking] = useState(false);

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
            {session.winner === 'draw'
              ? 'Ronde terakhir seri.'
              : `${session.winner === 'x' ? (session.player_x === userId ? 'Kamu' : 'Pasangan') : session.player_o === userId ? 'Kamu' : 'Pasangan'} menang ronde terakhir.`}
          </Text>
        )}
        <Text style={styles.muted}>Belum ada ronde aktif.</Text>
        <GameButton onPress={handleStart} loading={starting}>
          Mulai Ronde Baru
        </GameButton>
      </GameCard>
    );
  }

  const isPlayerX = session.player_x === userId;
  const waitingForPartner = !session.player_o && !isPlayerX;
  const waitingForOpponentToJoin = !session.player_o && isPlayerX;

  if (waitingForPartner) {
    return (
      <GameCard>
        <Text style={styles.text}>Pasangan membuat ronde baru. Gabung yuk!</Text>
        <GameButton onPress={() => joinGame(session.id)}>Gabung</GameButton>
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

  const state = session.state as RpsState;
  const myMove = isPlayerX ? state.p1Move : state.p2Move;
  const bothPicked = state.p1Move && state.p2Move;

  async function pick(move: Move) {
    if (!session || myMove || picking) return;
    setPicking(true);
    // Re-fetch right before writing rather than merging onto the possibly-
    // up-to-2.5s-stale polled `state` -- both players can pick within the
    // same poll window, and writing on stale state could silently wipe out
    // a pick the partner's client already landed (same fix as
    // WouldYouRatherOnline.tsx).
    const fresh = await refetch();
    if (!fresh) {
      setPicking(false);
      return;
    }
    const freshState = fresh.state as RpsState;
    const nextState: RpsState = isPlayerX ? { ...freshState, p1Move: move } : { ...freshState, p2Move: move };

    if (nextState.p1Move && nextState.p2Move) {
      const outcome = roundWinner(nextState.p1Move, nextState.p2Move);
      const winner = outcome === 'draw' ? 'draw' : outcome === 'a' ? 'x' : 'o';
      await updateSession({ id: fresh.id, state: nextState, turn: null, winner, status: 'finished' });
      const winnerUserId =
        outcome === 'draw'
          ? null
          : (outcome === 'a') === isPlayerX
            ? userId
            : fresh.player_x === userId
              ? fresh.player_o
              : fresh.player_x;
      await recordScore({ winnerUserId });
    } else {
      await updateSession({ id: fresh.id, state: nextState, turn: fresh.turn, winner: null, status: 'active' });
    }
    setPicking(false);
  }

  if (bothPicked) {
    const outcome = roundWinner(state.p1Move!, state.p2Move!);
    const iWon = (outcome === 'a') === isPlayerX;
    return (
      <GameCard>
        <View style={styles.vsRow}>
          <Text style={styles.vsEmoji}>{MOVES.find((m) => m.key === state.p1Move)?.emoji}</Text>
          <Text style={styles.muted}>vs</Text>
          <Text style={styles.vsEmoji}>{MOVES.find((m) => m.key === state.p2Move)?.emoji}</Text>
        </View>
        <Text style={styles.resultText}>{outcome === 'draw' ? 'Seri!' : iWon ? 'Kamu menang! 🎉' : 'Pasangan menang.'}</Text>
        <GameButton variant="secondary" onPress={handleStart} loading={starting}>
          Ronde Baru
        </GameButton>
      </GameCard>
    );
  }

  return (
    <GameCard>
      {myMove ? (
        <Text style={styles.muted}>
          Kamu pilih {MOVES.find((m) => m.key === myMove)?.emoji} — menunggu pasangan...
        </Text>
      ) : (
        <View style={styles.center}>
          <Text style={styles.promptText}>Pilih gerakanmu</Text>
          <View style={styles.moveRow}>
            {MOVES.map((m) => (
              <Pressable key={m.key} onPress={() => pick(m.key)} disabled={picking} style={styles.moveButton}>
                <Text style={styles.moveEmoji}>{m.emoji}</Text>
              </Pressable>
            ))}
          </View>
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
  center: {
    alignItems: 'center',
    gap: 12,
  },
  promptText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  moveRow: {
    flexDirection: 'row',
    gap: 12,
  },
  moveButton: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#fdeef4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveEmoji: {
    fontSize: 28,
  },
  vsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  vsEmoji: {
    fontSize: 40,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
});
