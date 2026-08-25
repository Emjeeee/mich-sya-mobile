import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as QuickActions from 'expo-quick-actions';

import AddJourneyMapModal from '../components/AddJourneyMapModal';
import AddMemoryModal from '../components/AddMemoryModal';
import DateRecapModal from '../components/DateRecapModal';
import EndDateModal from '../components/EndDateModal';
import FindPartnerModal from '../components/FindPartnerModal';
import JourneyMapModal from '../components/JourneyMapModal';
import PhoneNumberModal from '../components/PhoneNumberModal';
import SwipeToConfirm from '../components/SwipeToConfirm';
import { Pixel } from '../components/ui/pixel-icons';
import WishlistListModal from '../components/WishlistListModal';
import { artDeco } from '../theme/artDecoTokens';
import { ArtDecoBackground } from '../theme/components/ArtDecoBackground';
import { ThemeSwitcherSheet } from '../theme/components/ThemeSwitcherSheet';
import { useAppTheme } from '../theme/ThemeContext';
import { useCoupleStats } from '../hooks/useCoupleStats';
import { useDateSession } from '../hooks/useDateSession';
import { useNextSchedule } from '../hooks/useNextSchedule';
import { formatDistance } from '../lib/geo';
import { getCurrentCoords } from '../lib/location';
import { registerForPushNotifications } from '../lib/notifications';
import { sendPushToPartner } from '../lib/push';
import { ringPartner } from '../lib/ringPartner';
import { isSilentRingEligible } from '../lib/silentRing';
import { getSignedUrl } from '../lib/storage';
import { supabase } from '../lib/supabase';
import { formatElapsed } from '../lib/time';
import { refreshWidget } from '../lib/widget';
import type { RootStackParamList } from '../navigation/types';
import type { DateSession } from '../types/database';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const ICON_CAMERA = require('../../assets/icons/camera.png');
const ICON_TARGET = require('../../assets/icons/target.png');
const ICON_COMPASS = require('../../assets/icons/compass.png');
const ICON_MAP = require('../../assets/icons/map.png');
const ICON_HEART = require('../../assets/icons/heart.png');

