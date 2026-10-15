package expo.modules.blering

import android.content.Context
import android.util.Log

// Presence state machine for "Kencan otomatis". Fed by BleRingScanService
// (scan results + a 30s tick), all on the main thread; @Synchronized also
// guards the JS-module entry points (deferEnd/reset).
//
// The native side never knows whether a date is active -- it just reports
// transitions and JS decides:
//   'start': partner continuously near (>= PRESENT_STABLE_MS, majority of
//            recent samples strong). Re-emitted every START_RETRY_MS while
//            that holds, so leaving home together later still starts a date
//            (JS is idempotent and applies the home exclusion).
//   'end':   partner seen at least once, then not seen for ABSENT_MS. Once
//            per absence, whether or not the date was auto-started.
object AutoDateDetector {
  private const val TAG = "AutoDateDetector"

  // ---- Tunables ----
  const val NEAR_RSSI_DBM = -75
  const val PRESENT_STABLE_MS = 3 * 60_000L
  const val ABSENT_MS = 15 * 60_000L
  const val DEFER_END_MS = 10 * 60_000L
  // A pause in sightings longer than this restarts the "near since" clock.
  private const val SIGHTING_GAP_MS = 2 * 60_000L
  private const val START_RETRY_MS = 5 * 60_000L
  // RSSI is noisy: keep the last SAMPLE_WINDOW samples (at most one per
  // SAMPLE_MIN_INTERVAL_MS so a burst does not fill the window) and require a
  // strict majority at or above NEAR_RSSI_DBM once MIN_SAMPLES exist.
  private const val SAMPLE_WINDOW = 12
  private const val MIN_SAMPLES = 6
  private const val SAMPLE_MIN_INTERVAL_MS = 5_000L
  private const val PERSIST_INTERVAL_MS = 10_000L

  private var state: AutoDatePreferences.State? = null
  private val samples = ArrayList<Boolean>()
  private var lastSampleAt = 0L
  private var lastPersistAt = 0L

  private fun load(context: Context): AutoDatePreferences.State {
    val s = state ?: AutoDatePreferences.loadState(context)
    state = s
    return s
  }

  @Synchronized
  fun onSighting(context: Context, rssi: Int, now: Long) {
    val s = load(context)
    var dirty = false
    if (s.lastSeenMs == 0L || now - s.lastSeenMs > SIGHTING_GAP_MS) {
      s.nearSinceMs = now
      s.lastStartEmitMs = 0L
      samples.clear()
      dirty = true
    }
    if (!s.pendingEnd) {
      s.pendingEnd = true
      dirty = true
    }
    s.lastSeenMs = now
    s.deferUntilMs = 0L
    if (now - lastSampleAt >= SAMPLE_MIN_INTERVAL_MS) {
      lastSampleAt = now
      samples.add(rssi >= NEAR_RSSI_DBM)
      if (samples.size > SAMPLE_WINDOW) samples.removeAt(0)
    }
    if (dirty || now - lastPersistAt >= PERSIST_INTERVAL_MS) {
      lastPersistAt = now
      AutoDatePreferences.saveState(context, s)
    }
    evaluate(context, now)
  }

  @Synchronized
  fun evaluate(context: Context, now: Long) {
    if (!AutoDatePreferences.isEnabled(context)) return
    val s = load(context)
    if (s.lastSeenMs == 0L) return

    if (s.pendingEnd && now - s.lastSeenMs >= ABSENT_MS && now >= s.deferUntilMs) {
      val lastSeen = s.lastSeenMs
      val nearSince = s.nearSinceMs
      s.pendingEnd = false
      s.nearSinceMs = 0L
      s.lastStartEmitMs = 0L
      samples.clear()
      AutoDatePreferences.saveState(context, s)
      Log.d(TAG, "Partner absent, emitting end")
      AutoDateTaskService.dispatch(context, "end", lastSeen, nearSince)
      return
    }

    val stillPresent = now - s.lastSeenMs <= SIGHTING_GAP_MS
    if (stillPresent && s.nearSinceMs > 0L && now - s.nearSinceMs >= PRESENT_STABLE_MS &&
      now - s.lastStartEmitMs >= START_RETRY_MS && samples.size >= MIN_SAMPLES
    ) {
      val strong = samples.count { it }
      if (strong * 2 > samples.size) {
        s.lastStartEmitMs = now
        AutoDatePreferences.saveState(context, s)
        Log.d(TAG, "Partner present and stable, emitting start")
        AutoDateTaskService.dispatch(context, "start", s.lastSeenMs, s.nearSinceMs)
      }
    }
  }

  // JS asks for the end to be re-evaluated later (GPS says we have not moved).
  @Synchronized
  fun deferEnd(context: Context, now: Long) {
    val s = load(context)
    s.pendingEnd = true
    s.deferUntilMs = now + DEFER_END_MS
    AutoDatePreferences.saveState(context, s)
  }

  @Synchronized
  fun reset(context: Context) {
    val s = load(context)
    s.nearSinceMs = 0L
    s.lastSeenMs = 0L
    s.lastStartEmitMs = 0L
    s.pendingEnd = false
    s.deferUntilMs = 0L
    samples.clear()
    AutoDatePreferences.saveState(context, s)
  }
}
