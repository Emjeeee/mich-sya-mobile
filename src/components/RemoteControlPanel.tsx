import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';

import { isSilentRingEligible } from '../lib/silentRing';
import {
  getPartnerRemoteControlState,
  parsePartnerRow,
  requestPartnerRemoteState,
  setPartnerRingerMode,
  setPartnerStreamVolume,
  type PartnerRemoteControlState,
  type VolumeStream,
} from '../lib/remoteControl';
import { supabase } from '../lib/supabase';
import { artDeco } from '../theme/artDecoTokens';
import { GlassSurface } from '../theme/components/GlassSurface';
import {
  AlarmClockIcon,
  BellIcon,
  MusicNoteIcon,
  SpeakerIcon,
  SpeakerMuteIcon,
  VibrateIcon,
} from '../theme/components/GlassIcon';
import { liquidGlass } from '../theme/liquidGlassTokens';
import { useAppTheme } from '../theme/ThemeContext';

const MODES: {
  value: 'normal' | 'vibrate' | 'silent';
  label: string;
  GlassIcon: typeof SpeakerIcon;
}[] = [
  { value: 'normal', label: '🔊 Normal', GlassIcon: SpeakerIcon },
  { value: 'vibrate', label: '📳 Getar', GlassIcon: VibrateIcon },
  { value: 'silent', label: '🔇 Senyap', GlassIcon: SpeakerMuteIcon },
];

// Matches the 4 sliders Android's own system volume panel shows (confirmed
// on both the Samsung A9 and the Vivo V51 5G) -- ring/notification are the
// only two gated behind "Do Not Disturb access"; media/alarm need no such
// permission at all.
const STREAMS: {
  value: VolumeStream;
  label: string;
  glassLabel: string;
  GlassIcon: typeof BellIcon;
}[] = [
  { value: 'ring', label: '🔔 Nada dering', glassLabel: 'Nada dering', GlassIcon: BellIcon },
  { value: 'notification', label: '📩 Notifikasi', glassLabel: 'Notifikasi', GlassIcon: BellIcon },
  { value: 'media', label: '🎵 Media', glassLabel: 'Media', GlassIcon: MusicNoteIcon },
  { value: 'alarm', label: '⏰ Alarm', glassLabel: 'Alarm', GlassIcon: AlarmClockIcon },
];

type VolumeMap = Record<VolumeStream, number>;
const DEFAULT_VOLUMES: VolumeMap = { ring: 50, notification: 50, media: 50, alarm: 50 };

