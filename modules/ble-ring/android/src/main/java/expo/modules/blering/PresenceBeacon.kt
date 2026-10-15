package expo.modules.blering

import android.Manifest
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.ParcelUuid
import android.util.Log
import androidx.core.content.ContextCompat

// Persistent low-power presence advertisement for "Kencan otomatis":
// service data [2, tag0, tag1, tag2] under the shared SERVICE_UUID, where the
// tag is derived from the couple id so only the partner's phone matches.
// Runs on the main thread (service callbacks / main-looper posts), and every
// Bluetooth call is guarded -- never throws.
object PresenceBeacon {
  private const val TAG = "PresenceBeacon"

  private var callback: AdvertiseCallback? = null
  private var advertiser: BluetoothLeAdvertiser? = null
  // Counter, not a flag: one-shot ring/torch broadcasts can overlap.
  private var oneShotCount = 0

  fun refresh(context: Context) {
    stop()
    if (oneShotCount > 0) return
    try {
      val tag = AutoDatePreferences.tagBytes(context) ?: return
      if (!AutoDatePreferences.isEnabled(context)) return
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
        ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_ADVERTISE) !=
        PackageManager.PERMISSION_GRANTED
      ) {
        Log.w(TAG, "Missing BLUETOOTH_ADVERTISE, presence beacon off")
        return
      }
      val adapter = (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter
      if (adapter == null || !adapter.isEnabled) return
      val adv = adapter.bluetoothLeAdvertiser ?: return

      val settings = AdvertiseSettings.Builder()
        .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_POWER)
        .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM)
        .setConnectable(false)
        .setTimeout(0)
        .build()
      val payload = byteArrayOf(2, tag[0], tag[1], tag[2])
      val data = AdvertiseData.Builder()
        .setIncludeDeviceName(false)
        .addServiceUuid(ParcelUuid(RingBleConstants.SERVICE_UUID))
        .addServiceData(ParcelUuid(RingBleConstants.SERVICE_UUID), payload)
        .build()

      val cb = object : AdvertiseCallback() {
        override fun onStartFailure(errorCode: Int) {
          Log.w(TAG, "Presence advertising failed: $errorCode")
          // Lets ensure() retry on the next service tick.
          if (callback === this) callback = null
        }
      }
      callback = cb
      advertiser = adv
      adv.startAdvertising(settings, data, cb)
    } catch (e: Exception) {
      Log.w(TAG, "Could not start presence beacon", e)
      callback = null
    }
  }

  fun ensure(context: Context) {
    if (callback == null) refresh(context)
  }

  fun stop() {
    try {
      val cb = callback
      if (cb != null) advertiser?.stopAdvertising(cb)
    } catch (e: Exception) {
      // Bluetooth turned off or permission revoked -- already stopped.
    }
    callback = null
    advertiser = null
  }

  // Some chipsets allow only one concurrent advertiser, so the one-shot
  // ring/torch/stop broadcast (BleRingModule) takes over briefly.
  fun suspendForOneShot() {
    oneShotCount++
    stop()
  }

  fun resumeAfterOneShot(context: Context) {
    if (oneShotCount > 0) oneShotCount--
    if (oneShotCount == 0 && BleRingScanService.isRunning) refresh(context)
  }
}
