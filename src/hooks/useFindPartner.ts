import { useCallback, useEffect, useState } from 'react';

import { startFindPartnerTracking, stopFindPartnerTracking } from '../lib/backgroundFindPartner';
import { sendPushToPartner } from '../lib/push';
import { supabase } from '../lib/supabase';
import type { PartnerPresence } from '../types/database';

export function useFindPartner(coupleId: string | null) {
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [partnerPresence, setPartnerPresence] = useState<PartnerPresence | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyUserId(data.user?.id ?? null));
  }, []);

  // Both my own and the partner's presence are derived from the same table/subscription --
  // this reflects the true sharing state regardless of whether it was started in-app or
  // auto-started remotely via a push (see backgroundNotifications.ts's 'find_start' handling).
  useEffect(() => {
    if (!coupleId || !myUserId) return;

    supabase
      .from('partner_presence')
      .select('*')
      .eq('couple_id', coupleId)
      .then(({ data }) => {
        const rows = (data as PartnerPresence[]) ?? [];
        const mine = rows.find((row) => row.user_id === myUserId);
        const theirs = rows.find((row) => row.user_id !== myUserId);
        setIsSharing(Boolean(mine?.is_sharing));
        setMyLocation(mine?.is_sharing ? { lat: mine.lat, lng: mine.lng } : null);
        setPartnerPresence(theirs?.is_sharing ? theirs : null);
      });

    const channel = supabase
      .channel(`partner-presence-${coupleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'partner_presence',
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          const row = payload.new as PartnerPresence | undefined;
          if (!row) return;
          if (row.user_id === myUserId) {
            setIsSharing(row.is_sharing);
            setMyLocation(row.is_sharing ? { lat: row.lat, lng: row.lng } : null);
          } else {
            setPartnerPresence(row.is_sharing ? row : null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, myUserId]);

  const stopFinding = useCallback(async () => {
    if (!coupleId || !myUserId) return;
    await stopFindPartnerTracking(coupleId, myUserId);
  }, [coupleId, myUserId]);

  const startFinding = useCallback(async () => {
    if (!coupleId || !myUserId) return;
    setStarting(true);
    setError(null);

    const started = await startFindPartnerTracking(coupleId, myUserId);
    if (!started) {
      setError('Izin lokasi (termasuk latar belakang) diperlukan untuk mencari pasangan.');
      setStarting(false);
      return;
    }

    setStarting(false);

    sendPushToPartner(coupleId, myUserId, {
      title: 'Lagi dicariin nih 👀',
      body: 'Lokasimu otomatis dibagikan ke pasanganmu selama 30 menit biar saling ketemu.',
      data: { type: 'find_start', coupleId },
    });
  }, [coupleId, myUserId]);

  return {
    myUserId,
    isSharing,
    myLocation,
    partnerPresence,
    starting,
    error,
    startFinding,
    stopFinding,
  };
}
