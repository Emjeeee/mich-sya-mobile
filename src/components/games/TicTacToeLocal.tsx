import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { checkWinner, EMPTY_BOARD, type Cell } from '../../lib/tictactoe';
import { artDeco } from '../../theme/artDecoTokens';
import { useAppTheme } from '../../theme/ThemeContext';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';
import { TicTacToeBoard } from './TicTacToeBoard';

export function TicTacToeLocal() {
  const { isArtDeco } = useAppTheme();
  const [board, setBoard] = useState<Cell[]>(EMPTY_BOARD);
  const [turn, setTurn] = useState<'x' | 'o'>('x');
  const [scores, setScores] = useState({ x: 0, o: 0, draw: 0 });

  const result = checkWinner(board);

  function handleCellClick(index: number) {
    if (result || board[index] !== '') return;
    const next = [...board];
    next[index] = turn;
    setBoard(next);

    const nextResult = checkWinner(next);
    if (nextResult) {
      setScores((s) => ({ ...s, [nextResult]: s[nextResult] + 1 }));
    } else {
      setTurn(turn === 'x' ? 'o' : 'x');
    }
  }

  function reset() {
    setBoard(EMPTY_BOARD);
    setTurn('x');
  }

  return (
    <GameCard>
      <View style={styles.scoreRow}>
        <Text
          style={[
            styles.scoreText,
            isArtDeco && deco.scoreText,
            turn === 'x' && !result && styles.activeX,
            isArtDeco && turn === 'x' && !result && deco.activeX,
          ]}
        >
          ✕ Pemain 1: {scores.x}
        </Text>
        <Text style={[styles.drawText, isArtDeco && deco.drawText]}>Seri: {scores.draw}</Text>
        <Text
          style={[
            styles.scoreText,
            isArtDeco && deco.scoreText,
            turn === 'o' && !result && styles.activeO,
            isArtDeco && turn === 'o' && !result && deco.activeO,
          ]}
        >
          ○ Pemain 2: {scores.o}
        </Text>
      </View>

      <TicTacToeBoard board={board} onCellClick={handleCellClick} disabled={!!result} />

      <View style={styles.footer}>
        {result ? (
          <Text style={[styles.resultText, isArtDeco && deco.resultText]}>
            {result === 'draw' ? 'Seri!' : `${result === 'x' ? 'Pemain 1 (✕)' : 'Pemain 2 (○)'} menang!`}
          </Text>
        ) : (
          <Text style={[styles.hintText, isArtDeco && deco.hintText]}>
            Giliran {turn === 'x' ? 'Pemain 1 (✕)' : 'Pemain 2 (○)'} — gantian pegang HP ya
          </Text>
        )}
        <GameButton variant="secondary" onPress={reset}>
          Main Lagi
        </GameButton>
      </View>
    </GameCard>
  );
}

const styles = StyleSheet.create({
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  scoreText: {
    fontSize: 13,
    color: '#767676',
  },
  drawText: {
    fontSize: 11,
    color: '#767676',
  },
  activeX: {
    fontWeight: '700',
    color: '#e11d74',
  },
  activeO: {
    fontWeight: '700',
    color: '#3b82f6',
  },
  footer: {
    alignItems: 'center',
    gap: 8,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  hintText: {
    fontSize: 13,
    color: '#767676',
  },
});

const deco = StyleSheet.create({
  scoreText: {
    color: artDeco.color.muted,
  },
  drawText: {
    color: artDeco.color.muted,
  },
  activeX: {
    color: artDeco.color.gold,
  },
  activeO: {
    color: artDeco.color.ruby,
  },
  resultText: {
    color: artDeco.color.ink,
    fontFamily: artDeco.font.serifBold,
  },
  hintText: {
    color: artDeco.color.muted,
  },
});
