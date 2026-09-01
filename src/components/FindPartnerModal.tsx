import { BlurView } from 'expo-blur';
import { useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BatteryOptimizationNotice from './BatteryOptimizationNotice';
import CompassArrow from './CompassArrow';
import RemoteControlAccess from './RemoteControlAccess';
import RemoteControlPanel from './RemoteControlPanel';
import SilentRingToggle from './SilentRingToggle';
import { useFindPartner } from '../hooks/useFindPartner';
import { ringPartner } from '../lib/ringPartner';
import { torchPartner } from '../lib/torchPartner';
import {
  DEFAULT_TORCH_PATTERN,
  TORCH_PATTERN_STORAGE_KEY,
  TORCH_PRESET_LABELS,
  type TorchPattern,
  type TorchPatternKind,
} from '../lib/torchPattern';
import { artDeco } from '../theme/artDecoTokens';
import { ArtDecoBackground } from '../theme/components/ArtDecoBackground';
import { FlashlightIcon, SpeakerIcon, StopIcon } from '../theme/components/GlassIcon';
import { LiquidGlassBackground } from '../theme/components/LiquidGlassBackground';
import { LiquidGlassRoot, useGlassBlurProps } from '../theme/components/LiquidGlassRoot';
import { liquidGlass } from '../theme/liquidGlassTokens';
import { useAppTheme } from '../theme/ThemeContext';

// Excludes 'stop' -- it's a control action (see the dedicated "Matikan
// senter pasangan" button below), not a selectable blink-pattern chip.
const TORCH_PRESET_ORDER: Exclude<TorchPatternKind, 'stop'>[] = ['steady', 'slow', 'fast', 'sos', 'custom'];

// Real blur+wash behind a button/chip, as absolute-fill siblings rendered
// before the button's own Text child -- same direct-blur-sibling technique
// as HomeScreen's theme toggle/sign-out button, reused here since this
// file has several buttons that each already have their own Pressable
// structure not worth restructuring into GlassSurface.
function GlassFill({ radius = liquidGlass.radius.control }: { radius?: number }) {
  const blurProps = useGlassBlurProps();
  return (
    <>
      <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} {...blurProps} />
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: liquidGlass.color.glassChipWash, borderRadius: radius }]}
      />
    </>
  );
}

// Icon + text row for a glass button's label, replacing the emoji-prefixed
// strings the other themes use ("🔊 Bunyikan HP pasangan" etc.) with an
// SF-Symbol-style icon (see GlassIcon.tsx).
function GlassLabel({ icon, color, children }: { icon: ReactNode; color: string; children: ReactNode }) {
  return (
    <View style={styles.glassLabelRow}>
      {icon}
      <Text style={[styles.ringButtonText, { color }]}>{children}</Text>
    </View>
  );
}

interface FindPartnerModalProps {
  visible: boolean;
  coupleId: string;
  onClose: () => void;
}

