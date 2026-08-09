package expo.modules.blering

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.ParcelUuid
import android.util.Log

// Runs continuously in the background (started at app launch and on boot)
// scanning for a nearby phone's ring advertisement. See RingReactor for the
// actual (deliberately native, JS-independent) reaction.
class BleRingScanService : Service() {
  private var lastTriggeredAt = 0L

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    isRunning = true
    try {
      startForeground(RingBleConstants.SCAN_NOTIFICATION_ID, buildScanningNotification())
    } catch (e: Exception) {
      // Missing Bluetooth permission (e.g. boot-started before the app was
      // ever opened to grant it) -- give up quietly rather than crash.
      Log.w(TAG, "Could not start foreground service, stopping", e)
      isRunning = false
      stopSelf()
      return
    }
    startScan()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    return START_STICKY
  }

  override fun onDestroy() {
    isRunning = false
    stopScan()
    super.onDestroy()
  }

  private fun scanner() =
    (getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter?.bluetoothLeScanner

  private val scanCallback = object : ScanCallback() {
    override fun onScanResult(callbackType: Int, result: ScanResult?) {
      val now = System.currentTimeMillis()
      // The sender advertises for several seconds -- ignore repeat sightings
      // of the same burst so we don't re-trigger the alert on every scan tick.
      if (now - lastTriggeredAt < RETRIGGER_COOLDOWN_MS) return
      lastTriggeredAt = now
      Log.d(TAG, "Ring advertisement detected, triggering alert")
      RingReactor.trigger(applicationContext)
    }

    override fun onScanFailed(errorCode: Int) {
      Log.w(TAG, "BLE scan failed: $errorCode")
    }
  }

  private fun startScan() {
    val bleScanner = scanner() ?: return
    val filter = ScanFilter.Builder()
      .setServiceUuid(ParcelUuid(RingBleConstants.SERVICE_UUID))
      .build()
    val settings = ScanSettings.Builder()
      .setScanMode(ScanSettings.SCAN_MODE_LOW_POWER)
      .build()
    try {
      bleScanner.startScan(listOf(filter), settings, scanCallback)
    } catch (e: SecurityException) {
      Log.w(TAG, "Missing BLUETOOTH_SCAN permission, cannot scan", e)
    }
  }

  private fun stopScan() {
    try {
      scanner()?.stopScan(scanCallback)
    } catch (e: SecurityException) {
      // Nothing to do -- permission was revoked or adapter is off.
    }
  }

  private fun buildScanningNotification(): Notification {
    val manager = getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(
          RingBleConstants.SCAN_NOTIFICATION_CHANNEL_ID,
          "MichSya (pemantauan latar belakang)",
          NotificationManager.IMPORTANCE_MIN
        )
      )
    }

    return Notification.Builder(this, RingBleConstants.SCAN_NOTIFICATION_CHANNEL_ID)
      .setContentTitle("MichSya")
      .setContentText("Memantau bunyikan HP tanpa internet (Bluetooth + SMS)")
      .setSmallIcon(applicationInfo.icon)
      .setOngoing(true)
      .build()
  }

  companion object {
    private const val TAG = "BleRingScanService"
    private const val RETRIGGER_COOLDOWN_MS = 10_000L

    @Volatile
    var isRunning: Boolean = false
      private set
  }
}
