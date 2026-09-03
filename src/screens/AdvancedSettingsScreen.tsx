import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';

import {
  getCoupleRingSettings,
  setCoupleCustomRingtone,
  setCoupleQuietHours,
  syncRingCustomizationToDevice,
  type CoupleRingSettings,
} from '../lib/ringCustomization';
import { uploadCouplePhoto } from '../lib/storage';
import type { RootStackParamList } from '../navigation/types';
import { artDeco } from '../theme/artDecoTokens';
import { ArtDecoBackground } from '../theme/components/ArtDecoBackground';
import { BackButton } from '../theme/components/BackButton';
import { GlassSurface } from '../theme/components/GlassSurface';
import { LiquidGlassBackground } from '../theme/components/LiquidGlassBackground';
import { LiquidGlassRoot } from '../theme/components/LiquidGlassRoot';
import { liquidGlass } from '../theme/liquidGlassTokens';
import { useAppTheme } from '../theme/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'AdvancedSettings'>;

const DEFAULT_START_MINUTES = 22 * 60; // 22:00
const DEFAULT_END_MINUTES = 6 * 60; // 06:00

function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

// A time-of-day picker only cares about hours/minutes -- wrapping them in
// some Date is just what @react-native-community/datetimepicker's API
// needs, so today's date is as good as any.
function minutesToDate(minutes: number): Date {
  const d = new Date();
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

function dateToMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

// mjonathann.03-only (gated by the caller, HomeScreen.tsx, via
// isSilentRingEligible) -- a couple-wide custom ringtone + "quiet hours"
// window, both stored on `couple` (see 0007_ring_customization.sql) so they
// apply to BOTH devices, not just whoever configures them here. Neither
// setting reaches the native ring/battery-alert code directly from this
// screen -- every device (including this one) picks them up the same way,
// via syncRingCustomizationToDevice() on app foreground (App.tsx).
export default function AdvancedSettingsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { isArtDeco, isLiquidGlass } = useAppTheme();
  const { coupleId } = route.params;

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<CoupleRingSettings | null>(null);
  const [uploading, setUploading] = useState(false);
  const [quietEnabled, setQuietEnabled] = useState(false);
  const [startMinutes, setStartMinutes] = useState(DEFAULT_START_MINUTES);
  const [endMinutes, setEndMinutes] = useState(DEFAULT_END_MINUTES);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [savingHours, setSavingHours] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    getCoupleRingSettings(coupleId)
      .then((data) => {
        setSettings(data);
        const hasQuietHours = data?.quiet_hours_start_minutes != null && data?.quiet_hours_end_minutes != null;
        setQuietEnabled(hasQuietHours);
        if (data?.quiet_hours_start_minutes != null) setStartMinutes(data.quiet_hours_start_minutes);
        if (data?.quiet_hours_end_minutes != null) setEndMinutes(data.quiet_hours_end_minutes);
      })
      .finally(() => setLoading(false));
  }, [coupleId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handlePickSound = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const path = await uploadCouplePhoto(coupleId, 'sounds', asset.uri, asset.mimeType ?? 'audio/mpeg');
      await setCoupleCustomRingtone(coupleId, path);
      await syncRingCustomizationToDevice();
      refresh();
    } catch (err) {
      Alert.alert('Gagal', err instanceof Error ? err.message : 'Tidak bisa upload suara.');
    } finally {
      setUploading(false);
    }
  };

  const handleResetSound = async () => {
    setUploading(true);
    try {
      await setCoupleCustomRingtone(coupleId, null);
      await syncRingCustomizationToDevice();
      refresh();
    } catch {
      Alert.alert('Gagal', 'Tidak bisa mengembalikan ke suara default.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveQuietHours = async () => {
    setSavingHours(true);
    try {
      if (quietEnabled) {
        await setCoupleQuietHours(coupleId, startMinutes, endMinutes);
      } else {
        await setCoupleQuietHours(coupleId, null, null);
      }
      await syncRingCustomizationToDevice();
      refresh();
    } catch {
      Alert.alert('Gagal', 'Tidak bisa menyimpan jadwal.');
    } finally {
      setSavingHours(false);
    }
  };

  const handleStartChange = (event: DateTimePickerEvent, selected?: Date) => {
    // Android's picker is a transient dialog -- it reports its own dismissal
    // (Cancel, or tapping outside) via event.type, so this is the one place
    // that needs to hide it regardless of outcome. iOS's inline spinner
    // fires 'set' continuously as the wheels turn and never 'dismissed', so
    // this only ever closes something that is actually a dialog to begin
    // with.
    setShowStartPicker(false);
    if (event.type === 'set' && selected) setStartMinutes(dateToMinutes(selected));
  };

  const handleEndChange = (event: DateTimePickerEvent, selected?: Date) => {
    setShowEndPicker(false);
    if (event.type === 'set' && selected) setEndMinutes(dateToMinutes(selected));
  };

  const accent = isArtDeco ? artDeco.color.gold : isLiquidGlass ? liquidGlass.color.accent : '#e11d74';

  const body = (
    <>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} label="Kembali" />
        <Text style={[styles.title, isArtDeco && deco.title, isLiquidGlass && glass.title]}>Pengaturan Lanjutan</Text>
        <Text style={[styles.subtitle, isArtDeco && deco.subtitle, isLiquidGlass && glass.subtitle]}>
          Berlaku untuk HP kamu dan HP pasangan.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={accent} style={{ marginTop: 32 }} />
      ) : (
        <>
          <Card isLiquidGlass={isLiquidGlass} isArtDeco={isArtDeco}>
            <Text style={[styles.cardTitle, isArtDeco && deco.cardTitle, isLiquidGlass && glass.cardTitle]}>
              Nada Dering Custom
            </Text>
            <Text style={[styles.cardHint, isArtDeco && deco.cardHint, isLiquidGlass && glass.cardHint]}>
              Dipakai untuk "Bunyikan HP pasangan" dan alert baterai lemah.
            </Text>
            <Text style={[styles.statusText, isArtDeco && deco.statusText, isLiquidGlass && glass.statusText]}>
              {settings?.custom_ringtone_url ? 'Status: pakai suara custom' : 'Status: pakai suara default'}
            </Text>
            <View style={styles.row}>
              <Pressable
                style={[styles.button, isArtDeco && deco.button, isLiquidGlass && glass.button]}
                onPress={handlePickSound}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color={accent} />
                ) : (
                  <Text style={[styles.buttonText, isArtDeco && deco.buttonText, isLiquidGlass && glass.buttonText]}>
                    Pilih File MP3
                  </Text>
                )}
              </Pressable>
              {settings?.custom_ringtone_url && (
                <Pressable
                  style={[
                    styles.button,
                    styles.secondaryButton,
                    isArtDeco && deco.secondaryButton,
                    isLiquidGlass && glass.secondaryButton,
                  ]}
                  onPress={handleResetSound}
                  disabled={uploading}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      styles.secondaryButtonText,
                      isArtDeco && deco.secondaryButtonText,
                      isLiquidGlass && glass.secondaryButtonText,
                    ]}
                  >
                    Pakai Default
                  </Text>
                </Pressable>
              )}
            </View>
          </Card>

          <Card isLiquidGlass={isLiquidGlass} isArtDeco={isArtDeco}>
            <View style={styles.rowBetween}>
              <Text style={[styles.cardTitle, isArtDeco && deco.cardTitle, isLiquidGlass && glass.cardTitle]}>
                Jam Jangan Berisik
              </Text>
              <Switch
                value={quietEnabled}
                onValueChange={setQuietEnabled}
                trackColor={isLiquidGlass ? { false: '#ccc', true: liquidGlass.color.accentDeep } : undefined}
              />
            </View>
            <Text style={[styles.cardHint, isArtDeco && deco.cardHint, isLiquidGlass && glass.cardHint]}>
              Suara alert dimatikan di jam ini (getar tetap jalan) -- cocok untuk jam kerja.
            </Text>
            {quietEnabled && (
              <View style={styles.row}>
                <View style={styles.timeField}>
                  <Text style={[styles.timeLabel, isArtDeco && deco.timeLabel, isLiquidGlass && glass.timeLabel]}>
                    Mulai
                  </Text>
                  <Pressable
                    style={[styles.timeButton, isArtDeco && deco.timeButton, isLiquidGlass && glass.timeButton]}
                    onPress={() => setShowStartPicker(true)}
                  >
                    <Text
                      style={[
                        styles.timeButtonText,
                        isArtDeco && deco.timeButtonText,
                        isLiquidGlass && glass.timeButtonText,
                      ]}
                    >
                      {minutesToLabel(startMinutes)}
                    </Text>
                  </Pressable>
                </View>
                <View style={styles.timeField}>
                  <Text style={[styles.timeLabel, isArtDeco && deco.timeLabel, isLiquidGlass && glass.timeLabel]}>
                    Selesai
                  </Text>
                  <Pressable
                    style={[styles.timeButton, isArtDeco && deco.timeButton, isLiquidGlass && glass.timeButton]}
                    onPress={() => setShowEndPicker(true)}
                  >
                    <Text
                      style={[
                        styles.timeButtonText,
                        isArtDeco && deco.timeButtonText,
                        isLiquidGlass && glass.timeButtonText,
                      ]}
                    >
                      {minutesToLabel(endMinutes)}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
            <Pressable
              style={[styles.button, isArtDeco && deco.button, isLiquidGlass && glass.button]}
              onPress={handleSaveQuietHours}
              disabled={savingHours}
            >
              {savingHours ? (
                <ActivityIndicator color={accent} />
              ) : (
                <Text style={[styles.buttonText, isArtDeco && deco.buttonText, isLiquidGlass && glass.buttonText]}>
                  Simpan
                </Text>
              )}
            </Pressable>
          </Card>
        </>
      )}

      {showStartPicker && (
        <DateTimePicker value={minutesToDate(startMinutes)} mode="time" is24Hour onChange={handleStartChange} />
      )}
      {showEndPicker && (
        <DateTimePicker value={minutesToDate(endMinutes)} mode="time" is24Hour onChange={handleEndChange} />
      )}
    </>
  );

  return (
    <LiquidGlassRoot
      style={[
        styles.container,
        { paddingTop: insets.top + 16 },
        isArtDeco && deco.container,
        isLiquidGlass && glass.container,
      ]}
    >
      {isArtDeco && <ArtDecoBackground />}
      {isLiquidGlass && <LiquidGlassBackground variant="warm" />}
      {/* Previously a plain View with no scroll -- the Simpan button (and,
          once quiet-hours fields grew from two small TextInputs into two
          full time-picker rows, everything below it) could be pushed
          entirely off the bottom of the screen with no way to reach it.
          Reported as "the apply button does not appear". */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 16 }}
        showsVerticalScrollIndicator={false}
      >
        {body}
      </ScrollView>
    </LiquidGlassRoot>
  );
}

