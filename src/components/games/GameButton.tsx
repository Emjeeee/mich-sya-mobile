import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { artDeco } from '../../theme/artDecoTokens';
import { useAppTheme } from '../../theme/ThemeContext';

interface GameButtonProps {
  onPress: () => void;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
}

export function GameButton({ onPress, children, variant = 'primary', disabled, loading }: GameButtonProps) {
  const { isArtDeco } = useAppTheme();
  const primary = variant !== 'secondary';
  return (
    <Pressable
      style={[
        styles.button,
        primary ? styles.primary : styles.secondary,
        disabled && styles.disabled,
        isArtDeco && deco.button,
        isArtDeco && (primary ? deco.primary : deco.secondary),
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator
          color={primary ? (isArtDeco ? artDeco.color.black : '#fff') : isArtDeco ? artDeco.color.gold : '#e11d74'}
          size="small"
        />
      ) : (
        <Text
          style={[
            primary ? styles.primaryText : styles.secondaryText,
            isArtDeco && (primary ? deco.primaryText : deco.secondaryText),
          ]}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primary: {
    backgroundColor: '#e11d74',
  },
  secondary: {
    borderWidth: 1,
    borderColor: '#e11d74',
  },
  disabled: {
    opacity: 0.5,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryText: {
    color: '#e11d74',
    fontWeight: '600',
    fontSize: 14,
  },
});

const deco = StyleSheet.create({
  button: {
    borderRadius: artDeco.radius.none,
  },
  primary: {
    backgroundColor: artDeco.color.gold,
  },
  secondary: {
    borderColor: artDeco.color.gold,
  },
  primaryText: {
    color: artDeco.color.black,
    fontFamily: artDeco.font.serifBold,
    letterSpacing: artDeco.letterSpacingWide,
  },
  secondaryText: {
    color: artDeco.color.gold,
    fontFamily: artDeco.font.serifBold,
    letterSpacing: artDeco.letterSpacingWide,
  },
});
