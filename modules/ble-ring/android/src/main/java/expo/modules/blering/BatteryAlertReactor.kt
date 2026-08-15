package expo.modules.blering

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log

// Local (single-device) low-battery alarm reaction -- no BLE/SMS/push
// involved at all, see BatteryMonitorReceiver for the trigger side. Mirrors
// RingReactor's shape (MediaPlayer + Vibrator + full-screen Activity +
// dismissible notification), including tracking/cancelling the Vibrator in
// stop() from the start (RingReactor originally forgot this, leaving the
// phone vibrating forever after "Stop" -- fixed there, built in here).
object BatteryAlertReactor {
  private const val TAG = "BatteryAlertReactor"
  private const val VOLUME_RAMP_STEPS = 8
  private const val VOLUME_RAMP_STEP_MS = 500L
  private const val VOLUME_RAMP_START_FRACTION = 0.2f
  private var mediaPlayer: MediaPlayer? = null
  private var vibrator: Vibrator? = null
  private val rampHandler = Handler(Looper.getMainLooper())
  private var rampRunnable: Runnable? = null
  private var originalAlarmVolume: Int? = null

  fun trigger(context: Context, thresholdPercent: Int, currentPercent: Int) {
    playSound(context, thresholdPercent)
    vibrate(context)
    showNotification(context, currentPercent)
  }

  fun stop(context: Context) {
    rampRunnable?.let { rampHandler.removeCallbacks(it) }
    rampRunnable = null
    mediaPlayer?.let {
      it.stop()
      it.release()
    }
    mediaPlayer = null
    vibrator?.cancel()
    vibrator = null
    restoreAlarmVolume(context)
    context.getSystemService(NotificationManager::class.java).cancel(BatteryAlertConstants.NOTIFICATION_ID)
  }

  // See RingReactor's copy of these two for the full rationale -- same
  // "raise the ALARM stream itself, restore it once the alert stops"
  // pattern, so the alert is guaranteed audible (and the per-trigger ramp
  // below perceptible) even if the user had turned the alarm stream down
  // independently of ringer mode.
  private fun raiseAlarmVolume(context: Context) {
    try {
      val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val max = am.getStreamMaxVolume(AudioManager.STREAM_ALARM)
      val current = am.getStreamVolume(AudioManager.STREAM_ALARM)
      if (originalAlarmVolume == null) originalAlarmVolume = current
      if (current < max) am.setStreamVolume(AudioManager.STREAM_ALARM, max, 0)
    } catch (e: Exception) {
      Log.w(TAG, "Failed to raise alarm stream volume", e)
    }
  }

  private fun restoreAlarmVolume(context: Context) {
    val original = originalAlarmVolume ?: return
    originalAlarmVolume = null
    try {
      val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      am.setStreamVolume(AudioManager.STREAM_ALARM, original, 0)
    } catch (e: Exception) {
      Log.w(TAG, "Failed to restore alarm stream volume", e)
    }
  }

  // Ramps from a fraction of this tier's target volume up to the full
  // target (not always up to 1.0, so the existing "sedang" vs "kencang"
  // tier distinction from volumeFor() is preserved) over VOLUME_RAMP_STEPS
  // * VOLUME_RAMP_STEP_MS, then holds -- only needs to run once since the
  // player loops.
  private fun startVolumeRamp(player: MediaPlayer, targetVolume: Float) {
    val start = targetVolume * VOLUME_RAMP_START_FRACTION
    player.setVolume(start, start)
    var step = 0
    val runnable = object : Runnable {
      override fun run() {
        step++
        val level = (start + (targetVolume - start) * (step / VOLUME_RAMP_STEPS.toFloat())).coerceAtMost(targetVolume)
        try {
          player.setVolume(level, level)
        } catch (e: Exception) {
          return // player already released by stop()
        }
        if (step < VOLUME_RAMP_STEPS) rampHandler.postDelayed(this, VOLUME_RAMP_STEP_MS)
      }
    }
    rampRunnable = runnable
    rampHandler.postDelayed(runnable, VOLUME_RAMP_STEP_MS)
  }

  // Every threshold now plays something -- 20% used to be silent
  // (vibrate-only), but per explicit follow-up feedback the alert should
  // make the user aware "dalam kondisi apapun" even at the mildest tier, so
  // 20% got its own quiet-but-audible tier instead of null. Still escalates:
  // 20% = quiet, 15%/10% = "sedang" (medium), 5%/2% = "kencang" (loud) --
  // reuses the existing ring tone asset at different playback volumes
  // rather than sourcing separate sound files for each tier.
  private fun volumeFor(thresholdPercent: Int): Float = when (thresholdPercent) {
    20 -> 0.25f
    15, 10 -> 0.5f
    5, 2 -> 1f
    else -> 0.5f
  }

  private fun playSound(context: Context, thresholdPercent: Int) {
    val volume = volumeFor(thresholdPercent)
    if (mediaPlayer != null) return
    try {
      // See RingReactor.playRingtone() for why attributes are set before
      // prepare() here instead of using the MediaPlayer.create() factory --
      // that order is required for USAGE_ALARM to actually take effect.
      raiseAlarmVolume(context)
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
      startVolumeRamp(player, volume)
    } catch (e: Exception) {
      Log.w(TAG, "Failed to play battery alert sound", e)
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

  private fun showNotification(context: Context, currentPercent: Int) {
    val manager = context.getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(
          BatteryAlertConstants.NOTIFICATION_CHANNEL_ID,
          "Baterai Lemah",
          NotificationManager.IMPORTANCE_HIGH
        )
      )
    }

    // A raw context.startActivity() call from this background context (a
    // dynamically-registered receiver, not a foreground component) gets
    // silently blocked by Android's background-activity-start restriction
    // (confirmed via logcat: "Background activity start ...
    // isBgStartWhitelisted: false") -- the OS-sanctioned way to still show
    // a full-screen Activity from here is Notification.setFullScreenIntent,
    // which IS exempted from that restriction (and degrades gracefully to a
    // heads-up banner instead of interrupting when the device is already
    // unlocked/in active use).
    val activityIntent = Intent(context, NativeBatteryAlertActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or
        Intent.FLAG_ACTIVITY_CLEAR_TOP or
        Intent.FLAG_ACTIVITY_SINGLE_TOP
      putExtra("percent", currentPercent)
    }
    val fullScreenPendingIntent = PendingIntent.getActivity(
      context,
      0,
      activityIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val stopIntent = Intent(BatteryAlertConstants.STOP_ACTION).setPackage(context.packageName)
    val stopPendingIntent = PendingIntent.getBroadcast(
      context,
      0,
      stopIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    @Suppress("DEPRECATION")
    val stopAction = Notification.Action.Builder(
      android.R.drawable.ic_menu_close_clear_cancel,
      "Stop",
      stopPendingIntent
    ).build()

    val notification = Notification.Builder(context, BatteryAlertConstants.NOTIFICATION_CHANNEL_ID)
      .setContentTitle("Baterai HP kamu tinggal $currentPercent% 🔋")
      .setContentText("Yuk di-charge sebelum mati.")
      .setSmallIcon(context.applicationInfo.icon)
      .setContentIntent(fullScreenPendingIntent)
      .setFullScreenIntent(fullScreenPendingIntent, true)
      .setAutoCancel(false)
      .setOngoing(true)
      .addAction(stopAction)
      .build()

    manager.notify(BatteryAlertConstants.NOTIFICATION_ID, notification)
  }
}