// Card wrapper: a real frosted glass panel on Liquid Glass (this screen
// does not tick/re-render rapidly the way Snake does, so real BlurView here
// is not the performance concern it was there), a plain bordered box
// otherwise.
function Card({
  isLiquidGlass,
  isArtDeco,
  children,
}: {
  isLiquidGlass: boolean;
  isArtDeco: boolean;
  children: React.ReactNode;
}) {
  if (isLiquidGlass) {
    return (
      <GlassSurface style={styles.cardOuter} contentStyle={styles.cardContent} radius={liquidGlass.radius.card}>
        {children}
      </GlassSurface>
    );
  }
  return <View style={[styles.card, isArtDeco && deco.card]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e11d74',
  },
  subtitle: {
    fontSize: 13,
    color: '#767676',
    marginTop: 2,
  },
  cardOuter: {
    marginBottom: 16,
  },
  cardContent: {
    padding: 16,
    gap: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fdeef4',
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  cardHint: {
    fontSize: 12,
    color: '#767676',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e11d74',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  button: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fdeef4',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e11d74',
  },
  secondaryButton: {
    backgroundColor: '#f5f5f5',
  },
  secondaryButtonText: {
    color: '#666',
  },
  timeField: {
    flex: 1,
    gap: 4,
  },
  timeLabel: {
    fontSize: 12,
    color: '#767676',
  },
  // A real button, not a text field -- min 44dp tall so it is a proper
  // touch target for what opens the native time picker.
  timeButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
});

