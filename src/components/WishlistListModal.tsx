import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWishlist } from '../hooks/useWishlist';
import { getSignedUrl } from '../lib/storage';
import { artDeco } from '../theme/artDecoTokens';
import { ArtDecoBackground } from '../theme/components/ArtDecoBackground';
import { BackButton } from '../theme/components/BackButton';
import { useAppTheme } from '../theme/ThemeContext';
import type { WishlistItem } from '../types/database';
import AddWishlistModal from './AddWishlistModal';

interface WishlistListModalProps {
  visible: boolean;
  coupleId: string;
  onClose: () => void;
}

function WishlistRow({
  item,
  onToggleDone,
  onPromote,
  promoted,
}: {
  item: WishlistItem;
  onToggleDone: () => void;
  onPromote: () => void;
  promoted: boolean;
}) {
  const { isArtDeco } = useAppTheme();
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (item.image_url) {
      getSignedUrl(item.image_url).then(setImageUrl);
    }
  }, [item.image_url]);

  return (
    <View style={[styles.row, isArtDeco && deco.row]}>
      {imageUrl && <Image source={{ uri: imageUrl }} style={[styles.rowImage, isArtDeco && deco.rowImage]} />}
      <Pressable style={styles.rowBody} onPress={onToggleDone}>
        <Text
          style={[
            styles.rowTitle,
            isArtDeco && deco.rowTitle,
            item.is_done && styles.rowTitleDone,
            item.is_done && isArtDeco && deco.rowTitleDone,
          ]}
        >
          {item.title}
        </Text>
        {item.description && (
          <Text style={[styles.rowDescription, isArtDeco && deco.rowDescription]}>{item.description}</Text>
        )}
      </Pressable>
      <Pressable
        style={[
          styles.promoteButton,
          isArtDeco && deco.promoteButton,
          promoted && styles.promoteButtonDone,
          promoted && isArtDeco && deco.promoteButtonDone,
        ]}
        onPress={onPromote}
        disabled={promoted}
      >
        <Text style={[styles.promoteButtonText, isArtDeco && deco.promoteButtonText]}>
          {promoted ? 'Jadi goal ✓' : 'Jadikan goal'}
        </Text>
      </Pressable>
    </View>
  );
}

export default function WishlistListModal({ visible, coupleId, onClose }: WishlistListModalProps) {
  const insets = useSafeAreaInsets();
  const { isArtDeco } = useAppTheme();
  const { items, promotedIds, loading, error, refresh, toggleDone, promoteToGoal } = useWishlist(coupleId);
  const [showAddModal, setShowAddModal] = useState(false);

  const handlePromote = async (item: WishlistItem) => {
    await promoteToGoal(item);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
          isArtDeco && deco.container,
        ]}
      >
        {isArtDeco && <ArtDecoBackground />}
        <View style={styles.header}>
          <Text style={[styles.heading, isArtDeco && deco.heading]}>Wishlist</Text>
          <BackButton onPress={onClose} label="Tutup" variant="close" />
        </View>

        {error && <Text style={[styles.error, isArtDeco && deco.error]}>{error}</Text>}

        {loading ? (
          <ActivityIndicator style={styles.spacing} color={isArtDeco ? artDeco.color.gold : undefined} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<Text style={[styles.empty, isArtDeco && deco.empty]}>Belum ada wishlist.</Text>}
            renderItem={({ item }) => (
              <WishlistRow
                item={item}
                onToggleDone={() => toggleDone(item)}
                onPromote={() => handlePromote(item)}
                promoted={promotedIds.has(item.id)}
              />
            )}
          />
        )}

        <Pressable style={[styles.addButton, isArtDeco && deco.addButton]} onPress={() => setShowAddModal(true)}>
          <Text style={[styles.addButtonText, isArtDeco && deco.addButtonText]}>+ Tambah wishlist</Text>
        </Pressable>
      </View>

      <AddWishlistModal
        visible={showAddModal}
        coupleId={coupleId}
        onClose={() => {
          setShowAddModal(false);
          refresh();
        }}
      />
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
    marginBottom: 16,
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
  spacing: {
    marginTop: 24,
  },
  error: {
    color: '#c0392b',
    marginBottom: 12,
    textAlign: 'center',
  },
  empty: {
    textAlign: 'center',
    color: '#767676',
    marginTop: 40,
  },
  listContent: {
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  rowImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
  },
  rowTitleDone: {
    textDecorationLine: 'line-through',
    color: '#767676',
  },
  rowDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  promoteButton: {
    borderWidth: 1,
    borderColor: '#e11d74',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  promoteButtonDone: {
    borderColor: '#ccc',
  },
  promoteButtonText: {
    color: '#e11d74',
    fontSize: 12,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#e11d74',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
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
  empty: {
    color: artDeco.color.muted,
  },
  row: {
    backgroundColor: artDeco.color.surface,
    borderColor: artDeco.color.lineSoft,
    borderRadius: artDeco.radius.none,
  },
  rowImage: {
    borderRadius: artDeco.radius.none,
  },
  rowTitle: {
    color: artDeco.color.ink,
  },
  rowTitleDone: {
    color: artDeco.color.faint,
  },
  rowDescription: {
    color: artDeco.color.muted,
  },
  promoteButton: {
    borderColor: artDeco.color.gold,
    borderRadius: artDeco.radius.none,
  },
  promoteButtonDone: {
    borderColor: artDeco.color.lineFaint,
  },
  promoteButtonText: {
    color: artDeco.color.gold,
  },
  addButton: {
    backgroundColor: artDeco.color.gold,
    borderRadius: artDeco.radius.none,
  },
  addButtonText: {
    color: artDeco.color.black,
    fontFamily: artDeco.font.serifBold,
  },
});
