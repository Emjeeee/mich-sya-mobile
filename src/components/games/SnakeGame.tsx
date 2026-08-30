import { useEffect, useRef, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { StyleSheet, Text, View } from 'react-native';

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
  // Purely for rendering the head's "eyes" facing the right way -- only ever
  // set from the tick loop below (once per actual move), never from input
  // directly, so it can't introduce the same race the refs below are
  // designed to avoid.
  const [facingDir, setFacingDir] = useState<Dir>('right');
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [recorded, setRecorded] = useState(false);
  // Two refs, not one: `appliedDir` is the ground truth the tick loop last
  // actually moved in, and only it is ever compared against for the
  // OPPOSITE/180-reversal guard. `queuedDir` is whatever direction the next
  // tick should use. A single shared ref for both roles (the original bug)
  // meant a *second* input landing before the next tick validated itself
  // against the *first* input's not-yet-applied value instead of the last
  // real move -- so two different keys/swipes in the same ~160ms window
  // (e.g. up then left while actually moving right) could each individually
  // pass the guard and net out to a straight reversal into the snake's own
  // neck. Validating strictly against `appliedDir`, which only changes once
  // per tick, closes that gap regardless of how many inputs land in between.
  const appliedDirRef = useRef<Dir>('right');
  const queuedDirRef = useRef<Dir>('right');
  const { recordScore } = useGameScores(coupleId, 'snake');

  function changeDir(next: Dir) {
    if (OPPOSITE[appliedDirRef.current] === next) return;
    queuedDirRef.current = next;
  }

  useEffect(() => {
    if (!running || gameOver) return;
    const id = setInterval(() => {
      setSnake((prev) => {
        const head = prev[0];
        const useDir = queuedDirRef.current;
        appliedDirRef.current = useDir;
        const delta = DELTA[useDir];
        const next = { x: head.x + delta.x, y: head.y + delta.y };

        const hitsWall = next.x < 0 || next.y < 0 || next.x >= SIZE || next.y >= SIZE;
        const ateFood = next.x === food.x && next.y === food.y;
        // The tail segment vacates this same tick unless food was just
        // eaten (then the snake grows and the tail stays put) -- checking
        // against the full previous body, tail included, caused a false
        // "hit yourself" game over any time the next move happened to land
        // on the current tail cell, which is actually always a legal move.
        const bodyToCheck = ateFood ? prev : prev.slice(0, -1);
        const hitsSelf = bodyToCheck.some((s) => s.x === next.x && s.y === next.y);
        if (hitsWall || hitsSelf) {
          setGameOver(true);
          setRunning(false);
          return prev;
        }

        setFacingDir(useDir);
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
    appliedDirRef.current = 'right';
    queuedDirRef.current = 'right';
    setFacingDir('right');
    setGameOver(false);
    setRecorded(false);
    setRunning(true);
  }

  // Swipe-only controls (the d-pad buttons were dropped per request) --
  // absolute screen direction, same as before: swipe left = go left, up =
  // go up, etc. changeDir()'s OPPOSITE guard still blocks swiping straight
  // back into the snake's current direction of travel.
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
        <Text style={[styles.muted, isArtDeco && deco.muted]}>Geser layar untuk ganti arah</Text>
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

            if (isHead) {
              return (
                <View key={i} style={styles.cell}>
                  <View style={[styles.snakeHead, isArtDeco && deco.snakeHead]}>
                    <View style={[styles.eyeRow, EYE_ROW_BY_DIR[facingDir]]}>
                      <View style={styles.eye} />
                      <View style={styles.eye} />
                    </View>
                  </View>
                </View>
              );
            }
            if (isBody) {
              return (
                <View key={i} style={styles.cell}>
                  <View style={[styles.snakeBody, isArtDeco && deco.snakeBody]} />
                </View>
              );
            }
            if (isFood) {
              return (
                <View key={i} style={styles.cell}>
                  <Text style={styles.foodEmoji}>🍎</Text>
                </View>
              );
            }
            return <View key={i} style={[styles.cell, styles.empty]} />;
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
    </GameCard>
  );
}

const BOARD_SIZE = 280;
const CELL_SIZE = BOARD_SIZE / SIZE;

// Eye placement within the head cell, one pair per facing direction --
// simple absolute-positioned offsets rather than a full rotation, since the
// eyes are just two small dots.
const EYE_ROW_BY_DIR: Record<Dir, { justifyContent: 'flex-start' | 'flex-end' | 'center'; flexDirection: 'row' | 'column' }> = {
  right: { flexDirection: 'row', justifyContent: 'flex-end' },
  left: { flexDirection: 'row', justifyContent: 'flex-start' },
  up: { flexDirection: 'column', justifyContent: 'flex-start' },
  down: { flexDirection: 'column', justifyContent: 'flex-end' },
};

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
    backgroundColor: '#eafaf0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    backgroundColor: 'transparent',
  },
  snakeHead: {
    width: CELL_SIZE - 2,
    height: CELL_SIZE - 2,
    borderRadius: CELL_SIZE / 2.4,
    backgroundColor: '#22c55e',
    padding: 3,
  },
  eyeRow: {
    flex: 1,
    gap: 2,
  },
  eye: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#0f2e1a',
  },
  snakeBody: {
    width: CELL_SIZE - 3,
    height: CELL_SIZE - 3,
    borderRadius: CELL_SIZE / 3,
    backgroundColor: '#4ade80',
  },
  foodEmoji: {
    fontSize: CELL_SIZE * 0.7,
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
  grid: {
    backgroundColor: artDeco.color.surface2,
    borderRadius: artDeco.radius.none,
    borderWidth: 1,
    borderColor: artDeco.color.lineSoft,
  },
  snakeHead: {
    backgroundColor: artDeco.color.gold,
    borderRadius: artDeco.radius.none,
  },
  snakeBody: {
    backgroundColor: artDeco.color.goldSoft,
    borderRadius: artDeco.radius.none,
  },
  resultText: {
    color: artDeco.color.ink,
  },
});
