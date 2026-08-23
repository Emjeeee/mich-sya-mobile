// Replaces shadow-based elevation with the Art Deco "double gold frame":
// an outer solid border plus an inset thinner border, no shadow at all
// (see design-styles-reference.md, Art Deco elevation notes).
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { artDeco } from '../artDecoTokens';

export function DecoFrame({
  children,
  style,
  contentStyle,
  gap = 6,
}: {
  children: ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  gap?: number;
}) {
  return (
    <View style={[styles.outer, style]}>
      <View pointerEvents="none" style={[styles.innerBorder, { top: gap, left: gap, right: gap, bottom: gap }]} />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderWidth: 1.5,
    borderColor: artDeco.color.line,
    backgroundColor: artDeco.color.surface,
  },
  innerBorder: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: artDeco.color.lineFaint,
  },
  content: {
    padding: 14,
  },
});