// Only ever visible for one specific account (see silentRing.ts) -- lets
// that account remotely change the *partner's* phone ringer mode + all 4
// volume streams. Fundamentally different from SilentRingToggle.tsx, which
// only ever affects the signed-in account's own device.
//
// setPartnerRingerMode()/setPartnerStreamVolume() only confirm the push was
// *delivered* -- Expo accepts it well before the partner's device even
// wakes up to process it, so a `true` result says nothing about whether the
// native call on her end actually succeeded. The single most likely reason
// it wouldn't for ring/notification (she hasn't granted "Do Not Disturb
// access" yet) happens silently in a background task with no UI, so relying
// on the send-side result alone reproduces exactly what was reported: looks
// like nothing happened, with no indication why. This reads her
// last-reported grant status + current mode/volumes (written by
// RemoteControlAccess.tsx on her device) so that failure mode is visible up
// front, and the mode chip/volume sliders start from her phone's *actual*
// current state instead of a blind guess.
export default function RemoteControlPanel({ coupleId }: { coupleId: string | null }) {
  const { isArtDeco, isLiquidGlass } = useAppTheme();
  const [eligible, setEligible] = useState(false);
  const [partnerGranted, setPartnerGranted] = useState<boolean | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [mode, setMode] = useState<'normal' | 'vibrate' | 'silent' | null>(null);
  const [volumes, setVolumes] = useState<VolumeMap>(DEFAULT_VOLUMES);
  const [slidingStream, setSlidingStream] = useState<VolumeStream | null>(null);
  // Mirrors `slidingStream` for reads from callbacks that must stay stable
  // across renders (the realtime subscription below) -- see
  // applyPartnerState's comment.
  const slidingStreamRef = useRef<VolumeStream | null>(null);
  slidingStreamRef.current = slidingStream;
  // "Terkirim" only means the push was delivered, not that the native call
  // finished running on the partner's device -- both mode and volume changes
  // have little/no visible UI on her screen (no FLAG_SHOW_UI for volume, and
  // ringer-mode changes only touch a small status-bar icon), which was being
  // misread as "nothing happened" even when it fully worked. This is a
  // lightweight *attempt* confirmation, not proof of the actual outcome.
  const [lastSent, setLastSent] = useState<string | null>(null);
  const lastSentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Applies one PartnerRemoteControlState snapshot to local state --
  // shared by the initial fetch, the AppState-active refresh, and every
  // realtime update, so all three land through the exact same "don't yank
  // a slider the user is currently dragging" guard. Reads `slidingStream`
  // via the ref (not the state closure) so this callback's identity never
  // changes, which lets the realtime subscription effect below mount once
  // and stay subscribed instead of tearing down/reconnecting the channel
  // every time a drag starts or ends.
  const applyPartnerState = useCallback((state: PartnerRemoteControlState) => {
    setPartnerGranted(state.granted);
    if (state.mode) setMode(state.mode);
    const sliding = slidingStreamRef.current;
    setVolumes((prev) => ({
      ring: sliding === 'ring' || state.ring === null ? prev.ring : state.ring,
      notification: sliding === 'notification' || state.notification === null ? prev.notification : state.notification,
      media: sliding === 'media' || state.media === null ? prev.media : state.media,
      alarm: sliding === 'alarm' || state.alarm === null ? prev.alarm : state.alarm,
    }));
  }, []);

  const refreshPartnerState = useCallback(() => {
    if (!coupleId || !userId) {
      setCheckingAccess(false);
      return;
    }
    setCheckingAccess(true);
    getPartnerRemoteControlState(coupleId, userId)
      .then(applyPartnerState)
      .catch(() => setPartnerGranted(null))
      .finally(() => setCheckingAccess(false));
  }, [coupleId, userId, applyPartnerState]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEligible(isSilentRingEligible(data.user?.email));
      setUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    refreshPartnerState();
    // Also ask her device to report its *actual current* state right now --
    // refreshPartnerState() alone only shows whatever was last written,
    // which can be stale by however long since her device last reported on
    // its own. The fresh value (if it arrives) lands via the realtime
    // subscription below, not this call's return value.
    requestPartnerRemoteState(coupleId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId, userId]);

  useEffect(() => {
    // Partner may grant access / change her own ringer settings while
    // Michael already has this modal open -- re-check when this app comes
    // back to the foreground, AND ask for a fresh on-demand read (same as
    // the mount effect above) rather than relying solely on whatever she
    // last happened to report.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshPartnerState();
        requestPartnerRemoteState(coupleId).catch(() => {});
      }
    });
    return () => subscription.remove();
  }, [refreshPartnerState, coupleId]);

  useEffect(() => {
    // Real-time: reflects the partner's row the moment it changes --
    // whether from her own device re-reporting (foreground polling in
    // RemoteControlAccess.tsx, or a manual change she made), or from the
    // request_remote_state round trip above -- without needing this app to
    // background/foreground or the user to reopen the panel. Requires
    // device_push_tokens to be added to the `supabase_realtime` publication
    // (see supabase/migrations/0008_remote_control_realtime.sql).
    if (!coupleId || !userId) return;
    const channel = supabase
      .channel(`remote-control-${coupleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'device_push_tokens', filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          const row = payload.new as Record<string, unknown> | undefined;
          // The `!row.user_id` half also guards a DELETE event (`.new` is
          // `{}`, not undefined, for those) -- rows on this table are never
          // actually deleted, but skip cleanly rather than assume.
          if (!row || !row.user_id || row.user_id === userId) return;
          applyPartnerState(parsePartnerRow(row));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, userId, applyPartnerState]);

  useEffect(() => {
    return () => {
      if (lastSentTimer.current) clearTimeout(lastSentTimer.current);
    };
  }, []);

  const flashSent = (label: string) => {
    if (lastSentTimer.current) clearTimeout(lastSentTimer.current);
    setLastSent(label);
    lastSentTimer.current = setTimeout(() => setLastSent(null), 2500);
  };

  if (!eligible) return null;

  const chooseMode = async (value: 'normal' | 'vibrate' | 'silent') => {
    const previous = mode;
    setMode(value); // optimistic -- confirmed/corrected on the next refresh
    const sent = await setPartnerRingerMode(coupleId, value);
    if (!sent) {
      setMode(previous);
      Alert.alert(
        'Gagal',
        'Tidak bisa ubah mode HP pasangan. Pastikan dia sudah mengizinkan akses di Pengaturan.'
      );
      return;
    }
    flashSent(`Mode "${MODES.find((m) => m.value === value)?.label ?? value}" terkirim`);
  };

  const commitVolume = async (stream: VolumeStream, value: number) => {
    setSlidingStream(null);
    const rounded = Math.round(value);
    const sent = await setPartnerStreamVolume(coupleId, stream, rounded);
    if (!sent) {
      Alert.alert(
        'Gagal',
        'Tidak bisa ubah volume HP pasangan. Pastikan dia sudah mengizinkan akses di Pengaturan.'
      );
      return;
    }
    flashSent(`${STREAMS.find((s) => s.value === stream)?.label ?? stream} ${rounded}% terkirim`);
  };

  const content = (
    <>
      <View style={styles.headerRow}>
        <Text style={[styles.label, isArtDeco && deco.label, isLiquidGlass && glass.label]}>
          Atur HP pasangan dari jauh
        </Text>
        {isLiquidGlass && lastSent && <Text style={glass.sentChip}>✓ Terkirim</Text>}
      </View>
      {checkingAccess ? (
        <ActivityIndicator
          color={isArtDeco ? artDeco.color.gold : isLiquidGlass ? liquidGlass.color.accent : '#e11d74'}
          style={styles.warningRow}
        />
      ) : partnerGranted === false || partnerGranted === null ? (
        <Text style={[styles.warningText, isArtDeco && deco.warningText, isLiquidGlass && glass.warningText]}>
          {partnerGranted === null
            ? 'Belum diketahui apakah pasangan sudah mengizinkan akses. Nada dering/notifikasi di bawah mungkin tidak berpengaruh (Media/Alarm tetap bisa).'
            : 'Pasangan belum mengizinkan akses di Pengaturan -- nada dering/notifikasi di bawah tidak akan berpengaruh sampai dia mengizinkannya (Media/Alarm tetap bisa).'}
        </Text>
      ) : null}
      {!isLiquidGlass && lastSent && (
        <Text style={[styles.sentText, isArtDeco && deco.sentText]}>
          ✓ {lastSent} -- perubahan tidak selalu terlihat di layar pasangan.
        </Text>
      )}

      <View style={[styles.row, isLiquidGlass && glass.row]}>
        {MODES.map((m) => (
          <Pressable
            key={m.value}
            style={[
              styles.chip,
              isArtDeco && deco.chip,
              isLiquidGlass && glass.chip,
              mode === m.value && styles.chipActive,
              mode === m.value && isArtDeco && deco.chipActive,
              mode === m.value && isLiquidGlass && glass.chipActive,
            ]}
            onPress={() => chooseMode(m.value)}
          >
            {isLiquidGlass ? (
              <View style={glass.chipRowInner}>
                <m.GlassIcon size={14} color={mode === m.value ? '#fff' : liquidGlass.color.muted} />
                <Text style={[glass.chipText, mode === m.value && glass.chipTextActive]}>
                  {m.label.replace(/^\S+\s/, '')}
                </Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.chipText,
                  isArtDeco && deco.chipText,
                  mode === m.value && styles.chipTextActive,
                  mode === m.value && isArtDeco && deco.chipTextActive,
                ]}
              >
                {m.label}
              </Text>
            )}
          </Pressable>
        ))}
      </View>

      {STREAMS.map((s) => (
        <View key={s.value} style={isLiquidGlass && glass.volumeGroup}>
          <View style={styles.volumeRow}>
            {isLiquidGlass ? (
              <View style={glass.streamLabelRow}>
                <s.GlassIcon size={14} color={liquidGlass.color.ink} />
                <Text style={glass.volumeLabel}>{s.glassLabel}</Text>
              </View>
            ) : (
              <Text style={[styles.volumeLabel, isArtDeco && deco.volumeLabel]}>{s.label}</Text>
            )}
            <Text style={[styles.volumeValue, isArtDeco && deco.volumeValue, isLiquidGlass && glass.volumeValue]}>
              {Math.round(volumes[s.value])}%
            </Text>
          </View>
          <Slider
            minimumValue={0}
            maximumValue={100}
            step={1}
            value={volumes[s.value]}
            onValueChange={(value) => {
              setSlidingStream(s.value);
              setVolumes((prev) => ({ ...prev, [s.value]: value }));
            }}
            onSlidingComplete={(value) => commitVolume(s.value, value)}
            minimumTrackTintColor={isArtDeco ? artDeco.color.gold : isLiquidGlass ? liquidGlass.color.accentDeep : '#e11d74'}
            maximumTrackTintColor={
              isArtDeco ? artDeco.color.lineSoft : isLiquidGlass ? 'rgba(225,29,116,0.15)' : '#fdeef4'
            }
            thumbTintColor={isArtDeco ? artDeco.color.gold : isLiquidGlass ? '#fff' : '#e11d74'}
          />
        </View>
      ))}
    </>
  );

  if (isLiquidGlass) {
    return (
      <GlassSurface contentStyle={glass.panelContent} radius={liquidGlass.radius.panel}>
        {content}
      </GlassSurface>
    );
  }

  return <View style={styles.container}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: '#767676',
  },
  warningRow: {
    alignSelf: 'flex-start',
  },
  warningText: {
    fontSize: 12,
    color: '#c0392b',
  },
  sentText: {
    fontSize: 12,
    color: '#2e7d32',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    borderRadius: 999,
    // paddingVertical 10 (~36px total with the label) fell under the
    // 44-48dp minimum touch target -- bumped so each chip is a properly
    // tappable target on its own, not just readable text.
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#fdeef4',
  },
  chipActive: {
    backgroundColor: '#e11d74',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  chipTextActive: {
    color: '#fff',
  },
  volumeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  volumeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  volumeValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e11d74',
  },
});

const deco = StyleSheet.create({
  label: {
    color: artDeco.color.muted,
  },
  warningText: {
    color: artDeco.color.warn,
  },
  sentText: {
    color: artDeco.color.go,
  },
  chip: {
    backgroundColor: artDeco.color.goldSoft,
    borderRadius: artDeco.radius.none,
    borderWidth: 1,
    borderColor: artDeco.color.lineSoft,
  },
  chipActive: {
    backgroundColor: artDeco.color.gold,
  },
  chipText: {
    color: artDeco.color.ink2,
  },
  chipTextActive: {
    color: artDeco.color.black,
  },
  volumeLabel: {
    color: artDeco.color.ink2,
  },
  volumeValue: {
    color: artDeco.color.gold,
  },
});

const glass = StyleSheet.create({
  panelContent: {
    gap: 16,
    padding: 20,
  },
  label: {
    color: liquidGlass.color.muted,
  },
  sentChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: liquidGlass.radius.pill,
    backgroundColor: liquidGlass.color.goSoft,
    color: liquidGlass.color.go,
    fontSize: 10.5,
    fontWeight: '700',
    overflow: 'hidden',
  },
  warningText: {
    color: '#a8434a',
  },
  row: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    borderColor: liquidGlass.color.glassChipBorder,
    borderRadius: liquidGlass.radius.control,
    padding: 5,
  },
  chip: {
    backgroundColor: 'transparent',
  },
  chipActive: {
    backgroundColor: liquidGlass.color.accentDeep,
  },
  chipRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: liquidGlass.color.muted,
  },
  chipTextActive: {
    color: '#fff',
  },
  streamLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  volumeGroup: {
    marginTop: 2,
  },
  volumeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: liquidGlass.color.ink,
  },
  volumeValue: {
    color: liquidGlass.color.accentText,
  },
});
