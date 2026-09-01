import { sendPushToPartner } from './push';
import { supabase } from './supabase';

export type VolumeStream = 'ring' | 'notification' | 'media' | 'alarm';

async function resolveCoupleId(): Promise<string | null> {
  const { data: coupleRows } = await supabase.from('couple').select('id').limit(1);
  return (coupleRows?.[0]?.id as string) ?? null;
}

// Push-only, unlike ringPartner.ts/torchPartner.ts's push+BLE+SMS -- BLE
// needs close physical proximity (rarely true for "make sure my partner
// can hear their phone") and SMS can't cleanly carry a structured command
// without inventing a fragile text protocol for a feature that doesn't
// need to survive a no-internet scenario the way ring does. Requires the
// *receiving* device to have granted "Do Not Disturb access" (see
// RemoteControlAccess.tsx / ble-ring's hasRemoteControlAccess) for the
// "ring"/"notification" streams specifically -- if not, the native
// setRingerMode/setStreamVolume calls resolve false and this resolves
// false too, same as any other send failure. "media"/"alarm" need no such
// access on the receiving device at all.
export async function setPartnerRingerMode(
  coupleId: string | null | undefined,
  mode: 'normal' | 'vibrate' | 'silent'
): Promise<boolean> {
  let userId: string | null = null;
  try {
    const { data: userData } = await supabase.auth.getUser();
    userId = userData.user?.id ?? null;
  } catch {
    userId = null;
  }
  if (!userId) return false;

  let resolvedCoupleId: string | null = null;
  try {
    resolvedCoupleId = coupleId ?? (await resolveCoupleId());
  } catch {
    resolvedCoupleId = null;
  }
  if (!resolvedCoupleId) return false;

  return sendPushToPartner(resolvedCoupleId, userId, {
    data: { type: 'set_ringer_mode', mode },
  }).catch(() => false);
}

// Sets an exact target volume on one of the partner's 4 user-facing volume
// streams (matches Android's own system volume panel) rather than nudging
// one step at a time -- lets RemoteControlPanel.tsx's sliders pick a
// precise value directly.
export async function setPartnerStreamVolume(
  coupleId: string | null | undefined,
  stream: VolumeStream,
  percent: number
): Promise<boolean> {
  let userId: string | null = null;
  try {
    const { data: userData } = await supabase.auth.getUser();
    userId = userData.user?.id ?? null;
  } catch {
    userId = null;
  }
  if (!userId) return false;

  let resolvedCoupleId: string | null = null;
  try {
    resolvedCoupleId = coupleId ?? (await resolveCoupleId());
  } catch {
    resolvedCoupleId = null;
  }
  if (!resolvedCoupleId) return false;

  return sendPushToPartner(resolvedCoupleId, userId, {
    data: { type: 'set_stream_volume', stream, percent },
  }).catch(() => false);
}

export interface RemoteVolumeState {
  mode: 'normal' | 'vibrate' | 'silent';
  ring: number;
  notification: number;
  media: number;
  alarm: number;
}

