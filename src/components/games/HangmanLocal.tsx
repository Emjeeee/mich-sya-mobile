import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ALPHABET, isWordGuessed, maskWord, MAX_WRONG, wrongGuessCount } from '../../lib/games/hangman';
import { WORD_BANK } from '../../lib/games/wordBanks';
import { artDeco } from '../../theme/artDecoTokens';
import { useAppTheme } from '../../theme/ThemeContext';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

function randomWord() {
  return WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
}

export function HangmanLocal() {
  const { isArtDeco } = useAppTheme();
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
    <GameCard style={isArtDeco && deco.card}>
      <Text style={[styles.muted, isArtDeco && deco.muted]}>Main bareng, tebak kata ini sama-sama</Text>
      <Text style={[styles.hint, isArtDeco && deco.hint]}>Kesempatan salah: {MAX_WRONG - wrong} tersisa</Text>

      <Text style={[styles.wordDisplay, isArtDeco && deco.wordDisplay]}>{won || lost ? word : maskWord(word, guessed)}</Text>

      {(won || lost) && (
        <Text
          style={[
            styles.resultText,
            isArtDeco && (won ? deco.resultWon : deco.resultLost),
          ]}
        >
          {won ? 'Berhasil! 🎉' : `Kalah — kata tadi "${word}"`}
        </Text>
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
