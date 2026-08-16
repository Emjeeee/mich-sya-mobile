import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { hasBatteryOptimizationExemption, requestBatteryOptimizationExemption } from 'ble-ring';

// Unlike RemoteControlAccess/RemoteControlPanel, this isn't gated to one
// account -- every background feature (push ring/torch/remote control, the
// BLE scan foreground service, "Cari Pasangan" background location) depends
// on the OS actually letting this app's process wake up, on BOTH devices.
// OEMs with aggressive background-kill policies (Vivo's FunTouch/OriginOS
// especially, also Xiaomi/Oppo) can silently prevent that even when every
// normal permission is granted -- this surfaces the one exemption that's
// requestable through a direct system dialog, plus a manual hint for Vivo's
// separate "autostart manager" toggle, which has no public API to check or
// request at all.
export default function BatteryOptimizationNotice() {
  const [exempted, setExempted] = useState<boolean | null>(null);

  const refresh = useCallback(() => {
    hasBatteryOptimizationExemption()
      .then(setExempted)
      .catch(() => setExempted(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const isVivo = Platform.OS === 'android' && /vivo/i.test(String(Platform.constants?.Brand ?? ''));

  if (exempted === null) return null;
  if (exempted && !isVivo) return null;

  return (
    <View style={styles.container}>
      {!exempted && (
        <>
          <Text style={styles.label}>
            Supaya bunyikan HP/senter/atur jarak jauh tetap jalan walau HP ini tidak dibuka lama, izinkan MichSya
            berjalan tanpa batas hemat baterai.
          </Text>
          <Pressable style={styles.button} onPress={() => requestBatteryOptimizationExemption()}>
            <Text style={styles.buttonText}>Izinkan</Text>
          </Pressable>
        </>
      )}
      {isVivo && (
        <Text style={styles.vivoHint}>
          HP Vivo punya pengaturan tambahan yang tidak bisa diminta otomatis: buka i Manager (atau Pengaturan) →
          Manajemen Baterai/App Manager → cari MichSya → aktifkan "Autostart"/"Latar belakang otomatis", supaya fitur
          jarak jauh tetap bekerja walau aplikasi ditutup.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    color: '#767676',
  },
  button: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  vivoHint: {
    fontSize: 12,
    color: '#767676',
    fontStyle: 'italic',
  },
});
