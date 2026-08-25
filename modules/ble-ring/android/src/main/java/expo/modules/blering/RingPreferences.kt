package expo.modules.blering

import java.io.File
import java.util.Calendar
import android.content.Context

// Per-device preference: when true, "Bunyikan HP pasangan" reacts on THIS
// device with vibration only, no sound. Set by the JS side based on which
// account is signed in (see src/lib/silentRing.ts -- deliberately tied to
// one specific account, not a general user-facing setting), read directly
// here by RingReactor for the native BLE/SMS path and via BleRingModule's
// exposed functions by the JS push-channel path (ringtone.ts /
// backgroundNotifications.ts) -- one source of truth regardless of which
// of the 3 trigger channels the ring arrives through.
//
// Also holds two couple-wide settings (see AdvancedSettingsScreen.tsx,
// mjonathann.03-only) that JS syncs down from Supabase into this same local
// SharedPreferences store, so RingReactor/BatteryAlertReactor -- both
// deliberately native-only, zero JS dependency at trigger time -- can read
// them synchronously without a network round trip: a custom ringtone file
// path (downloaded locally by JS, see backgroundNotifications.ts's ringtone
// sync) and a "quiet hours" window during which sound (not vibration --
// confirmed as the wanted behavior) should stay off regardless of which of
// the 3 channels triggered the alert.
object RingPreferences {
  private const val PREFS_NAME = "michsya_ring_prefs"
  private const val KEY_SILENT = "silentRing"
  private const val KEY_CUSTOM_RINGTONE_PATH = "customRingtonePath"
  private const val KEY_QUIET_HOURS_START = "quietHoursStartMinutes"
  private const val KEY_QUIET_HOURS_END = "quietHoursEndMinutes"

  fun isSilent(context: Context): Boolean =
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getBoolean(KEY_SILENT, false)

  fun setSilent(context: Context, silent: Boolean) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().putBoolean(KEY_SILENT, silent).apply()
  }

  // Null (or a path whose file no longer exists on disk) means "no custom
  // ringtone -- use the bundled default", checked by the caller.
  fun getCustomRingtonePath(context: Context): String? =
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getString(KEY_CUSTOM_RINGTONE_PATH, null)

  fun setCustomRingtonePath(context: Context, path: String?) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().putString(KEY_CUSTOM_RINGTONE_PATH, path).apply()
  }

  // Resolves getCustomRingtonePath() down to a usable File, or null if unset
  // or the file is missing (e.g. app data was cleared after JS last synced
  // it) -- callers only need one check instead of duplicating both.
  fun customRingtoneFile(context: Context): File? {
    val path = getCustomRingtonePath(context) ?: return null
    val file = File(path)
    return if (file.exists()) file else null
  }

  // Both null means quiet hours are off. Minutes-since-midnight (0-1439) in
  // this device's own local time zone -- set together, never independently,
  // so a half-written state (only one of the two ever null) can't happen.
  fun setQuietHours(context: Context, startMinutes: Int?, endMinutes: Int?) {
    val editor = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
    if (startMinutes == null || endMinutes == null) {
      editor.remove(KEY_QUIET_HOURS_START).remove(KEY_QUIET_HOURS_END)
    } else {
      editor.putInt(KEY_QUIET_HOURS_START, startMinutes).putInt(KEY_QUIET_HOURS_END, endMinutes)
    }
    editor.apply()
  }

  // Handles an overnight window (e.g. 22:00-06:00, start > end) by checking
  // "now is after start OR before end" instead of "between start and end".
  fun isWithinQuietHours(context: Context): Boolean {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    if (!prefs.contains(KEY_QUIET_HOURS_START) || !prefs.contains(KEY_QUIET_HOURS_END)) return false
    val start = prefs.getInt(KEY_QUIET_HOURS_START, 0)
    val end = prefs.getInt(KEY_QUIET_HOURS_END, 0)
    val now = Calendar.getInstance().let { it.get(Calendar.HOUR_OF_DAY) * 60 + it.get(Calendar.MINUTE) }
    return if (start <= end) now in start until end else now >= start || now < end
  }
}
