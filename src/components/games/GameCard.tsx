import { StyleSheet, View, type ViewProps } from 'react-native';

// Shared visual wrapper for game UI sections, matching the card style used
// elsewhere in the app (e.g. DateRecapModal's card).
export function GameCard({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
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
