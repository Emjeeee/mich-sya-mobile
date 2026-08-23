import { useEffect, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { StyleSheet, Text, View } from 'react-native';

import { addRandomTile, emptyGrid, isGameOver, move, type Grid } from '../../lib/games/game2048';
import { useGameScores } from '../../hooks/useGameScores';
import { supabase } from '../../lib/supabase';
import { artDeco } from '../../theme/artDecoTokens';
import { useAppTheme } from '../../theme/ThemeContext';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

const SWIPE_THRESHOLD = 24;

const TILE_COLORS: Record<number, { bg: string; text: string }> = {
  2: { bg: '#fdeef4', text: '#333' },
  4: { bg: '#fbdce9', text: '#333' },
  8: { bg: '#f7b8d3', text: '#333' },
  16: { bg: '#f194bd', text: '#fff' },
  32: { bg: '#ea6fa4', text: '#fff' },
  64: { bg: '#e11d74', text: '#fff' },
  128: { bg: '#c81157', text: '#fff' },
  256: { bg: '#a80f49', text: '#fff' },
  512: { bg: '#8a0c3c', text: '#fff' },
  1024: { bg: '#6d0930', text: '#fff' },
  2048: { bg: '#4f0624', text: '#fff' },
};

// Gold/emerald/ruby-toned equivalent of TILE_COLORS, only used when
// isArtDeco -- the original palette above is never touched.
const DECO_TILE_COLORS: Record<number, { bg: string; text: string }> = {
  2: { bg: artDeco.color.surface2, text: artDeco.color.ink },
  4: { bg: artDeco.color.goldSoft, text: artDeco.color.ink },
  8: { bg: artDeco.color.emerald, text: artDeco.color.ink },
  16: { bg: artDeco.color.emeraldStrong, text: artDeco.color.white },
  32: { bg: artDeco.color.rubySoft, text: artDeco.color.ink },
  64: { bg: artDeco.color.ruby, text: artDeco.color.white },
  128: { bg: artDeco.color.rubyStrong, text: artDeco.color.white },
  256: { bg: artDeco.color.gold, text: artDeco.color.black },
  512: { bg: artDeco.color.goldStrong, text: artDeco.color.black },
  1024: { bg: artDeco.color.line, text: artDeco.color.black },
  2048: { bg: artDeco.color.white, text: artDeco.color.black },
};

function startingGrid(): Grid {
  const g = emptyGrid();
  addRandomTile(g);
  addRandomTile(g);
  return g;
}

export function Game2048({ coupleId }: { coupleId?: string | null }) {
  const { isArtDeco } = useAppTheme();
  const [grid, setGrid] = useState<Grid>(startingGrid);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const { recordScore } = useGameScores(coupleId, '2048');

  function handleMove(dir: 'left' | 'right' | 'up' | 'down') {
    if (gameOver) return;
    const result = move(grid, dir);
    if (!result.moved) return;
    addRandomTile(result.grid);
    setGrid(result.grid);
    setScore((s) => s + result.gained);
    if (isGameOver(result.grid)) setGameOver(true);
  }

  useEffect(() => {
    if (gameOver && !recorded) {
      setRecorded(true);
      supabase.auth.getUser().then(({ data }) => {
        recordScore({ userId: data.user?.id ?? null, score });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  function reset() {
    setGrid(startingGrid());
    setScore(0);
    setGameOver(false);
    setRecorded(false);
  }

  const swipe = Gesture.Pan().onEnd((e) => {
    const { translationX: dx, translationY: dy } = e;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      handleMove(dx > 0 ? 'right' : 'left');
    } else {
      handleMove(dy > 0 ? 'down' : 'up');
    }
  });

  return (
    <GameCard>
      <View style={styles.headerRow}>
        <Text style={[styles.muted, isArtDeco && deco.muted]}>Geser layar buat gerakin kotak</Text>
        <Text style={[styles.score, isArtDeco && deco.score]}>{score}</Text>
      </View>

      <GestureDetector gesture={swipe}>
        <View style={styles.grid}>
          {grid.flat().map((value, i) => {
            const colors = TILE_COLORS[value];
            const decoColors = DECO_TILE_COLORS[value];
            return (
              <View
                key={i}
                style={[
                  styles.tile,
                  isArtDeco && deco.tile,
                  colors ? { backgroundColor: colors.bg } : styles.emptyTile,
                  isArtDeco && (decoColors ? { backgroundColor: decoColors.bg } : deco.emptyTile),
                ]}
              >
                {value !== 0 && (
                  <Text
                    style={[
                      styles.tileText,
                      colors && { color: colors.text },
                      isArtDeco && decoColors && { color: decoColors.text },
                    ]}
                  >
                    {value}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </GestureDetector>

      {gameOver && <Text style={[styles.resultText, isArtDeco && deco.resultText]}>Game selesai — skor akhir {score}</Text>}

      <GameButton variant="secondary" onPress={reset}>
        {gameOver ? 'Main Lagi' : 'Acak Ulang'}
      </GameButton>
    </GameCard>
  );
}

const TILE_SIZE = 70;

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
    gap: 6,
    alignSelf: 'center',
    width: TILE_SIZE * 4 + 18,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTile: {
    backgroundColor: '#f7f7f7',
  },
  tileText: {
    fontSize: 20,
    fontWeight: '700',
  },
  resultText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
});

const deco = StyleSheet.create({
  muted: {
    color: artDeco.color.muted,
  },
  score: {
    color: artDeco.color.gold,
  },
  tile: {
    borderRadius: artDeco.radius.none,
  },
  emptyTile: {
    backgroundColor: artDeco.color.surface2,
  },
  resultText: {
    color: artDeco.color.ink,
  },
});
