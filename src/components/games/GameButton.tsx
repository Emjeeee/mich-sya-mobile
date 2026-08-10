import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

interface GameButtonProps {
  onPress: () => void;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
}

export function GameButton({ onPress, children, variant = 'primary', disabled, loading }: GameButtonProps) {
  return (
    <Pressable
      style={[styles.button, variant === 'secondary' ? styles.secondary : styles.primary, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : '#e11d74'} size="small" />
      ) : (
        <Text style={variant === 'primary' ? styles.primaryText : styles.secondaryText}>{children}</Text>
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
