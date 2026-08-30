import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { supabase } from './supabase';

export const FIND_PARTNER_TASK_NAME = 'michsya-find-partner-location';
// Redundant, independent enforcement of AUTO_STOP_MS below -- see its own
// comment for why the location-task check alone isn't enough.
const FIND_PARTNER_CAP_CHECK_TASK_NAME = 'michsya-find-partner-cap-check';

const ACTIVE_FIND_KEY = 'michsya.activeFindPartner';
const PING_INTERVAL_MS = 15 * 1000;
const AUTO_STOP_MS = 30 * 60 * 1000;

interface ActiveFindRef {
  coupleId: string;
  userId: string;
  startedAt: number;
}

async function getActiveFindRef(): Promise<ActiveFindRef | null> {
  const raw = await AsyncStorage.getItem(ACTIVE_FIND_KEY);
  return raw ? (JSON.parse(raw) as ActiveFindRef) : null;
}

// Shared by both enforcement paths below -- stops tracking if the 30-minute
// cap has passed, otherwise a no-op.
async function enforceAutoStopCap(): Promise<void> {
  const ref = await getActiveFindRef();
  if (!ref) return;
  if (Date.now() - ref.startedAt > AUTO_STOP_MS) {
    await stopFindPartnerTracking(ref.coupleId, ref.userId);
  }
}

// Defined at module scope so it survives headless (app-killed) restarts by the OS --
// this lets "Cari Pasangan" keep sharing location even if the partner never opens the app.
TaskManager.defineTask(FIND_PARTNER_TASK_NAME, async ({ data, error }) => {
  if (error) return;

  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations;
  const latest = locations?.[locations.length - 1];
  if (!latest) return;

  const ref = await getActiveFindRef();
  if (!ref) return;

  if (Date.now() - ref.startedAt > AUTO_STOP_MS) {
    await stopFindPartnerTracking(ref.coupleId, ref.userId);
    return;
  }

  await supabase.from('partner_presence').upsert(
    {
      couple_id: ref.coupleId,
      user_id: ref.userId,
      lat: latest.coords.latitude,
      lng: latest.coords.longitude,
      is_sharing: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'couple_id,user_id' }
  );
});

// The 30-minute cap above was previously only checked inside the location
// task, which only runs when the OS actually delivers a new fix --
// startLocationUpdatesAsync's `distanceInterval: 10` means Android can
// legitimately withhold a fix indefinitely if the device hasn't moved
// ~10m, which is exactly the "waiting at a meeting point" scenario this
// feature exists for. A stationary user could keep sharing location well
// past the advertised 30-minute cap since the check simply never ran. This
// periodic task enforces the same cap independently of whether any
// location fix arrives at all -- WorkManager's minimum periodic interval
// is ~15 minutes, so the cap is now enforced within roughly that margin
// even in the fully-stationary case, instead of not at all.
TaskManager.defineTask(FIND_PARTNER_CAP_CHECK_TASK_NAME, async () => {
  try {
    await enforceAutoStopCap();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

BackgroundTask.registerTaskAsync(FIND_PARTNER_CAP_CHECK_TASK_NAME, { minimumInterval: 15 });

export type StartFindPartnerResult = 'ok' | 'foreground-denied' | 'background-denied';

// The caller decides how to surface a non-'ok' result (this function itself can't
// show a permission UI from a background task). 'background-denied' specifically
// means: on Android 11+ (and especially on OEM skins like Samsung's), the OS often
// won't offer "Allow all the time" in the same dialog chained right after the
// foreground grant at all -- requestBackgroundPermissionsAsync() can resolve
// immediately without ever really showing a dialog, which is why this looked like
// the screen just flickering. The only reliable fix on those devices is sending the
// user to the app's own permission settings screen to pick "Allow all the time"
// manually -- see the "Buka Pengaturan" button in FindPartnerModal.tsx.
export async function startFindPartnerTracking(
  coupleId: string,
  userId: string
): Promise<StartFindPartnerResult> {
  await AsyncStorage.setItem(
    ACTIVE_FIND_KEY,
    JSON.stringify({ coupleId, userId, startedAt: Date.now() } satisfies ActiveFindRef)
  );

  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') return 'foreground-denied';

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== 'granted') return 'background-denied';

  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(
    FIND_PARTNER_TASK_NAME
  ).catch(() => false);
  if (!alreadyStarted) {
    await Location.startLocationUpdatesAsync(FIND_PARTNER_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: PING_INTERVAL_MS,
      distanceInterval: 10,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'MichSya sedang membagikan lokasi',
        notificationBody: 'Pasanganmu bisa lihat lokasimu untuk saling menemukan.',
      },
    });
  }
  return 'ok';
}

export async function stopFindPartnerTracking(coupleId: string, userId: string) {
  await AsyncStorage.removeItem(ACTIVE_FIND_KEY);

  const started = await Location.hasStartedLocationUpdatesAsync(FIND_PARTNER_TASK_NAME).catch(
    () => false
  );
  if (started) {
    await Location.stopLocationUpdatesAsync(FIND_PARTNER_TASK_NAME);
  }

  await supabase
    .from('partner_presence')
    .update({ is_sharing: false })
    .eq('couple_id', coupleId)
    .eq('user_id', userId);
}
