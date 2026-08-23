import { useState } from 'react';
import {
  ActivityIndicator,
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

import { artDeco } from '../theme/artDecoTokens';
import { useAppTheme } from '../theme/ThemeContext';

interface EndDateModalProps {
  visible: boolean;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (input: { title: string; summary: string }) => void;
}

export default function EndDateModal({
  visible,
  loading,
  onCancel,
  onSubmit,
}: EndDateModalProps) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const insets = useSafeAreaInsets();
  const { isArtDeco } = useAppTheme();

  const handleSubmit = () => {
    onSubmit({ title: title.trim(), summary: summary.trim() });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={[styles.backdrop, isArtDeco && deco.backdrop]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }, isArtDeco && deco.sheet]}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
            <Text style={[styles.heading, isArtDeco && deco.heading]}>Akhiri kencan</Text>

            <TextInput
              style={[styles.input, isArtDeco && deco.input]}
              placeholder="Judul kencan (opsional)"
              placeholderTextColor={isArtDeco ? artDeco.color.faint : '#767676'}
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              style={[styles.input, styles.multiline, isArtDeco && deco.input]}
              placeholder="Kemana saja, ngapain saja?"
              placeholderTextColor={isArtDeco ? artDeco.color.faint : '#767676'}
              value={summary}
              onChangeText={setSummary}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.row}>
              <Pressable style={[styles.button, styles.cancelButton, isArtDeco && deco.cancelButton]} onPress={onCancel}>
                <Text style={[styles.cancelText, isArtDeco && deco.cancelText]}>Batal</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.submitButton, isArtDeco && deco.submitButton]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={isArtDeco ? artDeco.color.black : '#fff'} />
                ) : (
                  <Text style={[styles.submitText, isArtDeco && deco.submitText]}>Selesai</Text>
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
  scrollContent: {
    gap: 12,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  multiline: {
    minHeight: 90,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
  input: {
    backgroundColor: artDeco.color.surface2,
    borderColor: artDeco.color.lineSoft,
    borderRadius: artDeco.radius.none,
    color: artDeco.color.ink,
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
