import { Pressable, StyleSheet, View } from 'react-native';

import { COLS, ROWS, type Cell } from '../../lib/games/connectFour';
import { artDeco } from '../../theme/artDecoTokens';
import { useAppTheme } from '../../theme/ThemeContext';

const MARK_COLOR: Record<Exclude<Cell, ''>, string> = {
  x: '#e11d74',
  o: '#eab308',
};

const DECO_MARK_COLOR: Record<Exclude<Cell, ''>, string> = {
  x: artDeco.color.gold,
  o: artDeco.color.ruby,
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
  const { isArtDeco } = useAppTheme();
  return (
    <View style={[styles.board, isArtDeco && deco.board]}>
      {Array.from({ length: COLS }, (_, col) => (
        <Pressable key={col} disabled={disabled} onPress={() => onColumnClick?.(col)} style={styles.column}>
          {Array.from({ length: ROWS }, (_, row) => {
            const cell = board[row * COLS + col];
            return (
              <View
                key={row}
                style={[
                  styles.disc,
                  cell ? { backgroundColor: MARK_COLOR[cell as Exclude<Cell, ''>] } : styles.discEmpty,
                  isArtDeco && deco.disc,
                  isArtDeco && (cell ? { backgroundColor: DECO_MARK_COLOR[cell as Exclude<Cell, ''>] } : deco.discEmpty),
                ]}
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

const deco = StyleSheet.create({
  board: {
    backgroundColor: artDeco.color.surface,
    borderRadius: artDeco.radius.none,
    borderWidth: 1.5,
    borderColor: artDeco.color.line,
  },
  disc: {
    borderRadius: artDeco.radius.none,
  },
  discEmpty: {
    backgroundColor: artDeco.color.bgAlt,
  },
});
