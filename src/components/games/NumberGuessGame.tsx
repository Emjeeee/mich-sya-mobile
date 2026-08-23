import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useGameScores } from '../../hooks/useGameScores';
import { supabase } from '../../lib/supabase';
import { artDeco } from '../../theme/artDecoTokens';
import { useAppTheme } from '../../theme/ThemeContext';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

function randomSecret() {
  return Math.floor(Math.random() * 100) + 1;
}

export function NumberGuessGame({ coupleId }: { coupleId?: string | null }) {
  const { isArtDeco } = useAppTheme();
  const [secret, setSecret] = useState(randomSecret);
  const [guess, setGuess] = useState('');
  const [history, setHistory] = useState<{ value: number; hint: string }[]>([]);
  const [won, setWon] = useState(false);
  const { recordScore } = useGameScores(coupleId, 'numberguess');

  async function handleGuess() {
    const value = Number(guess);
    if (!value || value < 1 || value > 100 || won) return;
    let hint = 'Benar! 🎉';
    if (value < secret) hint = 'Terlalu kecil';
    else if (value > secret) hint = 'Terlalu besar';
    const nextHistory = [{ value, hint }, ...history];
    setHistory(nextHistory);
    setGuess('');
    if (value === secret) {
      setWon(true);
      const { data } = await supabase.auth.getUser();
      await recordScore({ userId: data.user?.id ?? null, score: nextHistory.length });
    }
  }

  function reset() {
    setSecret(randomSecret());
    setHistory([]);
    setGuess('');
    setWon(false);
  }

  return (
    <GameCard>
      <Text style={[styles.muted, isArtDeco && deco.muted]}>Tebak angka 1-100 yang aku pikirkan, sesedikit mungkin coba.</Text>

      {won ? (
        <View style={styles.center}>
          <Text style={[styles.resultText, isArtDeco && deco.resultText]}>Berhasil dalam {history.length} tebakan! 🎉</Text>
          <GameButton onPress={reset}>Main Lagi</GameButton>
        </View>
      ) : (
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, isArtDeco && deco.input]}
            keyboardType="number-pad"
            value={guess}
            onChangeText={setGuess}
            placeholder="1-100"
            placeholderTextColor={isArtDeco ? artDeco.color.faint : '#767676'}
          />
          <GameButton onPress={handleGuess}>Tebak</GameButton>
        </View>
      )}

      {history.length > 0 && (
        <ScrollView style={styles.history}>
          {history.map((h, i) => (
            <View key={i} style={styles.historyRow}>
              <Text style={[styles.historyValue, isArtDeco && deco.historyValue]}>{h.value}</Text>
              <Text style={[styles.historyHint, isArtDeco && deco.historyHint]}>{h.hint}</Text>
            </View>
          ))}
        </ScrollView>
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
  center: {
    alignItems: 'center',
    gap: 8,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  history: {
    maxHeight: 128,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  historyValue: {
    fontSize: 13,
    color: '#333',
  },
  historyHint: {
    fontSize: 13,
    color: '#767676',
  },
});

const deco = StyleSheet.create({
  muted: {
    color: artDeco.color.muted,
  },
  resultText: {
    color: artDeco.color.gold,
    fontFamily: artDeco.font.serifBold,
    letterSpacing: artDeco.letterSpacingWide,
  },
  input: {
    borderRadius: artDeco.radius.none,
    borderColor: artDeco.color.line,
    backgroundColor: artDeco.color.surface,
    color: artDeco.color.ink,
  },
  historyValue: {
    color: artDeco.color.ink,
  },
  historyHint: {
    color: artDeco.color.muted,
  },
});
