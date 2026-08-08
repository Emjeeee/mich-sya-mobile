import { sendPushToPartner } from './push';
import { supabase } from './supabase';

async function resolveCoupleId(): Promise<string | null> {
  const { data: coupleRows } = await supabase.from('couple').select('id').limit(1);
  return (coupleRows?.[0]?.id as string) ?? null;
}

// Shared by the in-app "Bunyikan HP pasangan" button, the long-press quick
// action, and the home-screen widget's ring button -- all three just need
// "send a ring push to whoever my partner is".
export async function ringPartner(coupleId?: string | null): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

  const resolvedCoupleId = coupleId ?? (await resolveCoupleId());
  if (!resolvedCoupleId) return false;

  return sendPushToPartner(resolvedCoupleId, userData.user.id, { data: { type: 'ring' } });
}