function ActionButton({
  icon,
  label,
  onPress,
}: {
  icon: number | ReactNode;
  label: string;
  onPress: () => void;
}) {
  const { isArtDeco } = useAppTheme();
  return (
    <Pressable style={[styles.actionButton, isArtDeco && deco.actionButton]} onPress={onPress}>
      {typeof icon === 'number' ? <Image source={icon} style={styles.actionButtonIcon} /> : icon}
      <Text style={[styles.actionButtonText, isArtDeco && deco.actionButtonText]}>{label}</Text>
    </Pressable>
  );
}

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isArtDeco } = useAppTheme();
  const [showThemeSheet, setShowThemeSheet] = useState(false);
  const { coupleId, session, loading, starting, ending, error, startSession, endSession } =
    useDateSession();
  const { nextSchedule, daysUntil } = useNextSchedule(coupleId);
  const stats = useCoupleStats(coupleId);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [showFindPartnerModal, setShowFindPartnerModal] = useState(false);
  const [showJourneyMapModal, setShowJourneyMapModal] = useState(false);
  const [showPhoneNumberModal, setShowPhoneNumberModal] = useState(false);
  const [journeyPrompt, setJourneyPrompt] = useState<{ lat: number; lng: number } | null>(null);
  const [swipeResetKey, setSwipeResetKey] = useState(0);
  const [elapsed, setElapsed] = useState('');
  const [quickMemoryNotice, setQuickMemoryNotice] = useState<string | null>(null);
  const [advancedSettingsEligible, setAdvancedSettingsEligible] = useState(false);
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
    supabase.auth.getUser().then(({ data }) => {
      setAdvancedSettingsEligible(isSilentRingEligible(data.user?.email));
    });
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
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
        ringPartner(coupleId);
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
    try {
      const { data: userData } = await supabase.auth.getUser();

      // Don't let a slow/stuck GPS fix make the button look like it did nothing --
      // save the memory even if location isn't available within a couple seconds.
      const coords = await Promise.race([
        getCurrentCoords().catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
      ]);

      const { error: insertError } = await supabase.from('memories').insert({
        couple_id: coupleId,
        title: 'Momen spontan 💕',
        description: null,
        photo_url: null,
        voice_note_url: null,
        location: coords ? `${coords.lat}, ${coords.lng}` : null,
        memory_date: new Date().toISOString().slice(0, 10),
        created_by: userData.user?.id ?? null,
      });
      if (insertError) throw insertError;

      refreshWidget().catch(() => {});
      if (userData.user) {
        sendPushToPartner(coupleId, userData.user.id, { data: { type: 'widget_refresh' } }).catch(
          () => {}
        );
      }

      setQuickMemoryNotice('Momen tersimpan 💕');
      setTimeout(() => setQuickMemoryNotice(null), 2000);
    } catch {
      Alert.alert('Gagal', 'Momen tidak berhasil disimpan, coba lagi ya.');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }, isArtDeco && deco.container]}>
      {isArtDeco && <ArtDecoBackground />}

      <Pressable
        style={[themeButtonStyles.button, { top: insets.top + 8 }, isArtDeco && themeButtonStyles.buttonDeco]}
        onPress={() => setShowThemeSheet(true)}
      >
        <Text style={[themeButtonStyles.icon, isArtDeco && themeButtonStyles.iconDeco]}>
          {isArtDeco ? '◆' : '🎨'}
        </Text>
      </Pressable>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.center}>
          <Text style={[styles.title, isArtDeco && deco.title]}>MichSya</Text>

          {error && <Text style={[styles.error, isArtDeco && deco.error]}>{error}</Text>}

          {session ? (
            <>
              <Text style={[styles.status, isArtDeco && deco.status]}>Kencan sedang berlangsung</Text>
              <Text style={[styles.timer, isArtDeco && deco.timer]}>{elapsed}</Text>
              <SwipeToConfirm
                key={swipeResetKey}
                label="Geser untuk akhiri kencan"
                color={isArtDeco ? artDeco.color.gold : '#e11d74'}
                onConfirm={() => setShowEndModal(true)}
                loading={ending}
              />
            </>
          ) : (
            <>
              <Text style={[styles.status, isArtDeco && deco.status]}>Belum ada kencan aktif</Text>
              <SwipeToConfirm
                label="Geser untuk mulai kencan"
                color={isArtDeco ? artDeco.color.gold : '#e11d74'}
                onConfirm={startSession}
                loading={starting}
              />
              {nextSchedule && daysUntil !== null && (
                <Text style={[styles.hintLine, isArtDeco && deco.hintLine]}>
                  {daysUntil <= 0 ? 'Hari ini' : `${daysUntil} hari lagi`}: {nextSchedule.title}
                </Text>
              )}
              {stats && (
                <Text style={[styles.hintLine, isArtDeco && deco.hintLine]}>
                  {stats.totalMemories} kenangan · {stats.datesThisMonth} kencan bulan ini
                </Text>
              )}
            </>
          )}
        </View>

        {coupleId && (
          <View style={styles.actionsRow}>
            <ActionButton icon={ICON_CAMERA} label="Kenangan" onPress={() => setShowMemoryModal(true)} />
            <ActionButton icon={ICON_TARGET} label="Wishlist" onPress={() => setShowWishlistModal(true)} />
            <ActionButton icon={ICON_COMPASS} label="Cari Pasangan" onPress={() => setShowFindPartnerModal(true)} />
            <ActionButton icon={ICON_MAP} label="Journey Map" onPress={() => setShowJourneyMapModal(true)} />
            <ActionButton icon={ICON_HEART} label="Momen" onPress={handleQuickMemory} />
            <ActionButton
              icon={<Pixel name="gamepad" size={24} />}
              label="Arcade"
              onPress={() => navigation.navigate('Arcade', { coupleId })}
            />
            {advancedSettingsEligible && (
              <ActionButton
                icon={<Pixel name="gear" size={24} />}
                label="Pengaturan Lanjutan"
                onPress={() => navigation.navigate('AdvancedSettings', { coupleId })}
              />
            )}
          </View>
        )}

        {coupleId && (
          <Text style={[styles.momenHint, isArtDeco && deco.momenHint]}>
            Momen = catat momen spontan sekali tap, tanpa foto/tulisan — otomatis masuk ke Kenangan.
          </Text>
        )}

        {quickMemoryNotice && (
          <Text style={[styles.noticeText, isArtDeco && deco.noticeText]}>{quickMemoryNotice}</Text>
        )}

        {coupleId && (
          <Pressable onPress={() => setShowPhoneNumberModal(true)}>
            <Text style={[styles.phoneNumberLink, isArtDeco && deco.phoneNumberLink]}>
              📱 Atur nomor HP (cadangan SMS untuk Bunyikan)
            </Text>
          </Pressable>
        )}

        <Pressable
          style={[styles.signOutButton, isArtDeco && deco.signOutButton]}
          onPress={() => supabase.auth.signOut()}
        >
          <Text style={[styles.signOutText, isArtDeco && deco.signOutText]}>Keluar</Text>
        </Pressable>
      </ScrollView>

      <ThemeSwitcherSheet visible={showThemeSheet} onClose={() => setShowThemeSheet(false)} />

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
          <PhoneNumberModal
            visible={showPhoneNumberModal}
            coupleId={coupleId}
            onClose={() => setShowPhoneNumberModal(false)}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
    color: '#767676',
    marginTop: 4,
  },
  noticeText: {
    textAlign: 'center',
    color: '#e11d74',
    fontWeight: '600',
    marginBottom: 12,
  },
  momenHint: {
    fontSize: 12,
    color: '#767676',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  phoneNumberLink: {
    fontSize: 12,
    color: '#e11d74',
    textAlign: 'center',
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#fdeef4',
    alignItems: 'center',
    gap: 4,
    minWidth: 72,
  },
  actionButtonIcon: {
    width: 24,
    height: 24,
  },
  actionButtonText: {
    color: '#e11d74',
    fontWeight: '600',
    fontSize: 12,
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

const deco = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  title: {
    color: artDeco.color.gold,
    fontFamily: artDeco.font.display,
    fontSize: 28,
    letterSpacing: artDeco.letterSpacingWide,
  },
  status: {
    color: artDeco.color.ink2,
    fontFamily: artDeco.font.serifRegular,
  },
  timer: {
    color: artDeco.color.ink,
    fontFamily: artDeco.font.serifBold,
  },
  error: {
    color: artDeco.color.stop,
  },
  hintLine: {
    color: artDeco.color.muted,
  },
  noticeText: {
    color: artDeco.color.gold,
  },
  momenHint: {
    color: artDeco.color.faint,
  },
  phoneNumberLink: {
    color: artDeco.color.goldStrong,
  },
  actionButton: {
    backgroundColor: artDeco.color.goldSoft,
    borderRadius: artDeco.radius.none,
    borderWidth: 1,
    borderColor: artDeco.color.lineSoft,
  },
  actionButtonText: {
    color: artDeco.color.goldStrong,
  },
  signOutButton: {
    borderRadius: artDeco.radius.none,
    borderColor: artDeco.color.line,
  },
  signOutText: {
    color: artDeco.color.gold,
  },
});

const themeButtonStyles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  buttonDeco: {
    borderRadius: 0,
    borderWidth: 1,
    borderColor: artDeco.color.line,
    backgroundColor: artDeco.color.surface,
  },
  icon: {
    fontSize: 16,
  },
  iconDeco: {
    color: artDeco.color.gold,
  },
});
