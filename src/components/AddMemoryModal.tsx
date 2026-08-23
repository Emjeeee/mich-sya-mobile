import { useState } from 'react';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
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

import { enqueuePendingMemory, flushPendingMemories, type PendingMemory } from '../lib/offlineQueue';
import { saveMemoryNow } from '../lib/memoryUpload';
import { artDeco } from '../theme/artDecoTokens';
import { useAppTheme } from '../theme/ThemeContext';

interface AddMemoryModalProps {
  visible: boolean;
  coupleId: string;
  onClose: () => void;
}

export default function AddMemoryModal({ visible, coupleId, onClose }: AddMemoryModalProps) {
  const insets = useSafeAreaInsets();
  const { isArtDeco } = useAppTheme();
  const [assets, setAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [voiceNoteUri, setVoiceNoteUri] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const reset = () => {
    setAssets([]);
    setVoiceNoteUri(null);
    setTitle('');
    setStory('');
    setError(null);
    setNotice(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      setError('Izin akses galeri diperlukan.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setAssets((prev) => [...prev, ...result.assets]);
    }
  };

  const captureMedia = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      setError('Izin akses kamera diperlukan.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAssets((prev) => [...prev, ...result.assets]);
    }
  };

  const toggleRecording = async () => {
    if (recorderState.isRecording) {
      await recorder.stop();
      setVoiceNoteUri(recorder.uri);
      return;
    }

    setError(null);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError('Izin akses mikrofon diperlukan.');
        return;
      }
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      setError('Gagal mulai merekam suara.');
    }
  };

  const handleSave = async () => {
    if (assets.length === 0 && !voiceNoteUri) {
      setError('Pilih foto/video atau rekam suara dulu.');
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    const item: PendingMemory = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      coupleId,
      title: title.trim() || 'Momen hari ini',
      story: story.trim(),
      memoryDate: new Date().toISOString().slice(0, 10),
      assets: assets.map((asset) => ({
        uri: asset.uri,
        mimeType: asset.mimeType ?? (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
      })),
      voiceNote: voiceNoteUri ? { uri: voiceNoteUri, mimeType: 'audio/m4a' } : null,
    };

    try {
      await saveMemoryNow(item);
      flushPendingMemories();
      handleClose();
    } catch (err) {
      await enqueuePendingMemory(item);
      setSaving(false);
      setNotice('Gagal upload sekarang -- disimpan, akan dicoba lagi otomatis nanti.');
      setTimeout(handleClose, 1500);
      return;
    }
    setSaving(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={[styles.backdrop, isArtDeco && deco.backdrop]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }, isArtDeco && deco.sheet]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={[styles.heading, isArtDeco && deco.heading]}>Tambah kenangan</Text>

            <View style={styles.pickRow}>
              <Pressable
                style={[styles.pickButton, styles.pickButtonThird, isArtDeco && deco.pickButton]}
                onPress={captureMedia}
              >
                <Text style={[styles.pickButtonText, isArtDeco && deco.pickButtonText]}>Kamera</Text>
              </Pressable>
              <Pressable
                style={[styles.pickButton, styles.pickButtonThird, isArtDeco && deco.pickButton]}
                onPress={pickMedia}
              >
                <Text style={[styles.pickButtonText, isArtDeco && deco.pickButtonText]}>Galeri</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.pickButton,
                  styles.pickButtonThird,
                  isArtDeco && deco.pickButton,
                  recorderState.isRecording && styles.pickButtonRecording,
                  recorderState.isRecording && isArtDeco && deco.pickButtonRecording,
                ]}
                onPress={toggleRecording}
              >
                <Text style={[styles.pickButtonText, isArtDeco && deco.pickButtonText]}>
                  {recorderState.isRecording ? '⏺ Stop' : '🎤 Rekam'}
                </Text>
              </Pressable>
            </View>

            {voiceNoteUri && (
              <Text style={[styles.hint, isArtDeco && deco.hint]}>
                🎤 Catatan suara terekam ({Math.round(recorderState.durationMillis / 1000)}s)
              </Text>
            )}

            {assets.length > 0 && (
              <>
                <Text style={[styles.hint, isArtDeco && deco.hint]}>
                  {assets.length} media dipilih -- ketuk untuk hapus
                </Text>
                <ScrollView horizontal style={styles.previewRow}>
                  {assets.map((asset) => (
                    <Pressable
                      key={asset.uri}
                      onPress={() =>
                        setAssets((prev) => prev.filter((item) => item.uri !== asset.uri))
                      }
                    >
                      <Image source={{ uri: asset.uri }} style={[styles.preview, isArtDeco && deco.preview]} />
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}

            <TextInput
              style={[styles.input, isArtDeco && deco.input]}
              placeholder="Judul (opsional)"
              placeholderTextColor={isArtDeco ? artDeco.color.faint : '#767676'}
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              style={[styles.input, styles.multiline, isArtDeco && deco.input]}
              placeholder="Ceritain hari ini gimana... (opsional kalau udah rekam suara)"
              placeholderTextColor={isArtDeco ? artDeco.color.faint : '#767676'}
              value={story}
              onChangeText={setStory}
              multiline
              textAlignVertical="top"
            />

            {error && <Text style={[styles.error, isArtDeco && deco.error]}>{error}</Text>}
            {notice && <Text style={[styles.notice, isArtDeco && deco.notice]}>{notice}</Text>}

            <View style={styles.row}>
              <Pressable style={[styles.button, styles.cancelButton, isArtDeco && deco.cancelButton]} onPress={handleClose}>
                <Text style={[styles.cancelText, isArtDeco && deco.cancelText]}>Batal</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.submitButton, isArtDeco && deco.submitButton]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={isArtDeco ? artDeco.color.black : '#fff'} />
                ) : (
                  <Text style={[styles.submitText, isArtDeco && deco.submitText]}>Simpan</Text>
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
  pickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  pickButton: {
    borderWidth: 1,
    borderColor: '#e11d74',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  pickButtonThird: {
    flex: 1,
  },
  pickButtonRecording: {
    backgroundColor: '#fdeef4',
  },
  pickButtonText: {
    color: '#e11d74',
    fontWeight: '600',
    fontSize: 13,
  },
  hint: {
    fontSize: 12,
    color: '#767676',
    marginBottom: 8,
  },
  previewRow: {
    marginBottom: 12,
  },
  preview: {
    width: 72,
    height: 72,
    borderRadius: 10,
    marginRight: 8,
    backgroundColor: '#eee',
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
    minHeight: 90,
  },
  error: {
    color: '#c0392b',
    marginBottom: 8,
    textAlign: 'center',
  },
  notice: {
    color: '#b8860b',
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
  pickButton: {
    borderColor: artDeco.color.gold,
    borderRadius: artDeco.radius.none,
  },
  pickButtonRecording: {
    backgroundColor: artDeco.color.rubySoft,
  },
  pickButtonText: {
    color: artDeco.color.gold,
  },
  hint: {
    color: artDeco.color.muted,
  },
  preview: {
    borderRadius: artDeco.radius.none,
  },
  input: {
    backgroundColor: artDeco.color.surface2,
    borderColor: artDeco.color.lineSoft,
    borderRadius: artDeco.radius.none,
    color: artDeco.color.ink,
  },
  error: {
    color: artDeco.color.stop,
  },
  notice: {
    color: artDeco.color.warn,
  },
  cancelButton: {
    borderColor: artDeco.color.lineSoft,
    borderRadius: artDeco.radius.none,
  },
  cancelText: {
    color: artDeco.color.muted,
  },
  submitButton: {
    backgroundColor: artDeco.color.gold,
    borderRadius: artDeco.radius.none,
  },
  submitText: {
    color: artDeco.color.black,
    fontFamily: artDeco.font.serifBold,
  },
});
