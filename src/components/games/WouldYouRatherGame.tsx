import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WOULD_YOU_RATHER } from '../../lib/games/wordBanks';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

function pickPair(excludeIndex?: number) {
  let index: number;
  do {
    index = Math.floor(Math.random() * WOULD_YOU_RATHER.length);
  } while (index === excludeIndex && WOULD_YOU_RATHER.length > 1);
  return index;
}

export function WouldYouRatherGame() {
  const [index, setIndex] = useState(() => pickPair());
  const [picked, setPicked] = useState<{ you: 'A' | 'B' | null; partner: 'A' | 'B' | null }>({
    you: null,
    partner: null,
  });
  const pair = WOULD_YOU_RATHER[index];

  function next() {
    setIndex((i) => pickPair(i));
    setPicked({ you: null, partner: null });
  }

  return (
    <GameCard>
      <Text style={styles.muted}>Pilih duluan diam-diam, terus bareng-bareng buka pilihan</Text>

      <View style={styles.optionsGrid}>
        {(['A', 'B'] as const).map((opt) => (
          <View key={opt} style={styles.optionBlock}>
            <Text style={styles.optionText}>{opt === 'A' ? pair.optionA : pair.optionB}</Text>
            <View style={styles.pickRow}>
              <Pressable
                onPress={() => setPicked((p) => ({ ...p, you: opt }))}
                style={[styles.pickButton, picked.you === opt && styles.pickButtonYou]}
              >
                <Text style={[styles.pickButtonText, picked.you === opt && styles.pickButtonTextActive]}>
                  Pilihanku
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setPicked((p) => ({ ...p, partner: opt }))}
                style={[styles.pickButton, picked.partner === opt && styles.pickButtonPartner]}
              >
                <Text style={[styles.pickButtonText, picked.partner === opt && styles.pickButtonTextActive]}>
                  Pilihan Pasangan
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      {picked.you && picked.partner && (
        <Text style={styles.matchText}>
          {picked.you === picked.partner ? 'Sama! Cocok banget 💗' : 'Beda pilihan — seru buat didiskusiin!'}
        </Text>
      )}

      <GameButton variant="secondary" onPress={next}>
        Pertanyaan Berikutnya
      </GameButton>
    </GameCard>
  );
}

const styles = StyleSheet.create({
  muted: {
    fontSize: 13,
    color: '#767676',
    textAlign: 'center',
  },
  optionsGrid: {
    gap: 12,
  },
  optionBlock: {
    gap: 8,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  pickRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  pickButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fdeef4',
  },
  pickButtonYou: {
    backgroundColor: '#e11d74',
  },
  pickButtonPartner: {
    backgroundColor: '#3b82f6',
  },
  pickButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  pickButtonTextActive: {
    color: '#fff',
  },
  matchText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
});
