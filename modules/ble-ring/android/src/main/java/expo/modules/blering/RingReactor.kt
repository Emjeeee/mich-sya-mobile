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

  fun trigger(context: Context) {
    playRingtone(context)
    vibrate(context)
    showRingAlertActivity(context)
    showRingNotification(context)
  }

  fun stop(context: Context) {
    mediaPlayer?.let {
      it.stop()
      it.release()
    }
    mediaPlayer = null
    context.getSystemService(NotificationManager::class.java).cancel(RingBleConstants.RING_NOTIFICATION_ID)
  }

  private fun playRingtone(context: Context) {
    if (mediaPlayer != null) return
    try {
      val player = MediaPlayer.create(context, R.raw.ring)
      player.isLooping = true
      player.setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
      )
      player.start()
      mediaPlayer = player
    } catch (e: Exception) {
      Log.w(TAG, "Failed to play native ringtone", e)
    }
  }

  private fun vibrate(context: Context) {
    val pattern = longArrayOf(0, 400, 200, 400, 200, 400)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val vibrator = (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
      vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0))
    } else {
      @Suppress("DEPRECATION")
      val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0))
      } else {
        @Suppress("DEPRECATION")
        vibrator.vibrate(pattern, 0)
      }
    }
  }

  private fun showRingAlertActivity(context: Context) {
    val intent = Intent(context, NativeRingAlertActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or
        Intent.FLAG_ACTIVITY_CLEAR_TOP or
        Intent.FLAG_ACTIVITY_SINGLE_TOP
    }
    context.startActivity(intent)
  }

  private fun showRingNotification(context: Context) {
    val manager = context.getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(
          RingBleConstants.RING_NOTIFICATION_CHANNEL_ID,
          "Bunyikan HP",
          NotificationManager.IMPORTANCE_HIGH
        )
      )
    }

    val contentIntent = PendingIntent.getActivity(
      context,
      0,
      Intent(context, NativeRingAlertActivity::class.java),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val notification = Notification.Builder(context, RingBleConstants.RING_NOTIFICATION_CHANNEL_ID)
      .setContentTitle("HP kamu lagi dibunyiin pasangan 🔊")
      .setContentText("Terdeteksi tanpa internet. Ketuk untuk mematikan.")
      .setSmallIcon(context.applicationInfo.icon)
      .setContentIntent(contentIntent)
      .setAutoCancel(true)
      .setOngoing(true)
      .build()

    manager.notify(RingBleConstants.RING_NOTIFICATION_ID, notification)
  }
}
