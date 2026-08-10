import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, type View as RNView } from 'react-native';
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
import { useGameScores } from '../../hooks/useGameScores';
import { supabase } from '../../lib/supabase';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

// How far above the finger the dragged piece floats, so it stays visible past
// the touch point instead of hidden directly underneath it -- also the point
// used for grid hit-testing so what's shown lines up with where it lands.
const LIFT_PX = 60;

const BLOCK_HEX = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];

function PieceShape({ piece, cellPx }: { piece: TrayPiece; cellPx: number }) {
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
              backgroundColor: isFilled ? BLOCK_HEX[piece.color] : 'transparent',
            }}
          />
        );
      })}
    </View>
  );
}

export function BlockBlastGame({ coupleId }: { coupleId?: string | null }) {
  const [grid, setGrid] = useState<Grid>(emptyGrid);
  const [tray, setTray] = useState<(TrayPiece | null)[]>(randomTray);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);
  const { recordScore } = useGameScores(coupleId, 'blockblast');

  const containerRef = useRef<RNView>(null);
  const gridRef = useRef<RNView>(null);
  const containerLayout = useRef({ x: 0, y: 0 });
  const gridLayout = useRef({ x: 0, y: 0, cellSize: 0 });
  const dragPos = useRef(new Animated.ValueXY({ x: -1000, y: -1000 })).current;

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

  function updateDragPosition(absX: number, absY: number) {
    dragPos.setValue({ x: absX - containerLayout.current.x, y: absY - LIFT_PX - containerLayout.current.y });
    const cell = cellFromAbsolute(absX, absY - LIFT_PX);
    hoverCellRef.current = cell;
    setHoverCell((prev) => (prev?.row === cell?.row && prev?.col === cell?.col ? prev : cell));
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
    let nextTray = trayRef.current.map((p, i) => (i === index ? null : p));
    if (nextTray.every((p) => p === null)) nextTray = randomTray();
    setTray(nextTray);
    if (isGameOver(result.grid, nextTray)) setGameOver(true);
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
          <Text style={styles.score}>{score}</Text>
        </View>

        <View ref={gridRef} onLayout={measureGrid} style={styles.grid}>
          {grid.flat().map((value, i) => {
            const row = Math.floor(i / GRID_SIZE);
            const col = i % GRID_SIZE;
            const inFootprint = hoverFootprint?.has(`${row}-${col}`) ?? false;
            return (
              <View
                key={i}
                style={[
                  styles.cell,
                  value !== 0
                    ? { backgroundColor: BLOCK_HEX[value - 1] }
                    : inFootprint
                      ? hoverValid
                        ? styles.hoverValid
                        : styles.hoverInvalid
                      : styles.emptyCell,
                ]}
              />
            );
          })}
        </View>

        <View style={styles.trayRow}>
          {tray.map((piece, i) => {
            const gesture = Gesture.Pan()
              .onStart((e) => {
                if (gameOver || !trayRef.current[i] || dragIndexRef.current !== null) return;
                measureContainer();
                measureGrid();
                dragIndexRef.current = i;
                setDragIndex(i);
                updateDragPosition(e.absoluteX, e.absoluteY);
              })
              .onUpdate((e) => {
                if (dragIndexRef.current !== i) return;
                updateDragPosition(e.absoluteX, e.absoluteY);
              })
              .onEnd(() => {
                if (dragIndexRef.current !== i) return;
                endDrag(i);
              });

            return (
              <GestureDetector key={i} gesture={gesture}>
                <View style={styles.traySlot}>
                  {piece && dragIndex !== i ? (
                    <PieceShape piece={piece} cellPx={10} />
                  ) : (
                    <View style={styles.trayPlaceholder} />
                  )}
                </View>
              </GestureDetector>
            );
          })}
        </View>

        {gameOver && (
          <View style={styles.center}>
            <Text style={styles.resultText}>Game selesai — skor akhir {score}</Text>
            <GameButton onPress={reset}>Main Lagi</GameButton>
          </View>
        )}
      </GameCard>

      {dragIndex !== null && draggingPiece && (
        <Animated.View pointerEvents="none" style={[styles.floating, { transform: dragPos.getTranslateTransform() }]}>
          <PieceShape piece={draggingPiece} cellPx={22} />
        </Animated.View>
      )}
    </View>
  );
}

const BOARD_SIZE = 280;
const CELL_SIZE = BOARD_SIZE / GRID_SIZE;

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
    color: '#999',
    flexShrink: 1,
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
    backgroundColor: '#eee',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 0.5,
    borderColor: '#fff',
  },
  emptyCell: {
    backgroundColor: '#f7f7f7',
  },
  hoverValid: {
    backgroundColor: 'rgba(34, 197, 94, 0.4)',
  },
  hoverInvalid: {
    backgroundColor: 'rgba(239, 68, 68, 0.4)',
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
  floating: {
    position: 'absolute',
    left: 0,
    top: 0,
    opacity: 0.9,
  },
});
