package expo.modules.blering

import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.ParcelUuid
import android.telephony.SmsManager
import androidx.core.content.ContextCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class BleRingModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("BleRing")

    AsyncFunction("broadcastRing") { promise: Promise ->
      broadcastRing(promise)
    }

    AsyncFunction("startScanning") { promise: Promise ->
      ContextCompat.startForegroundService(context, Intent(context, BleRingScanService::class.java))
      promise.resolve(true)
    }

    AsyncFunction("stopScanning") { promise: Promise ->
      context.stopService(Intent(context, BleRingScanService::class.java))
      promise.resolve(null)
    }

    AsyncFunction("isScanning") { promise: Promise ->
      promise.resolve(BleRingScanService.isRunning)
    }

    AsyncFunction("sendRingSms") { phoneNumber: String, promise: Promise ->
      sendRingSms(phoneNumber, promise)
    }
  }

  private fun sendRingSms(phoneNumber: String, promise: Promise) {
    try {
      val smsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        context.getSystemService(SmsManager::class.java)
      } else {
        @Suppress("DEPRECATION")
        SmsManager.getDefault()
      }
      smsManager.sendTextMessage(phoneNumber, null, RingBleConstants.SMS_TRIGGER_MESSAGE, null, null)
      promise.resolve(true)
    } catch (e: Exception) {
      // Missing SEND_SMS permission, no SIM/radio, invalid number, etc.
      promise.resolve(false)
    }
  }

  private fun broadcastRing(promise: Promise) {
    val adapter = (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter
    if (adapter == null || !adapter.isEnabled) {
      promise.resolve(false)
      return
    }

    val advertiser = adapter.bluetoothLeAdvertiser
    if (advertiser == null) {
      promise.resolve(false)
      return
    }

    val settings = AdvertiseSettings.Builder()
      .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
      .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
      .setConnectable(false)
      .build()

    val data = AdvertiseData.Builder()
      .setIncludeDeviceName(false)
      .addServiceUuid(ParcelUuid(RingBleConstants.SERVICE_UUID))
      .build()

    var resolved = false
    val callback = object : AdvertiseCallback() {
      override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
        if (!resolved) {
          resolved = true
          promise.resolve(true)
        }
      }

      override fun onStartFailure(errorCode: Int) {
        if (!resolved) {
          resolved = true
          promise.resolve(false)
        }
      }
    }

    try {
      advertiser.startAdvertising(settings, data, callback)
    } catch (e: SecurityException) {
      // BLUETOOTH_ADVERTISE not granted -- caller is expected to have
      // requested it via PermissionsAndroid before calling this.
      if (!resolved) {
        resolved = true
        promise.resolve(false)
      }
      return
    }

    Handler(Looper.getMainLooper()).postDelayed({
      try {
        advertiser.stopAdvertising(callback)
      } catch (e: SecurityException) {
        // Already stopped or permission revoked mid-flight -- nothing to do.
      }
    }, RingBleConstants.ADVERTISE_DURATION_MS)
  }
}
