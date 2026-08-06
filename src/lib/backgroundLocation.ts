import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import {
  DWELL_MIN_DURATION_MS,
  DWELL_RADIUS_METERS,
  LOCATION_PING_INTERVAL_MS,
} from '../constants/config';
import { distanceMeters } from './geo';
import { supabase } from './supabase';

export const LOCATION_TASK_NAME = 'michsya-date-session-location';

const ACTIVE_SESSION_KEY = 'michsya.activeDateSession';
const LAST_DWELL_PROMPT_KEY = 'michsya.lastDwellPrompt';

interface ActiveSessionRef {
  sessionId: string;
  coupleId: string;
}

interface DwellPromptRef {
  sessionId: string;
  lat: number;
  lng: number;
}

async function getActiveSessionRef(): Promise<ActiveSessionRef | null> {
  const raw = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
  return raw ? (JSON.parse(raw) as ActiveSessionRef) : null;
}

// Looks at the recent breadcrumb trail for this session and, if the couple has
// stayed within DWELL_RADIUS_METERS for at least DWELL_MIN_DURATION_MS, prompts
// (once per distinct spot per session) to log it on the journey map.
async function checkForDwellAndPrompt(sessionId: string) {
  const { data, error } = await supabase
    .from('date_session_locations')
    .select('lat, lng, recorded_at')
    .eq('session_id', sessionId)
    .order('recorded_at', { ascending: false })
    .limit(12);

  if (error || !data || data.length === 0) return;

  const newest = data[0];
  let oldestInCluster = newest;
  for (let i = 1; i < data.length; i++) {
    if (distanceMeters(newest, data[i]) > DWELL_RADIUS_METERS) break;
    oldestInCluster = data[i];
  }

  const dwellMs = Date.now() - new Date(oldestInCluster.recorded_at).getTime();
  if (dwellMs < DWELL_MIN_DURATION_MS) return;

  const rawLastPrompt = await AsyncStorage.getItem(LAST_DWELL_PROMPT_KEY);
  const lastPrompt = rawLastPrompt ? (JSON.parse(rawLastPrompt) as DwellPromptRef) : null;

  if (
    lastPrompt &&
    lastPrompt.sessionId === sessionId &&
    distanceMeters(lastPrompt, newest) <= DWELL_RADIUS_METERS
  ) {
    return; // already prompted for this spot this session
  }

  await AsyncStorage.setItem(
    LAST_DWELL_PROMPT_KEY,
    JSON.stringify({ sessionId, lat: newest.lat, lng: newest.lng } satisfies DwellPromptRef)
  );

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Kayaknya betah nih di sini 📍',
      body: 'Ketuk buat nambahin tempat ini ke journey map kalian.',
      data: {
        type: 'journey_dwell_prompt',
        sessionId,
        lat: newest.lat,
        lng: newest.lng,
      },
    },
    trigger: null,
  });
}

// Defined at module scope so it survives headless (app-killed) restarts by the OS.
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) return;

  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations;
  const latest = locations?.[locations.length - 1];
  if (!latest) return;

  const ref = await getActiveSessionRef();
  if (!ref) return;

  await supabase.from('date_session_locations').insert({
    session_id: ref.sessionId,
    couple_id: ref.coupleId,
    lat: latest.coords.latitude,
    lng: latest.coords.longitude,
  });

  await checkForDwellAndPrompt(ref.sessionId);
});

export async function startBackgroundLocationTracking(sessionId: string, coupleId: string) {
  await AsyncStorage.setItem(
    ACTIVE_SESSION_KEY,
    JSON.stringify({ sessionId, coupleId } satisfies ActiveSessionRef)
  );
  await AsyncStorage.removeItem(LAST_DWELL_PROMPT_KEY);

  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') return;

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== 'granted') return;

  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(
    () => false
  );
  if (alreadyStarted) return;

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: LOCATION_PING_INTERVAL_MS,
    distanceInterval: 0,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'MichSya sedang mencatat kencan',
      notificationBody: 'Lokasi kalian dicatat untuk journey map. Ketuk untuk kembali ke aplikasi.',
    },
  });
}

export async function stopBackgroundLocationTracking() {
  await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
  await AsyncStorage.removeItem(LAST_DWELL_PROMPT_KEY);

  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(
    () => false
  );
  if (started) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}
