import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { useGameScores } from '../../hooks/useGameScores';
import { supabase } from '../../lib/supabase';
import { artDeco } from '../../theme/artDecoTokens';
import { useAppTheme } from '../../theme/ThemeContext';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

const HOLE_COUNT = 9;
const GAME_SECONDS = 30;

export function WhackAMoleGame({ coupleId }: { coupleId?: string | null }) {
  const { isArtDeco } = useAppTheme();
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [recorded, setRecorded] = useState(false);
  const moleTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { recordScore } = useGameScores(coupleId, 'whackamole');
  const scales = useRef(Array.from({ length: HOLE_COUNT }, () => new Animated.Value(0))).current;

  useEffect(() => {
    scales.forEach((scale, i) => {
      Animated.timing(scale, {
        toValue: active === i ? 1 : 0,
        duration: active === i ? 150 : 0,
        useNativeDriver: true,
      }).start();
    });
  }, [active, scales]);

  useEffect(() => {
    if (!running) return;
    function spawn() {
      setActive(Math.floor(Math.random() * HOLE_COUNT));
      moleTimeout.current = setTimeout(spawn, 500 + Math.random() * 500);
    }
    spawn();
    return () => clearTimeout(moleTimeout.current);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    if (timeLeft <= 0) {
      setRunning(false);
      setActive(null);
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [running, timeLeft]);

  useEffect(() => {
    if (!running && timeLeft === 0 && !recorded) {
      setRecorded(true);
      supabase.auth.getUser().then(({ data }) => {
        recordScore({ userId: data.user?.id ?? null, score });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, timeLeft]);

  function whack(i: number) {
    if (i !== active) return;
    setScore((s) => s + 1);
    setActive(null);
  }

  function start() {
    setScore(0);
    setTimeLeft(GAME_SECONDS);
    setRecorded(false);
    setRunning(true);
  }

  return (
    <GameCard>
      <View style={styles.headerRow}>
        <Text style={[styles.muted, isArtDeco && deco.muted]}>
          {running ? `Sisa waktu: ${timeLeft}s` : 'Ketuk mol yang muncul'}
        </Text>
        <Text style={[styles.score, isArtDeco && deco.score]}>{score}</Text>
      </View>

      <View style={styles.grid}>
        {Array.from({ length: HOLE_COUNT }, (_, i) => (
          <Pressable key={i} onPress={() => whack(i)} style={[styles.hole, isArtDeco && deco.hole]}>
            <Animated.View style={[styles.mole, { transform: [{ scale: scales[i] }] }]}>
              <Text style={styles.moleEmoji}>{active === i ? '🐹' : ''}</Text>
            </Animated.View>
          </Pressable>
        ))}
      </View>

      <View style={styles.center}>
        {!running && timeLeft === GAME_SECONDS && <GameButton onPress={start}>Mulai</GameButton>}
        {!running && timeLeft === 0 && (
          <>
            <Text style={[styles.resultText, isArtDeco && deco.resultText]}>Waktu habis — skor {score}</Text>
            <GameButton onPress={start}>Main Lagi</GameButton>
          </>
        )}
      </View>
    </GameCard>
  );
}

const HOLE_SIZE = 80;

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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  hole: {
    width: HOLE_SIZE,
    height: HOLE_SIZE,
    borderRadius: HOLE_SIZE / 2,
    backgroundColor: '#fdeef4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mole: {
    width: HOLE_SIZE * 0.75,
    height: HOLE_SIZE * 0.75,
    borderRadius: (HOLE_SIZE * 0.75) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moleEmoji: {
    fontSize: 28,
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
  muted: {
    color: artDeco.color.muted,
  },
  score: {
    color: artDeco.color.gold,
  },
  hole: {
    backgroundColor: artDeco.color.surface2,
    borderWidth: 1,
    borderColor: artDeco.color.lineSoft,
  },
  resultText: {
    color: artDeco.color.ink,
  },
});
