package expo.modules.blering

import android.content.Context
import android.content.Intent
import android.util.Log
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

// Hands a presence transition to JS ('MichsyaAutoDate', registered in
// src/lib/autoDate.ts) because creating/ending the date needs Supabase, which
// the native scan service deliberately does not talk to.
class AutoDateTaskService : HeadlessJsTaskService() {
  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
    val extras = intent?.extras ?: return null
    val event = extras.getString(EXTRA_EVENT) ?: return null
    val data = Arguments.createMap()
    data.putString("event", event)
    data.putDouble("lastSeenMs", extras.getLong(EXTRA_LAST_SEEN_MS).toDouble())
    data.putDouble("nearSinceMs", extras.getLong(EXTRA_NEAR_SINCE_MS).toDouble())
    return HeadlessJsTaskConfig(TASK_KEY, data, TIMEOUT_MS, true)
  }

  companion object {
    private const val TAG = "AutoDateTaskService"
    const val TASK_KEY = "MichsyaAutoDate"
    private const val EXTRA_EVENT = "event"
    private const val EXTRA_LAST_SEEN_MS = "lastSeenMs"
    private const val EXTRA_NEAR_SINCE_MS = "nearSinceMs"
    private const val TIMEOUT_MS = 60_000L

    fun dispatch(context: Context, event: String, lastSeenMs: Long, nearSinceMs: Long) {
      try {
        val appContext = context.applicationContext
        val intent = Intent(appContext, AutoDateTaskService::class.java)
          .putExtra(EXTRA_EVENT, event)
          .putExtra(EXTRA_LAST_SEEN_MS, lastSeenMs)
          .putExtra(EXTRA_NEAR_SINCE_MS, nearSinceMs)
        // Keeps the CPU awake until the service is actually running.
        HeadlessJsTaskService.acquireWakeLockNow(appContext)
        // Plain startService (not startForegroundService): the headless
        // service never calls startForeground(), and we are launched from
        // the already-foreground scan service so this is allowed.
        appContext.startService(intent)
      } catch (e: Exception) {
        Log.w(TAG, "Could not start auto date task", e)
      }
    }
  }
}
