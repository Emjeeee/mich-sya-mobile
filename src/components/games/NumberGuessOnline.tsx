import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useGameScores } from '../../hooks/useGameScores';
import { useOnlineGameSession } from '../../hooks/useOnlineGameSession';
import { artDeco } from '../../theme/artDecoTokens';
import { useAppTheme } from '../../theme/ThemeContext';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

interface NumberGuessState {
  secret: number;
  guesses: { value: number; hint: string }[];
}

export function NumberGuessOnline({ coupleId }: { coupleId?: string | null }) {
  const { isArtDeco } = useAppTheme();
  const { data: session, isLoading, userId, startGame, joinGame, updateSession } = useOnlineGameSession(
    coupleId,
    'numberguess',
    { secret: 0, guesses: [] }
  );
  const { recordScore } = useGameScores(coupleId, 'numberguess');
  const [secretInput, setSecretInput] = useState('');
  const [guess, setGuess] = useState('');
  const [starting, setStarting] = useState(false);
  const [joining, setJoining] = useState(false);

  if (isLoading) {
    return (
      <GameCard>
        <Text style={[styles.muted, isArtDeco && deco.muted]}>Memuat...</Text>
      </GameCard>
    );
  }

  const noActiveGame = !session || session.status === 'finished';

  const handleStart = async () => {
    if (!secretInput.trim()) return;
    setStarting(true);
    await startGame({ secret: Number(secretInput), guesses: [] });
    setSecretInput('');
    setStarting(false);
  };

  if (noActiveGame) {
    return (
      <GameCard>
        {session?.status === 'finished' && (
          <Text style={[styles.text, isArtDeco && deco.text]}>
            Angka terakhir: <Text style={[styles.bold, isArtDeco && deco.bold]}>{(session.state as NumberGuessState).secret}</Text>
          </Text>
        )}
        <Text style={[styles.muted, isArtDeco && deco.muted]}>Kamu tentukan angkanya — pasanganmu yang menebak.</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, isArtDeco && deco.input]}
            keyboardType="number-pad"
            value={secretInput}
            onChangeText={setSecretInput}
            placeholder="1-100"
            placeholderTextColor={isArtDeco ? artDeco.color.faint : '#767676'}
          />
          <GameButton onPress={handleStart} disabled={!secretInput.trim()} loading={starting}>
            Mulai
          </GameButton>
        </View>
      </GameCard>
    );
  }

  const isPlayerX = session.player_x === userId;
  const waitingForPartner = !session.player_o && !isPlayerX;
  const waitingForOpponentToJoin = !session.player_o && isPlayerX;

  const handleJoin = async () => {
    setJoining(true);
    await joinGame(session.id);
    setJoining(false);
  };

  if (waitingForPartner) {
    return (
      <GameCard>
        <Text style={[styles.text, isArtDeco && deco.text]}>Pasangan menyiapkan angka rahasia. Gabung buat nebak!</Text>
        <GameButton onPress={handleJoin} loading={joining}>
          Gabung sebagai Penebak
        </GameButton>
      </GameCard>
    );
  }
  if (waitingForOpponentToJoin) {
    return (
      <GameCard>
        <Text style={[styles.muted, isArtDeco && deco.muted]}>Menunggu pasangan bergabung sebagai penebak...</Text>
      </GameCard>
    );
  }

  // player_x set the secret, player_o guesses.
  const state = session.state as NumberGuessState;
  const isGuesser = !isPlayerX;
  const won = state.guesses.some((g) => g.value === state.secret);

  async function handleGuess() {
    if (!session || !isGuesser || won) return;
    const value = Number(guess);
    if (!value || value < 1 || value > 100) return;
    let hint = 'Benar! 🎉';
    if (value < state.secret) hint = 'Terlalu kecil';
    else if (value > state.secret) hint = 'Terlalu besar';
    const nextGuesses = [{ value, hint }, ...state.guesses];
    setGuess('');
    const nextWon = value === state.secret;
    await updateSession({
      id: session.id,
      state: { ...state, guesses: nextGuesses },
      turn: null,
      winner: nextWon ? 'o' : null,
      status: nextWon ? 'finished' : 'active',
    });
    if (nextWon) {
      await recordScore({ userId, score: nextGuesses.length });
    }
  }

  return (
    <GameCard>
      <Text style={[styles.muted, isArtDeco && deco.muted]}>
        {isGuesser ? 'Tebak angka 1-100 yang pasangan pikirkan' : 'Pasangan sedang menebak angkamu'}
      </Text>

      {won ? (
        <Text style={[styles.resultText, isArtDeco && deco.resultText]}>
          {isGuesser
            ? `Kamu berhasil dalam ${state.guesses.length} tebakan! 🎉`
            : `Pasangan berhasil menebak dalam ${state.guesses.length} tebakan!`}
        </Text>
      ) : (
        isGuesser && (
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
        )
      )}

      {state.guesses.length > 0 && (
        <ScrollView style={styles.history}>
          {state.guesses.map((g, i) => (
            <View key={i} style={styles.historyRow}>
              <Text style={[styles.historyValue, isArtDeco && deco.historyValue]}>{g.value}</Text>
              <Text style={[styles.historyHint, isArtDeco && deco.historyHint]}>{g.hint}</Text>
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
  text: {
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
  },
  bold: {
    fontWeight: '700',
  },
  resultText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
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
  text: {
    color: artDeco.color.ink,
    fontFamily: artDeco.font.serifBold,
  },
  bold: {
    color: artDeco.color.gold,
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
