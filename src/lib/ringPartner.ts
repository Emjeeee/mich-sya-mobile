import { broadcastBleRing, broadcastSmsRing } from './bleRing';
import { getPartnerPhoneNumber, sendPushToPartner } from './push';
import { supabase } from './supabase';

async function resolveCoupleId(): Promise<string | null> {
  const { data: coupleRows } = await supabase.from('couple').select('id').limit(1);
  return (coupleRows?.[0]?.id as string) ?? null;
}

// Shared by the in-app "Bunyikan HP pasangan" button, the long-press quick
// action, and the home-screen widget's ring button -- all three just need
// "ring whoever my partner is". Fires the internet-based push, a local
// Bluetooth broadcast, and an SMS trigger all in parallel, so it works
// whether the partner has no internet but is nearby (Bluetooth) or no
// internet but has cellular signal (SMS). Resolves `true` if any path went
// out -- none of the three can confirm actual delivery synchronously.
export async function ringPartner(coupleId?: string | null): Promise<boolean> {
  const blePromise = broadcastBleRing();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return blePromise;

  const resolvedCoupleId = coupleId ?? (await resolveCoupleId());
  if (!resolvedCoupleId) return blePromise;

  const smsPromise = getPartnerPhoneNumber(resolvedCoupleId, userData.user.id).then((phoneNumber) =>
    broadcastSmsRing(phoneNumber)
  );

  const pushSent = await sendPushToPartner(resolvedCoupleId, userData.user.id, {
    data: { type: 'ring' },
  });

  const [bleSent, smsSent] = await Promise.all([blePromise, smsPromise]);
  return pushSent || bleSent || smsSent;
}
