import { setSilentRing } from 'ble-ring';

// Personal preference tied to one specific account, not a general
// user-facing setting: when signed in as this email, "Bunyikan HP
// pasangan" reacts on THIS device with vibration only, no sound --
// regardless of which of the 3 trigger channels (push/BLE/SMS) it arrives
// through. See RingPreferences.kt (native) and ringtone.ts/
// backgroundNotifications.ts (JS push-channel path) for where this is read.
const SILENT_RING_EMAIL = 'mjonathann.03@gmail.com';

export async function syncSilentRingPreference(email: string | null | undefined) {
  const silent = (email ?? '').toLowerCase() === SILENT_RING_EMAIL;
  try {
    await setSilentRing(silent);
  } catch {
    // Best-effort -- worst case this device keeps its previous setting.
  }
}
