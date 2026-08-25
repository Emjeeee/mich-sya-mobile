import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { useAppTheme } from '../theme/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'AdvancedSettings'>;

function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

// "HH:mm" -> minutes-since-midnight, or null if not a valid time.
function parseTimeInput(text: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
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
  const { isArtDeco } = useAppTheme();
  const { coupleId } = route.params;

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<CoupleRingSettings | null>(null);
  const [uploading, setUploading] = useState(false);
  const [quietEnabled, setQuietEnabled] = useState(false);
  const [startText, setStartText] = useState('22:00');
  const [endText, setEndText] = useState('06:00');
  const [savingHours, setSavingHours] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    getCoupleRingSettings(coupleId)
      .then((data) => {
        setSettings(data);
        const hasQuietHours = data?.quiet_hours_start_minutes != null && data?.quiet_hours_end_minutes != null;
        setQuietEnabled(hasQuietHours);
        if (data?.quiet_hours_start_minutes != null) setStartText(minutesToLabel(data.quiet_hours_start_minutes));
        if (data?.quiet_hours_end_minutes != null) setEndText(minutesToLabel(data.quiet_hours_end_minutes));
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
    if (!quietEnabled) {
      setSavingHours(true);
      try {
        await setCoupleQuietHours(coupleId, null, null);
        await syncRingCustomizationToDevice();
        refresh();
      } catch {
        Alert.alert('Gagal', 'Tidak bisa menyimpan jadwal.');
      } finally {
        setSavingHours(false);
      }
      return;
    }

    const start = parseTimeInput(startText);
    const end = parseTimeInput(endText);
    if (start === null || end === null) {
      Alert.alert('Format salah', 'Gunakan format 24 jam, contoh: 22:00');
      return;
    }
    setSavingHours(true);
    try {
      await setCoupleQuietHours(coupleId, start, end);
      await syncRingCustomizationToDevice();
      refresh();
    } catch {
      Alert.alert('Gagal', 'Tidak bisa menyimpan jadwal.');
    } finally {
      setSavingHours(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }, isArtDeco && deco.container]}>
      {isArtDeco && <ArtDecoBackground />}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={[styles.backLink, isArtDeco && deco.backLink]}>‹ Kembali</Text>
        </Pressable>
        <Text style={[styles.title, isArtDeco && deco.title]}>Pengaturan Lanjutan</Text>
        <Text style={[styles.subtitle, isArtDeco && deco.subtitle]}>
          Berlaku untuk HP kamu dan HP pasangan.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={isArtDeco ? artDeco.color.gold : '#e11d74'} style={{ marginTop: 32 }} />
      ) : (
        <>
          <View style={[styles.card, isArtDeco && deco.card]}>
            <Text style={[styles.cardTitle, isArtDeco && deco.cardTitle]}>🔊 Nada Dering Custom</Text>
            <Text style={[styles.cardHint, isArtDeco && deco.cardHint]}>
              Dipakai untuk "Bunyikan HP pasangan" dan alert baterai lemah.
            </Text>
            <Text style={[styles.statusText, isArtDeco && deco.statusText]}>
              {settings?.custom_ringtone_url ? 'Status: pakai suara custom' : 'Status: pakai suara default'}
            </Text>
            <View style={styles.row}>
              <Pressable
                style={[styles.button, isArtDeco && deco.button]}
                onPress={handlePickSound}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color={isArtDeco ? artDeco.color.gold : '#e11d74'} />
                ) : (
                  <Text style={[styles.buttonText, isArtDeco && deco.buttonText]}>Pilih File MP3</Text>
                )}
              </Pressable>
              {settings?.custom_ringtone_url && (
                <Pressable
                  style={[styles.button, styles.secondaryButton, isArtDeco && deco.secondaryButton]}
                  onPress={handleResetSound}
                  disabled={uploading}
                >
                  <Text style={[styles.buttonText, styles.secondaryButtonText, isArtDeco && deco.secondaryButtonText]}>
                    Pakai Default
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          <View style={[styles.card, isArtDeco && deco.card]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.cardTitle, isArtDeco && deco.cardTitle]}>🔕 Jam Jangan Berisik</Text>
              <Switch value={quietEnabled} onValueChange={setQuietEnabled} />
            </View>
            <Text style={[styles.cardHint, isArtDeco && deco.cardHint]}>
              Suara alert dimatikan di jam ini (getar tetap jalan) -- cocok untuk jam kerja.
            </Text>
            {quietEnabled && (
              <View style={styles.row}>
                <View style={styles.timeField}>
                  <Text style={[styles.timeLabel, isArtDeco && deco.timeLabel]}>Mulai</Text>
                  <TextInput
                    style={[styles.timeInput, isArtDeco && deco.timeInput]}
                    value={startText}
                    onChangeText={setStartText}
                    placeholder="22:00"
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View style={styles.timeField}>
                  <Text style={[styles.timeLabel, isArtDeco && deco.timeLabel]}>Selesai</Text>
                  <TextInput
                    style={[styles.timeInput, isArtDeco && deco.timeInput]}
                    value={endText}
                    onChangeText={setEndText}
                    placeholder="06:00"
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>
            )}
            <Pressable
              style={[styles.button, isArtDeco && deco.button]}
              onPress={handleSaveQuietHours}
              disabled={savingHours}
            >
              {savingHours ? (
                <ActivityIndicator color={isArtDeco ? artDeco.color.gold : '#e11d74'} />
              ) : (
                <Text style={[styles.buttonText, isArtDeco && deco.buttonText]}>Simpan</Text>
              )}
            </Pressable>
          </View>
        </>
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
  header: {
    marginBottom: 16,
  },
  backLink: {
    color: '#666',
    fontWeight: '600',
    marginBottom: 8,
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
  timeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#333',
  },
});

const deco = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  backLink: {
    color: artDeco.color.muted,
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
  timeInput: {
    borderColor: artDeco.color.line,
    borderRadius: artDeco.radius.none,
    color: artDeco.color.ink,
    backgroundColor: artDeco.color.surface2,
  },
});
