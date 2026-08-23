import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { isSilentRing, setSilentRing } from 'ble-ring';

import { isSilentRingEligible } from '../lib/silentRing';
import { supabase } from '../lib/supabase';
import { artDeco } from '../theme/artDecoTokens';
import { useAppTheme } from '../theme/ThemeContext';

// Only ever visible for one specific account (see silentRing.ts) -- lets
// that account choose whether "Bunyikan HP pasangan" rings this phone with
// sound (normal) or vibration only (senyap), across all 3 trigger channels.
// Not a general user-facing setting for every account.
export default function SilentRingToggle() {
  const { isArtDeco } = useAppTheme();
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
      <Text style={[styles.label, isArtDeco && deco.label]}>Mode bunyikan HP kamu</Text>
      <View style={styles.chipRow}>
        <Pressable
          onPress={() => choose(false)}
          style={[styles.chip, isArtDeco && deco.chip, !silent && styles.chipActive, !silent && isArtDeco && deco.chipActive]}
        >
          <Text
            style={[
              styles.chipText,
              isArtDeco && deco.chipText,
              !silent && styles.chipTextActive,
              !silent && isArtDeco && deco.chipTextActive,
            ]}
          >
            🔊 Normal
          </Text>
        </Pressable>
        <Pressable
          onPress={() => choose(true)}
          style={[styles.chip, isArtDeco && deco.chip, silent && styles.chipActive, silent && isArtDeco && deco.chipActive]}
        >
          <Text
            style={[
              styles.chipText,
              isArtDeco && deco.chipText,
              silent && styles.chipTextActive,
              silent && isArtDeco && deco.chipTextActive,
            ]}
          >
            📳 Senyap
          </Text>
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

const deco = StyleSheet.create({
  label: {
    color: artDeco.color.muted,
  },
  chip: {
    backgroundColor: artDeco.color.goldSoft,
    borderRadius: artDeco.radius.none,
    borderWidth: 1,
    borderColor: artDeco.color.lineSoft,
  },
  chipActive: {
    backgroundColor: artDeco.color.gold,
  },
  chipText: {
    color: artDeco.color.ink2,
  },
  chipTextActive: {
    color: artDeco.color.black,
  },
});
