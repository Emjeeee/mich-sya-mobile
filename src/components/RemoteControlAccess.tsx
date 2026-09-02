import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { getVolumeState, hasRemoteControlAccess, requestRemoteControlAccess } from 'ble-ring';

import { isSilentRingEligible } from '../lib/silentRing';
import { reportRemoteControlAccessStatus } from '../lib/remoteControl';
import { supabase } from '../lib/supabase';
import { artDeco } from '../theme/artDecoTokens';
import { liquidGlass } from '../theme/liquidGlassTokens';
import { useAppTheme } from '../theme/ThemeContext';

// Only ever visible for the *other* account (not mjonathann.03 -- reusing
// isSilentRingEligible inverted, since it's already the "is this the
// Michael account" check) -- shows whether this device has granted "Do Not
// Disturb access", which RemoteControlPanel.tsx's mode/volume buttons need
// to actually work on this device. See src/lib/remoteControl.ts.
export default function RemoteControlAccess({ coupleId }: { coupleId: string | null }) {
  const { isArtDeco, isLiquidGlass } = useAppTheme();
  const [eligible, setEligible] = useState(false);
  const [granted, setGranted] = useState<boolean | null>(null);

  const refresh = useCallback(() => {
    hasRemoteControlAccess()
      .then(async (value) => {
        setGranted(value);
        // Best-effort -- if any of this fails (offline, no couple yet) the
        // controlling account just sees a stale/unknown status, same as any
        // other sync gap in this app. Volume state is read regardless of
        // `value` -- reading it needs no DND access, only setting ring/
        // notification does.
        const volumeState = await getVolumeState().catch((err) => {
          console.warn('[michsya] getVolumeState() threw:', err);
          return null;
        });
        if (coupleId) reportRemoteControlAccessStatus(coupleId, value, volumeState).catch(() => {});
      })
      .catch(() => setGranted(false));
  }, [coupleId]);

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

  useEffect(() => {
    // Catches the partner manually flipping her own ringer mode/volume
    // while this screen happens to already be open in the foreground on
    // her phone -- AppState-active alone only re-checks when coming back
    // *into* the app, not while it's already sitting open. Cheap (plain
    // getters, no permission prompts), and feeds the same realtime pipe
    // RemoteControlPanel.tsx subscribes to on the controlling side, so a
    // change made here shows up there within a few seconds instead of only
    // the next time either app backgrounds/foregrounds.
    const interval = setInterval(refresh, 8000); // was 5s -- eased off a bit as part of a general lag/battery pass
    return () => clearInterval(interval);
  }, [refresh]);

  if (!eligible || granted === null || granted) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, isArtDeco && deco.label, isLiquidGlass && glass.label]}>
        Izinkan pasangan atur mode HP kamu dari jauh
      </Text>
      <Pressable
        style={[styles.button, isArtDeco && deco.button, isLiquidGlass && glass.button]}
        onPress={() => requestRemoteControlAccess()}
      >
        <Text style={[styles.buttonText, isArtDeco && deco.buttonText, isLiquidGlass && glass.buttonText]}>
          Izinkan di Pengaturan
        </Text>
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

const deco = StyleSheet.create({
  label: {
    color: artDeco.color.muted,
  },
  button: {
    borderColor: artDeco.color.gold,
    borderRadius: artDeco.radius.none,
  },
  buttonText: {
    color: artDeco.color.gold,
  },
});

const glass = StyleSheet.create({
  label: {
    color: liquidGlass.color.muted,
  },
  button: {
    backgroundColor: liquidGlass.color.glassChipWash,
    borderColor: liquidGlass.color.glassChipBorder,
  },
  buttonText: {
    color: liquidGlass.color.ink2,
  },
});
