package com.michsya.mobile

import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.RemoteMessage
import expo.modules.notifications.service.ExpoFirebaseMessagingService
import org.json.JSONObject

// Subclasses expo-notifications' own FirebaseMessagingService (it's declared
// `open` specifically to allow this) so we can promote the process to a
// foreground service BEFORE the JS engine is asked to boot for a 'ring' or
// 'find_start' push -- see RingForegroundService for why. Every other message
// type, and the actual notification/task-manager delivery, is left completely
// untouched via super.onMessageReceived().
class RingAwareFirebaseMessagingService : ExpoFirebaseMessagingService() {
  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    val type = extractType(remoteMessage)
    Log.d(TAG, "onMessageReceived: type=$type")

    if (type == "ring" || type == "find_start") {
      ContextCompat.startForegroundService(this, Intent(this, RingForegroundService::class.java))
    }

    super.onMessageReceived(remoteMessage)
  }

  private fun extractType(remoteMessage: RemoteMessage): String? {
    return try {
      val body = remoteMessage.data["body"] ?: return null
      val type = JSONObject(body).optString("type", "")
      type.ifEmpty { null }
    } catch (e: Exception) {
      Log.w(TAG, "Failed to parse remote message body", e)
      null
    }
  }

  companion object {
    private const val TAG = "RingAwareFCMService"
  }
}
