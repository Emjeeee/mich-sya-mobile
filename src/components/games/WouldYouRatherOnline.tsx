import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useOnlineGameSession } from '../../hooks/useOnlineGameSession';
import { WOULD_YOU_RATHER } from '../../lib/games/wordBanks';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

interface WyrState {
  pairIndex: number;
  p1Pick: 'A' | 'B' | null;
  p2Pick: 'A' | 'B' | null;
  matches: number;
  rounds: number;
}

function randomPair(exclude?: number) {
  let index: number;
  do {
    index = Math.floor(Math.random() * WOULD_YOU_RATHER.length);
  } while (index === exclude && WOULD_YOU_RATHER.length > 1);
  return index;
}

const INITIAL_STATE: WyrState = { pairIndex: 0, p1Pick: null, p2Pick: null, matches: 0, rounds: 0 };

export function WouldYouRatherOnline({ coupleId }: { coupleId?: string | null }) {
  const { data: session, isLoading, userId, startGame, joinGame, updateSession, refetch } = useOnlineGameSession(
    coupleId,
    'wouldyourather',
    INITIAL_STATE
  );
  const [starting, setStarting] = useState(false);
  const [joining, setJoining] = useState(false);
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
    await startGame({ ...INITIAL_STATE, pairIndex: randomPair() });
    setStarting(false);
  };

  if (noActiveGame) {
    return (
      <GameCard>
        <Text style={styles.muted}>
          Pilih diam-diam dari device masing-masing — pilihan pasanganmu baru kelihatan setelah kalian
          berdua pilih.
        </Text>
        <GameButton onPress={handleStart} loading={starting}>
          Mulai Sesi
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
        <Text style={styles.text}>Pasangan memulai sesi baru. Gabung yuk!</Text>
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

  const state = session.state as WyrState;
  const pair = WOULD_YOU_RATHER[state.pairIndex];
  const myPick = isPlayerX ? state.p1Pick : state.p2Pick;
  const bothPicked = state.p1Pick && state.p2Pick;

  async function pick(opt: 'A' | 'B') {
    if (!session || myPick || picking) return;
    setPicking(true);
    // Re-fetch right before writing rather than merging onto the possibly-
    // up-to-2.5s-stale polled `state` -- both players can pick within the
    // same poll window, and writing on stale state could silently wipe out
    // a pick the partner's client already landed.
    const fresh = await refetch();
    if (!fresh) {
      setPicking(false);
      return;
    }
    const freshState = fresh.state as WyrState;
    const nextState: WyrState = isPlayerX ? { ...freshState, p1Pick: opt } : { ...freshState, p2Pick: opt };
    await updateSession({ id: fresh.id, state: nextState, turn: null, winner: null, status: 'active' });
    setPicking(false);
  }

  async function nextRound() {
    if (!session) return;
    const matched = state.p1Pick === state.p2Pick;
    const nextState: WyrState = {
      pairIndex: randomPair(state.pairIndex),
      p1Pick: null,
      p2Pick: null,
      matches: state.matches + (matched ? 1 : 0),
      rounds: state.rounds + 1,
    };
    await updateSession({ id: session.id, state: nextState, turn: null, winner: null, status: 'active' });
  }

  async function endSession() {
    if (!session) return;
    await updateSession({ id: session.id, state, turn: null, winner: null, status: 'finished' });
  }

  return (
    <GameCard>
      {state.rounds > 0 && (
        <Text style={styles.counter}>
          Kalian sudah {state.matches}/{state.rounds} kali pilihan sama 💗
        </Text>
      )}

      {bothPicked ? (
        <>
          <View style={styles.optionsGrid}>
            {(['A', 'B'] as const).map((opt) => (
              <View key={opt} style={[styles.resultBlock, (state.p1Pick === opt || state.p2Pick === opt) && styles.resultBlockActive]}>
                <Text style={styles.optionText}>{opt === 'A' ? pair.optionA : pair.optionB}</Text>
                <Text style={styles.pickedByText}>
                  {state.p1Pick === opt && state.p2Pick === opt
                    ? 'Kalian berdua pilih ini'
                    : state.p1Pick === opt
                      ? isPlayerX
                        ? 'Pilihanmu'
                        : 'Pilihan pasangan'
                      : state.p2Pick === opt
                        ? !isPlayerX
                          ? 'Pilihanmu'
                          : 'Pilihan pasangan'
                        : ''}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.matchText}>
            {state.p1Pick === state.p2Pick ? 'Sama! Cocok banget 💗' : 'Beda pilihan — seru buat didiskusiin!'}
          </Text>
          <View style={styles.buttonRow}>
            <GameButton onPress={nextRound}>Pertanyaan Berikutnya</GameButton>
            <GameButton variant="secondary" onPress={endSession}>
              Selesai
            </GameButton>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.text}>Would you rather...</Text>
          <View style={styles.optionsGrid}>
            {(['A', 'B'] as const).map((opt) => (
              <Pressable
                key={opt}
                onPress={() => pick(opt)}
                disabled={!!myPick || picking}
                style={[styles.choiceButton, myPick === opt && styles.choiceButtonActive]}
              >
                <Text style={[styles.choiceButtonText, myPick === opt && styles.choiceButtonTextActive]}>
                  {opt === 'A' ? pair.optionA : pair.optionB}
                </Text>
              </Pressable>
            ))}
          </View>
          {myPick && <Text style={styles.muted}>Menunggu pasangan memilih...</Text>}
        </>
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
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  counter: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textAlign: 'center',
  },
  optionsGrid: {
    gap: 12,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  resultBlock: {
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  resultBlockActive: {
    backgroundColor: '#fdeef4',
  },
  pickedByText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
  choiceButton: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fdeef4',
  },
  choiceButtonActive: {
    backgroundColor: '#e11d74',
  },
  choiceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  choiceButtonTextActive: {
    color: '#fff',
  },
  matchText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
});
