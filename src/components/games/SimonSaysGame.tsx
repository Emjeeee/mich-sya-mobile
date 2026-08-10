import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useGameScores } from '../../hooks/useGameScores';
import { supabase } from '../../lib/supabase';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

const COLORS = [
  { key: 0, color: '#e11d74' },
  { key: 1, color: '#3b82f6' },
  { key: 2, color: '#eab308' },
  { key: 3, color: '#6E5A50' },
];

type Phase = 'idle' | 'playing' | 'userTurn' | 'gameOver';

export function SimonSaysGame({ coupleId }: { coupleId?: string | null }) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [userStep, setUserStep] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [recorded, setRecorded] = useState(false);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { recordScore } = useGameScores(coupleId, 'simon');

  function clearTimers() {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  }

  useEffect(() => () => clearTimers(), []);

  function playSequence(seq: number[]) {
    setPhase('playing');
    seq.forEach((step, i) => {
      timeouts.current.push(
        setTimeout(() => setActiveIndex(step), i * 700),
        setTimeout(() => setActiveIndex(null), i * 700 + 400)
      );
    });
    timeouts.current.push(
      setTimeout(() => {
        setUserStep(0);
        setPhase('userTurn');
      }, seq.length * 700)
    );
  }

  function start() {
    clearTimers();
    setRecorded(false);
    const first = [Math.floor(Math.random() * 4)];
    setSequence(first);
    playSequence(first);
  }

  function handlePress(index: number) {
    if (phase !== 'userTurn') return;
    if (sequence[userStep] === index) {
      if (userStep + 1 === sequence.length) {
        const next = [...sequence, Math.floor(Math.random() * 4)];
        setSequence(next);
        timeouts.current.push(setTimeout(() => playSequence(next), 500));
        setPhase('playing');
      } else {
        setUserStep((s) => s + 1);
      }
    } else {
      setPhase('gameOver');
    }
  }

  useEffect(() => {
    if (phase === 'gameOver' && !recorded) {
      setRecorded(true);
      supabase.auth.getUser().then(({ data }) => {
        recordScore({ userId: data.user?.id ?? null, score: sequence.length - 1 });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <GameCard>
      <View style={styles.headerRow}>
        <Text style={styles.muted}>Ingat & ulangi urutan warnanya</Text>
        <Text style={styles.round}>
          Ronde {Math.max(0, sequence.length - (phase === 'userTurn' || phase === 'gameOver' ? 0 : 1))}
        </Text>
      </View>

      <View style={styles.grid}>
        {COLORS.map((c) => (
          <Pressable
            key={c.key}
            onPress={() => handlePress(c.key)}
            disabled={phase !== 'userTurn'}
            style={[
              styles.pad,
              { backgroundColor: c.color, opacity: activeIndex === c.key ? 1 : 0.4 },
            ]}
          />
        ))}
      </View>

      <View style={styles.center}>
        {phase === 'idle' && <GameButton onPress={start}>Mulai</GameButton>}
        {phase === 'gameOver' && (
          <>
            <Text style={styles.resultText}>Salah urutan — sampai ronde {sequence.length - 1}</Text>
            <GameButton onPress={start}>Main Lagi</GameButton>
          </>
        )}
        {phase === 'userTurn' && <Text style={styles.muted}>Giliran kamu...</Text>}
        {phase === 'playing' && <Text style={styles.muted}>Perhatikan urutannya...</Text>}
      </View>
    </GameCard>
  );
}

const PAD_SIZE = 100;

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
  round: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e11d74',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
    width: PAD_SIZE * 2 + 8,
  },
  pad: {
    width: PAD_SIZE,
    height: PAD_SIZE,
    borderRadius: 20,
  },
  center: {
    alignItems: 'center',
    gap: 8,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
});
