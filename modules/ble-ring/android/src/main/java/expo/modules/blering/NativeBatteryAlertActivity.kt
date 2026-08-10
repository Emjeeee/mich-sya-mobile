package expo.modules.blering

import android.app.Activity
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.widget.SeekBar
import android.widget.TextView

// Plain Android Activity (no React Native/Compose), shown full-screen even
// over the lock screen -- same technique as NativeRingAlertActivity, since
// battery events (like the BLE/SMS ring paths) need to work with the app
// fully killed, not just foreground. Dismiss is a real swipe (SeekBar
// dragged to the end) rather than a tap button, per the user's explicit
// request for this one.
class NativeBatteryAlertActivity : Activity() {
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

    setContentView(R.layout.activity_battery_alert)

    val percent = intent.getIntExtra("percent", -1)
    if (percent >= 0) {
      findViewById<TextView>(R.id.battery_alert_subtitle).text =
        "Baterai tinggal $percent% -- yuk di-charge sebelum mati"
    }

    findViewById<SeekBar>(R.id.battery_alert_dismiss_seekbar).setOnSeekBarChangeListener(
      object : SeekBar.OnSeekBarChangeListener {
        override fun onProgressChanged(seekBar: SeekBar, progress: Int, fromUser: Boolean) {
          if (fromUser && progress >= DISMISS_THRESHOLD) {
            dismiss()
          }
        }

        override fun onStartTrackingTouch(seekBar: SeekBar) {}

        override fun onStopTrackingTouch(seekBar: SeekBar) {
          // Snap back if released before completing the swipe -- makes it
          // read as "swipe to confirm" rather than a plain volume slider.
          if (!dismissed) seekBar.progress = 0
        }
      }
    )
  }

  private fun dismiss() {
    if (dismissed) return
    dismissed = true
    BatteryAlertReactor.stop(applicationContext)
    finish()
  }

  // The system back gesture/button would otherwise finish this Activity
  // without stopping the sound/vibration -- same bug class just fixed for
  // ring's NativeRingAlertActivity, built in correctly here from the start.
  @Suppress("MissingSuperCall", "OVERRIDE_DEPRECATION")
  override fun onBackPressed() {
    dismiss()
  }

  override fun onDestroy() {
    // Safety net for any other dismissal path -- stop() is idempotent.
    BatteryAlertReactor.stop(applicationContext)
    super.onDestroy()
  }

  companion object {
    private const val DISMISS_THRESHOLD = 90
  }
}
