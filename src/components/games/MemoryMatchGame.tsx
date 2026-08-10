import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { supabase } from '../../lib/supabase';
import { useGameScores } from '../../hooks/useGameScores';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

const SYMBOLS = ['💗', '🌸', '🎈', '🍫', '🎬', '🎵', '🌙', '⭐'];

interface CardState {
  id: number;
  symbol: string;
  matched: boolean;
}

function shuffledDeck(): CardState[] {
  const deck = [...SYMBOLS, ...SYMBOLS]
    .map((symbol, i) => ({ id: i, symbol, matched: false }))
    .sort(() => Math.random() - 0.5);
  return deck.map((card, i) => ({ ...card, id: i }));
}

export function MemoryMatchGame({ coupleId }: { coupleId?: string | null }) {
  const [deck, setDeck] = useState<CardState[]>(shuffledDeck);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const { recordScore } = useGameScores(coupleId, 'memory');

  const won = deck.every((c) => c.matched);

  useEffect(() => {
    if (!started || won) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [started, won]);

  useEffect(() => {
    if (flipped.length !== 2) return;
    const [a, b] = flipped;
    const isMatch = deck[a].symbol === deck[b].symbol;
    const timeout = setTimeout(
      () => {
        if (isMatch) {
          setDeck((d) => d.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c)));
        }
        setFlipped([]);
      },
      isMatch ? 400 : 800
    );
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped]);

  useEffect(() => {
    if (won && !recorded) {
      setRecorded(true);
      supabase.auth.getUser().then(({ data }) => {
        recordScore({ userId: data.user?.id ?? null, score: moves });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  function handleFlip(index: number) {
    if (flipped.length === 2 || flipped.includes(index) || deck[index].matched) return;
    if (!started) setStarted(true);
    const next = [...flipped, index];
    setFlipped(next);
    if (next.length === 2) setMoves((m) => m + 1);
  }

  function reset() {
    setDeck(shuffledDeck());
    setFlipped([]);
    setMoves(0);
    setSeconds(0);
    setStarted(false);
    setRecorded(false);
  }

  return (
    <GameCard>
      <View style={styles.statsRow}>
        <Text style={styles.muted}>Langkah: {moves}</Text>
        <Text style={styles.muted}>Waktu: {seconds}s</Text>
      </View>

      <View style={styles.grid}>
        {deck.map((card, i) => {
          const isFaceUp = card.matched || flipped.includes(i);
          return (
            <Pressable
              key={card.id}
              onPress={() => handleFlip(i)}
              disabled={isFaceUp}
              style={[styles.tile, isFaceUp && styles.tileFaceUp]}
            >
              <Text style={styles.tileSymbol}>{isFaceUp ? card.symbol : ''}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.center}>
        {won && <Text style={styles.resultText}>Selesai dalam {moves} langkah, {seconds} detik! 🎉</Text>}
        <GameButton variant="secondary" onPress={reset}>
          {won ? 'Main Lagi' : 'Acak Ulang'}
        </GameButton>
      </View>
    </GameCard>
  );
}

const TILE_SIZE = 68;

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  muted: {
    fontSize: 13,
    color: '#999',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fdeef4',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileFaceUp: {
    backgroundColor: '#fdeef4',
  },
  tileSymbol: {
    fontSize: 26,
  },
  center: {
    alignItems: 'center',
    gap: 8,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
});
