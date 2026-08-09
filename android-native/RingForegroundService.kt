package com.michsya.mobile

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log

// Exists purely to promote the process to a protected foreground execution
// grade for a few seconds after a 'ring'/'find_start' push arrives -- long
// enough for the JS engine to boot and run the real handling (playRingtone(),
// notifee's full-screen alert). See RingAwareFirebaseMessagingService.
class RingForegroundService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private val stopRunnable = Runnable { stopSelf() }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    Log.d(TAG, "onStartCommand: promoting process to foreground")
    startForeground(NOTIFICATION_ID, buildPlaceholderNotification())
    handler.removeCallbacks(stopRunnable)
    handler.postDelayed(stopRunnable, AUTO_STOP_MS)
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacks(stopRunnable)
    super.onDestroy()
  }

  private fun buildPlaceholderNotification(): Notification {
    val manager = getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "MichSya (proses latar belakang)",
        NotificationManager.IMPORTANCE_MIN
      )
      manager.createNotificationChannel(channel)
    }

    return Notification.Builder(this, CHANNEL_ID)
      .setContentTitle("MichSya")
      .setContentText("Memproses notifikasi...")
      .setSmallIcon(applicationInfo.icon)
      .setOngoing(true)
      .build()
  }

  companion object {
    private const val TAG = "RingForegroundService"
    private const val CHANNEL_ID = "michsya-fgs-trampoline"
    private const val NOTIFICATION_ID = 9187
    private const val AUTO_STOP_MS = 15000L
  }
}
