import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useGameScores } from '../../hooks/useGameScores';
import { supabase } from '../../lib/supabase';
import { artDeco } from '../../theme/artDecoTokens';
import { useAppTheme } from '../../theme/ThemeContext';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

const COLORS = [
  { name: 'Merah', hex: '#EF4444' },
  { name: 'Biru', hex: '#3B82F6' },
  { name: 'Hijau', hex: '#22C55E' },
  { name: 'Kuning', hex: '#EAB308' },
  { name: 'Ungu', hex: '#A855F7' },
  { name: 'Oranye', hex: '#F97316' },
];

const ROUND_MS = 2500;

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function newRound() {
  const options = shuffle(COLORS).slice(0, 4);
  const target = options[Math.floor(Math.random() * options.length)];
  return { options, target };
}

export function ColorMatchGame({ coupleId }: { coupleId?: string | null }) {
  const { isArtDeco } = useAppTheme();
  const [round, setRound] = useState(newRound);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const { recordScore } = useGameScores(coupleId, 'colormatch');

  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => {
      setRunning(false);
      setGameOver(true);
    }, ROUND_MS);
    return () => clearTimeout(id);
  }, [running, round]);

  useEffect(() => {
    if (gameOver && !recorded) {
      setRecorded(true);
      supabase.auth.getUser().then(({ data }) => {
        recordScore({ userId: data.user?.id ?? null, score });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  function pick(hex: string) {
    if (!running) return;
    if (hex === round.target.hex) {
      setScore((s) => s + 1);
      setRound(newRound());
    } else {
      setRunning(false);
      setGameOver(true);
    }
  }

  function start() {
    setRound(newRound());
    setScore(0);
    setGameOver(false);
    setRecorded(false);
    setRunning(true);
  }

  return (
    <GameCard>
      <View style={styles.headerRow}>
        <Text style={[styles.muted, isArtDeco && deco.muted]}>Cepat! Ketuk warna yang sesuai nama</Text>
        <Text style={[styles.score, isArtDeco && deco.score]}>{score}</Text>
      </View>

      {running ? (
        <>
          <Text style={[styles.targetName, isArtDeco && deco.targetName]}>{round.target.name}</Text>
          <View style={styles.grid}>
            {round.options.map((c) => (
              // Gameplay data -- the swatch colors being matched/guessed are not theme
              // chrome, so they stay literal in both themes.
              <Pressable
                key={c.hex}
                onPress={() => pick(c.hex)}
                style={[styles.swatch, { backgroundColor: c.hex }, isArtDeco && deco.swatch]}
              />
            ))}
          </View>
        </>
      ) : (
        <View style={styles.center}>
          {gameOver && <Text style={[styles.resultText, isArtDeco && deco.resultText]}>Salah! Skor akhir {score}</Text>}
          <GameButton onPress={start}>{gameOver ? 'Main Lagi' : 'Mulai'}</GameButton>
        </View>
      )}
    </GameCard>
  );
}

const SWATCH_SIZE = 100;

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
  targetName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: 20,
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
    fontFamily: artDeco.font.serifBold,
  },
  targetName: {
    color: artDeco.color.ink,
    fontFamily: artDeco.font.display,
  },
  // Shape only -- the swatch's fill color is gameplay data and stays literal;
  // this just matches Art Deco's sharp-cornered, no-rounding motif.
  swatch: {
    borderRadius: artDeco.radius.none,
  },
  resultText: {
    color: artDeco.color.ruby,
    fontFamily: artDeco.font.serifBold,
    letterSpacing: artDeco.letterSpacingWide,
  },
});
