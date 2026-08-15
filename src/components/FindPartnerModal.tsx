import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

// Excludes 'stop' -- it's a control action (see the dedicated "Matikan
// senter pasangan" button below), not a selectable blink-pattern chip.
const TORCH_PRESET_ORDER: Exclude<TorchPatternKind, 'stop'>[] = ['steady', 'slow', 'fast', 'sos', 'custom'];

interface FindPartnerModalProps {
  visible: boolean;
  coupleId: string;
  onClose: () => void;
}

export default function FindPartnerModal({ visible, coupleId, onClose }: FindPartnerModalProps) {
  const insets = useSafeAreaInsets();
  const {
    isSharing,
    myLocation,
    partnerPresence,
    starting,
    error,
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
      <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
        <View style={styles.header}>
          <Text style={styles.heading}>Cari Pasangan</Text>
          <Pressable onPress={handleClose}>
            <Text style={styles.closeText}>Tutup</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {error && <Text style={styles.error}>{error}</Text>}

          <CompassArrow
            myLocation={myLocation}
            partnerLocation={partnerPresence ? { lat: partnerPresence.lat, lng: partnerPresence.lng } : null}
          />

          <View style={styles.actions}>
            {isSharing ? (
              <Pressable style={[styles.button, styles.stopButton]} onPress={stopFinding}>
                <Text style={styles.stopButtonText}>Berhenti berbagi lokasi</Text>
              </Pressable>
            ) : (
              <Pressable style={[styles.button, styles.startButton]} onPress={startFinding} disabled={starting}>
                {starting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.startButtonText}>Mulai cari pasangan</Text>
                )}
              </Pressable>
            )}

            <Pressable style={[styles.button, styles.ringButton]} onPress={handleRing} disabled={ringing}>
              {ringing ? (
                <ActivityIndicator color="#e11d74" />
              ) : (
                <Text style={styles.ringButtonText}>🔊 Bunyikan HP pasangan</Text>
              )}
            </Pressable>

            <SilentRingToggle />
            <RemoteControlAccess />
            <RemoteControlPanel coupleId={coupleId} />

            <View style={styles.torchChipGrid}>
              <View style={styles.torchChipRow}>
                {TORCH_PRESET_ORDER.slice(0, 3).map((kind) => (
                  <Pressable
                    key={kind}
                    onPress={() => setTorchKind(kind)}
                    style={[styles.torchChip, torchKind === kind && styles.torchChipActive]}
                  >
                    <Text style={[styles.torchChipText, torchKind === kind && styles.torchChipTextActive]}>
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
                    style={[styles.torchChip, torchKind === kind && styles.torchChipActive]}
                  >
                    <Text style={[styles.torchChipText, torchKind === kind && styles.torchChipTextActive]}>
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
                  <Text style={styles.customLabel}>Nyala (ms)</Text>
                  <TextInput
                    style={styles.customInput}
                    keyboardType="number-pad"
                    value={customOnMs}
                    onChangeText={setCustomOnMs}
                  />
                </View>
                <View style={styles.customField}>
                  <Text style={styles.customLabel}>Mati (ms)</Text>
                  <TextInput
                    style={styles.customInput}
                    keyboardType="number-pad"
                    value={customOffMs}
                    onChangeText={setCustomOffMs}
                  />
                </View>
              </View>
            )}

            <View style={styles.torchButtonRow}>
              <Pressable
                style={[styles.button, styles.ringButton, styles.torchButtonHalf]}
                onPress={handleTorch}
                disabled={torching}
              >
                {torching ? (
                  <ActivityIndicator color="#e11d74" />
                ) : (
                  <Text style={styles.ringButtonText}>🔦 Nyalain</Text>
                )}
              </Pressable>
              <Pressable
                style={[styles.button, styles.stopButton, styles.torchButtonHalf]}
                onPress={handleStopTorch}
                disabled={stoppingTorch}
              >
                {stoppingTorch ? (
                  <ActivityIndicator color="#e11d74" />
                ) : (
                  <Text style={styles.stopButtonText}>⏹️ Matikan</Text>
                )}
              </Pressable>
            </View>
          </View>

          <Text style={styles.hint}>
            Lokasi tetap dibagikan meski layar ini ditutup atau app diminimize -- otomatis
            berhenti setelah 30 menit, atau tekan "Berhenti berbagi lokasi" kapan saja.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
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
