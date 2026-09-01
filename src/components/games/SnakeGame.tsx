import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useGameScores } from '../../hooks/useGameScores';
import { supabase } from '../../lib/supabase';
import { artDeco } from '../../theme/artDecoTokens';
import { GlassSurface } from '../../theme/components/GlassSurface';
import { liquidGlass } from '../../theme/liquidGlassTokens';
import { useAppTheme } from '../../theme/ThemeContext';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

const SIZE = 12;
const TICK_MS = 160;

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
  const { isArtDeco, isLiquidGlass } = useAppTheme();
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
  // real move -- so two different button presses in the same ~160ms window
  // (e.g. up then left while actually moving right) could each individually
  // pass the guard and net out to a straight reversal into the snake's own
  // neck. Validating strictly against `appliedDir`, which only changes once
  // per tick, closes that gap regardless of how many inputs land in between.
  const appliedDirRef = useRef<Dir>('right');
  const queuedDirRef = useRef<Dir>('right');
  const { recordScore } = useGameScores(coupleId, 'snake');

  function changeDir(next: Dir) {
    // Cross-key D-pad below only ever calls this with one of the 4 cardinal
    // directions, so there is no diagonal input to begin with -- this guard
    // just also blocks the one remaining illegal move, a straight 180 into
    // the snake's own neck.
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

        // No wraparound -- running off any edge ends the game. There is no
        // modulo anywhere in this file, so the snake can never "teleport"
        // to the opposite edge; if that was ever seen on-device it was the
        // fractional-pixel `flexWrap` grid below misrendering a cell into
        // the wrong row, not the game state actually jumping -- fixed by
        // rendering explicit rows/columns instead of a wrapped flex list.
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

  return (
    <GameCard>
      <View style={styles.headerRow}>
        {isLiquidGlass ? (
          <>
            <GlassSurface radius={liquidGlass.radius.pill} contentStyle={glass.hintChip}>
              <Text style={glass.muted}>Gunakan tombol arah di bawah</Text>
            </GlassSurface>
            <GlassSurface radius={liquidGlass.radius.pill} contentStyle={glass.scoreChip}>
              <Text style={glass.score}>{snake.length}</Text>
            </GlassSurface>
          </>
        ) : (
          <>
            <Text style={[styles.muted, isArtDeco && deco.muted]}>Gunakan tombol arah di bawah</Text>
            <Text style={[styles.score, isArtDeco && deco.score]}>{snake.length}</Text>
          </>
        )}
      </View>

      {/* Explicit rows of exact-integer-width cells, not a wrapped flex list
          of fractional-width items -- SIZE=12 into a non-multiple-of-12
          pixel board meant each row's cells could accumulate a fraction of
          a pixel of rounding error by the time it wrapped, which on some
          devices staggered rows out of alignment (looked like the snake
          moving diagonally) or wrapped a cell into the wrong row entirely
          (looked like the snake teleporting). Fixed-integer CELL_SIZE with
          real row Views makes both impossible regardless of pixel ratio. */}
      <View style={[styles.grid, isArtDeco && deco.grid]}>
        {Array.from({ length: SIZE }, (_, y) => (
          <View key={y} style={styles.row}>
            {Array.from({ length: SIZE }, (_, x) => {
              const isHead = snake[0].x === x && snake[0].y === y;
              const isBody = !isHead && snake.some((s) => s.x === x && s.y === y);
              const isFood = food.x === x && food.y === y;

              if (isHead) {
                return (
                  <View key={x} style={styles.cell}>
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
                  <View key={x} style={styles.cell}>
                    <View style={[styles.snakeBody, isArtDeco && deco.snakeBody]} />
                  </View>
                );
              }
              if (isFood) {
                return (
                  <View key={x} style={styles.cell}>
                    <Text style={styles.foodEmoji}>🍎</Text>
                  </View>
                );
              }
              return <View key={x} style={[styles.cell, styles.empty]} />;
            })}
          </View>
        ))}
      </View>

      {running && (
        <DPad isArtDeco={isArtDeco} isLiquidGlass={isLiquidGlass} onPress={changeDir} />
      )}

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

// Cross-key layout (like an Xbox controller's D-pad): one button each for
// up/down/left/right arranged in a "+" shape around a blank center, instead
// of 4 separate corner buttons or swipe gestures. Swipe detection turned
// out to be unreliable here -- ambiguous drags could register as the wrong
// axis or misfire as soon as the board was touched at all, which is what
// was actually behind the "controls don't work, game overs immediately"
// reports, not the game logic itself. Discrete buttons can't misfire that
// way and can't produce anything but one of the 4 cardinal directions.
function DPad({
  isArtDeco,
  isLiquidGlass,
  onPress,
}: {
  isArtDeco: boolean;
  isLiquidGlass: boolean;
  onPress: (dir: Dir) => void;
}) {
  const Btn = ({ dir, label }: { dir: Dir; label: string }) => (
    <Pressable
      onPress={() => onPress(dir)}
      style={({ pressed }) => [
        styles.dpadBtn,
        isArtDeco && deco.dpadBtn,
        isLiquidGlass && glass.dpadBtn,
        pressed && styles.dpadBtnPressed,
        pressed && isArtDeco && deco.dpadBtnPressed,
        pressed && isLiquidGlass && glass.dpadBtnPressed,
      ]}
    >
      <Text style={[styles.dpadLabel, isArtDeco && deco.dpadLabel, isLiquidGlass && glass.dpadLabel]}>{label}</Text>
    </Pressable>
  );

  const rows = (
    <>
      <View style={styles.dpadRow}>
        <View style={styles.dpadSpacer} />
        <Btn dir="up" label="▲" />
        <View style={styles.dpadSpacer} />
      </View>
      <View style={styles.dpadRow}>
        <Btn dir="left" label="◀" />
        <View style={[styles.dpadCenter, isArtDeco && deco.dpadCenter, isLiquidGlass && glass.dpadCenter]} />
        <Btn dir="right" label="▶" />
      </View>
      <View style={styles.dpadRow}>
        <View style={styles.dpadSpacer} />
        <Btn dir="down" label="▼" />
        <View style={styles.dpadSpacer} />
      </View>
    </>
  );

  // The whole cross sits on one shared dark frosted-glass surface (like
  // GlassEffectContainer grouping related glass elements into one connected
  // surface) rather than each button floating independently -- individual
  // buttons are then just a lighter tint on top of that shared glass, not
  // their own separate glass layer (no glass-on-glass).
  if (isLiquidGlass) {
    return (
      <GlassSurface style={styles.dpad} contentStyle={glass.dpadContent} variant="dark" radius={32}>
        {rows}
      </GlassSurface>
    );
  }

  return <View style={styles.dpad}>{rows}</View>;
}

const CELL_SIZE = 24;
const BOARD_SIZE = CELL_SIZE * SIZE;
const DPAD_BTN_SIZE = 48;

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
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    alignSelf: 'center',
    backgroundColor: '#eafaf0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    height: CELL_SIZE,
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
  dpad: {
    alignSelf: 'center',
    marginTop: 14,
    gap: 8,
  },
  dpadRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dpadSpacer: {
    width: DPAD_BTN_SIZE,
    height: DPAD_BTN_SIZE,
  },
  dpadCenter: {
    width: DPAD_BTN_SIZE,
    height: DPAD_BTN_SIZE,
    borderRadius: DPAD_BTN_SIZE / 2,
    backgroundColor: '#e5e7eb',
  },
  dpadBtn: {
    width: DPAD_BTN_SIZE,
    height: DPAD_BTN_SIZE,
    borderRadius: 10,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadBtnPressed: {
    backgroundColor: '#1f2937',
  },
  dpadLabel: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
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
  dpadCenter: {
    backgroundColor: artDeco.color.surface2,
    borderRadius: artDeco.radius.none,
    borderWidth: 1,
    borderColor: artDeco.color.lineSoft,
  },
  dpadBtn: {
    backgroundColor: artDeco.color.black,
    borderRadius: artDeco.radius.none,
    borderWidth: 1,
    borderColor: artDeco.color.gold,
  },
  dpadBtnPressed: {
    backgroundColor: artDeco.color.surface2,
  },
  dpadLabel: {
    color: artDeco.color.gold,
  },
});

const glass = StyleSheet.create({
  hintChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  scoreChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  muted: {
    fontSize: 11.5,
    fontWeight: '600',
    color: liquidGlass.color.ink,
  },
  score: {
    fontSize: 15,
    fontWeight: '800',
    color: liquidGlass.color.go,
  },
  dpadContent: {
    padding: 14,
    gap: 8,
    alignItems: 'center',
  },
  dpadBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
  },
  dpadBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  dpadLabel: {
    color: '#fff',
  },
  dpadCenter: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: DPAD_BTN_SIZE / 2,
  },
});
