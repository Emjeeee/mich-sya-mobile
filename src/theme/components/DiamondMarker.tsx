// A rotated square used everywhere the original design uses a round dot/bullet
// (active step indicators, list bullets, badges) -- Art Deco favors the
// diamond over the circle. See design-styles-reference.md ("marker chain
// berbentuk diamond, bukan lingkaran").
import { View, type ViewStyle } from 'react-native';

import { artDeco } from '../artDecoTokens';

export function DiamondMarker({
  size = 8,
  color = artDeco.color.gold,
  filled = true,
  style,
}: {
  size?: number;
  color?: string;
  filled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          backgroundColor: filled ? color : 'transparent',
          borderWidth: filled ? 0 : 1,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
        },
        style,
      ]}
    />
  );
}
