import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MOVES, roundWinner, type Move } from '../../lib/games/rps';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

type Phase = 'p1turn' | 'handoff' | 'p2turn' | 'reveal';

export function RockPaperScissorsLocal() {
  const [phase, setPhase] = useState<Phase>('p1turn');
  const [p1Move, setP1Move] = useState<Move | null>(null);
  const [p2Move, setP2Move] = useState<Move | null>(null);
  const [wins, setWins] = useState({ p1: 0, p2: 0 });

  const matchWinner = wins.p1 >= 3 ? 'Pemain 1' : wins.p2 >= 3 ? 'Pemain 2' : null;

  function pickP1(move: Move) {
    setP1Move(move);
    setPhase('handoff');
  }

  function pickP2(move: Move) {
    setP2Move(move);
    setPhase('reveal');
    const outcome = roundWinner(p1Move!, move);
    if (outcome === 'a') setWins((w) => ({ ...w, p1: w.p1 + 1 }));
    else if (outcome === 'b') setWins((w) => ({ ...w, p2: w.p2 + 1 }));
  }

  function nextRound() {
    setP1Move(null);
    setP2Move(null);
    setPhase('p1turn');
  }

  function resetMatch() {
    setWins({ p1: 0, p2: 0 });
    nextRound();
  }

  const outcome = p1Move && p2Move ? roundWinner(p1Move, p2Move) : null;

  return (
    <GameCard>
      <View style={styles.scoreRow}>
        <Text style={styles.scoreText}>Pemain 1: {wins.p1}</Text>
        <Text style={styles.scoreText}>Pemain 2: {wins.p2}</Text>
      </View>

      {matchWinner ? (
        <View style={styles.center}>
          <Text style={styles.resultText}>{matchWinner} menang pertandingan! 🎉</Text>
          <GameButton onPress={resetMatch}>Main Lagi</GameButton>
        </View>
      ) : phase === 'p1turn' ? (
        <View style={styles.center}>
          <Text style={styles.promptText}>Pemain 1, pilih diam-diam</Text>
          <View style={styles.moveRow}>
            {MOVES.map((m) => (
              <Pressable key={m.key} onPress={() => pickP1(m.key)} style={styles.moveButton}>
                <Text style={styles.moveEmoji}>{m.emoji}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : phase === 'handoff' ? (
        <View style={styles.center}>
          <Text style={styles.muted}>Serahkan HP ke Pemain 2</Text>
          <GameButton onPress={() => setPhase('p2turn')}>Lanjut</GameButton>
        </View>
      ) : phase === 'p2turn' ? (
        <View style={styles.center}>
          <Text style={styles.promptText}>Pemain 2, pilih diam-diam</Text>
          <View style={styles.moveRow}>
            {MOVES.map((m) => (
              <Pressable key={m.key} onPress={() => pickP2(m.key)} style={styles.moveButton}>
                <Text style={styles.moveEmoji}>{m.emoji}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.center}>
          <View style={styles.vsRow}>
            <Text style={styles.vsEmoji}>{MOVES.find((m) => m.key === p1Move)?.emoji}</Text>
            <Text style={styles.muted}>vs</Text>
            <Text style={styles.vsEmoji}>{MOVES.find((m) => m.key === p2Move)?.emoji}</Text>
          </View>
          <Text style={styles.resultText}>
            {outcome === 'draw' ? 'Seri!' : outcome === 'a' ? 'Pemain 1 menang ronde ini' : 'Pemain 2 menang ronde ini'}
          </Text>
          <GameButton variant="secondary" onPress={nextRound}>
            Ronde Berikutnya
          </GameButton>
        </View>
      )}
    </GameCard>
  );
}

const styles = StyleSheet.create({
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  scoreText: {
    fontSize: 13,
    color: '#767676',
  },
  center: {
    alignItems: 'center',
    gap: 12,
  },
  promptText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  muted: {
    fontSize: 13,
    color: '#767676',
  },
  moveRow: {
    flexDirection: 'row',
    gap: 12,
  },
  moveButton: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#fdeef4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveEmoji: {
    fontSize: 28,
  },
  vsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  vsEmoji: {
    fontSize: 40,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
});
