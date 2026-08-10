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
      // Event type 0 = ring, no further payload needed.
      broadcastEvent(byteArrayOf(0), promise)
    }

    AsyncFunction("broadcastTorch") { kind: String, onMs: Int?, offMs: Int?, promise: Promise ->
      broadcastEvent(torchPayload(kind, onMs, offMs), promise)
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
      sendSms(phoneNumber, RingBleConstants.SMS_TRIGGER_MESSAGE, promise)
    }

    AsyncFunction("sendTorchSms") { phoneNumber: String, kind: String, onMs: Int?, offMs: Int?, promise: Promise ->
      val suffix = if (kind == "custom") ":custom:${onMs ?: 250}:${offMs ?: 250}" else ":$kind"
      sendSms(phoneNumber, RingBleConstants.SMS_TORCH_MESSAGE_PREFIX + suffix, promise)
    }

    // Push-triggered torch has no BLE/SMS payload to decode -- this just
    // starts the same TorchBlinkService the BLE/SMS receivers start
    // directly, so all three channels share one blink engine.
    AsyncFunction("triggerTorch") { kind: String, onMs: Int?, offMs: Int?, promise: Promise ->
      try {
        val intent = Intent(context, TorchBlinkService::class.java).apply {
          putExtra("kind", kind)
          if (onMs != null) putExtra("onMs", onMs.toLong())
          if (offMs != null) putExtra("offMs", offMs.toLong())
        }
        ContextCompat.startForegroundService(context, intent)
        promise.resolve(true)
      } catch (e: Exception) {
        promise.resolve(false)
      }
    }
  }

  private fun patternKindByte(kind: String): Byte = when (kind) {
    "steady" -> 0
    "slow" -> 1
    "fast" -> 2
    "sos" -> 3
    "custom" -> 4
    else -> 1
  }

  // eventType(1) + patternKind(1) + onMsLo/onMsHi + offMsLo/offMsHi -- the
  // last 4 bytes only matter for "custom", zero-filled otherwise.
  private fun torchPayload(kind: String, onMs: Int?, offMs: Int?): ByteArray {
    val on = onMs ?: 0
    val off = offMs ?: 0
    return byteArrayOf(
      1,
      patternKindByte(kind),
      (on and 0xFF).toByte(),
      ((on shr 8) and 0xFF).toByte(),
      (off and 0xFF).toByte(),
      ((off shr 8) and 0xFF).toByte()
    )
  }

  private fun sendSms(phoneNumber: String, message: String, promise: Promise) {
    try {
      val smsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        context.getSystemService(SmsManager::class.java)
      } else {
        @Suppress("DEPRECATION")
        SmsManager.getDefault()
      }
      smsManager.sendTextMessage(phoneNumber, null, message, null, null)
      promise.resolve(true)
    } catch (e: Exception) {
      // Missing SEND_SMS permission, no SIM/radio, invalid number, etc.
      promise.resolve(false)
    }
  }

  private fun broadcastEvent(payload: ByteArray, promise: Promise) {
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
      .addServiceData(ParcelUuid(RingBleConstants.SERVICE_UUID), payload)
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
