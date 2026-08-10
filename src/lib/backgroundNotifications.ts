import notifee, { AndroidCategory, AndroidImportance, EventType } from '@notifee/react-native';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { triggerTorch } from 'ble-ring';

import { startFindPartnerTracking } from './backgroundFindPartner';
import { notifyRingSignal } from './ringSignal';
import { playRingtone, stopRingtone } from './ringtone';
import { supabase } from './supabase';
import { refreshWidget } from './widget';

const BACKGROUND_NOTIFICATION_TASK = 'michsya-background-notification-task';
const RING_CHANNEL_ID = 'ring-alert';
export const RING_NOTIFICATION_ID = 'ring-alert';
const STOP_RING_ACTION = 'stop-ring';

async function showRingNotification() {
  await notifee.createChannel({
    id: RING_CHANNEL_ID,
    name: 'Bunyikan HP',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });

  await notifee.displayNotification({
    id: RING_NOTIFICATION_ID,
    title: 'HP kamu lagi dibunyiin pasangan 🔊',
    body: 'Ketuk untuk mematikan.',
    data: { type: 'ring' },
    android: {
      channelId: RING_CHANNEL_ID,
      category: AndroidCategory.CALL,
      importance: AndroidImportance.HIGH,
      ongoing: true,
      autoCancel: false,
      fullScreenAction: { id: 'default' },
      pressAction: { id: 'default' },
      actions: [{ title: 'Stop', pressAction: { id: STOP_RING_ACTION } }],
    },
  });
}

// Registered at module scope (not inside a component) per notifee's requirement --
// this is what lets the Stop action work even while the app is backgrounded/killed.
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (
    type === EventType.ACTION_PRESS &&
    detail.pressAction?.id === STOP_RING_ACTION
  ) {
    stopRingtone();
    await notifee.cancelNotification(RING_NOTIFICATION_ID);
  }
});

// Handles a data-only "ring" push regardless of whether the app is foreground,
// background, or fully terminated. Must be defined at module scope so it survives
// headless (app-killed) invocation.
TaskManager.defineTask<Notifications.NotificationTaskPayload>(
  BACKGROUND_NOTIFICATION_TASK,
  async ({ data, error }) => {
    console.log('[michsya] background notification task invoked', { hasError: Boolean(error) });
    if (error || !data) return;
    if ('actionIdentifier' in data) return;

    let payload: Record<string, unknown> = {};
    const rawDataString = (data.data as { dataString?: string } | undefined)?.dataString;
    try {
      payload = rawDataString ? JSON.parse(rawDataString) : (data.data ?? {});
    } catch {
      payload = {};
    }

    if (payload.type === 'ring') {
      console.log('[michsya] background task: ring payload received');
      // Isolated try/catches so a failure in one doesn't block the other --
      // both are independently useful even if one throws in a headless context.
      try {
        await playRingtone();
        console.log('[michsya] playRingtone() completed');
      } catch (err) {
        console.warn('[michsya] playRingtone() failed:', err);
      }
      // Covers the app-alive case (foreground or backgrounded but not killed) --
      // see ringSignal.ts for why the notifee full-screen intent alone isn't enough.
      notifyRingSignal();
      try {
        await showRingNotification();
        console.log('[michsya] showRingNotification() completed');
      } catch (err) {
        console.warn('[michsya] showRingNotification() failed:', err);
      }
    }

    if (payload.type === 'torch') {
      console.log('[michsya] background task: torch payload received');
      // No JS-side notification/reaction needed here unlike ring -- the
      // native TorchBlinkService owns its own notification (incl. the Stop
      // action) and there's no headless-safe way to blink the torch from JS
      // anyway, so this just starts the same native service the BLE/SMS
      // paths start directly.
      try {
        await triggerTorch(
          typeof payload.kind === 'string' ? payload.kind : 'slow',
          typeof payload.onMs === 'number' ? payload.onMs : null,
          typeof payload.offMs === 'number' ? payload.offMs : null
        );
      } catch (err) {
        console.warn('[michsya] triggerTorch() failed:', err);
      }
    }

    if (payload.type === 'widget_refresh') {
      await refreshWidget();
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

Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch((err) => {
  console.warn('Failed to register background notification task:', err);
});
