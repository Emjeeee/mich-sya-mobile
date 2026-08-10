// Personal preference tied to one specific account, not a general
// user-facing setting: only when signed in as this email does the
// "Mode bunyikan" toggle (see SilentRingToggle.tsx) appear at all, letting
// that account switch between normal (sound) and silent (vibrate only) --
// across all 3 trigger channels (push/BLE/SMS). See RingPreferences.kt
// (native) and ringtone.ts/backgroundNotifications.ts (JS push-channel
// path) for where the resulting choice is read.
export const SILENT_RING_ELIGIBLE_EMAIL = 'mjonathann.03@gmail.com';

export function isSilentRingEligible(email: string | null | undefined): boolean {
  return (email ?? '').toLowerCase() === SILENT_RING_ELIGIBLE_EMAIL;
}
