package expo.modules.blering

import android.app.Activity
import android.graphics.Rect
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.SeekBar
import android.widget.TextView

// A plain Android Activity (no React Native/Compose involved) shown
// full-screen, including over the lock screen, when a BLE ring is detected.
// Deliberately independent of the JS engine so it works even if the RN
// JavaScript context never boots -- see BleRingScanService for why that
// matters here. Dismiss is a swipe (matching NativeBatteryAlertActivity's
// style, minus its color-cycling background) rather than the plain tap
// button this used to have, per explicit request.
class NativeRingAlertActivity : Activity() {
  private var dismissed = false

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

    val swipeLabel = findViewById<TextView>(R.id.ring_alert_swipe_label)
    val swipeContainer = findViewById<FrameLayout>(R.id.ring_alert_swipe_container)

    // Same fix as the battery alert: exclude this view's bounds from the
    // OS's own edge/back gesture so a drag near the screen edge can't get
    // intercepted by the system instead of this SeekBar.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      swipeContainer.post {
        swipeContainer.systemGestureExclusionRects =
          listOf(Rect(0, 0, swipeContainer.width, swipeContainer.height))
      }
    }

    findViewById<SeekBar>(R.id.ring_alert_dismiss_seekbar).setOnSeekBarChangeListener(
      object : SeekBar.OnSeekBarChangeListener {
        override fun onProgressChanged(seekBar: SeekBar, progress: Int, fromUser: Boolean) {
          swipeLabel.alpha = 1f - (progress / 100f)
          if (fromUser && progress >= DISMISS_THRESHOLD) {
            dismiss()
          }
        }

        override fun onStartTrackingTouch(seekBar: SeekBar) {
          seekBar.parent?.requestDisallowInterceptTouchEvent(true)
        }

        override fun onStopTrackingTouch(seekBar: SeekBar) {
          seekBar.parent?.requestDisallowInterceptTouchEvent(false)
          if (!dismissed) {
            seekBar.progress = 0
            swipeLabel.alpha = 1f
          }
        }
      }
    )
  }

  private fun dismiss() {
    if (dismissed) return
    dismissed = true
    RingReactor.stop(applicationContext)
    finish()
  }

  // The system back gesture/button would otherwise finish this Activity
  // without ever calling RingReactor.stop() -- leaving the ringtone and
  // (until reboot) the indefinitely-looping vibration running with no UI
  // left to stop them. Treat back the same as completing the swipe.
  @Suppress("MissingSuperCall", "OVERRIDE_DEPRECATION")
  override fun onBackPressed() {
    dismiss()
  }

  override fun onDestroy() {
    // Safety net for any other dismissal path (task swiped away from
    // Recents, etc.) -- stop() is idempotent, so calling it again after the
    // swipe/back-press already did is harmless.
    RingReactor.stop(applicationContext)
    super.onDestroy()
  }

  companion object {
    private const val DISMISS_THRESHOLD = 90
  }
}
