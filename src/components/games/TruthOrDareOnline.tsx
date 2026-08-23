import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useOnlineGameSession } from '../../hooks/useOnlineGameSession';
import { TRUTH_OR_DARE, type TruthOrDare } from '../../lib/games/wordBanks';
import { artDeco } from '../../theme/artDecoTokens';
import { useAppTheme } from '../../theme/ThemeContext';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

interface TodState {
  picker: 'x' | 'o'; // whose turn it is to be challenged (picks Truth/Dare for themselves)
  current: TruthOrDare | null;
  truths: number;
  dares: number;
}

function pickPrompt(type: 'truth' | 'dare', exclude?: TruthOrDare | null) {
  const pool = TRUTH_OR_DARE.filter((p) => p.type === type && p !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

const INITIAL_STATE: TodState = { picker: 'x', current: null, truths: 0, dares: 0 };

export function TruthOrDareOnline({ coupleId }: { coupleId?: string | null }) {
  const { isArtDeco } = useAppTheme();
  const { data: session, isLoading, userId, startGame, joinGame, updateSession } = useOnlineGameSession(
    coupleId,
    'truthordare',
    INITIAL_STATE
  );
  const [starting, setStarting] = useState(false);
  const [joining, setJoining] = useState(false);

  if (isLoading) {
    return (
      <GameCard style={isArtDeco && deco.card}>
        <Text style={[styles.muted, isArtDeco && deco.muted]}>Memuat...</Text>
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
      <GameCard style={isArtDeco && deco.card}>
        <Text style={[styles.muted, isArtDeco && deco.muted]}>
          Gantian pilih Truth atau Dare untuk diri sendiri — pertanyaan/tantangannya cuma muncul di layar
          pasanganmu, biar dia yang bacain ke kamu.
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
      <GameCard style={isArtDeco && deco.card}>
        <Text style={[styles.text, isArtDeco && deco.text]}>Pasangan memulai sesi baru. Gabung yuk!</Text>
        <GameButton onPress={handleJoin} loading={joining}>
          Gabung
        </GameButton>
      </GameCard>
    );
  }
  if (waitingForOpponentToJoin) {
    return (
      <GameCard style={isArtDeco && deco.card}>
        <Text style={[styles.muted, isArtDeco && deco.muted]}>Menunggu pasangan bergabung...</Text>
      </GameCard>
    );
  }

  const state = session.state as TodState;
  const myRole: 'x' | 'o' = isPlayerX ? 'x' : 'o';
  const isPicker = state.picker === myRole;

  async function choose(type: 'truth' | 'dare') {
    if (!session || !isPicker || state.current) return;
    const prompt = pickPrompt(type, state.current);
    const nextState: TodState = {
      ...state,
      current: prompt,
      truths: state.truths + (type === 'truth' ? 1 : 0),
      dares: state.dares + (type === 'dare' ? 1 : 0),
    };
    await updateSession({ id: session.id, state: nextState, turn: null, winner: null, status: 'active' });
  }

  async function finishRound() {
    if (!session) return;
    const nextState: TodState = { ...state, picker: state.picker === 'x' ? 'o' : 'x', current: null };
    await updateSession({ id: session.id, state: nextState, turn: null, winner: null, status: 'active' });
  }

  async function endSession() {
    if (!session) return;
    await updateSession({ id: session.id, state, turn: null, winner: null, status: 'finished' });
  }

  return (
    <GameCard style={isArtDeco && deco.card}>
      {(state.truths > 0 || state.dares > 0) && (
        <Text style={[styles.counter, isArtDeco && deco.counter]}>
          🤔 {state.truths} Truth · 🔥 {state.dares} Dare
        </Text>
      )}

      {isPicker ? (
        state.current ? (
          <Text style={[styles.muted, isArtDeco && deco.muted]}>
            Menunggu pasangan membacakan {state.current.type === 'truth' ? 'pertanyaannya' : 'tantangannya'}...
          </Text>
        ) : (
          <>
            <Text style={[styles.muted, isArtDeco && deco.muted]}>Giliranmu — pilih Truth atau Dare</Text>
            <View style={styles.buttonRow}>
              <GameButton onPress={() => choose('truth')}>🤔 Truth</GameButton>
              <GameButton variant="secondary" onPress={() => choose('dare')}>
                🔥 Dare
              </GameButton>
            </View>
          </>
        )
      ) : state.current ? (
        <>
          <View style={[styles.promptBox, isArtDeco && deco.promptBox]}>
            <Text style={[styles.promptLabel, isArtDeco && deco.promptLabel]}>
              {state.current.type === 'truth' ? 'Truth' : 'Dare'} untuk pasangan
            </Text>
            <Text style={[styles.promptText, isArtDeco && deco.promptText]}>{state.current.text}</Text>
          </View>
          <Text style={[styles.hint, isArtDeco && deco.hint]}>Bacakan ini ke pasangan, lalu lanjut kalau sudah selesai.</Text>
          <GameButton onPress={finishRound}>Lanjut ke Giliran Berikutnya</GameButton>
        </>
      ) : (
        <Text style={[styles.muted, isArtDeco && deco.muted]}>Menunggu pasangan memilih Truth atau Dare...</Text>
      )}

      <GameButton variant="secondary" onPress={endSession}>
        Selesai Sesi
      </GameButton>
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
  counter: {
    fontSize: 12,
    fontWeight: '600',
    color: '#767676',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  promptBox: {
    backgroundColor: '#fdeef4',
    borderRadius: 12,
    padding: 16,
  },
  promptLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e11d74',
    textTransform: 'uppercase',
    marginBottom: 4,
    textAlign: 'center',
  },
  promptText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  hint: {
    fontSize: 11,
    color: '#767676',
    textAlign: 'center',
  },
});

const deco = StyleSheet.create({
  card: {
    backgroundColor: artDeco.color.surface,
    borderRadius: artDeco.radius.none,
    borderWidth: 1.5,
    borderColor: artDeco.color.line,
  },
  muted: {
    color: artDeco.color.muted,
  },
  text: {
    color: artDeco.color.ink,
  },
  hint: {
    color: artDeco.color.faint,
  },
  counter: {
    color: artDeco.color.muted,
  },
  promptBox: {
    backgroundColor: artDeco.color.surface2,
    borderRadius: artDeco.radius.none,
    borderWidth: 1,
    borderColor: artDeco.color.line,
  },
  promptLabel: {
    color: artDeco.color.gold,
    letterSpacing: artDeco.letterSpacingEyebrow,
  },
  promptText: {
    color: artDeco.color.ink,
    fontFamily: artDeco.font.serifRegular,
  },
});
