import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { isSilentRing, setSilentRing } from 'ble-ring';

import { isSilentRingEligible } from '../lib/silentRing';
import { supabase } from '../lib/supabase';

// Only ever visible for one specific account (see silentRing.ts) -- lets
// that account choose whether "Bunyikan HP pasangan" rings this phone with
// sound (normal) or vibration only (senyap), across all 3 trigger channels.
// Not a general user-facing setting for every account.
export default function SilentRingToggle() {
  const [eligible, setEligible] = useState(false);
  const [silent, setSilent] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEligible(isSilentRingEligible(data.user?.email));
    });
    isSilentRing()
      .then(setSilent)
      .catch(() => setSilent(false));
  }, []);

  if (!eligible || silent === null) return null;

  const choose = (value: boolean) => {
    setSilent(value);
    setSilentRing(value).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Mode bunyikan HP kamu</Text>
      <View style={styles.chipRow}>
        <Pressable onPress={() => choose(false)} style={[styles.chip, !silent && styles.chipActive]}>
          <Text style={[styles.chipText, !silent && styles.chipTextActive]}>🔊 Normal</Text>
        </Pressable>
        <Pressable onPress={() => choose(true)} style={[styles.chip, silent && styles.chipActive]}>
          <Text style={[styles.chipText, silent && styles.chipTextActive]}>📳 Senyap</Text>
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
  chipRow: {
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
  chipActive: {
    backgroundColor: '#e11d74',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  chipTextActive: {
    color: '#fff',
  },
});
