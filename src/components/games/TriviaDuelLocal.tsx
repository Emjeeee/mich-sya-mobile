import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TRIVIA_QUESTIONS } from '../../lib/games/wordBanks';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

const TARGET_CORRECT = 5;

function randomQuestion(excludeQuestion?: string) {
  const pool = excludeQuestion ? TRIVIA_QUESTIONS.filter((q) => q.question !== excludeQuestion) : TRIVIA_QUESTIONS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function TriviaDuelLocal() {
  const [question, setQuestion] = useState(randomQuestion);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [turn, setTurn] = useState<'p1' | 'p2'>('p1');
  const [selected, setSelected] = useState<number | null>(null);

  const winner = scores.p1 >= TARGET_CORRECT ? 'Pemain 1' : scores.p2 >= TARGET_CORRECT ? 'Pemain 2' : null;

  function answer(index: number) {
    if (selected !== null || winner) return;
    setSelected(index);
    const correct = index === question.correctIndex;
    setTimeout(() => {
      setScores((s) => (correct ? { ...s, [turn]: s[turn] + 1 } : s));
      setTurn(turn === 'p1' ? 'p2' : 'p1');
      setQuestion(randomQuestion(question.question));
      setSelected(null);
    }, 900);
  }

  function reset() {
    setScores({ p1: 0, p2: 0 });
    setTurn('p1');
    setQuestion(randomQuestion());
    setSelected(null);
  }

  if (winner) {
    return (
      <GameCard>
        <Text style={styles.resultText}>{winner} menang! 🎉</Text>
        <GameButton onPress={reset}>Main Lagi</GameButton>
      </GameCard>
    );
  }

  return (
    <GameCard>
      <View style={styles.scoreRow}>
        <Text style={styles.muted}>Pemain 1: {scores.p1}</Text>
        <Text style={styles.muted}>Pemain 2: {scores.p2}</Text>
      </View>
      <Text style={styles.turnText}>Giliran {turn === 'p1' ? 'Pemain 1' : 'Pemain 2'}</Text>
      <Text style={styles.question}>{question.question}</Text>

      <View style={styles.optionsGrid}>
        {question.options.map((opt, i) => {
          const isCorrect = selected !== null && i === question.correctIndex;
          const isWrongPick = selected === i && i !== question.correctIndex;
          return (
            <Pressable
              key={opt}
              onPress={() => answer(i)}
              disabled={selected !== null}
              style={[styles.option, isCorrect && styles.optionCorrect, isWrongPick && styles.optionWrong]}
            >
              <Text style={[styles.optionText, isCorrect && styles.optionCorrectText, isWrongPick && styles.optionWrongText]}>
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </GameCard>
  );
}

const styles = StyleSheet.create({
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  muted: {
    fontSize: 13,
    color: '#999',
  },
  turnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e11d74',
    textAlign: 'center',
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
  optionCorrect: {
    borderColor: '#22c55e',
    backgroundColor: '#dcfce7',
  },
  optionWrong: {
    borderColor: '#f87171',
    backgroundColor: '#fee2e2',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  optionCorrectText: {
    color: '#16a34a',
  },
  optionWrongText: {
    color: '#ef4444',
  },
  resultText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
});
