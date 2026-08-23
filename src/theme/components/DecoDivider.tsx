import { StyleSheet, View, type ViewStyle } from 'react-native';

import { artDeco } from '../artDecoTokens';
import { DiamondMarker } from './DiamondMarker';

export function DecoDivider({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.line} />
      <DiamondMarker size={7} />
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' },
  line: { flex: 1, height: 1, backgroundColor: artDeco.color.lineSoft },
});
