import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type View as RNView } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import {
  GRID_SIZE,
  canPlace,
  emptyGrid,
  isGameOver,
  placePiece,
  randomTray,
  type Grid,
  type TrayPiece,
} from '../../lib/games/blockblast';
import { THEMES } from '../../lib/games/blockblastThemes';
import { useGameScores } from '../../hooks/useGameScores';
import { supabase } from '../../lib/supabase';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

const BOARD_SIZE = 280;
const CELL_SIZE = BOARD_SIZE / GRID_SIZE;

// How many full cell-heights of clear space sit between the finger and the
// dragged piece's BOTTOM edge -- also the basis for the point used for grid
// hit-testing so what's shown lines up with where it lands. Deliberately a
// gap from the piece's bottom edge, not from its center: an earlier version
// centered the piece LIFT_PX above the finger, which meant a taller piece
// (more of its own height extending back down toward the finger) ended up
// with much LESS actual clearance than a short one -- reported as "still
// too close" even after increasing that center offset. Measuring from the
// bottom edge keeps the gap the same 2 cells for every piece size.
const DRAG_GAP_CELLS = 2;

interface PieceShapeProps {
  piece: TrayPiece;
  cellPx: number;
  colors: readonly string[];
  cellBorder?: { width: number; color: string };
}

function PieceShape({ piece, cellPx, colors, cellBorder }: PieceShapeProps) {
  const rows = Math.max(...piece.cells.map((c) => c[0])) + 1;
  const cols = Math.max(...piece.cells.map((c) => c[1])) + 1;
  const filled = new Set(piece.cells.map(([r, c]) => `${r}-${c}`));
  return (
    <View style={{ width: cols * cellPx, height: rows * cellPx, flexDirection: 'row', flexWrap: 'wrap' }}>
      {Array.from({ length: rows * cols }, (_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const isFilled = filled.has(`${r}-${c}`);
        return (
          <View
            key={i}
            style={{
              width: cellPx,
              height: cellPx,
              borderRadius: 2,
              backgroundColor: isFilled ? colors[piece.color] : 'transparent',
              ...(cellBorder && isFilled
                ? { borderWidth: cellBorder.width, borderColor: cellBorder.color }
                : null),
            }}
          />
        );
      })}
    </View>
  );
}

function pieceSpan(piece: TrayPiece) {
  return {
    rows: Math.max(...piece.cells.map((c) => c[0])) + 1,
    cols: Math.max(...piece.cells.map((c) => c[1])) + 1,
  };
}

interface PlaceEffect {
  key: number;
  row: number;
  col: number;
  anim: Animated.Value;
}

interface BannerState {
  text: string;
  light: boolean; // white text -- used when shown over the accent-colored perfect-clear wash
}

