import { Pressable, StyleSheet, View } from 'react-native';

import { COLS, ROWS, type Cell } from '../../lib/games/connectFour';

const MARK_COLOR: Record<Exclude<Cell, ''>, string> = {
  x: '#e11d74',
  o: '#eab308',
};

export function ConnectFourBoard({
  board,
  onColumnClick,
  disabled,
}: {
  board: Cell[];
  onColumnClick?: (col: number) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.board}>
      {Array.from({ length: COLS }, (_, col) => (
        <Pressable key={col} disabled={disabled} onPress={() => onColumnClick?.(col)} style={styles.column}>
          {Array.from({ length: ROWS }, (_, row) => {
            const cell = board[row * COLS + col];
            return (
              <View
                key={row}
                style={[styles.disc, cell ? { backgroundColor: MARK_COLOR[cell as Exclude<Cell, ''>] } : styles.discEmpty]}
              />
            );
          })}
        </Pressable>
      ))}
    </View>
  );
}

const DISC_SIZE = 32;

const styles = StyleSheet.create({
  board: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: '#fdeef4',
    borderRadius: 12,
    padding: 6,
    alignSelf: 'center',
  },
  column: {
    gap: 4,
  },
  disc: {
    width: DISC_SIZE,
    height: DISC_SIZE,
    borderRadius: DISC_SIZE / 2,
  },
  discEmpty: {
    backgroundColor: '#fff',
  },
});
