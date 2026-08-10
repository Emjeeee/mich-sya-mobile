package expo.modules.blering

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.BatteryManager
import android.util.Log

// Handles two very differently-registered things:
// - ACTION_BATTERY_CHANGED: a sticky broadcast Android's own docs say can
//   ONLY reach a *dynamically* registered receiver, never a manifest one --
//   so this class is instantiated and registerReceiver()'d by
//   BleRingScanService (already the long-lived, boot-started foreground
//   service the ring feature depends on), not declared in the manifest for
//   this action. See BleRingScanService.onCreate().
// - STOP_ACTION: an app-defined custom action (not a system implicit
//   broadcast, so none of the above restriction applies) sent by the
//   alert's notification Stop button -- this one IS manifest-registered
//   (see AndroidManifest.xml) so dismissal works even if BleRingScanService
//   isn't currently alive to hold a dynamic registration.
// Purely local otherwise: no BLE/SMS/push, no partner involved at all, each
// phone just watches and alarms its own holder.
class BatteryMonitorReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      BatteryAlertConstants.STOP_ACTION -> BatteryAlertReactor.stop(context.applicationContext)
      Intent.ACTION_BATTERY_CHANGED -> handleBatteryChanged(context, intent)
    }
  }

  private fun handleBatteryChanged(context: Context, intent: Intent) {
    val level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
    val scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
    if (level < 0 || scale <= 0) return
    val percent = level * 100 / scale

    val status = intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1)
    val plugged = intent.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0)
    val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
      status == BatteryManager.BATTERY_STATUS_FULL ||
      plugged != 0

    val prefs = context.getSharedPreferences(BatteryAlertConstants.PREFS_NAME, Context.MODE_PRIVATE)
    val lastAlerted = prefs.getInt(BatteryAlertConstants.PREFS_LAST_ALERTED_KEY, BatteryAlertConstants.NO_THRESHOLD_ALERTED)

    if (isCharging) {
      // Reset so the next discharge cycle alerts from 20% again, rather
      // than staying suppressed forever because a threshold was already
      // hit before the last charge.
      if (lastAlerted != BatteryAlertConstants.NO_THRESHOLD_ALERTED) {
        prefs.edit().putInt(BatteryAlertConstants.PREFS_LAST_ALERTED_KEY, BatteryAlertConstants.NO_THRESHOLD_ALERTED).apply()
      }
      return
    }

    // The most urgent (lowest) threshold already reached -- collapses a
    // fast multi-threshold drop (e.g. device asleep, wakes up at 3%) into
    // one alert for the most severe threshold instead of replaying every
    // intermediate one.
    val mostUrgent = BatteryAlertConstants.THRESHOLDS.filter { percent <= it }.minOrNull() ?: return
    if (mostUrgent >= lastAlerted) return

    Log.d(TAG, "Battery at $percent%, alerting for $mostUrgent% threshold")
    prefs.edit().putInt(BatteryAlertConstants.PREFS_LAST_ALERTED_KEY, mostUrgent).apply()
    BatteryAlertReactor.trigger(context.applicationContext, mostUrgent, percent)
  }

  companion object {
    private const val TAG = "BatteryMonitorReceiver"
  }
}
