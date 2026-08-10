package expo.modules.blering

object BatteryAlertConstants {
  // Descending on purpose -- BatteryMonitorReceiver relies on iterating
  // these to find the most urgent (lowest) threshold crossed.
  val THRESHOLDS = listOf(20, 15, 10, 5, 2)

  const val PREFS_NAME = "michsya_battery_alert"
  const val PREFS_LAST_ALERTED_KEY = "lastAlertedThreshold"
  const val NO_THRESHOLD_ALERTED = 100 // sentinel: nothing alerted this discharge cycle yet

  const val NOTIFICATION_CHANNEL_ID = "michsya-battery-alert"
  const val NOTIFICATION_ID = 9191
  const val STOP_ACTION = "expo.modules.blering.ACTION_STOP_BATTERY_ALERT"
}
