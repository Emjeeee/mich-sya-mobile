import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ALPHABET, isWordGuessed, maskWord, MAX_WRONG, wrongGuessCount } from '../../lib/games/hangman';
import { WORD_BANK } from '../../lib/games/wordBanks';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

function randomWord() {
  return WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
}

export function HangmanLocal() {
  const [word, setWord] = useState(randomWord);
  const [guessed, setGuessed] = useState<string[]>([]);

  const wrong = wrongGuessCount(word, guessed);
  const won = isWordGuessed(word, guessed);
  const lost = wrong >= MAX_WRONG;

  function guess(letter: string) {
    if (won || lost || guessed.includes(letter)) return;
    setGuessed((g) => [...g, letter]);
  }

  function reset() {
    setWord(randomWord());
    setGuessed([]);
  }

  return (
    <GameCard>
      <Text style={styles.muted}>Main bareng, tebak kata ini sama-sama</Text>
      <Text style={styles.hint}>Kesempatan salah: {MAX_WRONG - wrong} tersisa</Text>

      <Text style={styles.wordDisplay}>{won || lost ? word : maskWord(word, guessed)}</Text>

      {(won || lost) && (
        <Text style={styles.resultText}>{won ? 'Berhasil! 🎉' : `Kalah — kata tadi "${word}"`}</Text>
      )}

      <View style={styles.grid}>
        {ALPHABET.map((letter) => {
          const used = guessed.includes(letter);
          const isHit = used && word.includes(letter);
          return (
            <Pressable
              key={letter}
              onPress={() => guess(letter)}
              disabled={used || won || lost}
              style={[styles.letter, isHit && styles.letterHit, used && !isHit && styles.letterMiss]}
            >
              <Text style={[styles.letterText, isHit && styles.letterHitText, used && !isHit && styles.letterMissText]}>
                {letter}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {(won || lost) && (
        <GameButton onPress={reset}>Main Lagi</GameButton>
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
