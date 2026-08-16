import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { isSilentRingEligible } from '../lib/silentRing';
import { adjustPartnerVolume, getPartnerRemoteControlAccess, setPartnerRingerMode } from '../lib/remoteControl';
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
// setPartnerRingerMode()/adjustPartnerVolume() only confirm the push was
// *delivered* -- Expo accepts it well before the partner's device even
// wakes up to process it, so a `true` result says nothing about whether the
// native setRingerMode/adjustRingerVolume call on her end actually
// succeeded. The single most likely reason it wouldn't (she hasn't granted
// "Do Not Disturb access" yet) happens silently in a background task with
// no UI, so relying on the send-side result alone reproduces exactly what
// was reported: looks like nothing happened, with no indication why. This
// reads her last-reported grant status (written by RemoteControlAccess.tsx
// on her device) so that specific failure mode is visible up front instead.
export default function RemoteControlPanel({ coupleId }: { coupleId: string | null }) {
  const [eligible, setEligible] = useState(false);
  const [partnerGranted, setPartnerGranted] = useState<boolean | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  // "Terkirim" only means the push was delivered, not that setRingerMode/
  // adjustRingerVolume finished running on the partner's device -- both
  // native calls have zero visible UI (no FLAG_SHOW_UI for volume, and
  // ringer-mode changes only touch a small status-bar icon), which was
  // being misread as "nothing happened" even when it fully worked. This is
  // a lightweight *attempt* confirmation, not proof of the actual outcome.
  const [lastSent, setLastSent] = useState<string | null>(null);
  const lastSentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshPartnerAccess = useCallback(() => {
    if (!coupleId || !userId) {
      setCheckingAccess(false);
      return;
    }
    setCheckingAccess(true);
    getPartnerRemoteControlAccess(coupleId, userId)
      .then(setPartnerGranted)
      .catch(() => setPartnerGranted(null))
      .finally(() => setCheckingAccess(false));
  }, [coupleId, userId]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEligible(isSilentRingEligible(data.user?.email));
      setUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    refreshPartnerAccess();
  }, [refreshPartnerAccess]);

  useEffect(() => {
    // Partner may grant access on her device while Michael already has this
    // modal open -- re-check when this app comes back to the foreground.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshPartnerAccess();
    });
    return () => subscription.remove();
  }, [refreshPartnerAccess]);

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

  const chooseMode = async (mode: 'normal' | 'vibrate' | 'silent') => {
    const sent = await setPartnerRingerMode(coupleId, mode);
    if (!sent) {
      Alert.alert(
        'Gagal',
        'Tidak bisa ubah mode HP pasangan. Pastikan dia sudah mengizinkan akses di Pengaturan.'
      );
      return;
    }
    flashSent(`Perintah mode "${MODES.find((m) => m.value === mode)?.label ?? mode}" terkirim`);
  };

  const adjustVolume = async (direction: 'up' | 'down') => {
    const sent = await adjustPartnerVolume(coupleId, direction);
    if (!sent) {
      Alert.alert(
        'Gagal',
        'Tidak bisa ubah volume HP pasangan. Pastikan dia sudah mengizinkan akses di Pengaturan.'
      );
      return;
    }
    flashSent(`Perintah volume ${direction === 'up' ? '+' : '-'} terkirim`);
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
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
});
