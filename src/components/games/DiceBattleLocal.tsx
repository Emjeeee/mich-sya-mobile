import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DICE_FACES, rollDie, TARGET_SCORE } from '../../lib/games/dice';
import { artDeco } from '../../theme/artDecoTokens';
import { useAppTheme } from '../../theme/ThemeContext';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

export function DiceBattleLocal() {
  const { isArtDeco } = useAppTheme();
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [turn, setTurn] = useState<'p1' | 'p2'>('p1');
  const [lastRoll, setLastRoll] = useState<number | null>(null);

  const winner = scores.p1 >= TARGET_SCORE ? 'Pemain 1' : scores.p2 >= TARGET_SCORE ? 'Pemain 2' : null;

  function roll() {
    if (winner) return;
    const value = rollDie();
    setLastRoll(value);
    setScores((s) => ({ ...s, [turn]: s[turn] + value }));
    setTurn(turn === 'p1' ? 'p2' : 'p1');
  }

  function reset() {
    setScores({ p1: 0, p2: 0 });
    setTurn('p1');
    setLastRoll(null);
  }

  return (
    <GameCard>
      <Text style={[styles.muted, isArtDeco && deco.muted]}>Target skor {TARGET_SCORE} — gantian lempar dadu</Text>

      <View style={styles.row}>
        <View style={styles.scoreBlock}>
          <Text style={[styles.scoreValue, styles.p1Color, isArtDeco && deco.p1Color]}>{scores.p1}</Text>
          <Text style={[styles.scoreLabel, isArtDeco && deco.scoreLabel]}>Pemain 1</Text>
        </View>
        <Text style={[styles.diceFace, isArtDeco && deco.diceFace]}>{lastRoll ? DICE_FACES[lastRoll] : '🎲'}</Text>
        <View style={styles.scoreBlock}>
          <Text style={[styles.scoreValue, styles.p2Color, isArtDeco && deco.p2Color]}>{scores.p2}</Text>
          <Text style={[styles.scoreLabel, isArtDeco && deco.scoreLabel]}>Pemain 2</Text>
        </View>
      </View>

      {winner ? (
        <View style={styles.center}>
          <Text style={[styles.resultText, isArtDeco && deco.resultText]}>{winner} menang! 🎉</Text>
          <GameButton onPress={reset}>Main Lagi</GameButton>
        </View>
      ) : (
        <GameButton onPress={roll}>Giliran {turn === 'p1' ? 'Pemain 1' : 'Pemain 2'} — Lempar Dadu</GameButton>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  scoreBlock: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  p1Color: {
    color: '#e11d74',
  },
  p2Color: {
    color: '#3b82f6',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#767676',
  },
  diceFace: {
    fontSize: 40,
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
});

const deco = StyleSheet.create({
  muted: {
    color: artDeco.color.muted,
  },
  p1Color: {
    color: artDeco.color.gold,
  },
  p2Color: {
    color: artDeco.color.ruby,
  },
  scoreLabel: {
    color: artDeco.color.muted,
  },
  diceFace: {
    color: artDeco.color.gold,
    backgroundColor: artDeco.color.surface,
    borderWidth: 1.5,
    borderColor: artDeco.color.line,
    borderRadius: artDeco.radius.none,
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  resultText: {
    color: artDeco.color.ink,
    fontFamily: artDeco.font.serifBold,
  },
});
