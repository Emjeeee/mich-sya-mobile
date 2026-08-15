package expo.modules.blering

import android.animation.ArgbEvaluator
import android.animation.ValueAnimator
import android.app.Activity
import android.graphics.Rect
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.view.animation.LinearInterpolator
import android.widget.FrameLayout
import android.widget.SeekBar
import android.widget.TextView

// Plain Android Activity (no React Native/Compose), shown full-screen even
// over the lock screen -- same technique as NativeRingAlertActivity, since
// battery events (like the BLE/SMS ring paths) need to work with the app
// fully killed, not just foreground. Dismiss is a real swipe (SeekBar
// dragged to the end) rather than a tap button, per the user's explicit
// request for this one, styled to match the app's own SwipeToConfirm
// component (src/components/SwipeToConfirm.tsx). The background cycles
// through bright colors while active to grab attention, per explicit
// request ("seperti ketika scan wajah").
class NativeBatteryAlertActivity : Activity() {
  private var dismissed = false
  private var backgroundAnimator: ValueAnimator? = null

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

    // Max out screen brightness while this alert is showing -- the whole
    // point of the color cycling below is catching the user's attention, so
    // a dim/auto-adjusted screen working against that defeats it. No manual
    // restore needed: this is a per-window override, and it's dropped
    // automatically once this Activity finishes and the window underneath
    // (home screen, lock screen, whatever) is back on top.
    window.attributes = window.attributes.apply { screenBrightness = 1.0f }

    setContentView(R.layout.activity_battery_alert)

    val percent = intent.getIntExtra("percent", -1)
    if (percent >= 0) {
      findViewById<TextView>(R.id.battery_alert_subtitle).text =
        "Baterai tinggal $percent% -- yuk di-charge sebelum mati"
    }

    val swipeLabel = findViewById<TextView>(R.id.battery_alert_swipe_label)
    val swipeContainer = findViewById<FrameLayout>(R.id.battery_alert_swipe_container)

    // The swipe sits close to the screen edge, and a drag starting there can
    // get intercepted by the OS's own edge/back gesture instead of reaching
    // this SeekBar -- confirmed on-device (a test swipe near the edge got
    // grabbed by a system gesture and opened a share sheet instead of
    // dismissing). Excluding this view's bounds from system gesture
    // handling (Android Q+) is the platform-sanctioned fix for exactly this
    // "app has its own edge-adjacent swipe" conflict.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      swipeContainer.post {
        swipeContainer.systemGestureExclusionRects =
          listOf(Rect(0, 0, swipeContainer.width, swipeContainer.height))
      }
    }

    findViewById<SeekBar>(R.id.battery_alert_dismiss_seekbar).setOnSeekBarChangeListener(
      object : SeekBar.OnSeekBarChangeListener {
        override fun onProgressChanged(seekBar: SeekBar, progress: Int, fromUser: Boolean) {
          // Fades out as it's dragged, same as SwipeToConfirm's label.
          swipeLabel.alpha = 1f - (progress / 100f)
          if (fromUser && progress >= DISMISS_THRESHOLD) {
            dismiss()
          }
        }

        override fun onStartTrackingTouch(seekBar: SeekBar) {
          // Belt-and-suspenders alongside the gesture exclusion above --
          // stops any ancestor view (within this app) from stealing the
          // drag once it's started.
          seekBar.parent?.requestDisallowInterceptTouchEvent(true)
        }

        override fun onStopTrackingTouch(seekBar: SeekBar) {
          seekBar.parent?.requestDisallowInterceptTouchEvent(false)
          // Snap back if released before completing the swipe -- makes it
          // read as "swipe to confirm" rather than a plain volume slider.
          if (!dismissed) {
            seekBar.progress = 0
            swipeLabel.alpha = 1f
          }
        }
      }
    )

    startBackgroundAnimation(findViewById(R.id.battery_alert_root))
  }

  private fun startBackgroundAnimation(rootView: View) {
    // First color repeated at the end so the loop wraps seamlessly instead
    // of snapping back on each repeat.
    val colors = intArrayOf(
      0xFFE11D74.toInt(), // brand pink
      0xFFFF3B30.toInt(), // red
      0xFFFF9500.toInt(), // orange
      0xFFFFCC00.toInt(), // yellow
      0xFF34C759.toInt(), // green
      0xFF00C7BE.toInt(), // teal
      0xFF007AFF.toInt(), // blue
      0xFFAF52DE.toInt(), // purple
      0xFFE11D74.toInt() // wrap back to pink
    )
    val animator = ValueAnimator.ofObject(ArgbEvaluator(), *colors.toTypedArray())
    // Was 450ms/color (~4s per full loop) -- per explicit feedback that was
    // too slow to actually grab attention, dropped to 180ms/color (~1.6s).
    animator.duration = colors.size * 180L
    animator.repeatCount = ValueAnimator.INFINITE
    animator.interpolator = LinearInterpolator()
    animator.addUpdateListener { anim -> rootView.setBackgroundColor(anim.animatedValue as Int) }
    animator.start()
    backgroundAnimator = animator
  }

  private fun dismiss() {
    if (dismissed) return
    dismissed = true
    backgroundAnimator?.cancel()
    backgroundAnimator = null
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
    backgroundAnimator?.cancel()
    backgroundAnimator = null
    BatteryAlertReactor.stop(applicationContext)
    super.onDestroy()
  }

  companion object {
    private const val DISMISS_THRESHOLD = 90
  }
}
