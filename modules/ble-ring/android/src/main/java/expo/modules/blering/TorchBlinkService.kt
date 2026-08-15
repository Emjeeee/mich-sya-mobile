package expo.modules.blering

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.content.ContextCompat

// Foreground service that owns the actual torch blink loop, notification,
// and auto-off/stop lifecycle -- started by any of the 3 trigger channels
// (BLE scan, SMS receiver, or the JS-facing triggerTorch() bridge function
// for the push channel). Unlike ring, torch has no full-screen Activity to
// pin the process alive or host a Stop button -- this service's own
// foreground-service status is what keeps the process alive for the ~30s
// duration, and its notification's Stop action targets the service
// directly via a pending intent (see RingBleConstants.TORCH_STOP_ACTION).
class TorchBlinkService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private var elapsedMs = 0L

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == RingBleConstants.TORCH_STOP_ACTION) {
      // Must satisfy the startForegroundService() contract even when this
      // arrives from requestStop() below and no blink loop was actually
      // running (a remote "stop" trigger with nothing to stop) -- Android
      // requires startForeground() shortly after that call or the process
      // crashes with RemoteServiceException, even for a same-instance
      // no-op. stopBlinking() cancels this same notification immediately
      // after, so it's an imperceptible flash rather than a visible one.
      startForeground(RingBleConstants.TORCH_NOTIFICATION_ID, buildNotification())
      stopBlinking()
      return START_NOT_STICKY
    }

    startForeground(RingBleConstants.TORCH_NOTIFICATION_ID, buildNotification())

    val kind = intent?.getStringExtra("kind") ?: "slow"
    val onMs = intent?.getLongExtra("onMs", -1L)?.takeIf { it >= 0 }
    val offMs = intent?.getLongExtra("offMs", -1L)?.takeIf { it >= 0 }
    val steps = TorchReactor.stepsFor(kind, onMs, offMs)

    // A fresh trigger while one is already blinking (e.g. tapped twice)
    // restarts cleanly rather than layering two loops -- this Handler is
    // dedicated to this service's own loop, so wiping every pending
    // callback is safe.
    handler.removeCallbacksAndMessages(null)
    elapsedMs = 0
    runStep(steps, 0)

    return START_NOT_STICKY
  }

  private fun runStep(steps: List<TorchReactor.Step>, index: Int) {
    if (elapsedMs >= RingBleConstants.TORCH_AUTO_OFF_MS) {
      stopBlinking()
      return
    }
    val step = steps[index % steps.size]
    TorchReactor.setTorch(this, true)
    handler.postDelayed({
      TorchReactor.setTorch(this, false)
      elapsedMs += step.onMs
      if (elapsedMs >= RingBleConstants.TORCH_AUTO_OFF_MS) {
        stopBlinking()
        return@postDelayed
      }
      handler.postDelayed({
        elapsedMs += step.offMs
        runStep(steps, index + 1)
      }, step.offMs)
    }, step.onMs)
  }

  private fun stopBlinking() {
    handler.removeCallbacksAndMessages(null)
    TorchReactor.setTorch(this, false)
    getSystemService(NotificationManager::class.java).cancel(RingBleConstants.TORCH_NOTIFICATION_ID)
    stopSelf()
  }

  override fun onDestroy() {
    handler.removeCallbacksAndMessages(null)
    TorchReactor.setTorch(this, false)
    super.onDestroy()
  }

  private fun buildNotification(): Notification {
    val manager = getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(
          RingBleConstants.TORCH_NOTIFICATION_CHANNEL_ID,
          "Senter HP",
          NotificationManager.IMPORTANCE_HIGH
        )
      )
    }

    val stopIntent = Intent(this, TorchBlinkService::class.java).setAction(RingBleConstants.TORCH_STOP_ACTION)
    val stopPendingIntent = PendingIntent.getService(
      this,
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

    return Notification.Builder(this, RingBleConstants.TORCH_NOTIFICATION_CHANNEL_ID)
      .setContentTitle("Senter kamu lagi dinyalain pasangan 🔦")
      .setContentText("Otomatis mati sendiri, atau ketuk Stop.")
      .setSmallIcon(applicationInfo.icon)
      .setOngoing(true)
      .addAction(stopAction)
      .build()
  }

  companion object {
    // Single source of truth for "how to remotely stop this service" --
    // used by the push channel's stopTorch() bridge in BleRingModule.kt,
    // and by BleRingScanService/SmsRingReceiver when they decode a "stop"
    // kind instead of a blink pattern. startForegroundService() (not
    // startService()) since this may be reaching an already-stopped
    // service -- see the startForeground() call in the STOP branch of
    // onStartCommand for why that's still safe.
    fun requestStop(context: Context) {
      val intent = Intent(context, TorchBlinkService::class.java)
        .setAction(RingBleConstants.TORCH_STOP_ACTION)
      ContextCompat.startForegroundService(context, intent)
    }
  }
}
