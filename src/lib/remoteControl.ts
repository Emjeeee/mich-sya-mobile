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
  // Temporary diagnostic -- see getPartnerRemoteControlState. Confirms
  // whether this device's actual read (volumeState, from getVolumeState())
  // is what's really being sent to Supabase, and whether the upsert itself
  // succeeds. Remove once root-caused.
  console.log('[michsya] reportRemoteControlAccessStatus', { coupleId, granted, volumeState, error });
}

export interface PartnerRemoteControlState {
  granted: boolean | null;
  mode: 'normal' | 'vibrate' | 'silent' | null;
  ring: number | null;
  notification: number | null;
  media: number | null;
  alarm: number | null;
}

// Read by RemoteControlPanel.tsx (the controlling account) before/while
// showing its buttons, so it can warn instead of silently doing nothing, and
// pre-fill the mode chip/volume sliders from the partner's last-reported
// state. Every field is independently null if the partner's device has
// never reported that particular piece at all.
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

  // Temporary diagnostic -- volume/mode sliders were reported as always
  // showing 0/unset on a real device despite the partner's actual phone
  // having normal non-zero volumes, and there's no other visibility into
  // what this query actually returns. Remove once root-caused.
  console.log('[michsya] getPartnerRemoteControlState', { coupleId, myUserId, data, error });

  const partnerRow = data?.find((row) => row.user_id !== myUserId);
  if (!partnerRow) {
    return { granted: null, mode: null, ring: null, notification: null, media: null, alarm: null };
  }
  const num = (v: unknown) => (typeof v === 'number' ? v : null);
  return {
    granted: Boolean(partnerRow.remote_control_granted),
    mode: (partnerRow.remote_ringer_mode as 'normal' | 'vibrate' | 'silent' | null) ?? null,
    ring: num(partnerRow.remote_ring_volume_percent),
    notification: num(partnerRow.remote_notification_volume_percent),
    media: num(partnerRow.remote_media_volume_percent),
    alarm: num(partnerRow.remote_alarm_volume_percent),
  };
}
