package expo.modules.blering

import android.content.Context

// "Kencan otomatis" config (synced from JS, see src/lib/autoDate.ts) plus the
// minimal presence state AutoDateDetector persists so a service restart
// does not forget "partner has been near since ...".
object AutoDatePreferences {
  private const val PREFS_NAME = "michsya_auto_date_prefs"
  private const val KEY_ENABLED = "enabled"
  private const val KEY_TAG = "coupleTagHex"
  private const val KEY_NEAR_SINCE = "nearSinceMs"
  private const val KEY_LAST_SEEN = "lastSeenMs"
  private const val KEY_LAST_START_EMIT = "lastStartEmitMs"
  private const val KEY_PENDING_END = "pendingEnd"
  private const val KEY_DEFER_UNTIL = "deferUntilMs"

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  fun isEnabled(context: Context): Boolean = prefs(context).getBoolean(KEY_ENABLED, false)

  fun setConfig(context: Context, enabled: Boolean, coupleTagHex: String) {
    prefs(context).edit().putBoolean(KEY_ENABLED, enabled).putString(KEY_TAG, coupleTagHex).apply()
  }

  // 3 bytes decoded from a 6-char hex string, or null if unset/malformed.
  fun tagBytes(context: Context): ByteArray? {
    val hex = prefs(context).getString(KEY_TAG, null) ?: return null
    if (hex.length != 6) return null
    return try {
      ByteArray(3) { i -> hex.substring(i * 2, i * 2 + 2).toInt(16).toByte() }
    } catch (e: NumberFormatException) {
      null
    }
  }

  class State(
    var nearSinceMs: Long,
    var lastSeenMs: Long,
    var lastStartEmitMs: Long,
    var pendingEnd: Boolean,
    var deferUntilMs: Long
  )

  fun loadState(context: Context): State {
    val p = prefs(context)
    return State(
      p.getLong(KEY_NEAR_SINCE, 0L),
      p.getLong(KEY_LAST_SEEN, 0L),
      p.getLong(KEY_LAST_START_EMIT, 0L),
      p.getBoolean(KEY_PENDING_END, false),
      p.getLong(KEY_DEFER_UNTIL, 0L)
    )
  }

  fun saveState(context: Context, s: State) {
    prefs(context).edit()
      .putLong(KEY_NEAR_SINCE, s.nearSinceMs)
      .putLong(KEY_LAST_SEEN, s.lastSeenMs)
      .putLong(KEY_LAST_START_EMIT, s.lastStartEmitMs)
      .putBoolean(KEY_PENDING_END, s.pendingEnd)
      .putLong(KEY_DEFER_UNTIL, s.deferUntilMs)
      .apply()
  }
}
