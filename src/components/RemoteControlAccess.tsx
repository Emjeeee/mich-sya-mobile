import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { hasRemoteControlAccess, requestRemoteControlAccess } from 'ble-ring';

import { isSilentRingEligible } from '../lib/silentRing';
import { supabase } from '../lib/supabase';

// Only ever visible for the *other* account (not mjonathann.03 -- reusing
// isSilentRingEligible inverted, since it's already the "is this the
// Michael account" check) -- shows whether this device has granted "Do Not
// Disturb access", which RemoteControlPanel.tsx's mode/volume buttons need
// to actually work on this device. See src/lib/remoteControl.ts.
export default function RemoteControlAccess() {
  const [eligible, setEligible] = useState(false);
  const [granted, setGranted] = useState<boolean | null>(null);

  const refresh = useCallback(() => {
    hasRemoteControlAccess()
      .then(setGranted)
      .catch(() => setGranted(false));
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEligible(!isSilentRingEligible(data.user?.email));
    });
    refresh();
  }, [refresh]);

  useEffect(() => {
    // Settings lives outside the app -- re-check when coming back to it so
    // the granted status updates without needing to reopen this modal.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  if (!eligible || granted === null || granted) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Izinkan pasangan atur mode HP kamu dari jauh</Text>
      <Pressable style={styles.button} onPress={() => requestRemoteControlAccess()}>
        <Text style={styles.buttonText}>Izinkan di Pengaturan</Text>
      </Pressable>
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
});
