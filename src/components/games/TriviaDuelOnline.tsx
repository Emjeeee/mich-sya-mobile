import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useGameScores } from '../../hooks/useGameScores';
import { useOnlineGameSession } from '../../hooks/useOnlineGameSession';
import { TRIVIA_QUESTIONS } from '../../lib/games/wordBanks';
import { artDeco } from '../../theme/artDecoTokens';
import { useAppTheme } from '../../theme/ThemeContext';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

const TARGET_CORRECT = 5;

interface TriviaState {
  p1Score: number;
  p2Score: number;
  questionIndex: number;
}

function randomQuestionIndex(exclude?: number) {
  let index: number;
  do {
    index = Math.floor(Math.random() * TRIVIA_QUESTIONS.length);
  } while (index === exclude && TRIVIA_QUESTIONS.length > 1);
  return index;
}

export function TriviaDuelOnline({ coupleId }: { coupleId?: string | null }) {
  const { isArtDeco } = useAppTheme();
  const { data: session, isLoading, userId, startGame, joinGame, updateSession } = useOnlineGameSession(
    coupleId,
    'trivia',
    { p1Score: 0, p2Score: 0, questionIndex: randomQuestionIndex() }
  );
  const { recordScore } = useGameScores(coupleId, 'trivia');
  const [starting, setStarting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [answering, setAnswering] = useState(false);

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
    await startGame({ p1Score: 0, p2Score: 0, questionIndex: randomQuestionIndex() });
    setStarting(false);
  };

  if (noActiveGame) {
    return (
      <GameCard style={isArtDeco && deco.card}>
        {session?.status === 'finished' && (
          <Text style={[styles.text, isArtDeco && deco.text]}>
            {(session.winner === 'x' ? session.player_x : session.player_o) === userId ? 'Kamu' : 'Pasangan'} menang ronde terakhir.
          </Text>
        )}
        <Text style={[styles.muted, isArtDeco && deco.muted]}>Duel trivia, pertama sampai {TARGET_CORRECT} benar menang.</Text>
        <GameButton onPress={handleStart} loading={starting}>
          Mulai Duel Baru
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
        <Text style={[styles.text, isArtDeco && deco.text]}>Pasangan membuat duel baru. Gabung yuk!</Text>
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

  const state = session.state as TriviaState;
  const question = TRIVIA_QUESTIONS[state.questionIndex];
  const isMyTurn = session.turn === userId;

  async function answer(index: number) {
    // See ConnectFourOnline.tsx's copy of this guard for the full rationale
    // -- without it, tapping a second option before the first
    // updateSession() round-trip resolves lets the same player answer more
    // than once per turn, and whichever write lands last in Supabase can
    // clobber a real win with a stale "not finished" state.
    if (!session || answering || !isMyTurn) return;
    setAnswering(true);
    const correct = index === question.correctIndex;
    const nextState: TriviaState = isPlayerX
      ? { ...state, p1Score: state.p1Score + (correct ? 1 : 0), questionIndex: randomQuestionIndex(state.questionIndex) }
      : { ...state, p2Score: state.p2Score + (correct ? 1 : 0), questionIndex: randomQuestionIndex(state.questionIndex) };

    const myScore = isPlayerX ? nextState.p1Score : nextState.p2Score;
    const finished = myScore >= TARGET_CORRECT;
    const nextTurn = isPlayerX ? session.player_o : session.player_x;

    await updateSession({
      id: session.id,
      state: nextState,
      turn: finished ? null : nextTurn,
      winner: finished ? (isPlayerX ? 'x' : 'o') : null,
      status: finished ? 'finished' : 'active',
    });
    if (finished) await recordScore({ winnerUserId: userId });
    setAnswering(false);
  }

  return (
    <GameCard style={isArtDeco && deco.card}>
      <View style={styles.scoreRow}>
        <Text style={[styles.muted, isArtDeco && deco.muted]}>Kamu: {isPlayerX ? state.p1Score : state.p2Score}</Text>
        <Text style={[styles.muted, isArtDeco && deco.muted]}>Pasangan: {isPlayerX ? state.p2Score : state.p1Score}</Text>
      </View>

      {isMyTurn ? (
        <>
          <Text style={[styles.question, isArtDeco && deco.question]}>{question.question}</Text>
          <View style={styles.optionsGrid}>
            {question.options.map((opt, i) => (
              <Pressable
                key={opt}
                onPress={() => answer(i)}
                disabled={answering}
                style={[styles.option, isArtDeco && deco.option]}
              >
                <Text style={[styles.optionText, isArtDeco && deco.optionText]}>{opt}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <Text style={[styles.muted, isArtDeco && deco.muted]}>Menunggu giliran pasangan...</Text>
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
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  question: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  optionsGrid: {
    gap: 8,
  },
  option: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
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
  question: {
    color: artDeco.color.ink,
    fontFamily: artDeco.font.serifRegular,
  },
  option: {
    borderColor: artDeco.color.line,
    borderRadius: artDeco.radius.none,
    backgroundColor: artDeco.color.surface2,
  },
  optionText: {
    color: artDeco.color.ink,
  },
});