export default function FindPartnerModal({ visible, coupleId, onClose }: FindPartnerModalProps) {
  const insets = useSafeAreaInsets();
  const { isArtDeco, isLiquidGlass } = useAppTheme();
  const {
    isSharing,
    myLocation,
    partnerPresence,
    starting,
    error,
    needsBackgroundLocationSettings,
    startFinding,
    stopFinding,
  } = useFindPartner(coupleId);
  const [ringing, setRinging] = useState(false);
  const [torchKind, setTorchKind] = useState<TorchPatternKind>(DEFAULT_TORCH_PATTERN.kind);
  const [customOnMs, setCustomOnMs] = useState('250');
  const [customOffMs, setCustomOffMs] = useState('250');
  const [torching, setTorching] = useState(false);
  const [stoppingTorch, setStoppingTorch] = useState(false);

  const handleClose = () => {
    // Sharing now runs in the background independent of this screen -- closing it
    // should not stop the session. Use "Berhenti berbagi lokasi" to stop explicitly.
    onClose();
  };

  const handleRing = async () => {
    setRinging(true);
    const sent = await ringPartner(coupleId);
    setRinging(false);
    if (!sent) {
      Alert.alert('Gagal', 'Tidak bisa membunyikan HP pasangan. Pastikan dia sudah pernah membuka MichSya di HP-nya.');
    }
  };

  const handleTorch = async () => {
    const pattern: TorchPattern =
      torchKind === 'custom'
        ? {
            kind: 'custom',
            onMs: Number(customOnMs) || DEFAULT_TORCH_PATTERN.onMs || 250,
            offMs: Number(customOffMs) || DEFAULT_TORCH_PATTERN.offMs || 250,
          }
        : { kind: torchKind };

    setTorching(true);
    const sent = await torchPartner(coupleId, pattern);
    setTorching(false);
    if (!sent) {
      Alert.alert('Gagal', 'Tidak bisa nyalain senter HP pasangan. Pastikan dia sudah pernah membuka MichSya di HP-nya.');
      return;
    }
    AsyncStorage.setItem(TORCH_PATTERN_STORAGE_KEY, JSON.stringify(pattern)).catch(() => {});
  };

  const handleStopTorch = async () => {
    setStoppingTorch(true);
    const sent = await torchPartner(coupleId, { kind: 'stop' });
    setStoppingTorch(false);
    if (!sent) {
      Alert.alert('Gagal', 'Tidak bisa matiin senter HP pasangan. Pastikan dia sudah pernah membuka MichSya di HP-nya.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
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
        <View style={styles.header}>
          <Text style={[styles.heading, isArtDeco && deco.heading, isLiquidGlass && glass.heading]}>
            Cari Pasangan
          </Text>
          <Pressable onPress={handleClose}>
            <Text style={[styles.closeText, isArtDeco && deco.closeText, isLiquidGlass && glass.closeText]}>
              Tutup
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {error && <Text style={[styles.error, isArtDeco && deco.error]}>{error}</Text>}
          {needsBackgroundLocationSettings && (
            <Pressable
              style={[styles.settingsButton, isArtDeco && deco.settingsButton]}
              onPress={() => Linking.openSettings()}
            >
              <Text style={[styles.settingsButtonText, isArtDeco && deco.settingsButtonText]}>Buka Pengaturan</Text>
            </Pressable>
          )}

          <CompassArrow
            myLocation={myLocation}
            partnerLocation={partnerPresence ? { lat: partnerPresence.lat, lng: partnerPresence.lng } : null}
          />

          <View style={styles.actions}>
            {isSharing ? (
              <Pressable
                style={[styles.button, styles.stopButton, isArtDeco && deco.stopButton, isLiquidGlass && glass.stopButton]}
                onPress={stopFinding}
              >
                {isLiquidGlass && <GlassFill />}
                <Text style={[styles.stopButtonText, isArtDeco && deco.stopButtonText, isLiquidGlass && glass.stopButtonText]}>
                  Berhenti berbagi lokasi
                </Text>
              </Pressable>
            ) : (
              <Pressable
                style={[
                  styles.button,
                  styles.startButton,
                  isArtDeco && deco.startButton,
                  isLiquidGlass && glass.startButton,
                ]}
                onPress={startFinding}
                disabled={starting}
              >
                {starting ? (
                  <ActivityIndicator color={isArtDeco ? artDeco.color.black : '#fff'} />
                ) : (
                  <Text
                    style={[styles.startButtonText, isArtDeco && deco.startButtonText, isLiquidGlass && glass.startButtonText]}
                  >
                    Mulai cari pasangan
                  </Text>
                )}
              </Pressable>
            )}

            <Pressable
              style={[styles.button, styles.ringButton, isArtDeco && deco.ringButton, isLiquidGlass && glass.ringButton]}
              onPress={handleRing}
              disabled={ringing}
            >
              {isLiquidGlass && <GlassFill />}
              {ringing ? (
                <ActivityIndicator color={isArtDeco ? artDeco.color.gold : isLiquidGlass ? liquidGlass.color.accent : '#e11d74'} />
              ) : isLiquidGlass ? (
                <GlassLabel icon={<SpeakerIcon size={16} color={liquidGlass.color.ink2} />} color={liquidGlass.color.ink2}>
                  Bunyikan HP pasangan
                </GlassLabel>
              ) : (
                <Text style={[styles.ringButtonText, isArtDeco && deco.ringButtonText]}>🔊 Bunyikan HP pasangan</Text>
              )}
            </Pressable>

            <BatteryOptimizationNotice />
            <SilentRingToggle />
            <RemoteControlAccess coupleId={coupleId} />
            <RemoteControlPanel coupleId={coupleId} />

            <View style={styles.torchChipGrid}>
              <View style={styles.torchChipRow}>
                {TORCH_PRESET_ORDER.slice(0, 3).map((kind) => (
                  <Pressable
                    key={kind}
                    onPress={() => setTorchKind(kind)}
                    style={[
                      styles.torchChip,
                      isArtDeco && deco.torchChip,
                      isLiquidGlass && glass.torchChip,
                      torchKind === kind && styles.torchChipActive,
                      torchKind === kind && isArtDeco && deco.torchChipActive,
                      torchKind === kind && isLiquidGlass && glass.torchChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.torchChipText,
                        isArtDeco && deco.torchChipText,
                        isLiquidGlass && glass.torchChipText,
                        torchKind === kind && styles.torchChipTextActive,
                        torchKind === kind && isArtDeco && deco.torchChipTextActive,
                        torchKind === kind && isLiquidGlass && glass.torchChipTextActive,
                      ]}
                    >
                      {TORCH_PRESET_LABELS[kind as Exclude<TorchPatternKind, 'custom' | 'stop'>]}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.torchChipRow}>
                {TORCH_PRESET_ORDER.slice(3).map((kind) => (
                  <Pressable
                    key={kind}
                    onPress={() => setTorchKind(kind)}
                    style={[
                      styles.torchChip,
                      isArtDeco && deco.torchChip,
                      isLiquidGlass && glass.torchChip,
                      torchKind === kind && styles.torchChipActive,
                      torchKind === kind && isArtDeco && deco.torchChipActive,
                      torchKind === kind && isLiquidGlass && glass.torchChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.torchChipText,
                        isArtDeco && deco.torchChipText,
                        isLiquidGlass && glass.torchChipText,
                        torchKind === kind && styles.torchChipTextActive,
                        torchKind === kind && isArtDeco && deco.torchChipTextActive,
                        torchKind === kind && isLiquidGlass && glass.torchChipTextActive,
                      ]}
                    >
                      {kind === 'custom' ? 'Custom' : TORCH_PRESET_LABELS[kind]}
                    </Text>
                  </Pressable>
                ))}
                {/* Invisible spacer keeps this row's chips the same width as
                    the 3-chip row above, so columns line up as a real grid. */}
                <View style={styles.torchChipSpacer} />
              </View>
            </View>

            {torchKind === 'custom' && (
              <View style={styles.customRow}>
                <View style={styles.customField}>
                  <Text style={[styles.customLabel, isArtDeco && deco.customLabel, isLiquidGlass && glass.customLabel]}>
                    Nyala (ms)
                  </Text>
                  <TextInput
                    style={[styles.customInput, isArtDeco && deco.customInput, isLiquidGlass && glass.customInput]}
                    keyboardType="number-pad"
                    value={customOnMs}
                    onChangeText={setCustomOnMs}
                  />
                </View>
                <View style={styles.customField}>
                  <Text style={[styles.customLabel, isArtDeco && deco.customLabel, isLiquidGlass && glass.customLabel]}>
                    Mati (ms)
                  </Text>
                  <TextInput
                    style={[styles.customInput, isArtDeco && deco.customInput, isLiquidGlass && glass.customInput]}
                    keyboardType="number-pad"
                    value={customOffMs}
                    onChangeText={setCustomOffMs}
                  />
                </View>
              </View>
            )}

            <View style={styles.torchButtonRow}>
              <Pressable
                style={[
                  styles.button,
                  styles.ringButton,
                  styles.torchButtonHalf,
                  isArtDeco && deco.ringButton,
                  isLiquidGlass && glass.ringButton,
                ]}
                onPress={handleTorch}
                disabled={torching}
              >
                {isLiquidGlass && <GlassFill />}
                {torching ? (
                  <ActivityIndicator color={isArtDeco ? artDeco.color.gold : isLiquidGlass ? liquidGlass.color.accent : '#e11d74'} />
                ) : isLiquidGlass ? (
                  <GlassLabel icon={<FlashlightIcon size={16} color={liquidGlass.color.ink2} />} color={liquidGlass.color.ink2}>
                    Nyalain
                  </GlassLabel>
                ) : (
                  <Text style={[styles.ringButtonText, isArtDeco && deco.ringButtonText]}>🔦 Nyalain</Text>
                )}
              </Pressable>
              <Pressable
                style={[
                  styles.button,
                  styles.stopButton,
                  styles.torchButtonHalf,
                  isArtDeco && deco.stopButton,
                  isLiquidGlass && glass.stopButton,
                ]}
                onPress={handleStopTorch}
                disabled={stoppingTorch}
              >
                {isLiquidGlass && <GlassFill />}
                {stoppingTorch ? (
                  <ActivityIndicator color={isArtDeco ? artDeco.color.gold : isLiquidGlass ? liquidGlass.color.accent : '#e11d74'} />
                ) : isLiquidGlass ? (
                  <GlassLabel icon={<StopIcon size={14} color={liquidGlass.color.accentText} />} color={liquidGlass.color.accentText}>
                    Matikan
                  </GlassLabel>
                ) : (
                  <Text style={[styles.stopButtonText, isArtDeco && deco.stopButtonText]}>⏹️ Matikan</Text>
                )}
              </Pressable>
            </View>
          </View>

          <Text style={[styles.hint, isArtDeco && deco.hint, isLiquidGlass && glass.hint]}>
            Lokasi tetap dibagikan meski layar ini ditutup atau app diminimize -- otomatis
            berhenti setelah 30 menit, atau tekan "Berhenti berbagi lokasi" kapan saja.
          </Text>
        </ScrollView>
      </LiquidGlassRoot>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  glassLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scroll: {
    flex: 1,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e11d74',
  },
  closeText: {
    color: '#666',
    fontWeight: '600',
  },
  error: {
    color: '#c0392b',
    textAlign: 'center',
    marginTop: 8,
  },
  settingsButton: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c0392b',
    marginTop: 8,
  },
  settingsButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#c0392b',
  },
  actions: {
    gap: 12,
    marginTop: 16,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#e11d74',
  },
  startButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  stopButton: {
    borderWidth: 1,
    borderColor: '#e11d74',
  },
  stopButtonText: {
    color: '#e11d74',
    fontWeight: '600',
  },
  ringButton: {
    borderWidth: 1,
    borderColor: '#ddd',
  },
  ringButtonText: {
    color: '#e11d74',
    fontWeight: '600',
  },
  torchButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  torchButtonHalf: {
    flex: 1,
  },
  torchChipGrid: {
    gap: 8,
  },
  torchChipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  torchChip: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fdeef4',
  },
  torchChipActive: {
    backgroundColor: '#e11d74',
  },
  torchChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  torchChipTextActive: {
    color: '#fff',
  },
  torchChipSpacer: {
    flex: 1,
  },
  customRow: {
    flexDirection: 'row',
    gap: 12,
  },
  customField: {
    flex: 1,
    gap: 4,
  },
  customLabel: {
    fontSize: 12,
    color: '#767676',
  },
  customInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
  },
  hint: {
    marginTop: 24,
    textAlign: 'center',
    color: '#767676',
    fontSize: 12,
  },
});

