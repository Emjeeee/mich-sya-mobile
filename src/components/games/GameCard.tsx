import { StyleSheet, View, type ViewProps } from 'react-native';

import { artDeco } from '../../theme/artDecoTokens';
import { GlassSurface } from '../../theme/components/GlassSurface';
import { liquidGlass } from '../../theme/liquidGlassTokens';
import { useAppTheme } from '../../theme/ThemeContext';

// Shared visual wrapper for game UI sections, matching the card style used
// elsewhere in the app (e.g. DateRecapModal's card).
export function GameCard({ style, children, ...props }: ViewProps) {
  const { isArtDeco, isLiquidGlass } = useAppTheme();

  if (isLiquidGlass) {
    // GlassSurface's own layering (blur/wash/border as absolute-fill,
    // content as a separate padded layer) already matches this card's
    // padding/gap -- reuse it wholesale rather than hand-rolling the same
    // thing again. Every call site only ever passes `style` (see the game
    // files that use GameCard), so no other ViewProps need forwarding here.
    return (
      <GlassSurface style={style} contentStyle={glass.content} radius={liquidGlass.radius.card}>
        {children}
      </GlassSurface>
    );
  }

  return (
    <View style={[styles.card, isArtDeco && deco.card, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fdeef4',
    gap: 12,
  },
});

const deco = StyleSheet.create({
  card: {
    backgroundColor: artDeco.color.surface,
    borderRadius: artDeco.radius.none,
    borderWidth: 1.5,
    borderColor: artDeco.color.line,
  },
});

const glass = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
  },
});
