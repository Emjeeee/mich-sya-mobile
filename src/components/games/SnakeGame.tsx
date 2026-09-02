import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';

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
  // The snake used to start moving (heading 'right', from dead center)
  // the instant "Mulai" was pressed -- with only SIZE=12 columns, that's
  // just ~6 ticks (under a second) before it hits the wall on its own,
  // often before a player has even located a D-pad button, let alone
  // pressed one. That's what was actually behind "every input causes game
  // over" / "the D-pad doesn't respond" -- the game was frequently already
  // over before the first input was even processed. Freezing the snake in
  // place until the first directional press removes that hidden countdown
  // entirely; the board and D-pad are shown (`running`) well before any
  // movement (`started`) begins.
  const [started, setStarted] = useState(false);
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
    // the snake's own neck. Only applies once the snake has actually started
    // moving -- before that it's a single segment with no neck to reverse
    // into, so the very first press should accept any of the 4 directions
    // (including whatever direction happens to equal the default heading's
    // opposite) rather than rejecting it as an illegal reversal.
    if (started && OPPOSITE[appliedDirRef.current] === next) return;
    queuedDirRef.current = next;
    if (!started) setStarted(true);
  }

  useEffect(() => {
    if (!running || gameOver || !started) return;
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
  }, [running, gameOver, started, food]);

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
    setStarted(false);
    setRunning(true);
  }

  const hintText =
    running && !started ? 'Tahan joystick lalu arahkan untuk mulai jalan' : 'Tahan & arahkan joystick di bawah';

  return (
    <GameCard>
      <View style={styles.headerRow}>
        {isLiquidGlass ? (
          <>
            <GlassSurface radius={liquidGlass.radius.pill} contentStyle={glass.hintChip}>
              <Text style={glass.muted}>{hintText}</Text>
            </GlassSurface>
            <GlassSurface radius={liquidGlass.radius.pill} contentStyle={glass.scoreChip}>
              <Text style={glass.score}>{snake.length}</Text>
            </GlassSurface>
          </>
        ) : (
          <>
            <Text style={[styles.muted, isArtDeco && deco.muted]}>{hintText}</Text>
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
        <Joystick isArtDeco={isArtDeco} isLiquidGlass={isLiquidGlass} onDirection={changeDir} />
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

// Press-and-hold joystick, replacing the earlier D-pad -- drag the knob
// toward a direction and hold it there to keep steering that way; letting
// go springs the knob back to center but doesn't stop the snake, same as
// releasing a D-pad button never did either. The touch responder
// (panHandlers) is attached to the whole base circle, not just the small
// knob, so grabbing the stick anywhere within it works, not only a precise
// touch on the knob itself.
//
// The nearest cardinal direction is derived from whichever axis of the
// drag has the larger magnitude -- the same "biggest axis wins" rule the
// very first swipe-to-steer version used -- evaluated on every move, not
// just once, so re-aiming the stick keeps re-steering the snake without
// needing to release and grab it again. A small deadzone near center
// avoids registering a direction from tiny finger jitter right as the
// stick is grabbed.
const JOYSTICK_BASE_SIZE = 160;
const JOYSTICK_KNOB_SIZE = 64;
const JOYSTICK_MAX_RADIUS = (JOYSTICK_BASE_SIZE - JOYSTICK_KNOB_SIZE) / 2;
const JOYSTICK_DEADZONE = 12;

function Joystick({
  isArtDeco,
  isLiquidGlass,
  onDirection,
}: {
  isArtDeco: boolean;
  isLiquidGlass: boolean;
  onDirection: (dir: Dir) => void;
}) {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  // Only used to avoid re-calling onDirection every single move event when
  // the stick hasn't actually crossed into a different cardinal direction
  // since the last one -- onDirection itself is cheap to call repeatedly
  // (changeDir() no-ops on an unchanged/illegal direction), this just
  // avoids the redundant calls.
  const lastDirRef = useRef<Dir | null>(null);

  const snapBack = () => {
    lastDirRef.current = null;
    Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, bounciness: 10 }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const { dx, dy } = gestureState;
        const distance = Math.hypot(dx, dy);
        const clampedDistance = Math.min(distance, JOYSTICK_MAX_RADIUS);
        const angle = Math.atan2(dy, dx);
        pan.setValue({
          x: distance > 0 ? Math.cos(angle) * clampedDistance : 0,
          y: distance > 0 ? Math.sin(angle) * clampedDistance : 0,
        });

        if (distance < JOYSTICK_DEADZONE) return;
        const dir: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        if (dir !== lastDirRef.current) {
          lastDirRef.current = dir;
          onDirection(dir);
        }
      },
      onPanResponderRelease: snapBack,
      onPanResponderTerminate: snapBack,
    })
  ).current;

  return (
    <View style={styles.joystickWrap} {...panResponder.panHandlers}>
      {isLiquidGlass ? (
        <GlassSurface style={styles.joystickFill} variant="dark" radius={JOYSTICK_BASE_SIZE / 2} />
      ) : (
        <View style={[styles.joystickFill, styles.joystickBase, isArtDeco && deco.joystickBase]} />
      )}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.joystickKnob,
          isArtDeco && deco.joystickKnob,
          isLiquidGlass && glass.joystickKnob,
          { transform: [{ translateX: pan.x }, { translateY: pan.y }] },
        ]}
      />
    </View>
  );
}

const CELL_SIZE = 24;
const BOARD_SIZE = CELL_SIZE * SIZE;

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
  joystickWrap: {
    width: JOYSTICK_BASE_SIZE,
    height: JOYSTICK_BASE_SIZE,
    alignSelf: 'center',
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Shared by both the plain and GlassSurface-rendered base -- fills the
  // wrap exactly so the whole circle (not just the knob) is the grab area.
  joystickFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: JOYSTICK_BASE_SIZE / 2,
  },
  joystickBase: {
    backgroundColor: '#374151',
  },
  joystickKnob: {
    width: JOYSTICK_KNOB_SIZE,
    height: JOYSTICK_KNOB_SIZE,
    borderRadius: JOYSTICK_KNOB_SIZE / 2,
    backgroundColor: '#e11d74',
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
  joystickBase: {
    backgroundColor: artDeco.color.black,
    borderRadius: artDeco.radius.none,
    borderWidth: 1,
    borderColor: artDeco.color.gold,
  },
  joystickKnob: {
    backgroundColor: artDeco.color.gold,
    borderRadius: artDeco.radius.none,
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
  joystickKnob: {
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
});
