package expo.modules.blering

import android.content.Context
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.util.Log

// Converts a preset/custom blink pattern into a repeating list of
// (onMs, offMs) steps, and wraps the actual CameraManager torch control.
// Shared by all three trigger channels (push/BLE/SMS) via TorchBlinkService
// -- there's no headless-safe way to blink the torch from JS at all (no
// Expo Torch API usable outside a mounted camera view), so unlike ring
// (where the push path reacts in JS via expo-audio), every torch trigger
// ends up here regardless of which channel it arrived on.
object TorchReactor {
  private const val TAG = "TorchReactor"
  private const val UNIT_MS = 200L // SOS morse unit

  data class Step(val onMs: Long, val offMs: Long)

  private var cachedCameraId: String? = null

  fun stepsFor(kind: String, onMs: Long?, offMs: Long?): List<Step> = when (kind) {
    "steady" -> listOf(Step(RingBleConstants.TORCH_AUTO_OFF_MS, 0))
    "slow" -> listOf(Step(500, 500))
    "fast" -> listOf(Step(150, 150))
    "sos" -> sosSteps()
    "custom" -> listOf(Step((onMs ?: 250).coerceIn(50, 5000), (offMs ?: 250).coerceIn(50, 5000)))
    else -> listOf(Step(500, 500))
  }

  private fun sosSteps(): List<Step> {
    val dot = UNIT_MS
    val dash = UNIT_MS * 3
    val symbolGap = UNIT_MS
    val letterGap = UNIT_MS * 3
    val wordGap = UNIT_MS * 7
    return listOf(
      Step(dot, symbolGap), Step(dot, symbolGap), Step(dot, letterGap), // S
      Step(dash, symbolGap), Step(dash, symbolGap), Step(dash, letterGap), // O
      Step(dot, symbolGap), Step(dot, symbolGap), Step(dot, wordGap) // S
    )
  }

  private fun flashCameraId(context: Context, manager: CameraManager): String? {
    cachedCameraId?.let { return it }
    return try {
      val id = manager.cameraIdList.firstOrNull { candidate ->
        manager.getCameraCharacteristics(candidate).get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
      }
      cachedCameraId = id
      id
    } catch (e: Exception) {
      Log.w(TAG, "Failed to enumerate cameras for torch", e)
      null
    }
  }

  // Best-effort, like every other native call site in this module -- a
  // missing CAMERA permission, no flash-capable camera, or the camera being
  // held open by another app should never crash the caller.
  fun setTorch(context: Context, on: Boolean) {
    try {
      val manager = context.getSystemService(Context.CAMERA_SERVICE) as? CameraManager ?: return
      val id = flashCameraId(context, manager) ?: return
      manager.setTorchMode(id, on)
    } catch (e: Exception) {
      Log.w(TAG, "Failed to set torch mode", e)
    }
  }
}
