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

import { artDeco } from '../theme/artDecoTokens';
import { useAppTheme } from '../theme/ThemeContext';

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
  const { isArtDeco } = useAppTheme();
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
      <View style={[styles.backdrop, isArtDeco && deco.backdrop]}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }, isArtDeco && deco.sheet]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={[styles.heading, isArtDeco && deco.heading]}>Bagikan recap kencan ini?</Text>

            <View ref={cardRef} collapsable={false} style={[styles.card, isArtDeco && deco.card]}>
              <Text style={[styles.cardTitle, isArtDeco && deco.cardTitle]}>{title}</Text>
              <Text style={[styles.cardStat, isArtDeco && deco.cardStat]}>
                {durationLabel}
                {distanceLabel ? ` · ${distanceLabel}` : ''}
              </Text>

              {photoUrls.length > 0 && (
                <View style={styles.grid}>
                  {photoUrls.slice(0, 4).map((url) => (
                    <Image key={url} source={{ uri: url }} style={[styles.gridPhoto, isArtDeco && deco.gridPhoto]} />
                  ))}
                </View>
              )}

              <Text style={[styles.cardBrand, isArtDeco && deco.cardBrand]}>MichSya 💕</Text>
            </View>

            <View style={styles.row}>
              <Pressable style={[styles.button, styles.cancelButton, isArtDeco && deco.cancelButton]} onPress={onClose}>
                <Text style={[styles.cancelText, isArtDeco && deco.cancelText]}>Tutup</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.shareButton, isArtDeco && deco.shareButton]}
                onPress={handleShare}
                disabled={sharing}
              >
                {sharing ? (
                  <ActivityIndicator color={isArtDeco ? artDeco.color.black : '#fff'} />
                ) : (
                  <Text style={[styles.shareText, isArtDeco && deco.shareText]}>Bagikan</Text>
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

const deco = StyleSheet.create({
  backdrop: {
    backgroundColor: artDeco.color.overlay,
  },
  sheet: {
    backgroundColor: artDeco.color.surface,
    borderTopLeftRadius: artDeco.radius.none,
    borderTopRightRadius: artDeco.radius.none,
    borderTopWidth: 2,
    borderColor: artDeco.color.line,
  },
  heading: {
    color: artDeco.color.ink,
    fontFamily: artDeco.font.serifBold,
  },
  card: {
    backgroundColor: artDeco.color.surface2,
    borderRadius: artDeco.radius.none,
    borderWidth: 1.5,
    borderColor: artDeco.color.line,
  },
  cardTitle: {
    color: artDeco.color.gold,
    fontFamily: artDeco.font.display,
  },
  cardStat: {
    color: artDeco.color.muted,
  },
  gridPhoto: {
    borderRadius: artDeco.radius.none,
  },
  cardBrand: {
    color: artDeco.color.faint,
  },
  cancelButton: {
    borderColor: artDeco.color.lineSoft,
    borderRadius: artDeco.radius.none,
  },
  cancelText: {
    color: artDeco.color.muted,
  },
  shareButton: {
    backgroundColor: artDeco.color.gold,
    borderRadius: artDeco.radius.none,
  },
  shareText: {
    color: artDeco.color.black,
    fontFamily: artDeco.font.serifBold,
  },
});
