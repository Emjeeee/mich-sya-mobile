import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { stopRing } from 'ble-ring';

import SwipeToConfirm from '../components/SwipeToConfirm';

interface RingAlertScreenProps {
  onDismiss: () => void;
}

export default function RingAlertScreen({ onDismiss }: RingAlertScreenProps) {
  const insets = useSafeAreaInsets();

  const handleStop = () => {
    stopRing().catch(() => {});
    onDismiss();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.center}>
        <Text style={styles.icon}>🔊</Text>
        <Text style={styles.title}>HP kamu lagi dibunyiin pasangan</Text>
        <Text style={styles.subtitle}>Kayaknya dia lagi nyariin kamu nih...</Text>
      </View>

      <SwipeToConfirm label="Geser untuk hentikan" color="#e11d74" onConfirm={handleStop} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e11d74',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 72,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
  },
});
