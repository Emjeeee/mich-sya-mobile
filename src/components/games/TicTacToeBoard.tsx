import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Cell } from '../../lib/tictactoe';

const MARK_COLOR: Record<Exclude<Cell, ''>, string> = {
  x: '#e11d74',
  o: '#3b82f6',
};

export function TicTacToeBoard({
  board,
  onCellClick,
  disabled,
}: {
  board: Cell[];
  onCellClick?: (index: number) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.grid}>
      {board.map((cell, i) => (
        <Pressable
          key={i}
          disabled={disabled || cell !== ''}
          onPress={() => onCellClick?.(i)}
          style={styles.cell}
        >
          <Text style={[styles.mark, cell !== '' && { color: MARK_COLOR[cell as Exclude<Cell, ''>] }]}>
            {cell === 'x' ? '✕' : cell === 'o' ? '○' : ''}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 264,
    alignSelf: 'center',
    gap: 8,
  },
  cell: {
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fdeef4',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    fontSize: 32,
    fontWeight: '700',
  },
});