// Written by RemoteControlAccess.tsx on the *receiving* device (the one being
// controlled) every time it checks its own DND-access status, so the
// *controlling* account can see it ahead of time -- see 0004_remote_control_status.sql
// for why this exists (setPartnerRingerMode/setPartnerStreamVolume resolving
// true only proves the push was delivered, not that the native call
// succeeded). Also reports the device's *current* ringer mode/volumes
// (best-effort, plain getters -- see 0005_remote_ringer_state.sql and
// 0006_remote_volume_streams.sql) so the controlling account's UI can start
// from the real current state instead of guessing blind.
export async function reportRemoteControlAccessStatus(
  coupleId: string,
  granted: boolean,
  volumeState: RemoteVolumeState | null
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;
  const { error } = await supabase.from('device_push_tokens').upsert(
    {
      user_id: userId,
      couple_id: coupleId,
      remote_control_granted: granted,
      remote_ringer_mode: volumeState?.mode ?? null,
      remote_ring_volume_percent: volumeState?.ring ?? null,
      remote_notification_volume_percent: volumeState?.notification ?? null,
      remote_media_volume_percent: volumeState?.media ?? null,
      remote_alarm_volume_percent: volumeState?.alarm ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) console.warn('[michsya] reportRemoteControlAccessStatus upsert failed:', error);
}

export interface PartnerRemoteControlState {
  granted: boolean | null;
  mode: 'normal' | 'vibrate' | 'silent' | null;
  ring: number | null;
  notification: number | null;
  media: number | null;
  alarm: number | null;
}

const EMPTY_PARTNER_STATE: PartnerRemoteControlState = {
  granted: null,
  mode: null,
  ring: null,
  notification: null,
  media: null,
  alarm: null,
};

// Shapes one raw `device_push_tokens` row into PartnerRemoteControlState --
// shared by getPartnerRemoteControlState's one-shot fetch below AND
// RemoteControlPanel.tsx's realtime subscription (a `postgres_changes`
// payload's `.new` is the same raw row shape), so both paths parse it
// identically instead of duplicating the field mapping.
export function parsePartnerRow(row: Record<string, unknown> | null | undefined): PartnerRemoteControlState {
  if (!row) return EMPTY_PARTNER_STATE;
  const num = (v: unknown) => (typeof v === 'number' ? v : null);
  return {
    granted: Boolean(row.remote_control_granted),
    mode: (row.remote_ringer_mode as 'normal' | 'vibrate' | 'silent' | null) ?? null,
    ring: num(row.remote_ring_volume_percent),
    notification: num(row.remote_notification_volume_percent),
    media: num(row.remote_media_volume_percent),
    alarm: num(row.remote_alarm_volume_percent),
  };
}

// Read by RemoteControlPanel.tsx (the controlling account) before/while
// showing its buttons, so it can warn instead of silently doing nothing, and
// pre-fill the mode chip/volume sliders from the partner's last-reported
// state. Every field is independently null if the partner's device has
// never reported that particular piece at all. This is a one-shot snapshot
// of whatever was last written -- possibly stale if the partner's device
// hasn't reported since; pair with requestPartnerRemoteState() below to ask
// for a fresh value, and a realtime subscription to receive it the moment
// it lands.
export async function getPartnerRemoteControlState(
  coupleId: string,
  myUserId: string
): Promise<PartnerRemoteControlState> {
  const { data, error } = await supabase
    .from('device_push_tokens')
    .select(
      'user_id, remote_control_granted, remote_ringer_mode, remote_ring_volume_percent, remote_notification_volume_percent, remote_media_volume_percent, remote_alarm_volume_percent'
    )
    .eq('couple_id', coupleId);

  if (error) console.warn('[michsya] getPartnerRemoteControlState query failed:', error);

  const partnerRow = data?.find((row) => row.user_id !== myUserId);
  return parsePartnerRow(partnerRow);
}

// Asks the partner's device to immediately re-read its own current
// mode/volume state and report it (see backgroundNotifications.ts's
// 'request_remote_state' handler) -- without this, opening the panel could
// only ever show whatever her device last happened to report on its own
// (on her app foregrounding, or periodically -- see RemoteControlAccess.tsx),
// which may be stale by however long it's been since either of those last
// happened. Combined with the realtime subscription in
// RemoteControlPanel.tsx, the fresh value lands within moments of opening
// the panel instead of needing her to background/foreground her own app.
export async function requestPartnerRemoteState(coupleId: string | null | undefined): Promise<boolean> {
  let userId: string | null = null;
  try {
    const { data: userData } = await supabase.auth.getUser();
    userId = userData.user?.id ?? null;
  } catch {
    userId = null;
  }
  if (!userId) return false;

  let resolvedCoupleId: string | null = null;
  try {
    resolvedCoupleId = coupleId ?? (await resolveCoupleId());
  } catch {
    resolvedCoupleId = null;
  }
  if (!resolvedCoupleId) return false;

  return sendPushToPartner(resolvedCoupleId, userId, {
    data: { type: 'request_remote_state', coupleId: resolvedCoupleId },
  }).catch(() => false);
}