export function BlockBlastGame({ coupleId }: { coupleId?: string | null }) {
  const [grid, setGrid] = useState<Grid>(emptyGrid);
  const [tray, setTray] = useState<(TrayPiece | null)[]>(randomTray);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);
  const [themeIndex, setThemeIndex] = useState(0);
  // Display-only overrides for the two-phase line-clear flash -- `grid`
  // itself always holds the final (already-cleared) board immediately, so
  // canPlace/isGameOver/gridRefValue never see a stale mid-animation state.
  const [pendingGrid, setPendingGrid] = useState<Grid | null>(null);
  const [clearLines, setClearLines] = useState<{ rows: number[]; cols: number[] } | null>(null);
  const [placeEffects, setPlaceEffects] = useState<PlaceEffect[]>([]);
  const [banner, setBanner] = useState<BannerState | null>(null);
  const { recordScore } = useGameScores(coupleId, 'blockblast');

  const theme = THEMES[themeIndex];
  const nextTheme = THEMES[(themeIndex + 1) % THEMES.length];
  const shownGrid = pendingGrid ?? grid;

  const containerRef = useRef<RNView>(null);
  const gridRef = useRef<RNView>(null);
  const containerLayout = useRef({ x: 0, y: 0 });
  const gridLayout = useRef({ x: 0, y: 0, cellSize: 0 });
  const dragPos = useRef(new Animated.ValueXY({ x: -1000, y: -1000 })).current;
  const scorePop = useRef(new Animated.Value(0)).current;
  const clearFlash = useRef(new Animated.Value(0)).current;
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const wash = useRef(new Animated.Value(0)).current;
  const boardPulse = useRef(new Animated.Value(0)).current;
  const overIn = useRef(new Animated.Value(0)).current;
  const effectIdRef = useRef(0);

  const gridRefValue = useRef(grid);
  const trayRef = useRef(tray);
  const dragIndexRef = useRef<number | null>(null);
  const hoverCellRef = useRef<{ row: number; col: number } | null>(null);
  gridRefValue.current = grid;
  trayRef.current = tray;
  dragIndexRef.current = dragIndex;

  useEffect(() => {
    if (gameOver && !recorded) {
      setRecorded(true);
      supabase.auth.getUser().then(({ data }) => {
        recordScore({ userId: data.user?.id ?? null, score });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  useEffect(() => {
    if (!gameOver) return;
    overIn.setValue(0);
    Animated.timing(overIn, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  function measureContainer() {
    containerRef.current?.measureInWindow((x, y) => {
      containerLayout.current = { x, y };
    });
  }

  function measureGrid() {
    gridRef.current?.measureInWindow((x, y, width) => {
      gridLayout.current = { x, y, cellSize: width / GRID_SIZE };
    });
  }

  function cellFromAbsolute(absX: number, absY: number) {
    const { x, y, cellSize } = gridLayout.current;
    if (!cellSize) return null;
    const col = Math.floor((absX - x) / cellSize);
    const row = Math.floor((absY - y) / cellSize);
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
    return { row, col };
  }

  function updateDragPosition(absX: number, absY: number, piece: TrayPiece) {
    const { rows, cols } = pieceSpan(piece);
    // Horizontally centered on the finger. Vertically, the piece's BOTTOM
    // edge sits DRAG_GAP_CELLS cells above the finger -- so origin (top-left)
    // is that gap plus the piece's own full height further up.
    const originX = absX - (cols * CELL_SIZE) / 2;
    const originY = absY - DRAG_GAP_CELLS * CELL_SIZE - rows * CELL_SIZE;

    dragPos.setValue({
      x: originX - containerLayout.current.x,
      y: originY - containerLayout.current.y,
    });

    // Probe the center of the piece's origin cell, not the bounding-box
    // corner -- cellFromAbsolute floors, so a corner probe sits exactly on a
    // cell boundary and can flip a whole cell on sub-pixel jitter.
    const cell = cellFromAbsolute(originX + CELL_SIZE / 2, originY + CELL_SIZE / 2);
    hoverCellRef.current = cell;
    setHoverCell((prev) => (prev?.row === cell?.row && prev?.col === cell?.col ? prev : cell));
  }

  function bumpScore() {
    scorePop.setValue(0);
    Animated.sequence([
      Animated.timing(scorePop, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.spring(scorePop, { toValue: 0, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();
  }

  function popPlacement(cells: [number, number][]) {
    const effects: PlaceEffect[] = cells.map(([row, col]) => ({
      key: ++effectIdRef.current,
      row,
      col,
      anim: new Animated.Value(0),
    }));
    setPlaceEffects((prev) => [...prev, ...effects]);
    Animated.parallel(
      effects.map((e) =>
        Animated.timing(e.anim, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true })
      )
    ).start(() => {
      setPlaceEffects((prev) => prev.filter((e) => !effects.some((ef) => ef.key === e.key)));
    });
  }

  function showBanner(text: string, light = false) {
    setBanner({ text, light });
    bannerAnim.setValue(0);
    Animated.sequence([
      Animated.timing(bannerAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.back(1.6)),
        useNativeDriver: true,
      }),
      Animated.delay(500),
      Animated.timing(bannerAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setBanner(null);
    });
  }

  function celebratePerfectClear() {
    const upcoming = THEMES[(themeIndex + 1) % THEMES.length];
    showBanner(`Papan bersih! Tema ${upcoming.name}`, true);
    Animated.parallel([
      Animated.timing(wash, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(boardPulse, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.spring(boardPulse, { toValue: 0, friction: 4, tension: 60, useNativeDriver: true }),
      ]),
    ]).start(({ finished }) => {
      if (!finished) return;
      // Swap at peak wash opacity -- every themed color changes in one
      // frame while the screen is fully covered, so it reads as a
      // cross-fade with zero color interpolation (stays native-driver-only).
      setThemeIndex((i) => (i + 1) % THEMES.length);
      Animated.timing(wash, { toValue: 0, duration: 450, useNativeDriver: true }).start();
    });
  }

  function endDrag(index: number) {
    const cell = hoverCellRef.current;
    const piece = trayRef.current[index];
    dragIndexRef.current = null;
    setDragIndex(null);
    setHoverCell(null);
    dragPos.setValue({ x: -1000, y: -1000 });
    if (!cell || !piece) return;
    const result = placePiece(gridRefValue.current, piece, cell.row, cell.col);
    if (!result) return;

    setGrid(result.grid);
    setScore((s) => s + result.scoreGained);
    bumpScore();
    let nextTray = trayRef.current.map((p, i) => (i === index ? null : p));
    if (nextTray.every((p) => p === null)) nextTray = randomTray(result.grid);
    setTray(nextTray);

    if (result.linesCleared === 0) {
      popPlacement(result.placedCells);
      if (isGameOver(result.grid, nextTray)) setGameOver(true);
      return;
    }

    setPendingGrid(result.filledGrid);
    setClearLines({ rows: result.clearedRows, cols: result.clearedCols });
    clearFlash.setValue(0);
    Animated.timing(clearFlash, { toValue: 1, duration: 90, useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return; // reset() stopped us; it already cleaned up
      setPendingGrid(null);
      if (result.perfectClear) celebratePerfectClear();
      else if (result.linesCleared >= 2) showBanner(`Kombo x${result.linesCleared}`);
      Animated.timing(clearFlash, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
        setClearLines(null)
      );
      if (isGameOver(result.grid, nextTray)) setGameOver(true);
    });
  }

  function reset() {
    setGrid(emptyGrid());
    setTray(randomTray());
    setDragIndex(null);
    setHoverCell(null);
    dragIndexRef.current = null;
    setScore(0);
    setGameOver(false);
    setRecorded(false);
    clearFlash.stopAnimation();
    setPendingGrid(null);
    setClearLines(null);
    setPlaceEffects([]);
    setBanner(null);
    overIn.setValue(0);
    // themeIndex intentionally left alone -- an earned theme persists through "Main Lagi".
  }

  const draggingPiece = dragIndex !== null ? tray[dragIndex] : null;
  const hoverValid = draggingPiece && hoverCell ? canPlace(grid, draggingPiece, hoverCell.row, hoverCell.col) : false;
  const hoverFootprint =
    draggingPiece && hoverCell
      ? new Set(draggingPiece.cells.map(([dr, dc]) => `${hoverCell.row + dr}-${hoverCell.col + dc}`))
      : null;

  return (
    <View ref={containerRef} onLayout={measureContainer} style={styles.wrapper}>
      <GameCard>
        <View style={styles.headerRow}>
          <Text style={styles.muted}>Seret potongan ke kotak buat menempatkannya</Text>
          <Animated.Text
            style={[
              styles.score,
              { color: theme.accent, transform: [{ scale: scorePop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }] },
            ]}
          >
            {score}
          </Animated.Text>
        </View>

        <View ref={gridRef} onLayout={measureGrid} style={styles.gridOuter}>
          <Animated.View
            style={[
              styles.gridInner,
              {
                backgroundColor: theme.boardBg,
                transform: [{ scale: boardPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }],
              },
            ]}
          >
            {shownGrid.flat().map((value, i) => {
              const row = Math.floor(i / GRID_SIZE);
              const col = i % GRID_SIZE;
              const inFootprint = hoverFootprint?.has(`${row}-${col}`) ?? false;
              return (
                <View
                  key={i}
                  style={[
                    styles.cell,
                    { borderColor: theme.gridLine },
                    value !== 0
                      ? { backgroundColor: theme.blocks[value - 1] }
                      : inFootprint
                        ? hoverValid
                          ? styles.hoverValid
                          : styles.hoverInvalid
                        : { backgroundColor: theme.emptyCell },
                  ]}
                />
              );
            })}

            {placeEffects.map((e) => (
              <Animated.View
                key={e.key}
                pointerEvents="none"
                style={[
                  styles.placeEffect,
                  {
                    left: e.col * CELL_SIZE,
                    top: e.row * CELL_SIZE,
                    opacity: e.anim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 0] }),
                    transform: [{ scale: e.anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) }],
                  },
                ]}
              />
            ))}

            {clearLines?.rows.map((r) => (
              <Animated.View
                key={`row-${r}`}
                pointerEvents="none"
                style={[
                  styles.clearBarRow,
                  {
                    top: r * CELL_SIZE,
                    opacity: clearFlash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.95] }),
                    transform: [{ scaleY: clearFlash.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }],
                  },
                ]}
              />
            ))}
            {clearLines?.cols.map((c) => (
              <Animated.View
                key={`col-${c}`}
                pointerEvents="none"
                style={[
                  styles.clearBarCol,
                  {
                    left: c * CELL_SIZE,
                    opacity: clearFlash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.95] }),
                    transform: [{ scaleX: clearFlash.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }],
                  },
                ]}
              />
            ))}

            {banner && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.bannerWrap,
                  {
                    opacity: bannerAnim,
                    transform: [
                      { translateY: bannerAnim.interpolate({ inputRange: [0, 1], outputRange: [14, -16] }) },
                      { scale: bannerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.05] }) },
                    ],
                  },
                ]}
              >
                <Text style={[styles.banner, { color: banner.light ? '#ffffff' : theme.accent }]}>{banner.text}</Text>
              </Animated.View>
            )}
          </Animated.View>
        </View>

        <View style={styles.trayRow}>
          {tray.map((piece, i) => {
            const gesture = Gesture.Pan()
              .minDistance(0)
              .onStart((e) => {
                if (gameOver || !trayRef.current[i] || dragIndexRef.current !== null) return;
                measureContainer();
                measureGrid();
                dragIndexRef.current = i;
                setDragIndex(i);
                updateDragPosition(e.absoluteX, e.absoluteY, trayRef.current[i]!);
              })
              .onUpdate((e) => {
                if (dragIndexRef.current !== i) return;
                const current = trayRef.current[i];
                if (!current) return;
                updateDragPosition(e.absoluteX, e.absoluteY, current);
              })
              .onEnd(() => {
                if (dragIndexRef.current !== i) return;
                endDrag(i);
              })
              .onFinalize(() => {
                // Guaranteed to run even if the gesture is cancelled instead
                // of ending normally (e.g. the enclosing ScrollView steals
                // the touch mid-drag) -- onEnd alone left dragIndexRef stuck
                // non-null in that case, permanently hiding this piece and
                // blocking every future drag via the onStart guard above.
                if (dragIndexRef.current !== i) return;
                dragIndexRef.current = null;
                setDragIndex(null);
                setHoverCell(null);
                dragPos.setValue({ x: -1000, y: -1000 });
              });

            return (
              <GestureDetector key={i} gesture={gesture}>
                <View style={styles.traySlot}>
                  {piece && dragIndex !== i ? (
                    <PieceShape piece={piece} cellPx={10} colors={theme.blocks} />
                  ) : (
                    <View style={styles.trayPlaceholder} />
                  )}
                </View>
              </GestureDetector>
            );
          })}
        </View>

        {gameOver && (
          <Animated.View
            style={[
              styles.center,
              {
                opacity: overIn,
                transform: [{ translateY: overIn.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
              },
            ]}
          >
            <Text style={styles.resultText}>Game selesai — skor akhir {score}</Text>
            <GameButton onPress={reset}>Main Lagi</GameButton>
          </Animated.View>
        )}
      </GameCard>

      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.wash,
          { backgroundColor: nextTheme.accent, opacity: wash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.92] }) },
        ]}
      />

      {dragIndex !== null && draggingPiece && (
        <Animated.View pointerEvents="none" style={[styles.floating, { transform: dragPos.getTranslateTransform() }]}>
          <PieceShape
            piece={draggingPiece}
            cellPx={CELL_SIZE}
            colors={theme.blocks}
            cellBorder={{ width: 0.5, color: theme.gridLine }}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  muted: {
    fontSize: 13,
    color: '#767676',
    flexShrink: 1,
  },
  score: {
    fontSize: 18,
    fontWeight: '700',
  },
  gridOuter: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    alignSelf: 'center',
  },
  gridInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 0.5,
  },
  hoverValid: {
    backgroundColor: 'rgba(34, 197, 94, 0.4)',
  },
  hoverInvalid: {
    backgroundColor: 'rgba(239, 68, 68, 0.4)',
  },
  placeEffect: {
    position: 'absolute',
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
  clearBarRow: {
    position: 'absolute',
    left: 0,
    width: BOARD_SIZE,
    height: CELL_SIZE,
    backgroundColor: '#ffffff',
  },
  clearBarCol: {
    position: 'absolute',
    top: 0,
    width: CELL_SIZE,
    height: BOARD_SIZE,
    backgroundColor: '#ffffff',
  },
  bannerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: BOARD_SIZE / 2 - 20,
    alignItems: 'center',
  },
  banner: {
    fontSize: 18,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  trayRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  traySlot: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trayPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#fdeef4',
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
  wash: {
    borderRadius: 16,
  },
  floating: {
    position: 'absolute',
    left: 0,
    top: 0,
    opacity: 0.9,
  },
});
