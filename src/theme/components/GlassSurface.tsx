// A floating frosted-glass panel: real native blur (expo-blur's BlurView)
// behind a translucent color wash and a bright hairline border, matching
// the "Liquid Glass" look from .claude/skills/ios26-mobile-design.
//
// The blur/wash/border layers are `StyleSheet.absoluteFill`, and the actual
// children render in a *separate* normal-flow inner View (`contentStyle`)
// -- not as siblings sharing the outer padded box. If padding/layout were
// applied directly to the outer box, the absolute-fill layers would sit
// inset from it (RN positions `top/left/right/bottom: 0` against the
// padding edge, not the border edge), leaving a visible seam of unblurred
// background around the edge. Splitting outer (box/position/radius) from
// contentStyle (padding/flex layout) avoids that entirely.
import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useGlassBlurProps } from './LiquidGlassRoot';
import { liquidGlass } from '../liquidGlassTokens';

interface GlassSurfaceProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  radius?: number;
  intensity?: number; // expo-blur's BlurView intensity, 0-100
  tint?: 'light' | 'dark' | 'default';
  wash?: string;
  borderColor?: string;
  variant?: 'panel' | 'dark';
}

export function GlassSurface({
  children,
  style,
  contentStyle,
  radius = liquidGlass.radius.card,
  intensity = 40,
  tint = 'light',
  wash,
  borderColor,
  variant = 'panel',
}: GlassSurfaceProps) {
  const resolvedWash = wash ?? (variant === 'dark' ? liquidGlass.color.glassDarkWash : liquidGlass.color.glassPanelWash);
  const resolvedBorder =
    borderColor ?? (variant === 'dark' ? liquidGlass.color.glassDarkBorder : liquidGlass.color.glassPanelBorder);
  const resolvedTint = variant === 'dark' ? 'dark' : tint;
  const blurProps = useGlassBlurProps();

  return (
    <View style={[styles.outer, { borderRadius: radius }, style]}>
      <BlurView intensity={intensity} tint={resolvedTint} style={StyleSheet.absoluteFill} {...blurProps} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: resolvedWash }]} />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: 1, borderColor: resolvedBorder }]}
      />
      <View style={contentStyle}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    overflow: 'hidden',
  },
});
