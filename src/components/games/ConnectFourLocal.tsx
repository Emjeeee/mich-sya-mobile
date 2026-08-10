import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { checkWinner, dropDisc, EMPTY_BOARD, type Cell } from '../../lib/games/connectFour';
import { ConnectFourBoard } from './ConnectFourBoard';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

export function ConnectFourLocal() {
  const [board, setBoard] = useState<Cell[]>(EMPTY_BOARD);
  const [turn, setTurn] = useState<'x' | 'o'>('x');

  const result = checkWinner(board);

  function handleColumnClick(col: number) {
    if (result) return;
    const next = dropDisc(board, col, turn);
    if (!next) return;
    setBoard(next);
    if (!checkWinner(next)) setTurn(turn === 'x' ? 'o' : 'x');
  }

  function reset() {
    setBoard(EMPTY_BOARD);
    setTurn('x');
  }

  return (
    <GameCard>
      <Text style={styles.text}>
        {result
          ? result === 'draw'
            ? 'Seri!'
            : `${result === 'x' ? 'Pemain 1 (●)' : 'Pemain 2 (●)'} menang!`
          : `Giliran ${turn === 'x' ? 'Pemain 1' : 'Pemain 2'} — gantian pegang HP ya`}
      </Text>
      <ConnectFourBoard board={board} onColumnClick={handleColumnClick} disabled={!!result} />
      <GameButton variant="secondary" onPress={reset}>
        Main Lagi
      </GameButton>
    </GameCard>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 13,
    color: '#767676',
    textAlign: 'center',
  },
});
