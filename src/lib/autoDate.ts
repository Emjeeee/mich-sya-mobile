import AsyncStorage from '@react-native-async-storage/async-storage';
import { deferAutoDateEnd } from 'ble-ring';
import * as Notifications from 'expo-notifications';
import { AppRegistry } from 'react-native';

import type { DateSession } from '../types/database';
import { startBackgroundLocationTracking, stopBackgroundLocationTracking } from './backgroundLocation';
import { friendlyError } from './friendlyError';
import { distanceMeters } from './geo';
import { getCurrentCoords, type Coords } from './location';
import { sendPushToPartner } from './push';
import { getCoupleRingSettings } from './ringCustomization';
import { supabase } from './supabase';
import { localDateString, localTimeString } from './time';
import { refreshWidget } from './widget';

// ---- Non-hook date core (shared by useDateSession and the auto-date task) ----

// Postgres unique_violation: the "one open date per couple" index (0009).
const UNIQUE_VIOLATION = '23505';

// Best-effort nudge so the partner's widget/app catches up immediately
// instead of waiting for the next periodic widget refresh.
function notifyPartnerOfWidgetChange(coupleId: string, myUserId: string) {
  sendPushToPartner(coupleId, myUserId, { data: { type: 'widget_refresh' } }).catch(() => {});
}

export async function fetchActiveSession(coupleId: string): Promise<DateSession | null> {
  const { data } = await supabase
    .from('date_sessions')
    .select('*')
    .eq('couple_id', coupleId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1);
  return (data?.[0] as DateSession | undefined) ?? null;
}

export async function computeRouteDistanceMeters(sessionId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('date_session_locations')
    .select('lat, lng')
    .eq('session_id', sessionId)
    .order('recorded_at', { ascending: true });

  if (error || !data || data.length < 2) return null;

  let total = 0;
  for (let i = 1; i < data.length; i++) {
    total += distanceMeters(data[i - 1], data[i]);
  }
  return total;
}

export interface StartCoreResult {
  session: DateSession | null;
  // True only when THIS call inserted the session (not adopted/pre-existing).
  created: boolean;
  error: string | null;
}

export interface StartCoreOptions {
  // Pre-fetched coords (null = known unavailable); omitted = fetch here.
  coords?: Coords | null;
  // Auto-date: on losing the two-phones race (23505) adopt the winner's
  // session instead of surfacing an error, and don't fail if background
  // tracking can't start from a headless context.
  auto?: boolean;
}

export async function startDateSessionCore(
  coupleId: string,
  options: StartCoreOptions = {}
): Promise<StartCoreResult> {
  // Re-check server-side: a stale local state (or a widget/other-device start)
  // would otherwise create a duplicate active session.
  const existing = await fetchActiveSession(coupleId);
  if (existing) return { session: existing, created: false, error: null };

  const { data: userData } = await supabase.auth.getUser();
  const coords = options.coords !== undefined ? options.coords : await getCurrentCoords();

  const { data, error: insertError } = await supabase
    .from('date_sessions')
    .insert({
      couple_id: coupleId,
      created_by: userData.user?.id ?? null,
      start_lat: coords?.lat ?? null,
      start_lng: coords?.lng ?? null,
    })
    .select()
    .single();

  if (insertError) {
    if (options.auto && insertError.code === UNIQUE_VIOLATION) {
      const winner = await fetchActiveSession(coupleId);
      if (winner) {
        await startBackgroundLocationTracking(winner.id, coupleId).catch(() => {});
        return { session: winner, created: false, error: null };
      }
    }
    return { session: null, created: false, error: friendlyError(insertError.message) };
  }

  const newSession = data as DateSession;

  // Drop an immediate breadcrumb so the trail doesn't wait for the first interval tick.
  if (coords) {
    await supabase.from('date_session_locations').insert({
      session_id: newSession.id,
      couple_id: coupleId,
      lat: coords.lat,
      lng: coords.lng,
    });
  }

  if (options.auto) {
    await startBackgroundLocationTracking(newSession.id, coupleId).catch(() => {});
  } else {
    await startBackgroundLocationTracking(newSession.id, coupleId);
  }
  refreshWidget().catch(() => {});
  if (userData.user) notifyPartnerOfWidgetChange(coupleId, userData.user.id);
  return { session: newSession, created: true, error: null };
}

export interface EndCoreResult {
  success: boolean;
  routeMeters: number | null;
  // True when the session was already closed by the partner (auto flow only).
  alreadyEnded?: boolean;
  error: string | null;
}

// When a date ends we remember when, so a still-present partner doesn't
// immediately re-trigger an auto start for the same togetherness (see
// handleStart).
const LAST_DATE_ENDED_AT_KEY = 'michsya.autoDate.lastEndedAt';

