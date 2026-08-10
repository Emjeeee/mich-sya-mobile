package expo.modules.blering

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log

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
      val matched = fullBody.contains(RingBleConstants.SMS_TRIGGER_MARKER)
      if (matched) {
        Log.d(TAG, "Ring SMS detected, triggering alert")
        RingReactor.trigger(context.applicationContext)
      }
    } catch (e: Exception) {
      Log.w(TAG, "Failed to process incoming SMS", e)
    }
  }

  companion object {
    private const val TAG = "SmsRingReceiver"
  }
}
