import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getMyPhoneNumber, savePhoneNumber } from '../lib/push';
import { supabase } from '../lib/supabase';

interface PhoneNumberModalProps {
  visible: boolean;
  coupleId: string;
  onClose: () => void;
}

// Indonesian local format ("08...") -> international format ("+628...") --
// SMS sending needs the international form. Only rewrites the leading "0",
// so it doesn't fight the user while they keep typing digits after it.
function normalizePhoneInput(text: string): string {
  if (text.startsWith('0')) return `+62${text.slice(1)}`;
  return text;
}

export default function PhoneNumberModal({ visible, coupleId, onClose }: PhoneNumberModalProps) {
  const insets = useSafeAreaInsets();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      getMyPhoneNumber(data.user.id).then((existing) => {
        if (existing) setPhoneNumber(existing);
      });
    });
  }, [visible]);

  const handleSave = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    setSaving(true);
    await savePhoneNumber(coupleId, userData.user.id, phoneNumber.trim());
    setSaving(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'android' ? 'height' : 'padding'}
        style={styles.backdrop}
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.heading}>Nomor HP kamu</Text>
          <Text style={styles.subtitle}>
            Dipakai sebagai cadangan "Bunyikan HP" lewat SMS, untuk saat pasangan ada sinyal tapi
            tidak ada internet.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="+62812xxxxxxx"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={(text) => setPhoneNumber(normalizePhoneInput(text))}
          />

          <View style={styles.row}>
            <Pressable style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.cancelText}>Tutup</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.saveButton]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Simpan</Text>}
            </Pressable>
          </View>
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
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e11d74',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
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
  saveButton: {
    backgroundColor: '#e11d74',
  },
  saveText: {
    color: '#fff',
    fontWeight: '600',
  },
});
