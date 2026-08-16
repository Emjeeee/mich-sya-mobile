import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';

import { isSilentRingEligible } from '../lib/silentRing';
import {
  getPartnerRemoteControlState,
  setPartnerRingerMode,
  setPartnerRingerVolume,
} from '../lib/remoteControl';
import { supabase } from '../lib/supabase';

const MODES: { value: 'normal' | 'vibrate' | 'silent'; label: string }[] = [
  { value: 'normal', label: '🔊 Normal' },
  { value: 'vibrate', label: '📳 Getar' },
  { value: 'silent', label: '🔇 Senyap' },
];

// Only ever visible for one specific account (see silentRing.ts) -- lets
// that account remotely change the *partner's* phone ringer mode/volume.
// Fundamentally different from SilentRingToggle.tsx, which only ever
// affects the signed-in account's own device.
//
// setPartnerRingerMode()/setPartnerRingerVolume() only confirm the push was
// *delivered* -- Expo accepts it well before the partner's device even
// wakes up to process it, so a `true` result says nothing about whether the
// native call on her end actually succeeded. The single most likely reason
// it wouldn't (she hasn't granted "Do Not Disturb access" yet) happens
// silently in a background task with no UI, so relying on the send-side
// result alone reproduces exactly what was reported: looks like nothing
// happened, with no indication why. This reads her last-reported grant
// status + current mode/volume (written by RemoteControlAccess.tsx on her
// device) so that failure mode is visible up front, and the mode chip/
// volume slider start from her phone's *actual* current state instead of a
// blind guess.
export default function RemoteControlPanel({ coupleId }: { coupleId: string | null }) {
  const [eligible, setEligible] = useState(false);
  const [partnerGranted, setPartnerGranted] = useState<boolean | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [mode, setMode] = useState<'normal' | 'vibrate' | 'silent' | null>(null);
  const [volumePercent, setVolumePercent] = useState(50);
  const [sliding, setSliding] = useState(false);
  // "Terkirim" only means the push was delivered, not that the native call
  // finished running on the partner's device -- both mode and volume changes
  // have little/no visible UI on her screen (no FLAG_SHOW_UI for volume, and
  // ringer-mode changes only touch a small status-bar icon), which was being
  // misread as "nothing happened" even when it fully worked. This is a
  // lightweight *attempt* confirmation, not proof of the actual outcome.
  const [lastSent, setLastSent] = useState<string | null>(null);
  const lastSentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshPartnerState = useCallback(() => {
    if (!coupleId || !userId) {
      setCheckingAccess(false);
      return;
    }
    setCheckingAccess(true);
    getPartnerRemoteControlState(coupleId, userId)
      .then((state) => {
        setPartnerGranted(state.granted);
        // Only adopt the reported state when there isn't a slider drag in
        // flight -- a refresh landing mid-drag would otherwise yank the
        // thumb out from under the user's finger.
        if (state.mode) setMode(state.mode);
        if (state.volumePercent !== null && !sliding) setVolumePercent(state.volumePercent);
      })
      .catch(() => setPartnerGranted(null))
      .finally(() => setCheckingAccess(false));
  }, [coupleId, userId, sliding]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEligible(isSilentRingEligible(data.user?.email));
      setUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    refreshPartnerState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId, userId]);

  useEffect(() => {
    // Partner may grant access / change her own ringer settings while
    // Michael already has this modal open -- re-check when this app comes
    // back to the foreground.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshPartnerState();
    });
    return () => subscription.remove();
  }, [refreshPartnerState]);

  useEffect(() => {
    return () => {
      if (lastSentTimer.current) clearTimeout(lastSentTimer.current);
    };
  }, []);

  const flashSent = (label: string) => {
    if (lastSentTimer.current) clearTimeout(lastSentTimer.current);
    setLastSent(label);
    lastSentTimer.current = setTimeout(() => setLastSent(null), 2500);
  };

  if (!eligible) return null;

  const chooseMode = async (value: 'normal' | 'vibrate' | 'silent') => {
    const previous = mode;
    setMode(value); // optimistic -- confirmed/corrected on the next refresh
    const sent = await setPartnerRingerMode(coupleId, value);
    if (!sent) {
      setMode(previous);
      Alert.alert(
        'Gagal',
        'Tidak bisa ubah mode HP pasangan. Pastikan dia sudah mengizinkan akses di Pengaturan.'
      );
      return;
    }
    flashSent(`Mode "${MODES.find((m) => m.value === value)?.label ?? value}" terkirim`);
  };

  const commitVolume = async (value: number) => {
    setSliding(false);
    const rounded = Math.round(value);
    const sent = await setPartnerRingerVolume(coupleId, rounded);
    if (!sent) {
      Alert.alert(
        'Gagal',
        'Tidak bisa ubah volume HP pasangan. Pastikan dia sudah mengizinkan akses di Pengaturan.'
      );
      return;
    }
    flashSent(`Volume ${rounded}% terkirim`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Atur HP pasangan dari jauh</Text>
      {checkingAccess ? (
        <ActivityIndicator color="#e11d74" style={styles.warningRow} />
      ) : partnerGranted === false || partnerGranted === null ? (
        <Text style={styles.warningText}>
          {partnerGranted === null
            ? 'Belum diketahui apakah pasangan sudah mengizinkan akses. Tombol di bawah mungkin tidak berpengaruh.'
            : 'Pasangan belum mengizinkan akses di Pengaturan -- tombol di bawah tidak akan berpengaruh sampai dia mengizinkannya.'}
        </Text>
      ) : null}
      {lastSent && <Text style={styles.sentText}>✓ {lastSent} -- perubahan tidak selalu terlihat di layar pasangan.</Text>}

      <View style={styles.row}>
        {MODES.map((m) => (
          <Pressable
            key={m.value}
            style={[styles.chip, mode === m.value && styles.chipActive]}
            onPress={() => chooseMode(m.value)}
          >
            <Text style={[styles.chipText, mode === m.value && styles.chipTextActive]}>{m.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.volumeRow}>
        <Text style={styles.volumeLabel}>🔊 Volume</Text>
        <Text style={styles.volumeValue}>{Math.round(volumePercent)}%</Text>
      </View>
      <Slider
        minimumValue={0}
        maximumValue={100}
        step={1}
        value={volumePercent}
        onValueChange={(value) => {
          setSliding(true);
          setVolumePercent(value);
        }}
        onSlidingComplete={commitVolume}
        minimumTrackTintColor="#e11d74"
        maximumTrackTintColor="#fdeef4"
        thumbTintColor="#e11d74"
      />
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
  warningRow: {
    alignSelf: 'flex-start',
  },
  warningText: {
    fontSize: 12,
    color: '#c0392b',
  },
  sentText: {
    fontSize: 12,
    color: '#2e7d32',
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
  volumeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  volumeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  volumeValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e11d74',
  },
});
