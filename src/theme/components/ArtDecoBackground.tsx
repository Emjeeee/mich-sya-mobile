// Decorative emerald backdrop with repeating gold linework and corner
// sunburst fans -- the Art Deco theme's signature background, meant to sit
// behind a screen's content via `{isArtDeco && <ArtDecoBackground />}`.
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { artDeco } from '../artDecoTokens';

type Corner = 'tl' | 'tr' | 'bl' | 'br';

const ANCHOR: Record<Corner, (size: number) => { x: number; y: number }> = {
  tl: () => ({ x: 0, y: 0 }),
  tr: (size) => ({ x: size, y: 0 }),
  br: (size) => ({ x: size, y: size }),
  bl: (size) => ({ x: 0, y: size }),
};

const ANGLE_START: Record<Corner, number> = { tl: 0, tr: 90, br: 180, bl: 270 };

const POSITION: Record<Corner, object> = {
  tl: { top: 0, left: 0 },
  tr: { top: 0, right: 0 },
  br: { bottom: 0, right: 0 },
  bl: { bottom: 0, left: 0 },
};

function CornerFan({ corner, size = 64, rays = 6 }: { corner: Corner; size?: number; rays?: number }) {
  const anchor = ANCHOR[corner](size);
  const startDeg = ANGLE_START[corner];

  const lines = Array.from({ length: rays }, (_, i) => {
    const deg = startDeg + (90 * i) / (rays - 1);
    const rad = (deg * Math.PI) / 180;
    return {
      x2: anchor.x + Math.cos(rad) * size,
      y2: anchor.y + Math.sin(rad) * size,
    };
  });

  return (
    <View style={[styles.corner, POSITION[corner], { width: size, height: size }]} pointerEvents="none">
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {lines.map((l, i) => (
          <Line
            key={i}
            x1={anchor.x}
            y1={anchor.y}
            x2={l.x2}
            y2={l.y2}
            stroke={artDeco.color.line}
            strokeWidth={1}
            opacity={0.5}
          />
        ))}
        <Circle
          cx={anchor.x}
          cy={anchor.y}
          r={5}
          fill="none"
          stroke={artDeco.color.line}
          strokeWidth={1}
          opacity={0.6}
        />
      </Svg>
    </View>
  );
}

export function ArtDecoBackground({ corners = true }: { corners?: boolean }) {
  const { width } = useWindowDimensions();
  const lineCount = 14;
  const gap = width / lineCount;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: artDeco.color.bg }]} />
      {Array.from({ length: lineCount + 1 }, (_, i) => (
        <View
          key={i}
          style={[styles.verticalLine, { left: i * gap, opacity: i % 2 === 0 ? 0.055 : 0.03 }]}
        />
      ))}
      {corners && (
        <>
          <CornerFan corner="tl" />
          <CornerFan corner="tr" />
          <CornerFan corner="bl" />
          <CornerFan corner="br" />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  verticalLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: artDeco.color.line,
  },
  corner: {
    position: 'absolute',
  },
});
