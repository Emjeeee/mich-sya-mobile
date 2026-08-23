import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Cell } from '../../lib/tictactoe';
import { artDeco } from '../../theme/artDecoTokens';
import { useAppTheme } from '../../theme/ThemeContext';

const MARK_COLOR: Record<Exclude<Cell, ''>, string> = {
  x: '#e11d74',
  o: '#3b82f6',
};

const DECO_MARK_COLOR: Record<Exclude<Cell, ''>, string> = {
  x: artDeco.color.gold,
  o: artDeco.color.ruby,
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
  const { isArtDeco } = useAppTheme();
  return (
    <View style={styles.grid}>
      {board.map((cell, i) => (
        <Pressable
          key={i}
          disabled={disabled || cell !== ''}
          onPress={() => onCellClick?.(i)}
          style={[styles.cell, isArtDeco && deco.cell]}
        >
          <Text
            style={[
              styles.mark,
              cell !== '' && { color: MARK_COLOR[cell as Exclude<Cell, ''>] },
              isArtDeco && cell !== '' && { color: DECO_MARK_COLOR[cell as Exclude<Cell, ''>] },
            ]}
          >
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

const deco = StyleSheet.create({
  cell: {
    borderRadius: artDeco.radius.none,
    borderWidth: 1.5,
    borderColor: artDeco.color.line,
    backgroundColor: artDeco.color.surface,
  },
});
