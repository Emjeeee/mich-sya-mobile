import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useGameScores } from '../../hooks/useGameScores';
import { useOnlineGameSession } from '../../hooks/useOnlineGameSession';
import { ALPHABET, isWordGuessed, maskWord, MAX_WRONG, wrongGuessCount } from '../../lib/games/hangman';
import { artDeco } from '../../theme/artDecoTokens';
import { useAppTheme } from '../../theme/ThemeContext';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

interface HangmanState {
  word: string;
  guessed: string[];
}

export function HangmanOnline({ coupleId }: { coupleId?: string | null }) {
  const { isArtDeco } = useAppTheme();
  const { data: session, isLoading, userId, startGame, joinGame, updateSession } = useOnlineGameSession(
    coupleId,
    'hangman',
    { word: '', guessed: [] }
  );
  const { recordScore } = useGameScores(coupleId, 'hangman');
  const [wordInput, setWordInput] = useState('');
  const [starting, setStarting] = useState(false);
  const [joining, setJoining] = useState(false);

  if (isLoading) {
    return (
      <GameCard style={isArtDeco && deco.card}>
        <Text style={[styles.muted, isArtDeco && deco.muted]}>Memuat...</Text>
      </GameCard>
    );
  }

  const noActiveGame = !session || session.status === 'finished';

  const handleStart = async () => {
    if (!wordInput.trim()) return;
    setStarting(true);
    await startGame({ word: wordInput.trim().toUpperCase(), guessed: [] });
    setWordInput('');
    setStarting(false);
  };

  if (noActiveGame) {
    return (
      <GameCard style={isArtDeco && deco.card}>
        {session?.status === 'finished' && (
          <Text style={[styles.text, isArtDeco && deco.text]}>
            Kata terakhir: <Text style={[styles.bold, isArtDeco && deco.text]}>{(session.state as HangmanState).word}</Text>
          </Text>
        )}
        <Text style={[styles.muted, isArtDeco && deco.muted]}>Kamu jadi penentu kata — pasanganmu yang menebak.</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, isArtDeco && deco.input]}
            value={wordInput}
            onChangeText={setWordInput}
            placeholder="Ketik kata rahasia"
            placeholderTextColor={isArtDeco ? artDeco.color.faint : '#767676'}
            autoCapitalize="characters"
          />
          <GameButton onPress={handleStart} disabled={!wordInput.trim()} loading={starting}>
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
      <GameCard style={isArtDeco && deco.card}>
        <Text style={[styles.text, isArtDeco && deco.text]}>Pasangan menyiapkan kata rahasia. Gabung buat nebak!</Text>
        <GameButton onPress={handleJoin} loading={joining}>
          Gabung sebagai Penebak
        </GameButton>
      </GameCard>
    );
  }
  if (waitingForOpponentToJoin) {
    return (
      <GameCard style={isArtDeco && deco.card}>
        <Text style={[styles.muted, isArtDeco && deco.muted]}>Menunggu pasangan bergabung sebagai penebak...</Text>
      </GameCard>
    );
  }

  // player_x set the word (setter), player_o guesses.
  const state = session.state as HangmanState;
  const isGuesser = !isPlayerX;
  const wrong = wrongGuessCount(state.word, state.guessed);
  const won = isWordGuessed(state.word, state.guessed);
  const lost = wrong >= MAX_WRONG;

  async function guess(letter: string) {
    if (!session || !isGuesser || won || lost || state.guessed.includes(letter)) return;
    const nextGuessed = [...state.guessed, letter];
    const nextWrong = wrongGuessCount(state.word, nextGuessed);
    const nextWon = isWordGuessed(state.word, nextGuessed);
    const nextLost = nextWrong >= MAX_WRONG;
    const finished = nextWon || nextLost;

    await updateSession({
      id: session.id,
      state: { ...state, guessed: nextGuessed },
      turn: null,
      winner: finished ? (nextWon ? 'o' : 'x') : null,
      status: finished ? 'finished' : 'active',
    });
    if (finished) {
      await recordScore({ winnerUserId: nextWon ? session.player_o : session.player_x });
    }
  }

  const wonOrLostDecoStyle = won ? deco.resultWon : lost ? deco.resultLost : undefined;

  return (
    <GameCard style={isArtDeco && deco.card}>
      <Text style={[styles.muted, isArtDeco && deco.muted]}>
        {isGuesser ? 'Tebak kata dari pasanganmu' : 'Pasangan sedang menebak kata darimu'}
      </Text>
      <Text style={[styles.hint, isArtDeco && deco.hint]}>Kesempatan salah: {MAX_WRONG - wrong} tersisa</Text>

      <Text style={[styles.wordDisplay, isArtDeco && deco.wordDisplay]}>
        {won || lost ? state.word : maskWord(state.word, state.guessed)}
      </Text>

      {(won || lost) && (
        <Text style={[styles.resultText, isArtDeco && wonOrLostDecoStyle]}>
          {won
            ? isGuesser
              ? 'Kamu berhasil menebak! 🎉'
              : 'Pasangan berhasil menebak!'
            : isGuesser
              ? `Kalah — kata tadi "${state.word}"`
              : 'Kamu menang — pasangan kehabisan kesempatan!'}
        </Text>
      )}

      {isGuesser && !won && !lost && (
        <View style={styles.grid}>
          {ALPHABET.map((letter) => {
            const used = state.guessed.includes(letter);
            const isHit = used && state.word.includes(letter);
            return (
              <Pressable
                key={letter}
                onPress={() => guess(letter)}
                disabled={used}
                style={[
                  styles.letter,
                  isArtDeco && deco.letter,
                  isHit && styles.letterHit,
                  isArtDeco && isHit && deco.letterHit,
                  used && !isHit && styles.letterMiss,
                  isArtDeco && used && !isHit && deco.letterMiss,
                ]}
              >
                <Text
                  style={[
                    styles.letterText,
                    isArtDeco && deco.letterText,
                    isHit && styles.letterHitText,
                    isArtDeco && isHit && deco.letterHitText,
                    used && !isHit && styles.letterMissText,
                    isArtDeco && used && !isHit && deco.letterMissText,
                  ]}
                >
                  {letter}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </GameCard>
  );
}

const LETTER_SIZE = 32;

const styles = StyleSheet.create({
  muted: {
    fontSize: 13,
    color: '#767676',
    textAlign: 'center',
  },
  hint: {
    fontSize: 11,
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
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
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
  wordDisplay: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    letterSpacing: 4,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  letter: {
    width: LETTER_SIZE,
    height: LETTER_SIZE,
    borderRadius: 6,
    backgroundColor: '#fdeef4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterHit: {
    backgroundColor: '#dcfce7',
  },
  letterMiss: {
    backgroundColor: '#fee2e2',
  },
  letterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },
  letterHitText: {
    color: '#16a34a',
  },
  letterMissText: {
    color: '#f87171',
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
  hint: {
    color: artDeco.color.faint,
  },
  text: {
    color: artDeco.color.ink,
  },
  input: {
    borderColor: artDeco.color.line,
    borderRadius: artDeco.radius.none,
    backgroundColor: artDeco.color.surface2,
    color: artDeco.color.ink,
  },
  wordDisplay: {
    color: artDeco.color.gold,
    fontFamily: artDeco.font.serifBold,
  },
  resultWon: {
    color: artDeco.color.go,
  },
  resultLost: {
    color: artDeco.color.ruby,
  },
  letter: {
    borderRadius: artDeco.radius.none,
    backgroundColor: artDeco.color.surface2,
    borderWidth: 1,
    borderColor: artDeco.color.lineSoft,
  },
  letterHit: {
    borderColor: artDeco.color.go,
  },
  letterMiss: {
    borderColor: artDeco.color.ruby,
  },
  letterText: {
    color: artDeco.color.ink,
  },
  letterHitText: {
    color: artDeco.color.go,
  },
  letterMissText: {
    color: artDeco.color.ruby,
  },
});
