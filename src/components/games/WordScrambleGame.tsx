import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useGameScores } from '../../hooks/useGameScores';
import { WORD_BANK } from '../../lib/games/wordBanks';
import { supabase } from '../../lib/supabase';
import { artDeco } from '../../theme/artDecoTokens';
import { useAppTheme } from '../../theme/ThemeContext';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

const GAME_SECONDS = 60;

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function scrambleWord(word: string): string {
  let letters: string[];
  do {
    letters = shuffle(word.split(''));
  } while (letters.join('') === word && word.length > 1);
  return letters.join('');
}

function pickWord(exclude?: string): { word: string; scrambled: string } {
  const pool = exclude ? WORD_BANK.filter((w) => w !== exclude) : WORD_BANK;
  const word = pool[Math.floor(Math.random() * pool.length)];
  return { word, scrambled: scrambleWord(word) };
}

export function WordScrambleGame({ coupleId }: { coupleId?: string | null }) {
  const { isArtDeco } = useAppTheme();
  const [{ word, scrambled }, setCurrent] = useState(() => pickWord());
  const [guess, setGuess] = useState('');
  const [solved, setSolved] = useState(0);
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [recorded, setRecorded] = useState(false);
  const { recordScore } = useGameScores(coupleId, 'wordscramble');

  useEffect(() => {
    if (!running || timeLeft <= 0) return;
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [running, timeLeft]);

  useEffect(() => {
    if (running && timeLeft === 0) {
      setRunning(false);
      if (!recorded) {
        setRecorded(true);
        supabase.auth.getUser().then(({ data }) => {
          recordScore({ userId: data.user?.id ?? null, score: solved });
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, timeLeft]);

  function handleGuess() {
    if (!guess.trim()) return;
    if (guess.trim().toUpperCase() === word) {
      setSolved((s) => s + 1);
      setFeedback('correct');
      setCurrent(pickWord(word));
    } else {
      setFeedback('wrong');
    }
    setGuess('');
    setTimeout(() => setFeedback(null), 500);
  }

  function start() {
    setCurrent(pickWord());
    setGuess('');
    setSolved(0);
    setTimeLeft(GAME_SECONDS);
    setRecorded(false);
    setRunning(true);
  }

  return (
    <GameCard style={isArtDeco && deco.card}>
      <View style={styles.headerRow}>
        <Text style={[styles.muted, isArtDeco && deco.muted]}>
          {running ? `Sisa waktu: ${timeLeft}s` : 'Susun ulang hurufnya'}
        </Text>
        <Text style={[styles.score, isArtDeco && deco.score]}>{solved}</Text>
      </View>

      {running ? (
        <>
          <Text style={[styles.scrambled, isArtDeco && deco.scrambled]}>{scrambled}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.input,
                isArtDeco && deco.input,
                feedback === 'wrong' && styles.inputWrong,
                isArtDeco && feedback === 'wrong' && deco.inputWrong,
                feedback === 'correct' && styles.inputCorrect,
                isArtDeco && feedback === 'correct' && deco.inputCorrect,
              ]}
              value={guess}
              onChangeText={setGuess}
              placeholder="Jawabanmu..."
              placeholderTextColor={isArtDeco ? artDeco.color.faint : '#767676'}
              autoCapitalize="characters"
            />
            <GameButton onPress={handleGuess}>Cek</GameButton>
          </View>
        </>
      ) : (
        <View style={styles.center}>
          {timeLeft === 0 && (
            <Text style={[styles.resultText, isArtDeco && deco.resultText]}>
              Waktu habis — {solved} kata terjawab
            </Text>
          )}
          <GameButton onPress={start}>{timeLeft === 0 ? 'Main Lagi' : 'Mulai'}</GameButton>
        </View>
      )}
    </GameCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  muted: {
    fontSize: 13,
    color: '#767676',
  },
  score: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e11d74',
  },
  scrambled: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    letterSpacing: 4,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  inputWrong: {
    borderColor: '#f87171',
  },
  inputCorrect: {
    borderColor: '#4ade80',
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
  score: {
    color: artDeco.color.gold,
    fontFamily: artDeco.font.serifBold,
  },
  scrambled: {
    color: artDeco.color.gold,
    fontFamily: artDeco.font.serifBold,
  },
  input: {
    borderColor: artDeco.color.line,
    borderRadius: artDeco.radius.none,
    backgroundColor: artDeco.color.surface2,
    color: artDeco.color.ink,
  },
  inputWrong: {
    borderColor: artDeco.color.ruby,
  },
  inputCorrect: {
    borderColor: artDeco.color.go,
  },
  resultText: {
    color: artDeco.color.ink,
  },
});
