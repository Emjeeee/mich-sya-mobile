package expo.modules.blering

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat

class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val granted = listOf(Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT).all {
          ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED
        }
        if (!granted) {
          Log.w("BootReceiver", "Bluetooth permissions missing, not starting scan service")
          return
        }
      }
      try {
        ContextCompat.startForegroundService(context, Intent(context, BleRingScanService::class.java))
      } catch (e: Exception) {
        Log.w("BootReceiver", "Could not start scan service", e)
      }
    }
  }
}
