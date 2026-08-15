package expo.modules.blering

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import androidx.core.content.ContextCompat

// Fallback for the case where a phone has full cellular signal but no
// internet/data connection -- SMS still goes through the carrier network
// independent of internet, so it works as a longer-range alternative to the
// close-proximity Bluetooth path. Reacts entirely natively (see RingReactor)
// for the same reliability reason as the BLE path -- no JS engine required.
class SmsRingReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

    try {
      // getMessagesFromIntent() returns one SmsMessage per PDU part of a
      // multi-part SMS -- SMS_TRIGGER_MESSAGE contains an emoji, which forces
      // UCS-2 encoding (a ~67-char/segment cap vs. GSM-7's 160), so the
      // marker at the tail of the message is split across two parts and
      // never appears whole in any single part's messageBody. Concatenating
      // all parts in order before matching is the standard fix.
      val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
      val fullBody = messages.joinToString("") { it.messageBody ?: "" }

      if (fullBody.contains(RingBleConstants.SMS_TRIGGER_MARKER)) {
        Log.d(TAG, "Ring SMS detected, triggering alert")
        RingReactor.trigger(context.applicationContext)
        return
      }

      val torchIndex = fullBody.indexOf(RingBleConstants.SMS_TORCH_TRIGGER_MARKER)
      if (torchIndex >= 0) {
        // Suffix after the marker is ":<kind>" for presets or
        // ":custom:<onMs>:<offMs>" -- see BleRingModule.sendTorchSms.
        val suffix = fullBody.substring(torchIndex + RingBleConstants.SMS_TORCH_TRIGGER_MARKER.length)
        val parts = suffix.trimStart(':').split(":")
        val kind = parts.getOrNull(0)?.takeIf { it.isNotBlank() } ?: "slow"

        if (kind == "stop") {
          Log.d(TAG, "Torch stop SMS detected, stopping torch")
          TorchBlinkService.requestStop(context.applicationContext)
          return
        }

        val onMs = parts.getOrNull(1)?.toLongOrNull()
        val offMs = parts.getOrNull(2)?.toLongOrNull()

        Log.d(TAG, "Torch SMS detected ($kind), triggering torch")
        val serviceIntent = Intent(context.applicationContext, TorchBlinkService::class.java).apply {
          putExtra("kind", kind)
          if (onMs != null) putExtra("onMs", onMs)
          if (offMs != null) putExtra("offMs", offMs)
        }
        ContextCompat.startForegroundService(context.applicationContext, serviceIntent)
      }
    } catch (e: Exception) {
      Log.w(TAG, "Failed to process incoming SMS", e)
    }
  }

  companion object {
    private const val TAG = "SmsRingReceiver"
  }
}
