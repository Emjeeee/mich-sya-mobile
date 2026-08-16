import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { setRingerMode, setRingerVolume, stopTorch, triggerRing, triggerTorch } from 'ble-ring';

import { startFindPartnerTracking } from './backgroundFindPartner';
import { notifyRingSignal } from './ringSignal';
import { supabase } from './supabase';
import { refreshWidget } from './widget';

const BACKGROUND_NOTIFICATION_TASK = 'michsya-background-notification-task';

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
      // Reuses RingReactor -- the same native sound/vibrate/full-screen-alert
      // engine the BLE/SMS receivers already use -- instead of a JS-side
      // notification + expo-audio player. That JS path only bypassed
      // Android's ringer mode (silent/vibrate), not a separately muted
      // media/music stream, which is why push-triggered ring could go
      // completely silent even in Normal mode; RingReactor routes playback
      // to the ALARM stream, which doesn't have that problem.
      notifyRingSignal();
      try {
        await triggerRing();
      } catch (err) {
        console.warn('[michsya] triggerRing() failed:', err);
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
        if (payload.kind === 'stop') {
          await stopTorch();
        } else {
          await triggerTorch(
            typeof payload.kind === 'string' ? payload.kind : 'slow',
            typeof payload.onMs === 'number' ? payload.onMs : null,
            typeof payload.offMs === 'number' ? payload.offMs : null
          );
        }
      } catch (err) {
        console.warn('[michsya] triggerTorch()/stopTorch() failed:', err);
      }
    }

    if (payload.type === 'set_ringer_mode' && typeof payload.mode === 'string') {
      console.log('[michsya] background task: set_ringer_mode payload received');
      try {
        await setRingerMode(payload.mode);
      } catch (err) {
        console.warn('[michsya] setRingerMode() failed:', err);
      }
    }

    if (payload.type === 'set_ringer_volume' && typeof payload.percent === 'number') {
      console.log('[michsya] background task: set_ringer_volume payload received');
      try {
        await setRingerVolume(payload.percent);
      } catch (err) {
        console.warn('[michsya] setRingerVolume() failed:', err);
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
