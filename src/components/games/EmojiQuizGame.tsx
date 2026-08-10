import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useGameScores } from '../../hooks/useGameScores';
import { EMOJI_QUIZ } from '../../lib/games/wordBanks';
import { supabase } from '../../lib/supabase';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

const GAME_SECONDS = 60;

function pickQuestion(excludeEmoji?: string) {
  const pool = excludeEmoji ? EMOJI_QUIZ.filter((q) => q.emoji !== excludeEmoji) : EMOJI_QUIZ;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function EmojiQuizGame({ coupleId }: { coupleId?: string | null }) {
  const [current, setCurrent] = useState(pickQuestion);
  const [guess, setGuess] = useState('');
  const [correct, setCorrect] = useState(0);
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [recorded, setRecorded] = useState(false);
  const { recordScore } = useGameScores(coupleId, 'emojiquiz');

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
          recordScore({ userId: data.user?.id ?? null, score: correct });
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, timeLeft]);

  function handleGuess() {
    if (!guess.trim()) return;
    if (guess.trim().toUpperCase() === current.answer) {
      setCorrect((c) => c + 1);
      setFeedback('correct');
    } else {
      setFeedback('wrong');
    }
    setCurrent(pickQuestion(current.emoji));
    setGuess('');
    setTimeout(() => setFeedback(null), 500);
  }

  function skip() {
    setCurrent(pickQuestion(current.emoji));
    setGuess('');
  }

  function start() {
    setCurrent(pickQuestion());
    setGuess('');
    setCorrect(0);
    setTimeLeft(GAME_SECONDS);
    setRecorded(false);
    setRunning(true);
  }

  return (
    <GameCard>
      <View style={styles.headerRow}>
        <Text style={styles.muted}>{running ? `Sisa waktu: ${timeLeft}s` : 'Tebak dari emoji-nya'}</Text>
        <Text style={styles.score}>{correct}</Text>
      </View>

      {running ? (
        <>
          <Text style={styles.emoji}>{current.emoji}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.input,
                feedback === 'wrong' && styles.inputWrong,
                feedback === 'correct' && styles.inputCorrect,
              ]}
              value={guess}
              onChangeText={setGuess}
              placeholder="Jawabanmu..."
              placeholderTextColor="#999"
              autoCapitalize="characters"
            />
            <GameButton onPress={handleGuess}>Cek</GameButton>
          </View>
          <Pressable onPress={skip}>
            <Text style={styles.skipText}>Lewati soal ini</Text>
          </Pressable>
        </>
      ) : (
        <View style={styles.center}>
          {timeLeft === 0 && <Text style={styles.resultText}>Waktu habis — {correct} jawaban benar</Text>}
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
    color: '#999',
  },
  score: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e11d74',
  },
  emoji: {
    fontSize: 48,
    textAlign: 'center',
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
  skipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    textAlign: 'center',
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
