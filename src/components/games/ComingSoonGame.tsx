import { StyleSheet, Text } from 'react-native';

import { GameCard } from './GameCard';

// Placeholder for games in the registry that haven't been ported from the
// web app yet -- shows the full 21-game Arcade grid from day one instead of
// growing it silently across app updates.
export function ComingSoonGame() {
  return (
    <GameCard>
      <Text style={styles.text}>Game ini segera hadir di update berikutnya! 🚧</Text>
    </GameCard>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
