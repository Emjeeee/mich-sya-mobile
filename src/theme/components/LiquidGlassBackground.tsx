// Soft gradient backdrop for the Liquid Glass theme -- gives the floating
// glass panels "something to refract" (a flat single color behind glass
// looks dead, per .claude/skills/ios26-mobile-design/references/
// layout-typography-accessibility.md #9). A diagonal base sweep plus two
// soft radial highlights, meant to sit behind a screen's content via
// `{isLiquidGlass && <LiquidGlassBackground />}`, same mounting pattern as
// `<ArtDecoBackground />`.
import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { liquidGlass } from '../liquidGlassTokens';

export function LiquidGlassBackground({ variant = 'warm' }: { variant?: 'warm' | 'cool' }) {
  const { width, height } = useWindowDimensions();
  const g = liquidGlass.gradient[variant];

  return (
    <Svg
      width={width}
      height={height}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient id="base" x1="0%" y1="0%" x2="70%" y2="100%">
          <Stop offset="0%" stopColor={g.base[0]} />
          <Stop offset="45%" stopColor={g.base[1]} />
          <Stop offset="100%" stopColor={g.base[2]} />
        </LinearGradient>
        <RadialGradient id="blobTL" cx="18%" cy="12%" r="45%">
          <Stop offset="0%" stopColor={g.blobTopLeft} stopOpacity={1} />
          <Stop offset="100%" stopColor={g.blobTopLeft} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="blobBR" cx="85%" cy="78%" r="48%">
          <Stop offset="0%" stopColor={g.blobBottomRight} stopOpacity={1} />
          <Stop offset="100%" stopColor={g.blobBottomRight} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill="url(#base)" />
      <Rect x={0} y={0} width={width} height={height} fill="url(#blobTL)" />
      <Rect x={0} y={0} width={width} height={height} fill="url(#blobBR)" />
    </Svg>
  );
}
