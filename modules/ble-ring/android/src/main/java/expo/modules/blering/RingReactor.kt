package expo.modules.blering

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log

// The actual "ring the phone" reaction, shared by both the BLE scan service
// and the SMS trigger receiver. Deliberately pure native code with zero
// dependency on the JS engine being alive -- see BleRingScanService for why
// that matters here. A singleton object since only one ring can reasonably
// be active at a time.
object RingReactor {
  private const val TAG = "RingReactor"
  private var mediaPlayer: MediaPlayer? = null
  private var vibrator: Vibrator? = null

  fun trigger(context: Context) {
    playRingtone(context)
    vibrate(context)
    showRingNotification(context)
  }

  fun stop(context: Context) {
    mediaPlayer?.let {
      it.stop()
      it.release()
    }
    mediaPlayer = null
    // vibrate()'s waveform loops indefinitely (repeat index 0) until
    // explicitly cancelled -- without this the phone kept vibrating forever
    // after "Stop" was tapped, since only the ringtone was ever stopped here.
    vibrator?.cancel()
    vibrator = null
    context.getSystemService(NotificationManager::class.java).cancel(RingBleConstants.RING_NOTIFICATION_ID)
  }

  private fun playRingtone(context: Context) {
    if (mediaPlayer != null) return
    if (RingPreferences.isSilent(context)) return // vibrate()/notification/activity still happen
    try {
      // MediaPlayer.create()'s factory already prepares the player against
      // the default stream before returning, so a setAudioAttributes() call
      // afterward doesn't reliably re-route the already-prepared session on
      // every device -- confirmed live via dumpsys audio, which showed the
      // player stuck on usage=USAGE_UNKNOWN despite this call, so it played
      // on a stream that happened to be muted instead of alarm (audible
      // regardless of ringer/silent/vibrate mode, same as an alarm clock).
      // Building the player manually and setting attributes before prepare()
      // is the order that actually applies them.
      val player = MediaPlayer()
      player.setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
      )
      val afd = context.resources.openRawResourceFd(R.raw.marimba)
      player.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
      afd.close()
      player.isLooping = true
      player.prepare()
      player.start()
      mediaPlayer = player
    } catch (e: Exception) {
      Log.w(TAG, "Failed to play native ringtone", e)
    }
  }

  private fun vibrate(context: Context) {
    val pattern = longArrayOf(0, 400, 200, 400, 200, 400)
    val v: Vibrator
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      v = (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
      v.vibrate(VibrationEffect.createWaveform(pattern, 0))
    } else {
      @Suppress("DEPRECATION")
      v = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        v.vibrate(VibrationEffect.createWaveform(pattern, 0))
      } else {
        @Suppress("DEPRECATION")
        v.vibrate(pattern, 0)
      }
    }
    vibrator = v
  }

  private fun showRingNotification(context: Context) {
    val silent = RingPreferences.isSilent(context)
    val channelId = if (silent) RingBleConstants.RING_NOTIFICATION_CHANNEL_ID_SILENT else RingBleConstants.RING_NOTIFICATION_CHANNEL_ID
    val manager = context.getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        channelId,
        if (silent) "Bunyikan HP (senyap)" else "Bunyikan HP",
        NotificationManager.IMPORTANCE_HIGH
      )
      // A freshly created channel defaults to the system notification sound
      // unless explicitly silenced -- vibration is left at its default
      // (still enabled for HIGH importance) since only sound should be
      // suppressed here.
      if (silent) channel.setSound(null, null)
      manager.createNotificationChannel(channel)
    }

    // A raw context.startActivity() call from this background context (the
    // BLE scan service / SMS receiver, not a foreground component) gets
    // silently blocked by Android's background-activity-start restriction
    // (confirmed via logcat on the equivalent battery-alert code path:
    // "Background activity start ... isBgStartWhitelisted: false") --
    // Notification.setFullScreenIntent is the OS-sanctioned way to still
    // show a full-screen Activity from here, exempted from that
    // restriction, and it degrades gracefully to a heads-up banner instead
    // of interrupting when the device is already unlocked/in active use.
    val contentIntent = PendingIntent.getActivity(
      context,
      0,
      Intent(context, NativeRingAlertActivity::class.java),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val notification = Notification.Builder(context, channelId)
      .setContentTitle("HP kamu lagi dibunyiin pasangan 🔊")
      .setContentText("Terdeteksi tanpa internet. Ketuk untuk mematikan.")
      .setSmallIcon(context.applicationInfo.icon)
      .setContentIntent(contentIntent)
      .setFullScreenIntent(contentIntent, true)
      .setAutoCancel(true)
      .setOngoing(true)
      .build()

    manager.notify(RingBleConstants.RING_NOTIFICATION_ID, notification)
  }
}
