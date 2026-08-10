package expo.modules.blering

import android.content.Context

// Per-device preference: when true, "Bunyikan HP pasangan" reacts on THIS
// device with vibration only, no sound. Set by the JS side based on which
// account is signed in (see src/lib/silentRing.ts -- deliberately tied to
// one specific account, not a general user-facing setting), read directly
// here by RingReactor for the native BLE/SMS path and via BleRingModule's
// exposed functions by the JS push-channel path (ringtone.ts /
// backgroundNotifications.ts) -- one source of truth regardless of which
// of the 3 trigger channels the ring arrives through.
object RingPreferences {
  private const val PREFS_NAME = "michsya_ring_prefs"
  private const val KEY_SILENT = "silentRing"

  fun isSilent(context: Context): Boolean =
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getBoolean(KEY_SILENT, false)

  fun setSilent(context: Context, silent: Boolean) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().putBoolean(KEY_SILENT, silent).apply()
  }
}
