// Shared "go back" / "close" control -- every screen/modal in this app used
// to hand-roll its own `<Pressable onPress={...}><Text>‹ Kembali</Text></Pressable>`,
// which sized the tappable area to the text's own bounding box (well under
// the 44-48dp minimum touch target) and, on Liquid Glass, still showed the
// same plain gray text as every other theme instead of anything reading as
// "iOS". This centralizes both fixes in one place.
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { artDeco } from '../artDecoTokens';
import { liquidGlass } from '../liquidGlassTokens';
import { useAppTheme } from '../ThemeContext';
import { ChevronLeftIcon, CloseIcon } from './GlassIcon';

interface BackButtonProps {
  onPress: () => void;
  label?: string;
  // 'back' (default): a chevron, for real screen-to-screen navigation
  // (navigation.goBack()). 'close': an X, for dismissing a modal/sheet --
  // only changes which glyph Liquid Glass shows; Klasik/Art Deco render
  // both the same way (their own text-only style predates this distinction).
  variant?: 'back' | 'close';
}

export function BackButton({ onPress, label = 'Kembali', variant = 'back' }: BackButtonProps) {
  const { isArtDeco, isLiquidGlass } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={[styles.button, isArtDeco && deco.button, isLiquidGlass && glass.button]}
    >
      {isLiquidGlass ? (
        <View style={styles.iosRow}>
          {variant === 'close' ? (
            <CloseIcon size={16} color={liquidGlass.color.accentText} />
          ) : (
            <ChevronLeftIcon size={20} color={liquidGlass.color.accentText} />
          )}
          <Text style={glass.label}>{label}</Text>
        </View>
      ) : (
        <Text style={[styles.text, isArtDeco && deco.text]}>
          {variant === 'close' ? label : `‹ ${label}`}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // The real fix for "too small to tap reliably": a real 44dp+ box around
  // the label, not just a hitSlop illusion around tiny text.
  button: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  text: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
  },
  iosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

const deco = StyleSheet.create({
  button: {},
  text: {
    color: artDeco.color.muted,
  },
});

const glass = StyleSheet.create({
  button: {},
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: liquidGlass.color.accentText,
  },
});
