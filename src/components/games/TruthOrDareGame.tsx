import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TRUTH_OR_DARE, type TruthOrDare } from '../../lib/games/wordBanks';
import { artDeco } from '../../theme/artDecoTokens';
import { useAppTheme } from '../../theme/ThemeContext';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

function pick(type: 'truth' | 'dare', exclude?: TruthOrDare): TruthOrDare {
  const pool = TRUTH_OR_DARE.filter((p) => p.type === type && p !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function TruthOrDareGame() {
  const { isArtDeco } = useAppTheme();
  const [current, setCurrent] = useState<TruthOrDare | null>(null);

  return (
    <GameCard style={isArtDeco && deco.card}>
      <Text style={[styles.muted, isArtDeco && deco.muted]}>Pilih Truth atau Dare, gantian sama pasanganmu</Text>

      <View style={styles.buttonRow}>
        <GameButton onPress={() => setCurrent(pick('truth', current ?? undefined))}>🤔 Truth</GameButton>
        <GameButton variant="secondary" onPress={() => setCurrent(pick('dare', current ?? undefined))}>
          🔥 Dare
        </GameButton>
      </View>

      {current && (
        <View style={[styles.promptBox, isArtDeco && deco.promptBox]}>
          <Text style={[styles.promptLabel, isArtDeco && deco.promptLabel]}>{current.type === 'truth' ? 'Truth' : 'Dare'}</Text>
          <Text style={[styles.promptText, isArtDeco && deco.promptText]}>{current.text}</Text>
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
  promptBox: {
    backgroundColor: artDeco.color.surface2,
    borderRadius: artDeco.radius.none,
    borderWidth: 1,
    borderColor: artDeco.color.line,
  },
  promptLabel: {
    color: artDeco.color.gold,
    letterSpacing: artDeco.letterSpacingEyebrow,
  },
  promptText: {
    color: artDeco.color.ink,
    fontFamily: artDeco.font.serifRegular,
  },
});
