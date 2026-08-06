import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { uploadCouplePhoto } from '../lib/storage';
import { supabase } from '../lib/supabase';

interface AddWishlistModalProps {
  visible: boolean;
  coupleId: string;
  onClose: () => void;
}

export default function AddWishlistModal({ visible, coupleId, onClose }: AddWishlistModalProps) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle('');
    setDescription('');
    setAsset(null);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      setError('Izin akses galeri diperlukan.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAsset(result.assets[0]);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Judul wishlist wajib diisi.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();

      let imagePath: string | null = null;
      if (asset) {
        imagePath = await uploadCouplePhoto(
          coupleId,
          'wishlist',
          asset.uri,
          asset.mimeType ?? 'image/jpeg'
        );
      }

      const { error: insertError } = await supabase.from('wishlist_items').insert({
        couple_id: coupleId,
        title: title.trim(),
        description: description.trim() || null,
        image_url: imagePath,
        is_done: false,
        created_by: userData.user?.id ?? null,
      });
      if (insertError) throw insertError;

      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan wishlist.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.heading}>Tambah wishlist</Text>

            <TextInput
              style={styles.input}
              placeholder="Mau ngapain / kemana?"
              placeholderTextColor="#999"
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Detail (opsional)"
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />

            <Pressable style={styles.pickButton} onPress={pickImage}>
              <Text style={styles.pickButtonText}>
                {asset ? 'Ganti gambar' : 'Tambah gambar (opsional)'}
              </Text>
            </Pressable>

            {asset && <Image source={{ uri: asset.uri }} style={styles.preview} />}

            {error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.row}>
              <Pressable style={[styles.button, styles.cancelButton]} onPress={handleClose}>
                <Text style={styles.cancelText}>Batal</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.submitButton]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>Simpan</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    marginBottom: 12,
  },
  multiline: {
    minHeight: 80,
  },
  pickButton: {
    borderWidth: 1,
    borderColor: '#e11d74',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  pickButtonText: {
    color: '#e11d74',
    fontWeight: '600',
  },
  preview: {
    width: 96,
    height: 96,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: '#eee',
  },
  error: {
    color: '#c0392b',
    marginBottom: 8,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    marginBottom: 8,
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
  submitButton: {
    backgroundColor: '#e11d74',
  },
  submitText: {
    color: '#fff',
    fontWeight: '600',
  },
});
