import { sendPushToPartner } from './push';
import { supabase } from './supabase';

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
// RemoteControlAccess.tsx / ble-ring's hasRemoteControlAccess) -- if not,
// the native setRingerMode/adjustRingerVolume calls resolve false and this
// resolves false too, same as any other send failure.
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

export async function adjustPartnerVolume(
  coupleId: string | null | undefined,
  direction: 'up' | 'down'
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
    data: { type: 'adjust_volume', direction },
  }).catch(() => false);
}

// Written by RemoteControlAccess.tsx on the *receiving* device (the one being
// controlled) every time it checks its own DND-access status, so the
// *controlling* account can see it ahead of time -- see 0004_remote_control_status.sql
// for why this exists (setPartnerRingerMode/adjustPartnerVolume resolving true
// only proves the push was delivered, not that the native call succeeded).
export async function reportRemoteControlAccessStatus(coupleId: string, granted: boolean): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;
  await supabase.from('device_push_tokens').upsert(
    {
      user_id: userId,
      couple_id: coupleId,
      remote_control_granted: granted,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
}

// Read by RemoteControlPanel.tsx (the controlling account) before/while
// showing its buttons, so it can warn instead of silently doing nothing.
// Returns null if the partner's device has never reported a status at all.
export async function getPartnerRemoteControlAccess(
  coupleId: string,
  myUserId: string
): Promise<boolean | null> {
  const { data } = await supabase
    .from('device_push_tokens')
    .select('user_id, remote_control_granted')
    .eq('couple_id', coupleId);

  const partnerRow = data?.find((row) => row.user_id !== myUserId);
  return partnerRow ? Boolean(partnerRow.remote_control_granted) : null;
}
