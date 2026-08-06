import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CompassArrow from './CompassArrow';
import { useFindPartner } from '../hooks/useFindPartner';
import { sendPushToPartner } from '../lib/push';

interface FindPartnerModalProps {
  visible: boolean;
  coupleId: string;
  onClose: () => void;
}

export default function FindPartnerModal({ visible, coupleId, onClose }: FindPartnerModalProps) {
  const insets = useSafeAreaInsets();
  const {
    myUserId,
    isSharing,
    myLocation,
    partnerPresence,
    starting,
    error,
    startFinding,
    stopFinding,
  } = useFindPartner(coupleId);
  const [ringing, setRinging] = useState(false);

  const handleClose = () => {
    // Sharing now runs in the background independent of this screen -- closing it
    // should not stop the session. Use "Berhenti berbagi lokasi" to stop explicitly.
    onClose();
  };

  const handleRing = async () => {
    if (!myUserId) return;
    setRinging(true);
    const sent = await sendPushToPartner(coupleId, myUserId, {
      data: { type: 'ring' },
    });
    setRinging(false);
    if (!sent) {
      Alert.alert('Gagal', 'Tidak bisa membunyikan HP pasangan. Pastikan dia sudah pernah membuka MichSya di HP-nya.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.heading}>Cari Pasangan</Text>
          <Pressable onPress={handleClose}>
            <Text style={styles.closeText}>Tutup</Text>
          </Pressable>
        </View>

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
        </View>

        <Text style={styles.hint}>
          Lokasi tetap dibagikan meski layar ini ditutup atau app diminimize -- otomatis berhenti
          setelah 30 menit, atau tekan "Berhenti berbagi lokasi" kapan saja.
        </Text>
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
  hint: {
    marginTop: 'auto',
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
  },
});
