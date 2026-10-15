package expo.modules.blering

// Short-lived memory of ring ids shared by the BLE, SMS and push paths, so a
// late/duplicate ring can't re-trigger after a stop, or ring twice because
// the same ring arrived over a second channel. Ids are 16-bit (1..65535);
// null means "no id" (older build) and is never remembered.
object RingIdMemory {
  private const val TTL_MS = 120_000L
  private const val MAX_ENTRIES = 10
  private val stopped = LinkedHashMap<Int, Long>()
  private val handled = LinkedHashMap<Int, Long>()

  private fun prune(map: LinkedHashMap<Int, Long>, now: Long) {
    val iterator = map.entries.iterator()
    while (iterator.hasNext()) {
      if (now - iterator.next().value > TTL_MS) iterator.remove()
    }
    while (map.size > MAX_ENTRIES) {
      val eldest = map.keys.iterator().next()
      map.remove(eldest)
    }
  }

  @Synchronized
  fun markStopped(id: Int) {
    val now = System.currentTimeMillis()
    stopped[id] = now
    prune(stopped, now)
  }

  // True if this ring must be ignored (already stopped, or already handled
  // via another channel). Otherwise records it as handled and returns false.
  @Synchronized
  fun shouldIgnoreRing(id: Int): Boolean {
    val now = System.currentTimeMillis()
    prune(stopped, now)
    prune(handled, now)
    if (stopped.containsKey(id) || handled.containsKey(id)) return true
    handled[id] = now
    return false
  }

  // Bytes 1-2 of a BLE ring/stop payload, little-endian; null if absent or 0.
  fun fromPayload(payload: ByteArray): Int? {
    if (payload.size < 3) return null
    val value = (payload[1].toInt() and 0xFF) or ((payload[2].toInt() and 0xFF) shl 8)
    return if (value == 0) null else value
  }

  // Parses the optional ":<id>" suffix that follows an SMS marker.
  fun fromSmsSuffix(suffix: String): Int? {
    val digits = suffix.removePrefix(":").takeWhile { it.isDigit() }
    val value = digits.toIntOrNull() ?: return null
    return if (value in 1..65535) value else null
  }
}
