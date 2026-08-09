package expo.modules.blering

import android.app.Activity
import android.app.NotificationManager
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.widget.Button

// A plain Android Activity (no React Native/Compose involved) shown
// full-screen, including over the lock screen, when a BLE ring is detected.
// Deliberately independent of the JS engine so it works even if the RN
// JavaScript context never boots -- see BleRingScanService for why that
// matters here.
class NativeRingAlertActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
          WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
      )
    }

    setContentView(R.layout.activity_ring_alert)

    findViewById<Button>(R.id.ring_alert_stop_button).setOnClickListener {
      RingReactor.stop(applicationContext)
      finish()
    }
  }

  override fun onDestroy() {
    getSystemService(NotificationManager::class.java).cancel(RingBleConstants.RING_NOTIFICATION_ID)
    super.onDestroy()
  }
}