const deco = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  title: {
    color: artDeco.color.gold,
    fontFamily: artDeco.font.display,
    letterSpacing: artDeco.letterSpacingWide,
  },
  subtitle: {
    color: artDeco.color.muted,
    fontFamily: artDeco.font.serifRegular,
  },
  card: {
    backgroundColor: artDeco.color.surface,
    borderRadius: artDeco.radius.none,
    borderWidth: 1.5,
    borderColor: artDeco.color.line,
  },
  cardTitle: {
    color: artDeco.color.ink,
    fontFamily: artDeco.font.serifBold,
  },
  cardHint: {
    color: artDeco.color.muted,
  },
  statusText: {
    color: artDeco.color.gold,
  },
  button: {
    backgroundColor: artDeco.color.goldSoft,
    borderRadius: artDeco.radius.none,
    borderWidth: 1,
    borderColor: artDeco.color.lineSoft,
  },
  buttonText: {
    color: artDeco.color.gold,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: artDeco.color.lineFaint,
  },
  secondaryButtonText: {
    color: artDeco.color.muted,
  },
  timeLabel: {
    color: artDeco.color.muted,
  },
  timeButton: {
    borderColor: artDeco.color.line,
    borderRadius: artDeco.radius.none,
    backgroundColor: artDeco.color.surface2,
  },
  timeButtonText: {
    color: artDeco.color.ink,
  },
});

const glass = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  title: {
    color: liquidGlass.color.accentText,
  },
  subtitle: {
    color: liquidGlass.color.inkSoft,
  },
  cardTitle: {
    color: liquidGlass.color.ink,
  },
  cardHint: {
    color: liquidGlass.color.muted,
  },
  statusText: {
    color: liquidGlass.color.accentText,
  },
  button: {
    backgroundColor: liquidGlass.color.accentDeep,
  },
  buttonText: {
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: liquidGlass.color.glassChipWash,
    borderWidth: 1,
    borderColor: liquidGlass.color.glassChipBorder,
  },
  secondaryButtonText: {
    color: liquidGlass.color.ink2,
  },
  timeLabel: {
    color: liquidGlass.color.muted,
  },
  timeButton: {
    backgroundColor: liquidGlass.color.glassChipWash,
    borderWidth: 1,
    borderColor: liquidGlass.color.glassChipBorder,
    borderRadius: liquidGlass.radius.control,
  },
  timeButtonText: {
    color: liquidGlass.color.ink,
  },
});
