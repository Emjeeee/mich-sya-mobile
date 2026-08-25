import AsyncStorage from '@react-native-async-storage/async-storage';
// expo-file-system's default export moved documentDirectory/downloadAsync/
// deleteAsync (the plain path-string API used here) to this subpath in the
// SDK version this app is on -- the new default export uses a different
// File/Directory/Paths class-based API instead.
import * as FileSystem from 'expo-file-system/legacy';
import { setCustomRingtonePath, setQuietHours } from 'ble-ring';

import { getSignedUrl } from './storage';
import { supabase } from './supabase';

export interface CoupleRingSettings {
  custom_ringtone_url: string | null;
  quiet_hours_start_minutes: number | null;
  quiet_hours_end_minutes: number | null;
}

// Fixed local path so RingReactor/BatteryAlertReactor (native, no JS/network
// access at trigger time) always know where to look -- see
// RingPreferences.kt's customRingtoneFile().
const LOCAL_RINGTONE_PATH = `${FileSystem.documentDirectory}custom_ringtone.mp3`;
// Tracks what's already been downloaded to LOCAL_RINGTONE_PATH so
// syncRingCustomizationToDevice() (called on every app foreground, for both
// accounts) doesn't re-download an unchanged file every time.
const LAST_SYNCED_RINGTONE_KEY = 'michsya.lastSyncedRingtoneUrl';

async function resolveCoupleId(): Promise<string | null> {
  const { data } = await supabase.from('couple').select('id').limit(1);
  return (data?.[0]?.id as string) ?? null;
}

export async function getCoupleRingSettings(coupleId: string): Promise<CoupleRingSettings | null> {
  const { data } = await supabase
    .from('couple')
    .select('custom_ringtone_url, quiet_hours_start_minutes, quiet_hours_end_minutes')
    .eq('id', coupleId)
    .maybeSingle();
  return (data as CoupleRingSettings | null) ?? null;
}

// Written by AdvancedSettingsScreen.tsx (mjonathann.03-only) -- couple-wide,
// not per-device, since both phones should ring with the same custom sound.
export async function setCoupleCustomRingtone(coupleId: string, storagePath: string | null): Promise<void> {
  const { error } = await supabase.from('couple').update({ custom_ringtone_url: storagePath }).eq('id', coupleId);
  if (error) throw error;
}

export async function setCoupleQuietHours(
  coupleId: string,
  startMinutes: number | null,
  endMinutes: number | null
): Promise<void> {
  const { error } = await supabase
    .from('couple')
    .update({ quiet_hours_start_minutes: startMinutes, quiet_hours_end_minutes: endMinutes })
    .eq('id', coupleId);
  if (error) throw error;
}

// Called on app mount + every foreground (App.tsx), for BOTH accounts --
// pulls the couple's shared ring-customization settings down into this
// device's local native prefs. Quiet hours are cheap to always re-sync;
// the ringtone file is only re-downloaded when its storage path actually
// changed, so this stays a no-op most of the time.
export async function syncRingCustomizationToDevice(): Promise<void> {
  const coupleId = await resolveCoupleId().catch(() => null);
  if (!coupleId) return;
  const settings = await getCoupleRingSettings(coupleId).catch(() => null);
  if (!settings) return;

  await setQuietHours(settings.quiet_hours_start_minutes, settings.quiet_hours_end_minutes).catch(() => {});

  const lastSyncedUrl = await AsyncStorage.getItem(LAST_SYNCED_RINGTONE_KEY);
  if (settings.custom_ringtone_url === lastSyncedUrl) return;

  if (!settings.custom_ringtone_url) {
    await setCustomRingtonePath(null).catch(() => {});
    await FileSystem.deleteAsync(LOCAL_RINGTONE_PATH, { idempotent: true }).catch(() => {});
    await AsyncStorage.setItem(LAST_SYNCED_RINGTONE_KEY, '');
    return;
  }

  const signedUrl = await getSignedUrl(settings.custom_ringtone_url, 60 * 60);
  if (!signedUrl) return;
  try {
    await FileSystem.downloadAsync(signedUrl, LOCAL_RINGTONE_PATH);
    await setCustomRingtonePath(LOCAL_RINGTONE_PATH);
    await AsyncStorage.setItem(LAST_SYNCED_RINGTONE_KEY, settings.custom_ringtone_url);
  } catch {
    // Best-effort -- next foreground sync retries.
  }
}
