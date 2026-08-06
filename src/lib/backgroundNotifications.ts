import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { startFindPartnerTracking } from './backgroundFindPartner';
import { playRingtone, stopRingtone } from './ringtone';
import { supabase } from './supabase';

const BACKGROUND_NOTIFICATION_TASK = 'michsya-background-notification-task';
export const RING_ACTION_CATEGORY = 'ring-alert';
const STOP_RING_ACTION = 'stop-ring';

Notifications.setNotificationCategoryAsync(RING_ACTION_CATEGORY, [
  {
    identifier: STOP_RING_ACTION,
    buttonTitle: 'Stop',
    options: { isDestructive: true, opensAppToForeground: true },
  },
]);

export function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  if (response.actionIdentifier === STOP_RING_ACTION || data?.type === 'ring') {
    stopRingtone();
  }
}

// Handles a data-only "ring" push regardless of whether the app is foreground,
// background, or fully terminated. Must be defined at module scope so it survives
// headless (app-killed) invocation.
TaskManager.defineTask<Notifications.NotificationTaskPayload>(
  BACKGROUND_NOTIFICATION_TASK,
  async ({ data, error }) => {
    if (error || !data) return;

    if ('actionIdentifier' in data) {
      handleNotificationResponse(data);
      return;
    }

    let payload: Record<string, unknown> = {};
    const rawDataString = (data.data as { dataString?: string } | undefined)?.dataString;
    try {
      payload = rawDataString ? JSON.parse(rawDataString) : (data.data ?? {});
    } catch {
      payload = {};
    }

    if (payload.type === 'ring') {
      await playRingtone();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'HP kamu lagi dibunyiin pasangan 🔊',
          body: 'Ketuk Stop untuk menghentikan.',
          categoryIdentifier: RING_ACTION_CATEGORY,
          data: { type: 'ring' },
        },
        trigger: null,
      });
    }

    if (payload.type === 'find_start' && typeof payload.coupleId === 'string') {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        // Best-effort: if background location permission was never granted on this
        // device before, this silently no-ops -- the visible push still lets them
        // open the app and grant it, which then makes future auto-starts work.
        await startFindPartnerTracking(payload.coupleId, userData.user.id);
      }
    }
  }
);

Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