const deco = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  heading: {
    color: artDeco.color.gold,
    fontFamily: artDeco.font.display,
  },
  closeText: {
    color: artDeco.color.muted,
  },
  error: {
    color: artDeco.color.stop,
  },
  settingsButton: {
    borderColor: artDeco.color.stop,
    borderRadius: artDeco.radius.none,
  },
  settingsButtonText: {
    color: artDeco.color.stop,
  },
  startButton: {
    backgroundColor: artDeco.color.gold,
    borderRadius: artDeco.radius.none,
  },
  startButtonText: {
    color: artDeco.color.black,
    fontFamily: artDeco.font.serifBold,
  },
  stopButton: {
    borderColor: artDeco.color.gold,
    borderRadius: artDeco.radius.none,
  },
  stopButtonText: {
    color: artDeco.color.gold,
  },
  ringButton: {
    borderColor: artDeco.color.lineSoft,
    borderRadius: artDeco.radius.none,
  },
  ringButtonText: {
    color: artDeco.color.gold,
  },
  torchChip: {
    backgroundColor: artDeco.color.goldSoft,
    borderRadius: artDeco.radius.none,
    borderWidth: 1,
    borderColor: artDeco.color.lineSoft,
  },
  torchChipActive: {
    backgroundColor: artDeco.color.gold,
  },
  torchChipText: {
    color: artDeco.color.ink2,
  },
  torchChipTextActive: {
    color: artDeco.color.black,
  },
  customLabel: {
    color: artDeco.color.muted,
  },
  customInput: {
    backgroundColor: artDeco.color.surface2,
    borderColor: artDeco.color.lineSoft,
    borderRadius: artDeco.radius.none,
    color: artDeco.color.ink,
  },
  hint: {
    color: artDeco.color.faint,
  },
});

