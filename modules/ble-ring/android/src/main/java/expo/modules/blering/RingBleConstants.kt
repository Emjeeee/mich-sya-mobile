package expo.modules.blering

import java.util.UUID

// A random, fixed UUID unique to MichSya -- both phones must share this
// exact value. Sender advertises it (connectionless), receiver scans for it.
object RingBleConstants {
  val SERVICE_UUID: UUID = UUID.fromString("8f6a2e2e-6c2b-4a7d-9b6a-2e2e6c2b4a7d")
  const val ADVERTISE_DURATION_MS = 6000L
  const val SCAN_NOTIFICATION_CHANNEL_ID = "michsya-ble-scan"
  const val SCAN_NOTIFICATION_ID = 9188
  const val RING_NOTIFICATION_CHANNEL_ID = "michsya-ble-ring"
  const val RING_NOTIFICATION_ID = 9189

  // A fixed marker unique enough not to collide with a normal text, checked
  // as a substring so the message can still read as a friendly notification
  // if the partner happens to see it in their normal SMS app (SmsRingReceiver
  // observes the broadcast but doesn't suppress the OS's own SMS handling).
  const val SMS_TRIGGER_MARKER = "MICHSYA_RING_7f3a9c"
  const val SMS_TRIGGER_MESSAGE = "💕 [MichSya] Pasanganmu lagi coba membunyikan HP kamu. $SMS_TRIGGER_MARKER"

  // Torch ("Nyalain senter pasangan") -- same idea as the ring marker above,
  // plus a ":kind:..." suffix SmsRingReceiver parses to know which blink
  // pattern to play. No emoji here on purpose: emoji forces UCS-2 SMS
  // encoding with a much smaller per-segment character budget, which is
  // exactly what caused the ring marker to get split across two SMS parts
  // and silently never match -- kept plain GSM-7 text here to stay
  // comfortably inside a single SMS segment even with the pattern suffix.
  const val SMS_TORCH_TRIGGER_MARKER = "MICHSYA_TORCH_7f3a9c"
  const val SMS_TORCH_MESSAGE_PREFIX = "[MichSya] Pasanganmu lagi coba nyalain senter HP kamu. $SMS_TORCH_TRIGGER_MARKER"

  const val TORCH_NOTIFICATION_CHANNEL_ID = "michsya-torch"
  const val TORCH_NOTIFICATION_ID = 9190
  const val TORCH_AUTO_OFF_MS = 30_000L
  const val TORCH_STOP_ACTION = "expo.modules.blering.ACTION_STOP_TORCH"
}
