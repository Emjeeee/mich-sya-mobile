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
//
// Every path is wrapped so a failure in one (e.g. a raw fetch() throwing
// "Network request failed" with no connection) can never stop the others
// from being tried -- that exact bug was caught by a real airplane-mode
// test: an unguarded throw from the push path was aborting this function
// before BLE/SMS were even evaluated.
export async function ringPartner(coupleId?: string | null): Promise<boolean> {
  const blePromise = broadcastBleRing().catch(() => false);

  let userId: string | null = null;
  try {
    const { data: userData } = await supabase.auth.getUser();
    userId = userData.user?.id ?? null;
  } catch {
    userId = null;
  }
  if (!userId) return blePromise;

  let resolvedCoupleId: string | null = null;
  try {
    resolvedCoupleId = coupleId ?? (await resolveCoupleId());
  } catch {
    resolvedCoupleId = null;
  }
  if (!resolvedCoupleId) return blePromise;

  const smsPromise = getPartnerPhoneNumber(resolvedCoupleId, userId)
    .then((phoneNumber) => broadcastSmsRing(phoneNumber))
    .catch(() => false);

  const pushSent = await sendPushToPartner(resolvedCoupleId, userId, {
    data: { type: 'ring' },
  }).catch(() => false);

  const [bleSent, smsSent] = await Promise.all([blePromise, smsPromise]);
  return pushSent || bleSent || smsSent;
}
