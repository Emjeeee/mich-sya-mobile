import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TRUTH_OR_DARE, type TruthOrDare } from '../../lib/games/wordBanks';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

function pick(type: 'truth' | 'dare', exclude?: TruthOrDare): TruthOrDare {
  const pool = TRUTH_OR_DARE.filter((p) => p.type === type && p !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function TruthOrDareGame() {
  const [current, setCurrent] = useState<TruthOrDare | null>(null);

  return (
    <GameCard>
      <Text style={styles.muted}>Pilih Truth atau Dare, gantian sama pasanganmu</Text>

      <View style={styles.buttonRow}>
        <GameButton onPress={() => setCurrent(pick('truth', current ?? undefined))}>🤔 Truth</GameButton>
        <GameButton variant="secondary" onPress={() => setCurrent(pick('dare', current ?? undefined))}>
          🔥 Dare
        </GameButton>
      </View>

      {current && (
        <View style={styles.promptBox}>
          <Text style={styles.promptLabel}>{current.type === 'truth' ? 'Truth' : 'Dare'}</Text>
          <Text style={styles.promptText}>{current.text}</Text>
        </View>
      )}
    </GameCard>
  );
}

const styles = StyleSheet.create({
  muted: {
    fontSize: 13,
    color: '#767676',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  promptBox: {
    backgroundColor: '#fdeef4',
    borderRadius: 12,
    padding: 16,
  },
  promptLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e11d74',
    textTransform: 'uppercase',
    marginBottom: 4,
    textAlign: 'center',
  },
  promptText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
});
