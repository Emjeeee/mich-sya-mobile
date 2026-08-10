import { broadcastBleTorch, broadcastSmsTorch } from './bleRing';
import { getPartnerPhoneNumber, sendPushToPartner } from './push';
import { supabase } from './supabase';
import type { TorchPattern } from './torchPattern';

async function resolveCoupleId(): Promise<string | null> {
  const { data: coupleRows } = await supabase.from('couple').select('id').limit(1);
  return (coupleRows?.[0]?.id as string) ?? null;
}

// Torch equivalent of ringPartner.ts -- same 3-channel-in-parallel,
// each-independently-guarded orchestration, so "Nyalain senter pasangan"
// works whether the partner has no internet but is nearby (Bluetooth) or no
// internet but has cellular signal (SMS). See ringPartner.ts for why every
// path is wrapped so one failing (e.g. a raw fetch() throwing offline)
// never blocks the others.
export async function torchPartner(coupleId: string | null | undefined, pattern: TorchPattern): Promise<boolean> {
  const blePromise = broadcastBleTorch(pattern).catch(() => false);

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
    .then((phoneNumber) => broadcastSmsTorch(phoneNumber, pattern))
    .catch(() => false);

  const pushSent = await sendPushToPartner(resolvedCoupleId, userId, {
    data: { type: 'torch', kind: pattern.kind, onMs: pattern.onMs, offMs: pattern.offMs },
  }).catch(() => false);

  const [bleSent, smsSent] = await Promise.all([blePromise, smsPromise]);
  return pushSent || bleSent || smsSent;
}
