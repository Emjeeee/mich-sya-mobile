import { useRef, useState } from 'react';
import * as Sharing from 'expo-sharing';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DateRecapModalProps {
  visible: boolean;
  title: string;
  durationLabel: string;
  distanceLabel: string | null;
  photoUrls: string[];
  onClose: () => void;
}

export default function DateRecapModal({
  visible,
  title,
  durationLabel,
  distanceLabel,
  photoUrls,
  onClose,
}: DateRecapModalProps) {
  const insets = useSafeAreaInsets();
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 0.95 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.heading}>Bagikan recap kencan ini?</Text>

            <View ref={cardRef} collapsable={false} style={styles.card}>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardStat}>
                {durationLabel}
                {distanceLabel ? ` · ${distanceLabel}` : ''}
              </Text>

              {photoUrls.length > 0 && (
                <View style={styles.grid}>
                  {photoUrls.slice(0, 4).map((url) => (
                    <Image key={url} source={{ uri: url }} style={styles.gridPhoto} />
                  ))}
                </View>
              )}

              <Text style={styles.cardBrand}>MichSya 💕</Text>
            </View>

            <View style={styles.row}>
              <Pressable style={[styles.button, styles.cancelButton]} onPress={onClose}>
                <Text style={styles.cancelText}>Tutup</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.shareButton]}
                onPress={handleShare}
                disabled={sharing}
              >
                {sharing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.shareText}>Bagikan</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '85%',
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#fdeef4',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e11d74',
    textAlign: 'center',
  },
  cardStat: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    width: '100%',
  },
  gridPhoto: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  cardBrand: {
    marginTop: 16,
    fontSize: 12,
    color: '#c9a3b3',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelText: {
    color: '#333',
    fontWeight: '600',
  },
  shareButton: {
    backgroundColor: '#e11d74',
  },
  shareText: {
    color: '#fff',
    fontWeight: '600',
  },
});
