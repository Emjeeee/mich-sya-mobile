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

async function getPartnerPushToken(coupleId: string, myUserId: string): Promise<string | null> {
  const { data } = await supabase
    .from('device_push_tokens')
    .select('user_id, expo_push_token')
    .eq('couple_id', coupleId);

  const partnerRow = data?.find((row) => row.user_id !== myUserId);
  return partnerRow?.expo_push_token ?? null;
}

export async function sendPushToPartner(
  coupleId: string,
  myUserId: string,
  payload: PushPayload
): Promise<boolean> {
  const token = await getPartnerPushToken(coupleId, myUserId);
  if (!token) return false;

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
      sound: payload.sound ?? 'default',
      priority: payload.priority ?? 'high',
      channelId: 'default',
    }),
  });

  return response.ok;
}
