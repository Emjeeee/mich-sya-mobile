import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as QuickActions from 'expo-quick-actions';

import AddJourneyMapModal from '../components/AddJourneyMapModal';
import AddMemoryModal from '../components/AddMemoryModal';
import DateRecapModal from '../components/DateRecapModal';
import EndDateModal from '../components/EndDateModal';
import FindPartnerModal from '../components/FindPartnerModal';
import JourneyMapModal from '../components/JourneyMapModal';
import SwipeToConfirm from '../components/SwipeToConfirm';
import WishlistListModal from '../components/WishlistListModal';
import { useCoupleStats } from '../hooks/useCoupleStats';
import { useDateSession } from '../hooks/useDateSession';
import { useNextSchedule } from '../hooks/useNextSchedule';
import { handleNotificationResponse } from '../lib/backgroundNotifications';
import { formatDistance } from '../lib/geo';
import { getCurrentCoords } from '../lib/location';
import { registerForPushNotifications } from '../lib/notifications';
import { sendPushToPartner } from '../lib/push';
import { getSignedUrl } from '../lib/storage';
import { supabase } from '../lib/supabase';
import type { DateSession } from '../types/database';

function formatElapsed(startedAt: string): string {
  const elapsedMs = Date.now() - new Date(startedAt).getTime();
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { coupleId, session, loading, starting, ending, error, startSession, endSession } =
    useDateSession();
  const { nextSchedule, daysUntil } = useNextSchedule(coupleId);
  const stats = useCoupleStats(coupleId);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [showFindPartnerModal, setShowFindPartnerModal] = useState(false);
  const [showJourneyMapModal, setShowJourneyMapModal] = useState(false);
  const [journeyPrompt, setJourneyPrompt] = useState<{ lat: number; lng: number } | null>(null);
  const [swipeResetKey, setSwipeResetKey] = useState(0);
  const [elapsed, setElapsed] = useState('');
  const [quickMemoryNotice, setQuickMemoryNotice] = useState<string | null>(null);
  const [recap, setRecap] = useState<{
    title: string;
    durationLabel: string;
    distanceLabel: string | null;
    photoUrls: string[];
  } | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    if (!session) return;
    setElapsed(formatElapsed(session.started_at));
    const interval = setInterval(() => {
      setElapsed(formatElapsed(session.started_at));
    }, 1000);
    return () => clearInterval(interval);
  }, [session?.started_at]);

  useEffect(() => {
    if (!coupleId) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) registerForPushNotifications(coupleId, data.user.id);
    });
  }, [coupleId]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response);
      const data = response.notification.request.content.data;
      if (data?.type === 'find_start') {
        setShowFindPartnerModal(true);
      }
      if (data?.type === 'journey_dwell_prompt') {
        setJourneyPrompt({ lat: data.lat as number, lng: data.lng as number });
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!coupleId) return;

    const handleQuickAction = async (action: QuickActions.Action) => {
      if (action.id === 'start_date') {
        if (!sessionRef.current) startSession();
      } else if (action.id === 'ring_partner') {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          sendPushToPartner(coupleId, userData.user.id, { data: { type: 'ring' } });
        }
      }
    };

    if (QuickActions.initial) handleQuickAction(QuickActions.initial);
    const subscription = QuickActions.addListener(handleQuickAction);
    return () => subscription.remove();
  }, [coupleId, startSession]);

  const handleEndSubmit = async (input: { title: string; summary: string }) => {
    const endingSession = sessionRef.current;
    const durationLabel = elapsed;
    const routeMeters = await endSession(input);
    setShowEndModal(false);

    const distanceLabel = routeMeters !== null ? formatDistance(routeMeters) : null;
    if (distanceLabel) {
      Alert.alert('Kencan berakhir!', `Kalian jalan sejauh ${distanceLabel} selama kencan ini.`);
    }

    if (endingSession && coupleId) {
      await prepareRecap(endingSession, input.title, durationLabel, distanceLabel);
    }
  };

  const prepareRecap = async (
    endingSession: DateSession,
    title: string,
    durationLabel: string,
    distanceLabel: string | null
  ) => {
    if (!coupleId) return;
    const { data: memoriesForDate } = await supabase
      .from('memories')
      .select('photo_url')
      .eq('couple_id', coupleId)
      .eq('memory_date', endingSession.started_at.slice(0, 10))
      .not('photo_url', 'is', null)
      .limit(4);

    const photoUrls = (
      await Promise.all(
        (memoriesForDate ?? []).map((m) => getSignedUrl(m.photo_url as string))
      )
    ).filter((url): url is string => Boolean(url));

    setRecap({
      title: title.trim() || endingSession.title || 'Kencan',
      durationLabel,
      distanceLabel,
      photoUrls,
    });
  };

  const handleQuickMemory = async () => {
    if (!coupleId) return;
    const { data: userData } = await supabase.auth.getUser();
    const coords = await getCurrentCoords();

    await supabase.from('memories').insert({
      couple_id: coupleId,
      title: 'Momen spontan 💕',
      description: null,
      photo_url: null,
      voice_note_url: null,
      location: coords ? `${coords.lat}, ${coords.lng}` : null,
      memory_date: new Date().toISOString().slice(0, 10),
      created_by: userData.user?.id ?? null,
    });

    setQuickMemoryNotice('Momen tersimpan 💕');
    setTimeout(() => setQuickMemoryNotice(null), 2000);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16, paddingTop: insets.top + 16 }]}>
      <View style={styles.center}>
        <Text style={styles.title}>MichSya</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        {session ? (
          <>
            <Text style={styles.status}>Kencan sedang berlangsung</Text>
            <Text style={styles.timer}>{elapsed}</Text>
            <SwipeToConfirm
              key={swipeResetKey}
              label="Geser untuk akhiri kencan"
              color="#e11d74"
              onConfirm={() => setShowEndModal(true)}
              loading={ending}
            />
          </>
        ) : (
          <>
            <Text style={styles.status}>Belum ada kencan aktif</Text>
            <SwipeToConfirm
              label="Geser untuk mulai kencan"
              color="#e11d74"
              onConfirm={startSession}
              loading={starting}
            />
            {nextSchedule && daysUntil !== null && (
              <Text style={styles.hintLine}>
                {daysUntil <= 0 ? 'Hari ini' : `${daysUntil} hari lagi`}: {nextSchedule.title}
              </Text>
            )}
            {stats && (
              <Text style={styles.hintLine}>
                {stats.totalMemories} kenangan · {stats.datesThisMonth} kencan bulan ini
              </Text>
            )}
          </>
        )}
      </View>

      {coupleId && (
        <View style={styles.actionsRow}>
          <Pressable
            style={styles.actionButton}
            onPress={() => setShowMemoryModal(true)}
          >
            <Text style={styles.actionButtonText}>📷 Kenangan</Text>
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={() => setShowWishlistModal(true)}
          >
            <Text style={styles.actionButtonText}>✨ Wishlist</Text>
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={() => setShowFindPartnerModal(true)}
          >
            <Text style={styles.actionButtonText}>🧭 Cari Pasangan</Text>
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={() => setShowJourneyMapModal(true)}
          >
            <Text style={styles.actionButtonText}>🗺 Journey Map</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={handleQuickMemory}>
            <Text style={styles.actionButtonText}>💕 Momen</Text>
          </Pressable>
        </View>
      )}

      {quickMemoryNotice && <Text style={styles.noticeText}>{quickMemoryNotice}</Text>}

      <Pressable style={styles.signOutButton} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.signOutText}>Keluar</Text>
      </Pressable>

      <EndDateModal
        visible={showEndModal}
        loading={ending}
        onCancel={() => {
          setShowEndModal(false);
          setSwipeResetKey((k) => k + 1);
        }}
        onSubmit={handleEndSubmit}
      />

      {coupleId && (
        <>
          <AddMemoryModal
            visible={showMemoryModal}
            coupleId={coupleId}
            onClose={() => setShowMemoryModal(false)}
          />
          <WishlistListModal
            visible={showWishlistModal}
            coupleId={coupleId}
            onClose={() => setShowWishlistModal(false)}
          />
          <FindPartnerModal
            visible={showFindPartnerModal}
            coupleId={coupleId}
            onClose={() => setShowFindPartnerModal(false)}
          />
          {journeyPrompt && (
            <AddJourneyMapModal
              visible
              coupleId={coupleId}
              lat={journeyPrompt.lat}
              lng={journeyPrompt.lng}
              onClose={() => setJourneyPrompt(null)}
            />
          )}
          <JourneyMapModal
            visible={showJourneyMapModal}
            coupleId={coupleId}
            onClose={() => setShowJourneyMapModal(false)}
          />
        </>
      )}

      {recap && (
        <DateRecapModal
          visible
          title={recap.title}
          durationLabel={recap.durationLabel}
          distanceLabel={recap.distanceLabel}
          photoUrls={recap.photoUrls}
          onClose={() => setRecap(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#e11d74',
    marginBottom: 8,
  },
  status: {
    fontSize: 16,
    color: '#333',
  },
  timer: {
    fontSize: 40,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    fontVariant: ['tabular-nums'],
  },
  error: {
    color: '#c0392b',
    textAlign: 'center',
    marginBottom: 8,
  },
  hintLine: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  noticeText: {
    textAlign: 'center',
    color: '#e11d74',
    fontWeight: '600',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#fdeef4',
  },
  actionButtonText: {
    color: '#e11d74',
    fontWeight: '600',
  },
  signOutButton: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e11d74',
  },
  signOutText: {
    color: '#e11d74',
    fontWeight: '600',
  },
});
