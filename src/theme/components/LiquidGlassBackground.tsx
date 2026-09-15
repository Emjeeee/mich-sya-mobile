// Soft gradient backdrop for the Liquid Glass theme -- gives the floating
// glass panels "something to refract" (a flat single color behind glass
// looks dead, per .claude/skills/ios26-mobile-design/references/
// layout-typography-accessibility.md #9). A diagonal base sweep, three soft
// radial highlights, and a scattering of low-opacity sparkle/heart motifs
// (added per a direct "background terlalu polos" report -- the original
// two-blob version left most of a tall screen as a flat gradient with
// nothing else going on). Meant to sit behind a screen's content via
// `{isLiquidGlass && <LiquidGlassBackground />}`, same mounting pattern as
// `<ArtDecoBackground />`.
import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { liquidGlass } from '../liquidGlassTokens';

const SPARKLE_PATH = 'M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10L12 2Z';
const HEART_PATH =
  'M12 20C12 20 3.5 14.5 3.5 8.7C3.5 5.9 5.7 4 8.2 4C9.8 4 11.2 4.9 12 6.2C12.8 4.9 14.2 4 15.8 4C18.3 4 20.5 5.9 20.5 8.7C20.5 14.5 12 20 12 20Z';

// Fixed relative positions (0-1 of screen width/height) so the scatter is
// stable across re-renders and reasonably clear of where a screen's main
// content/cards usually sit (avoids a dead band down the vertical center).
// `kind` picks the glyph, `scale` its size (glyphs are drawn in a 24x24
// box), `opacity` keeps it a background hint, never a foreground shape.
const MOTIFS: { x: number; y: number; kind: 'sparkle' | 'heart'; scale: number; opacity: number }[] = [
  { x: 0.08, y: 0.09, kind: 'sparkle', scale: 1.1, opacity: 0.16 },
  { x: 0.86, y: 0.06, kind: 'heart', scale: 0.9, opacity: 0.14 },
  { x: 0.9, y: 0.24, kind: 'sparkle', scale: 0.7, opacity: 0.12 },
  { x: 0.05, y: 0.32, kind: 'heart', scale: 0.7, opacity: 0.1 },
  { x: 0.93, y: 0.55, kind: 'sparkle', scale: 0.9, opacity: 0.14 },
  { x: 0.04, y: 0.62, kind: 'sparkle', scale: 0.6, opacity: 0.1 },
  { x: 0.12, y: 0.85, kind: 'heart', scale: 1.1, opacity: 0.15 },
  { x: 0.82, y: 0.88, kind: 'sparkle', scale: 1.0, opacity: 0.15 },
];

export function LiquidGlassBackground({ variant = 'warm' }: { variant?: 'warm' | 'cool' }) {
  const { width, height } = useWindowDimensions();
  const g = liquidGlass.gradient[variant];
  const tint = variant === 'warm' ? g.blobBottomRight : liquidGlass.color.accent;

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
        <RadialGradient id="blobMid" cx="50%" cy="46%" r="40%">
          <Stop offset="0%" stopColor={g.blobTopLeft} stopOpacity={0.55} />
          <Stop offset="100%" stopColor={g.blobTopLeft} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill="url(#base)" />
      <Rect x={0} y={0} width={width} height={height} fill="url(#blobTL)" />
      <Rect x={0} y={0} width={width} height={height} fill="url(#blobBR)" />
      <Rect x={0} y={0} width={width} height={height} fill="url(#blobMid)" />
      {MOTIFS.map((m, i) => {
        const size = 24 * m.scale;
        const cx = m.x * width;
        const cy = m.y * height;
        return (
          <Path
            key={i}
            d={m.kind === 'sparkle' ? SPARKLE_PATH : HEART_PATH}
            fill={tint}
            opacity={m.opacity}
            transform={`translate(${cx - size / 2}, ${cy - size / 2}) scale(${m.scale})`}
          />
        );
      })}
    </Svg>
  );
}
