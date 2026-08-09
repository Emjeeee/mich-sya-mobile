import { supabase } from './supabase';

interface PushPayload {
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  priority?: 'default' | 'high';
}

export async function registerPushToken(coupleId: string, userId: string, token: string) {
  await supabase.from('device_push_tokens').upsert(
    {
      user_id: userId,
      couple_id: coupleId,
      expo_push_token: token,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
}

// Lets "Bunyikan HP pasangan" fall back to SMS (see sendRingSms in
// bleRing.ts) when the partner's phone has signal but no internet/data.
export async function savePhoneNumber(coupleId: string, userId: string, phoneNumber: string) {
  await supabase.from('device_push_tokens').upsert(
    {
      user_id: userId,
      couple_id: coupleId,
      phone_number: phoneNumber,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
}

export async function getMyPhoneNumber(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('device_push_tokens')
    .select('phone_number')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.phone_number ?? null;
}

async function getPartnerPushToken(coupleId: string, myUserId: string): Promise<string | null> {
  const { data } = await supabase
    .from('device_push_tokens')
    .select('user_id, expo_push_token')
    .eq('couple_id', coupleId);

  const partnerRow = data?.find((row) => row.user_id !== myUserId);
  return partnerRow?.expo_push_token ?? null;
}

export async function getPartnerPhoneNumber(coupleId: string, myUserId: string): Promise<string | null> {
  const { data } = await supabase
    .from('device_push_tokens')
    .select('user_id, phone_number')
    .eq('couple_id', coupleId);

  const partnerRow = data?.find((row) => row.user_id !== myUserId);
  return partnerRow?.phone_number ?? null;
}

export async function sendPushToPartner(
  coupleId: string,
  myUserId: string,
  payload: PushPayload
): Promise<boolean> {
  // ringPartner() fires this alongside the BLE/SMS fallbacks specifically
  // for the no-internet case -- an unguarded fetch() throws
  // (UnknownHostException/"Network request failed") with no connection,
  // which previously aborted ringPartner() entirely before it could even
  // check whether BLE/SMS went out. Must degrade to `false`, not throw.
  try {
    const token = await getPartnerPushToken(coupleId, myUserId);
    if (!token) return false;

    // Data-only pushes (no title/body -- ring, widget_refresh, find_start's
    // internal re-delivery) must NOT set `sound` or `channelId`: both are
    // display-notification concepts, and their mere presence appears to make
    // Expo's gateway construct an FCM "notification" message (with blank
    // title/body) instead of a pure data message. A background/killed app
    // NEVER gets onMessageReceived called for a notification-shaped FCM
    // message -- Android displays it via the system tray directly (exactly
    // the empty/silent notification bar previously observed), bypassing every
    // bit of our own handling entirely, native or JS.
    const isDataOnly = !payload.title && !payload.body;

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        to: token,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        ...(isDataOnly
          ? {}
          : { sound: payload.sound ?? 'default', channelId: 'default' }),
        priority: payload.priority ?? 'high',
      }),
    });

    if (!response.ok) return false;

    // Expo returns 200 even when the push itself was rejected (e.g. a stale/
    // uninstalled-app token) -- the real per-recipient result is in the body.
    const json = await response.json().catch(() => null);
    const ticketStatus = json?.data?.status;
    if (ticketStatus === 'error') {
      console.warn('Expo push rejected:', json?.data?.message, json?.data?.details);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('sendPushToPartner failed (likely offline):', err);
    return false;
  }
}
