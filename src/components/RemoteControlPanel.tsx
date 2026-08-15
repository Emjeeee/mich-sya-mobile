import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { isSilentRingEligible } from '../lib/silentRing';
import { adjustPartnerVolume, setPartnerRingerMode } from '../lib/remoteControl';
import { supabase } from '../lib/supabase';

const MODES: { value: 'normal' | 'vibrate' | 'silent'; label: string }[] = [
  { value: 'normal', label: '🔊 Normal' },
  { value: 'vibrate', label: '📳 Getar' },
  { value: 'silent', label: '🔇 Senyap' },
];

// Only ever visible for one specific account (see silentRing.ts) -- lets
// that account remotely change the *partner's* phone ringer mode/volume.
// Fundamentally different from SilentRingToggle.tsx, which only ever
// affects the signed-in account's own device. Fire-and-forget, same as
// ringPartner()/torchPartner() -- no delivery confirmation, no live state
// synced back from the partner's device.
export default function RemoteControlPanel({ coupleId }: { coupleId: string | null }) {
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEligible(isSilentRingEligible(data.user?.email));
    });
  }, []);

  if (!eligible) return null;

  const chooseMode = async (mode: 'normal' | 'vibrate' | 'silent') => {
    const sent = await setPartnerRingerMode(coupleId, mode);
    if (!sent) {
      Alert.alert(
        'Gagal',
        'Tidak bisa ubah mode HP pasangan. Pastikan dia sudah mengizinkan akses di Pengaturan.'
      );
    }
  };

  const adjustVolume = async (direction: 'up' | 'down') => {
    const sent = await adjustPartnerVolume(coupleId, direction);
    if (!sent) {
      Alert.alert(
        'Gagal',
        'Tidak bisa ubah volume HP pasangan. Pastikan dia sudah mengizinkan akses di Pengaturan.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Atur HP pasangan dari jauh</Text>
      <View style={styles.row}>
        {MODES.map((m) => (
          <Pressable key={m.value} style={styles.chip} onPress={() => chooseMode(m.value)}>
            <Text style={styles.chipText}>{m.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.row}>
        <Pressable style={styles.chip} onPress={() => adjustVolume('down')}>
          <Text style={styles.chipText}>🔉 Volume -</Text>
        </Pressable>
        <Pressable style={styles.chip} onPress={() => adjustVolume('up')}>
          <Text style={styles.chipText}>🔊 Volume +</Text>
        </Pressable>
      </View>
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
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fdeef4',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
});
