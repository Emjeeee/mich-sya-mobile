import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../ThemeContext';
import { artDeco } from '../artDecoTokens';
import { liquidGlass } from '../liquidGlassTokens';

export function ThemeSwitcherSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { themeName, isArtDeco, isLiquidGlass, setThemeName } = useAppTheme();

  const choose = (name: 'original' | 'artdeco' | 'liquidglass') => {
    setThemeName(name);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <Text style={[styles.title, isArtDeco && styles.titleDeco, isLiquidGlass && styles.titleGlass]}>
            Pilih Tampilan
          </Text>

          <Pressable
            style={[
              styles.option,
              themeName === 'original' && styles.optionActive,
              isArtDeco && themeName === 'original' && styles.optionActiveDeco,
              isLiquidGlass && themeName === 'original' && styles.optionActiveGlass,
            ]}
            onPress={() => choose('original')}
          >
            <View style={[styles.swatch, { backgroundColor: '#e11d74' }]} />
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Klasik</Text>
              <Text style={styles.optionDesc}>Tampilan MichSya yang biasa dipakai</Text>
            </View>
          </Pressable>

          <Pressable
            style={[
              styles.option,
              themeName === 'artdeco' && styles.optionActive,
              isArtDeco && themeName === 'artdeco' && styles.optionActiveDeco,
              isLiquidGlass && themeName === 'artdeco' && styles.optionActiveGlass,
            ]}
            onPress={() => choose('artdeco')}
          >
            <View
              style={[
                styles.swatch,
                { backgroundColor: artDeco.color.bg, borderWidth: 1.5, borderColor: artDeco.color.gold },
              ]}
            />
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Art Deco</Text>
              <Text style={styles.optionDesc}>Emas & emerald, motif geometris 1920-an</Text>
            </View>
          </Pressable>

          <Pressable
            style={[
              styles.option,
              themeName === 'liquidglass' && styles.optionActive,
              isArtDeco && themeName === 'liquidglass' && styles.optionActiveDeco,
              isLiquidGlass && themeName === 'liquidglass' && styles.optionActiveGlass,
            ]}
            onPress={() => choose('liquidglass')}
          >
            <View
              style={[
                styles.swatch,
                {
                  backgroundColor: 'rgba(255,255,255,0.5)',
                  borderWidth: 1.5,
                  borderColor: liquidGlass.color.accent,
                },
              ]}
            />
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Liquid Glass</Text>
              <Text style={styles.optionDesc}>Kaca kabur mengambang, gaya iOS 26</Text>
            </View>
          </Pressable>

          <Pressable onPress={onClose} style={styles.close}>
            <Text style={styles.closeText}>Tutup</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4, color: '#222' },
  titleDeco: { color: artDeco.color.ruby },
  titleGlass: { color: liquidGlass.color.accentText },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#eee',
  },
  optionActive: { borderColor: '#e11d74' },
  optionActiveDeco: { borderColor: artDeco.color.gold },
  optionActiveGlass: { borderColor: liquidGlass.color.accent },
  swatch: { width: 32, height: 32, borderRadius: 8 },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 15, fontWeight: '700', color: '#222' },
  optionDesc: { fontSize: 12, color: '#777', marginTop: 2 },
  close: { alignSelf: 'center', marginTop: 4, padding: 8 },
  closeText: { color: '#999', fontWeight: '600' },
});
