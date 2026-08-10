import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

const DURATION = 10;

type Phase = 'idle' | 'countdown' | 'playing' | 'done';

export function TapBattleGame() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [taps, setTaps] = useState({ p1: 0, p2: 0 });

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown === 0) {
      setPhase('playing');
      return;
    }
    const id = setTimeout(() => setCountdown((c) => c - 1), 700);
    return () => clearTimeout(id);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft === 0) {
      setPhase('done');
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, timeLeft]);

  function start() {
    setTaps({ p1: 0, p2: 0 });
    setTimeLeft(DURATION);
    setCountdown(3);
    setPhase('countdown');
  }

  const winner = taps.p1 === taps.p2 ? null : taps.p1 > taps.p2 ? 'Pemain 1' : 'Pemain 2';

  return (
    <GameCard>
      <Text style={styles.muted}>Siapa paling banyak tap dalam {DURATION} detik?</Text>

      {phase === 'idle' && <GameButton onPress={start}>Mulai</GameButton>}

      {phase === 'countdown' && <Text style={styles.countdown}>{countdown || 'GO!'}</Text>}

      {(phase === 'playing' || phase === 'done') && (
        <>
          {phase === 'playing' && <Text style={styles.timer}>Sisa waktu: {timeLeft}s</Text>}
          <View style={styles.tapRow}>
            <Pressable
              onPress={() => phase === 'playing' && setTaps((t) => ({ ...t, p1: t.p1 + 1 }))}
              style={[styles.tapButton, styles.tapButtonP1]}
            >
              <Text style={[styles.tapCount, styles.p1Color]}>{taps.p1}</Text>
              <Text style={styles.tapLabel}>Pemain 1</Text>
            </Pressable>
            <Pressable
              onPress={() => phase === 'playing' && setTaps((t) => ({ ...t, p2: t.p2 + 1 }))}
              style={[styles.tapButton, styles.tapButtonP2]}
            >
              <Text style={[styles.tapCount, styles.p2Color]}>{taps.p2}</Text>
              <Text style={styles.tapLabel}>Pemain 2</Text>
            </Pressable>
          </View>
        </>
      )}

      {phase === 'done' && (
        <View style={styles.center}>
          <Text style={styles.resultText}>{winner ? `${winner} menang! 🎉` : 'Seri!'}</Text>
          <GameButton onPress={start}>Main Lagi</GameButton>
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
  tapRow: {
    flexDirection: 'row',
    height: 180,
    gap: 8,
  },
  tapButton: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapButtonP1: {
    backgroundColor: '#fdeef4',
  },
  tapButtonP2: {
    backgroundColor: '#dbeafe',
  },
  tapCount: {
    fontSize: 36,
    fontWeight: '700',
  },
  p1Color: {
    color: '#e11d74',
  },
  p2Color: {
    color: '#3b82f6',
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