export async function endDateSessionCore(
  coupleId: string,
  current: DateSession,
  { title, summary, onlyIfOpen }: { title: string; summary: string; onlyIfOpen?: boolean }
): Promise<EndCoreResult> {
  const coords = await getCurrentCoords();
  const endedAt = new Date();

  // Both phones auto-end at about the same time: only the one that actually
  // closes the row records the schedule entry / recap.
  const changes = {
    ended_at: endedAt.toISOString(),
    end_lat: coords?.lat ?? null,
    end_lng: coords?.lng ?? null,
    title: title || current.title,
    summary,
  };
  let updateError;
  let closedByUs = true;
  if (onlyIfOpen) {
    const res = await supabase.from('date_sessions').update(changes).eq('id', current.id).is('ended_at', null).select('id');
    updateError = res.error;
    closedByUs = !!res.data && res.data.length > 0;
  } else {
    const res = await supabase.from('date_sessions').update(changes).eq('id', current.id);
    updateError = res.error;
  }

  if (updateError) {
    return { success: false, routeMeters: null, error: friendlyError(updateError.message) };
  }
  if (!closedByUs) {
    await stopBackgroundLocationTracking().catch(() => {});
    return { success: true, routeMeters: null, alreadyEnded: true, error: null };
  }

  AsyncStorage.setItem(LAST_DATE_ENDED_AT_KEY, String(endedAt.getTime())).catch(() => {});

  const { data: userData } = await supabase.auth.getUser();
  const startedAt = new Date(current.started_at);

  const { error: scheduleError } = await supabase.from('schedules').insert({
    couple_id: coupleId,
    title: title || 'Kencan',
    description: summary,
    scheduled_date: localDateString(startedAt),
    scheduled_time: localTimeString(startedAt),
    status: 'completed',
    created_by: userData.user?.id ?? null,
  });

  const routeMeters = await computeRouteDistanceMeters(current.id);

  await stopBackgroundLocationTracking();
  refreshWidget().catch(() => {});
  if (userData.user) notifyPartnerOfWidgetChange(coupleId, userData.user.id);
  return {
    success: true,
    routeMeters,
    error: scheduleError ? friendlyError(scheduleError.message) : null,
  };
}

// ---- Kencan otomatis (headless task driven by the native BLE detector) ----

// "Where the partner was last seen" is approximated by this phone's own last
// breadcrumb; if we are still this close to it, the partner's phone more
// likely died/ran out of range for a moment than we actually parted.
const STILL_TOGETHER_METERS = 100;
const DEFERRED_FOR_KEY = 'michsya.autoDate.deferredForLastSeen';

async function notifyLocal(title: string, body: string) {
  try {
    await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
  } catch {
    // Best-effort.
  }
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.max(1, Math.round(ms / 60_000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} menit`;
  return m === 0 ? `${h} jam` : `${h} jam ${m} menit`;
}

async function loadSettings() {
  const { data } = await supabase.from('couple').select('id').limit(1);
  const coupleId = (data?.[0]?.id as string | undefined) ?? null;
  if (!coupleId) return null;
  const settings = await getCoupleRingSettings(coupleId);
  if (!settings?.auto_date_enabled) return null;
  return { coupleId, settings };
}

async function handleStart(nearSinceMs: number) {
  const loaded = await loadSettings();
  if (!loaded) return;
  const { coupleId, settings } = loaded;

  // A date that ended during this same togetherness (e.g. swiped to end while
  // still next to each other) must not be restarted until they part.
  const lastEnded = Number(await AsyncStorage.getItem(LAST_DATE_ENDED_AT_KEY)) || 0;
  if (nearSinceMs > 0 && lastEnded >= nearSinceMs) return;

  if (await fetchActiveSession(coupleId)) return;

  const coords = await getCurrentCoords();
  if (settings.home_lat != null && settings.home_lng != null) {
    // Can't prove we're away from home without a fix -- don't guess.
    if (!coords) return;
    const dist = distanceMeters(coords, { lat: settings.home_lat, lng: settings.home_lng });
    if (dist <= settings.home_radius_m) return;
  }

  const result = await startDateSessionCore(coupleId, { coords, auto: true });
  if (result.created) await notifyLocal('Kencan dimulai otomatis 💕', 'Kalian lagi bareng, kencan dicatat.');
}

async function handleEnd(lastSeenMs: number) {
  const loaded = await loadSettings();
  if (!loaded) return;
  const { coupleId } = loaded;

  const active = await fetchActiveSession(coupleId);
  if (!active) return;

  const deferredFor = await AsyncStorage.getItem(DEFERRED_FOR_KEY);
  if (deferredFor !== String(lastSeenMs)) {
    const coords = await getCurrentCoords();
    if (coords) {
      const { data } = await supabase
        .from('date_session_locations')
        .select('lat, lng')
        .eq('session_id', active.id)
        .lte('recorded_at', new Date(lastSeenMs).toISOString())
        .order('recorded_at', { ascending: false })
        .limit(1);
      const ref = data?.[0] as Coords | undefined;
      if (ref && distanceMeters(coords, ref) <= STILL_TOGETHER_METERS) {
        // Defer only once per absence so a really-ended date can't be stuck open.
        await AsyncStorage.setItem(DEFERRED_FOR_KEY, String(lastSeenMs));
        await deferAutoDateEnd().catch(() => {});
        return;
      }
    }
  }

  const result = await endDateSessionCore(coupleId, active, { title: '', summary: '', onlyIfOpen: true });
  if (result.success && !result.alreadyEnded) {
    const duration = formatDuration(Date.now() - new Date(active.started_at).getTime());
    await notifyLocal(`Kencan selesai — ${duration}`, 'Kencan kalian sudah dicatat.');
  }
}

// Native events can arrive back to back (and from a still-running previous
// task) -- run them one at a time.
let queue: Promise<void> = Promise.resolve();

interface AutoDateTaskData {
  event?: string;
  lastSeenMs?: number;
  nearSinceMs?: number;
}

AppRegistry.registerHeadlessTask('MichsyaAutoDate', () => async (data: AutoDateTaskData) => {
  const run = queue.then(async () => {
    try {
      if (data?.event === 'start') await handleStart(data.nearSinceMs ?? 0);
      else if (data?.event === 'end') await handleEnd(data.lastSeenMs ?? 0);
    } catch {
      // A failed auto action is retried by the next native event.
    }
  });
  queue = run;
  await run;
});
