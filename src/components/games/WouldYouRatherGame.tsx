import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WOULD_YOU_RATHER } from '../../lib/games/wordBanks';
import { artDeco } from '../../theme/artDecoTokens';
import { useAppTheme } from '../../theme/ThemeContext';
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
  const { isArtDeco } = useAppTheme();
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
    <GameCard style={isArtDeco && deco.card}>
      <Text style={[styles.muted, isArtDeco && deco.muted]}>Pilih duluan diam-diam, terus bareng-bareng buka pilihan</Text>

      <View style={styles.optionsGrid}>
        {(['A', 'B'] as const).map((opt) => (
          <View key={opt} style={styles.optionBlock}>
            <Text style={[styles.optionText, isArtDeco && deco.optionText]}>{opt === 'A' ? pair.optionA : pair.optionB}</Text>
            <View style={styles.pickRow}>
              <Pressable
                onPress={() => setPicked((p) => ({ ...p, you: opt }))}
                style={[
                  styles.pickButton,
                  isArtDeco && deco.pickButton,
                  picked.you === opt && styles.pickButtonYou,
                  isArtDeco && picked.you === opt && deco.pickButtonYou,
                ]}
              >
                <Text
                  style={[
                    styles.pickButtonText,
                    isArtDeco && deco.pickButtonText,
                    picked.you === opt && styles.pickButtonTextActive,
                    isArtDeco && picked.you === opt && deco.pickButtonYouTextActive,
                  ]}
                >
                  Pilihanku
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setPicked((p) => ({ ...p, partner: opt }))}
                style={[
                  styles.pickButton,
                  isArtDeco && deco.pickButton,
                  picked.partner === opt && styles.pickButtonPartner,
                  isArtDeco && picked.partner === opt && deco.pickButtonPartner,
                ]}
              >
                <Text
                  style={[
                    styles.pickButtonText,
                    isArtDeco && deco.pickButtonText,
                    picked.partner === opt && styles.pickButtonTextActive,
                    isArtDeco && picked.partner === opt && deco.pickButtonPartnerTextActive,
                  ]}
                >
                  Pilihan Pasangan
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      {picked.you && picked.partner && (
        <Text style={[styles.matchText, isArtDeco && deco.matchText]}>
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

const deco = StyleSheet.create({
  card: {
    backgroundColor: artDeco.color.surface,
    borderRadius: artDeco.radius.none,
    borderWidth: 1.5,
    borderColor: artDeco.color.line,
  },
  muted: {
    color: artDeco.color.muted,
  },
  optionText: {
    color: artDeco.color.ink,
    fontFamily: artDeco.font.serifRegular,
  },
  pickButton: {
    borderRadius: artDeco.radius.none,
    backgroundColor: artDeco.color.surface2,
    borderWidth: 1,
    borderColor: artDeco.color.lineSoft,
  },
  pickButtonYou: {
    backgroundColor: artDeco.color.gold,
    borderColor: artDeco.color.gold,
  },
  pickButtonPartner: {
    backgroundColor: artDeco.color.ruby,
    borderColor: artDeco.color.ruby,
  },
  pickButtonText: {
    color: artDeco.color.ink,
  },
  pickButtonYouTextActive: {
    color: artDeco.color.black,
  },
  pickButtonPartnerTextActive: {
    color: artDeco.color.white,
  },
  matchText: {
    color: artDeco.color.ink,
  },
});
