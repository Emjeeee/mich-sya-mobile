// Personal preference tied to one specific account, not a general
// user-facing setting: only when signed in as one of these emails does the
// "Mode bunyikan" toggle (see SilentRingToggle.tsx) appear at all, letting
// that account switch between normal (sound) and silent (vibrate only) --
// across all 3 trigger channels (push/BLE/SMS). See RingPreferences.kt
// (native) and ringtone.ts/backgroundNotifications.ts (JS push-channel
// path) for where the resulting choice is read.
//
// dummy1@gmail.com is a throwaway Supabase account created purely to test
// on a 3rd device (Samsung S22 Ultra) without touching the real
// mjonathann.03/anatasyajastine couple pairing -- it replicates
// mjonathann.03's eligibility so the remote-control panel (also gated by
// this same check) is testable end-to-end before shipping to the real
// devices. Safe to remove once that testing wraps up.
const SILENT_RING_ELIGIBLE_EMAILS = new Set(['mjonathann.03@gmail.com', 'dummy1@gmail.com']);

export function isSilentRingEligible(email: string | null | undefined): boolean {
  return SILENT_RING_ELIGIBLE_EMAILS.has((email ?? '').toLowerCase());
}
