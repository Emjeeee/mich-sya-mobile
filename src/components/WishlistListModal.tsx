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
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (item.image_url) {
      getSignedUrl(item.image_url).then(setImageUrl);
    }
  }, [item.image_url]);

  return (
    <View style={styles.row}>
      {imageUrl && <Image source={{ uri: imageUrl }} style={styles.rowImage} />}
      <Pressable style={styles.rowBody} onPress={onToggleDone}>
        <Text style={[styles.rowTitle, item.is_done && styles.rowTitleDone]}>{item.title}</Text>
        {item.description && <Text style={styles.rowDescription}>{item.description}</Text>}
      </Pressable>
      <Pressable
        style={[styles.promoteButton, promoted && styles.promoteButtonDone]}
        onPress={onPromote}
        disabled={promoted}
      >
        <Text style={styles.promoteButtonText}>
          {promoted ? 'Jadi goal ✓' : 'Jadikan goal'}
        </Text>
      </Pressable>
    </View>
  );
}

export default function WishlistListModal({ visible, coupleId, onClose }: WishlistListModalProps) {
  const insets = useSafeAreaInsets();
  const { items, loading, error, refresh, toggleDone, promoteToGoal } = useWishlist(coupleId);
  const [showAddModal, setShowAddModal] = useState(false);
  const [promotedIds, setPromotedIds] = useState<Set<string>>(new Set());

  const handlePromote = async (item: WishlistItem) => {
    const ok = await promoteToGoal(item);
    if (ok) {
      setPromotedIds((prev) => new Set(prev).add(item.id));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.header}>
          <Text style={styles.heading}>Wishlist</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.closeText}>Tutup</Text>
          </Pressable>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        {loading ? (
          <ActivityIndicator style={styles.spacing} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<Text style={styles.empty}>Belum ada wishlist.</Text>}
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

        <Pressable style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Text style={styles.addButtonText}>+ Tambah wishlist</Text>
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
    color: '#999',
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
    color: '#999',
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
