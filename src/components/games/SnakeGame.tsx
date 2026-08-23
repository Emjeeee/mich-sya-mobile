import { useEffect, useRef, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useGameScores } from '../../hooks/useGameScores';
import { supabase } from '../../lib/supabase';
import { artDeco } from '../../theme/artDecoTokens';
import { useAppTheme } from '../../theme/ThemeContext';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

const SIZE = 12;
const TICK_MS = 160;
const SWIPE_THRESHOLD = 16;

type Point = { x: number; y: number };
type Dir = 'up' | 'down' | 'left' | 'right';

const DELTA: Record<Dir, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

function randomEmptyCell(snake: Point[]): Point {
  let cell: Point;
  do {
    cell = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
  } while (snake.some((s) => s.x === cell.x && s.y === cell.y));
  return cell;
}

export function SnakeGame({ coupleId }: { coupleId?: string | null }) {
  const { isArtDeco } = useAppTheme();
  const [snake, setSnake] = useState<Point[]>([{ x: 6, y: 6 }]);
  const [food, setFood] = useState<Point>(() => randomEmptyCell([{ x: 6, y: 6 }]));
  const [dir, setDir] = useState<Dir>('right');
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const dirRef = useRef(dir);
  const { recordScore } = useGameScores(coupleId, 'snake');

  dirRef.current = dir;

  function changeDir(next: Dir) {
    if (OPPOSITE[dirRef.current] === next) return;
    setDir(next);
  }

  useEffect(() => {
    if (!running || gameOver) return;
    const id = setInterval(() => {
      setSnake((prev) => {
        const head = prev[0];
        const delta = DELTA[dirRef.current];
        const next = { x: head.x + delta.x, y: head.y + delta.y };

        const hitsWall = next.x < 0 || next.y < 0 || next.x >= SIZE || next.y >= SIZE;
        const hitsSelf = prev.some((s) => s.x === next.x && s.y === next.y);
        if (hitsWall || hitsSelf) {
          setGameOver(true);
          setRunning(false);
          return prev;
        }

        const ateFood = next.x === food.x && next.y === food.y;
        const body = [next, ...prev];
        if (!ateFood) body.pop();
        else setFood(randomEmptyCell(body));
        return body;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running, gameOver, food]);

  useEffect(() => {
    if (gameOver && !recorded) {
      setRecorded(true);
      supabase.auth.getUser().then(({ data }) => {
        recordScore({ userId: data.user?.id ?? null, score: snake.length });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  function reset() {
    const start = { x: 6, y: 6 };
    setSnake([start]);
    setFood(randomEmptyCell([start]));
    setDir('right');
    setGameOver(false);
    setRecorded(false);
    setRunning(true);
  }

  const swipe = Gesture.Pan().onEnd((e) => {
    const { translationX: dx, translationY: dy } = e;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      changeDir(dx > 0 ? 'right' : 'left');
    } else {
      changeDir(dy > 0 ? 'down' : 'up');
    }
  });

  return (
    <GameCard>
      <View style={styles.headerRow}>
        <Text style={[styles.muted, isArtDeco && deco.muted]}>Geser layar atau tombol di bawah</Text>
        <Text style={[styles.score, isArtDeco && deco.score]}>{snake.length}</Text>
      </View>

      <GestureDetector gesture={swipe}>
        <View style={[styles.grid, isArtDeco && deco.grid]}>
          {Array.from({ length: SIZE * SIZE }, (_, i) => {
            const x = i % SIZE;
            const y = Math.floor(i / SIZE);
            const isHead = snake[0].x === x && snake[0].y === y;
            const isBody = !isHead && snake.some((s) => s.x === x && s.y === y);
            const isFood = food.x === x && food.y === y;
            const base = isHead ? styles.head : isBody ? styles.body : isFood ? styles.food : styles.empty;
            const decoOverride = isHead ? deco.head : isBody ? deco.body : isFood ? deco.food : null;
            return <View key={i} style={[styles.cell, base, isArtDeco && decoOverride]} />;
          })}
        </View>
      </GestureDetector>

      {!running && (
        <View style={styles.center}>
          {gameOver && (
            <Text style={[styles.resultText, isArtDeco && deco.resultText]}>Game over — panjang akhir {snake.length}</Text>
          )}
          <GameButton onPress={reset}>{gameOver ? 'Main Lagi' : 'Mulai'}</GameButton>
        </View>
      )}

      {running && (
        <View style={styles.dpad}>
          <View style={styles.dpadRow}>
            <View style={styles.dpadSpacer} />
            <Pressable onPress={() => changeDir('up')} style={[styles.dpadButton, isArtDeco && deco.dpadButton]}>
              <Text style={[styles.dpadText, isArtDeco && deco.dpadText]}>▲</Text>
            </Pressable>
            <View style={styles.dpadSpacer} />
          </View>
          <View style={styles.dpadRow}>
            <Pressable onPress={() => changeDir('left')} style={[styles.dpadButton, isArtDeco && deco.dpadButton]}>
              <Text style={[styles.dpadText, isArtDeco && deco.dpadText]}>◀</Text>
            </Pressable>
            <Pressable onPress={() => changeDir('down')} style={[styles.dpadButton, isArtDeco && deco.dpadButton]}>
              <Text style={[styles.dpadText, isArtDeco && deco.dpadText]}>▼</Text>
            </Pressable>
            <Pressable onPress={() => changeDir('right')} style={[styles.dpadButton, isArtDeco && deco.dpadButton]}>
              <Text style={[styles.dpadText, isArtDeco && deco.dpadText]}>▶</Text>
            </Pressable>
          </View>
        </View>
      )}
    </GameCard>
  );
}

const BOARD_SIZE = 280;
const CELL_SIZE = BOARD_SIZE / SIZE;

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
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    alignSelf: 'center',
    backgroundColor: '#f7f7f7',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
  },
  empty: {
    backgroundColor: 'transparent',
  },
  head: {
    backgroundColor: '#e11d74',
  },
  body: {
    backgroundColor: '#f194bd',
  },
  food: {
    backgroundColor: '#ffb020',
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
  dpad: {
    alignSelf: 'center',
    gap: 4,
  },
  dpadRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dpadButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#fdeef4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadSpacer: {
    width: 44,
    height: 44,
  },
  dpadText: {
    fontSize: 14,
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
  grid: {
    backgroundColor: artDeco.color.surface2,
    borderRadius: artDeco.radius.none,
    borderWidth: 1,
    borderColor: artDeco.color.lineSoft,
  },
  head: {
    backgroundColor: artDeco.color.gold,
  },
  body: {
    backgroundColor: artDeco.color.goldSoft,
  },
  food: {
    backgroundColor: artDeco.color.ruby,
  },
  resultText: {
    color: artDeco.color.ink,
  },
  dpadButton: {
    backgroundColor: artDeco.color.surface2,
    borderRadius: artDeco.radius.none,
    borderWidth: 1,
    borderColor: artDeco.color.lineSoft,
  },
  dpadText: {
    color: artDeco.color.gold,
  },
});
