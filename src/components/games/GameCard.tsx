import { StyleSheet, View, type ViewProps } from 'react-native';

import { artDeco } from '../../theme/artDecoTokens';
import { useAppTheme } from '../../theme/ThemeContext';

// Shared visual wrapper for game UI sections, matching the card style used
// elsewhere in the app (e.g. DateRecapModal's card).
export function GameCard({ style, ...props }: ViewProps) {
  const { isArtDeco } = useAppTheme();
  return <View style={[styles.card, isArtDeco && deco.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fdeef4',
    gap: 12,
  },
});

const deco = StyleSheet.create({
  card: {
    backgroundColor: artDeco.color.surface,
    borderRadius: artDeco.radius.none,
    borderWidth: 1.5,
    borderColor: artDeco.color.line,
  },
});