const glass = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  heading: {
    color: liquidGlass.color.accentText,
  },
  closeText: {
    color: liquidGlass.color.muted,
  },
  startButton: {
    backgroundColor: liquidGlass.color.accentDeep,
    borderRadius: liquidGlass.radius.control,
  },
  startButtonText: {
    color: '#fff',
  },
  stopButton: {
    overflow: 'hidden',
    borderRadius: liquidGlass.radius.control,
    borderWidth: 1,
    borderColor: liquidGlass.color.glassChipBorder,
    backgroundColor: 'transparent',
  },
  stopButtonText: {
    color: liquidGlass.color.accentText,
  },
  ringButton: {
    overflow: 'hidden',
    borderRadius: liquidGlass.radius.control,
    borderWidth: 1,
    borderColor: liquidGlass.color.glassChipBorder,
    backgroundColor: 'transparent',
  },
  ringButtonText: {
    color: liquidGlass.color.ink2,
  },
  torchChip: {
    backgroundColor: liquidGlass.color.glassChipWash,
    borderWidth: 1,
    borderColor: liquidGlass.color.glassChipBorder,
  },
  torchChipActive: {
    backgroundColor: liquidGlass.color.accentDeep,
    borderColor: liquidGlass.color.accentDeep,
  },
  torchChipText: {
    color: liquidGlass.color.ink2,
  },
  torchChipTextActive: {
    color: '#fff',
  },
  customLabel: {
    color: liquidGlass.color.muted,
  },
  customInput: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderColor: liquidGlass.color.glassChipBorder,
    color: liquidGlass.color.ink,
  },
  hint: {
    color: liquidGlass.color.muted,
  },
});
