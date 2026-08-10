import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useGameScores } from '../../hooks/useGameScores';
import { supabase } from '../../lib/supabase';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

const SIZE = 4;
const SOLVED = [...Array.from({ length: 15 }, (_, i) => i + 1), 0];

function validMoves(blankIndex: number): number[] {
  const row = Math.floor(blankIndex / SIZE);
  const col = blankIndex % SIZE;
  const moves: number[] = [];
  if (row > 0) moves.push(blankIndex - SIZE);
  if (row < SIZE - 1) moves.push(blankIndex + SIZE);
  if (col > 0) moves.push(blankIndex - 1);
  if (col < SIZE - 1) moves.push(blankIndex + 1);
  return moves;
}

function shuffledBoard(): number[] {
  const board = [...SOLVED];
  let blank = board.indexOf(0);
  // Shuffle via random valid slides so the result is always solvable.
  for (let i = 0; i < 300; i++) {
    const neighbors = validMoves(blank);
    const next = neighbors[Math.floor(Math.random() * neighbors.length)];
    [board[blank], board[next]] = [board[next], board[blank]];
    blank = next;
  }
  return board;
}

export function SlidingPuzzleGame({ coupleId }: { coupleId?: string | null }) {
  const [board, setBoard] = useState<number[]>(shuffledBoard);
  const [moves, setMoves] = useState(0);
  const [recorded, setRecorded] = useState(false);
  const { recordScore } = useGameScores(coupleId, 'slidingpuzzle');

  const won = board.every((v, i) => v === SOLVED[i]);

  function handleTileClick(index: number) {
    if (won) return;
    const blank = board.indexOf(0);
    if (!validMoves(blank).includes(index)) return;
    const next = [...board];
    [next[blank], next[index]] = [next[index], next[blank]];
    setBoard(next);
    setMoves((m) => m + 1);
    if (next.every((v, i) => v === SOLVED[i]) && !recorded) {
      setRecorded(true);
      supabase.auth.getUser().then(({ data }) => {
        recordScore({ userId: data.user?.id ?? null, score: moves + 1 });
      });
    }
  }

  function reset() {
    setBoard(shuffledBoard());
    setMoves(0);
    setRecorded(false);
  }

  return (
    <GameCard>
      <View style={styles.headerRow}>
        <Text style={styles.muted}>Urutkan angka 1-15</Text>
        <Text style={styles.score}>{moves} langkah</Text>
      </View>

      <View style={styles.grid}>
        {board.map((value, i) => (
          <Pressable key={i} onPress={() => handleTileClick(i)} disabled={value === 0} style={styles.tile}>
            <Text style={styles.tileText}>{value !== 0 ? value : ''}</Text>
          </Pressable>
        ))}
      </View>

      {won && <Text style={styles.resultText}>Selesai dalam {moves} langkah! 🎉</Text>}

      <GameButton variant="secondary" onPress={reset}>
        {won ? 'Main Lagi' : 'Acak Ulang'}
      </GameButton>
    </GameCard>
  );
}

const TILE_SIZE = 64;

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  muted: {
    fontSize: 13,
    color: '#999',
  },
  score: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e11d74',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    width: TILE_SIZE * 4 + 18,
    alignSelf: 'center',
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 8,
    backgroundColor: '#fdeef4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  resultText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
});
