import { StyleSheet, Text } from 'react-native';

import { artDeco } from '../../theme/artDecoTokens';
import { useAppTheme } from '../../theme/ThemeContext';
import { GameCard } from './GameCard';

// Placeholder for games in the registry that haven't been ported from the
// web app yet -- shows the full 21-game Arcade grid from day one instead of
// growing it silently across app updates.
export function ComingSoonGame() {
  const { isArtDeco } = useAppTheme();
  return (
    <GameCard>
      <Text style={[styles.text, isArtDeco && deco.text]}>Game ini segera hadir di update berikutnya! 🚧</Text>
    </GameCard>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 14,
    color: '#767676',
    textAlign: 'center',
  },
});

const deco = StyleSheet.create({
  text: {
    color: artDeco.color.muted,
    fontFamily: artDeco.font.serifRegular,
  },
});
