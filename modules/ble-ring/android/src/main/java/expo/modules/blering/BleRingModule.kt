package expo.modules.blering

import android.app.NotificationManager
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.ParcelUuid
import android.provider.Settings
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

    // Per-device "silent ring" preference -- see RingPreferences for why
    // this exists (tied to a specific account, set from the JS side on
    // sign-in) and RingReactor for how the native BLE/SMS path reads it
    // directly; these two functions are only needed so the JS push-channel
    // path (ringtone.ts / backgroundNotifications.ts) can read/write the
    // same value.
    AsyncFunction("setSilentRing") { silent: Boolean, promise: Promise ->
      RingPreferences.setSilent(context, silent)
      promise.resolve(true)
    }

    AsyncFunction("isSilentRing") { promise: Promise ->
      promise.resolve(RingPreferences.isSilent(context))
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

    // Same idea as triggerTorch above, for the push channel's "ring"
    // payload. Reuses RingReactor -- the exact sound/vibrate/full-screen
    // engine the BLE/SMS receivers already use -- instead of a JS-side
    // audio player, which only bypasses Android's ringer mode (silent/
    // vibrate) and not a separately muted media/music stream. RingReactor
    // routes explicit playback to the ALARM stream, which is the fix that
    // made BLE/SMS-triggered ring audible regardless of the device's media
    // volume.
    AsyncFunction("triggerRing") { promise: Promise ->
      try {
        RingReactor.trigger(context)
        promise.resolve(true)
      } catch (e: Exception) {
        promise.resolve(false)
      }
    }

    // Lets RingAlertScreen (the full-screen swipe-to-dismiss UI shown while
    // the app is alive, driven by ringSignal.ts) stop the actual native
    // sound/vibration/notification a push-triggered ring started via
    // triggerRing() above.
    AsyncFunction("stopRing") { promise: Promise ->
      RingReactor.stop(context)
      promise.resolve(true)
    }

    // Push channel's bridge for remotely stopping the *other* device's
    // torch -- see TorchBlinkService.requestStop() for why this can't just
    // be "start the service with the stop action" inline (ANR risk if the
    // service isn't already running).
    AsyncFunction("stopTorch") { promise: Promise ->
      try {
        TorchBlinkService.requestStop(context)
        promise.resolve(true)
      } catch (e: Exception) {
        promise.resolve(false)
      }
    }

    // android.permission.ACCESS_NOTIFICATION_POLICY alone isn't enough --
    // AudioManager.setRingerMode()/adjustStreamVolume() on STREAM_RING also
    // need the user to have granted this app "Do Not Disturb access" via
    // system Settings (a special-access toggle, not a normal runtime
    // permission -- can't be requested through PermissionsAndroid the way
    // BLE/SMS/camera are in bleRing.ts). Checked on whichever device is
    // about to be remotely controlled, i.e. the partner's, not the
    // controlling account's.
    AsyncFunction("hasRemoteControlAccess") { promise: Promise ->
      val nm = context.getSystemService(NotificationManager::class.java)
      promise.resolve(nm.isNotificationPolicyAccessGranted)
    }

    // Can't grant this programmatically -- opens the system settings screen
    // for the user to flip the toggle themselves. Interactive, so this must
    // only be called from a foreground context with a visible Activity.
    AsyncFunction("requestRemoteControlAccess") { promise: Promise ->
      try {
        val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS).apply {
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
        promise.resolve(true)
      } catch (e: Exception) {
        promise.resolve(false)
      }
    }

    // Sets *this* device's own ringer mode -- called on the receiving end
    // of a "set_ringer_mode" push from the controlling account. Resolves
    // false (rather than letting a SecurityException escape) if DND access
    // hasn't been granted yet, or the mode string isn't recognized.
    AsyncFunction("setRingerMode") { mode: String, promise: Promise ->
      try {
        val nm = context.getSystemService(NotificationManager::class.java)
        if (!nm.isNotificationPolicyAccessGranted) {
          promise.resolve(false)
          return@AsyncFunction
        }
        val ringerMode = when (mode) {
          "normal" -> AudioManager.RINGER_MODE_NORMAL
          "vibrate" -> AudioManager.RINGER_MODE_VIBRATE
          "silent" -> AudioManager.RINGER_MODE_SILENT
          else -> null
        }
        if (ringerMode == null) {
          promise.resolve(false)
          return@AsyncFunction
        }
        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        am.ringerMode = ringerMode
        promise.resolve(true)
      } catch (e: Exception) {
        promise.resolve(false)
      }
    }

    // Raises/lowers this device's own ring volume by one step -- same DND
    // access gate as setRingerMode above (adjusting STREAM_RING can hit the
    // same restriction when it would affect DND state). No FLAG_SHOW_UI --
    // this device's owner isn't the one who triggered the change, so the
    // system volume overlay popping up unprompted would be confusing.
    AsyncFunction("adjustRingerVolume") { direction: String, promise: Promise ->
      try {
        val nm = context.getSystemService(NotificationManager::class.java)
        if (!nm.isNotificationPolicyAccessGranted) {
          promise.resolve(false)
          return@AsyncFunction
        }
        val adjustment = when (direction) {
          "up" -> AudioManager.ADJUST_RAISE
          "down" -> AudioManager.ADJUST_LOWER
          else -> null
        }
        if (adjustment == null) {
          promise.resolve(false)
          return@AsyncFunction
        }
        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        am.adjustStreamVolume(AudioManager.STREAM_RING, adjustment, 0)
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
    "stop" -> 5
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
