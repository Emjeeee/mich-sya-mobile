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
import android.content.IntentFilter
import android.os.Build
import android.os.IBinder
import android.os.ParcelUuid
import android.util.Log
import androidx.core.content.ContextCompat

// Runs continuously in the background (started at app launch and on boot)
// scanning for a nearby phone's ring advertisement. See RingReactor for the
// actual (deliberately native, JS-independent) reaction.
class BleRingScanService : Service() {
  private var lastTriggeredAt = 0L
  private val batteryMonitor = BatteryMonitorReceiver()
  private var batteryMonitorRegistered = false
  private var foregroundFailed = false

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    isRunning = true

    // ACTION_BATTERY_CHANGED is a sticky broadcast that Android's own docs
    // say can ONLY be received via a dynamically-registered receiver, never
    // a manifest-declared one -- unlike BOOT_COMPLETED/SMS_RECEIVED above,
    // which do work via the manifest. This service is already the
    // long-lived, boot-started foreground service the ring feature depends
    // on, so it doubles as the "always alive" host the battery monitor
    // needs too, rather than inventing a second persistence mechanism.
    // Registered before the risky startForeground() below so a missing
    // Bluetooth permission doesn't also take battery monitoring down with
    // it (even though both still share this service's lifecycle overall).
    try {
      registerReceiver(batteryMonitor, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
      batteryMonitorRegistered = true
    } catch (e: Exception) {
      Log.w(TAG, "Could not register battery monitor", e)
    }

    try {
      startForeground(RingBleConstants.SCAN_NOTIFICATION_ID, buildScanningNotification())
    } catch (e: Exception) {
      // Missing Bluetooth permission. stopSelf() here would break the
      // startForegroundService() contract (crash), so just stay idle;
      // onStartCommand stops us if we were not started that way. BootReceiver
      // pre-checks permissions so this should be rare.
      Log.w(TAG, "Could not start foreground service, staying idle", e)
      isRunning = false
      foregroundFailed = true
      return
    }
    startScan()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (foregroundFailed) {
      // A null intent means a sticky restart, not a fresh startForegroundService() call.
      if (intent == null) stopSelf()
      return START_NOT_STICKY
    }
    return START_STICKY
  }

  override fun onDestroy() {
    isRunning = false
    stopScan()
    if (batteryMonitorRegistered) {
      try {
        unregisterReceiver(batteryMonitor)
      } catch (e: Exception) {
        // Already unregistered or never successfully registered -- fine.
      }
    }
    super.onDestroy()
  }

  private fun scanner() =
    (getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter?.bluetoothLeScanner

  private val scanCallback = object : ScanCallback() {
    override fun onScanResult(callbackType: Int, result: ScanResult?) {
      val payload = result?.scanRecord?.getServiceData(ParcelUuid(RingBleConstants.SERVICE_UUID))

      // Ring stop (type 3) runs before the cooldown below so a stop sent
      // right after a ring isn't swallowed by that ring's cooldown.
      if (payload != null && payload.isNotEmpty() && payload[0].toInt() == 3) {
        val stopId = RingIdMemory.fromPayload(payload)
        Log.d(TAG, "Ring stop advertisement detected, stopping ring")
        if (stopId != null) RingIdMemory.markStopped(stopId)
        RingReactor.stopRemote(applicationContext)
        return
      }

      val now = System.currentTimeMillis()
      // The sender advertises for several seconds -- ignore repeat sightings
      // of the same burst so we don't re-trigger the alert on every scan tick.
      if (now - lastTriggeredAt < RETRIGGER_COOLDOWN_MS) return
      lastTriggeredAt = now

      // Service data layout (see BleRingModule.torchPayload): byte 0 is the
      // event type (0=ring, 1=torch, 3=ring stop; 2 is reserved); no data at
      // all (older advertiser) also means ring. Ring bytes 1-2 are an
      // optional ring id.
      if (payload == null || payload.isEmpty() || payload[0].toInt() == 0) {
        val ringId = if (payload != null) RingIdMemory.fromPayload(payload) else null
        if (ringId != null && RingIdMemory.shouldIgnoreRing(ringId)) {
          Log.d(TAG, "Ring advertisement ignored (already stopped or handled)")
          return
        }
        Log.d(TAG, "Ring advertisement detected, triggering alert")
        RingReactor.trigger(applicationContext)
        return
      }

      val kind = when (payload.getOrElse(1) { 1 }.toInt()) {
        0 -> "steady"
        2 -> "fast"
        3 -> "sos"
        4 -> "custom"
        5 -> "stop"
        else -> "slow"
      }

      if (kind == "stop") {
        Log.d(TAG, "Torch stop advertisement detected, stopping torch")
        TorchBlinkService.requestStop(applicationContext)
        return
      }

      val onMs = if (payload.size >= 4) (payload[2].toInt() and 0xFF) or ((payload[3].toInt() and 0xFF) shl 8) else null
      val offMs = if (payload.size >= 6) (payload[4].toInt() and 0xFF) or ((payload[5].toInt() and 0xFF) shl 8) else null

      Log.d(TAG, "Torch advertisement detected ($kind), triggering torch")
      val intent = Intent(applicationContext, TorchBlinkService::class.java).apply {
        putExtra("kind", kind)
        if (onMs != null) putExtra("onMs", onMs.toLong())
        if (offMs != null) putExtra("offMs", offMs.toLong())
      }
      try {
        ContextCompat.startForegroundService(applicationContext, intent)
      } catch (e: Exception) {
        Log.w(TAG, "Could not start torch service", e)
      }
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
