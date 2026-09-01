import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pixel } from '../components/ui/pixel-icons';
import { GAMES } from '../lib/games/registry';
import type { RootStackParamList } from '../navigation/types';
import { artDeco } from '../theme/artDecoTokens';
import { ArtDecoBackground } from '../theme/components/ArtDecoBackground';
import { DiamondMarker } from '../theme/components/DiamondMarker';
import { GlassSurface } from '../theme/components/GlassSurface';
import { LiquidGlassBackground } from '../theme/components/LiquidGlassBackground';
import { liquidGlass } from '../theme/liquidGlassTokens';
import { useAppTheme } from '../theme/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Arcade'>;

// Ports the web app's ArcadePage.tsx -- a grid of every game in the registry.
export default function ArcadeScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { isArtDeco, isLiquidGlass } = useAppTheme();
  const { coupleId } = route.params;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
        isArtDeco && deco.container,
        isLiquidGlass && glass.container,
      ]}
    >
      {isArtDeco && <ArtDecoBackground />}
      {isLiquidGlass && <LiquidGlassBackground variant="warm" />}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={[styles.backLink, isArtDeco && deco.backLink, isLiquidGlass && glass.backLink]}>
            ‹ Kembali
          </Text>
        </Pressable>
        <Text style={[styles.title, isArtDeco && deco.title, isLiquidGlass && glass.title]}>Arcade Room</Text>
        <Text style={[styles.subtitle, isArtDeco && deco.subtitle, isLiquidGlass && glass.subtitle]}>
          {GAMES.length} mini game buat seru-seruan berdua
        </Text>
      </View>

      <FlatList
        data={GAMES}
        keyExtractor={(g) => g.key}
        contentContainerStyle={styles.list}
        renderItem={({ item }) =>
          isLiquidGlass ? (
            <Pressable onPress={() => navigation.navigate('Game', { gameKey: item.key, coupleId })}>
              <GlassSurface contentStyle={glass.cardContent} radius={liquidGlass.radius.card}>
                <Pixel name={item.icon} size={32} />
                <View style={styles.cardText}>
                  <View style={styles.cardTitleRow}>
                    <Text style={[styles.cardTitle, glass.cardTitle]}>{item.title}</Text>
                    {item.hasOnline && (
                      <View style={[styles.onlineBadge, glass.onlineBadge]}>
                        <Text style={[styles.onlineBadgeText, glass.onlineBadgeText]}>ONLINE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.cardDescription, glass.cardDescription]}>{item.description}</Text>
                </View>
              </GlassSurface>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.card, isArtDeco && deco.card]}
              onPress={() => navigation.navigate('Game', { gameKey: item.key, coupleId })}
            >
              {isArtDeco ? <DiamondMarker size={10} /> : <Pixel name={item.icon} size={32} />}
              <View style={styles.cardText}>
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.cardTitle, isArtDeco && deco.cardTitle]}>{item.title}</Text>
                  {item.hasOnline && (
                    <View style={[styles.onlineBadge, isArtDeco && deco.onlineBadge]}>
                      <Text style={[styles.onlineBadgeText, isArtDeco && deco.onlineBadgeText]}>
                        ONLINE
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.cardDescription, isArtDeco && deco.cardDescription]}>
                  {item.description}
                </Text>
              </View>
            </Pressable>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 12,
  },
  backLink: {
    color: '#666',
    fontWeight: '600',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e11d74',
  },
  subtitle: {
    fontSize: 13,
    color: '#767676',
    marginTop: 2,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    flexDirection: 'row',
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fdeef4',
    backgroundColor: '#fff',
    padding: 16,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  onlineBadge: {
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  onlineBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#3b82f6',
  },
  cardDescription: {
    fontSize: 13,
    color: '#767676',
  },
});

const deco = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  backLink: {
    color: artDeco.color.muted,
  },
  title: {
    color: artDeco.color.gold,
    fontFamily: artDeco.font.display,
    letterSpacing: artDeco.letterSpacingWide,
  },
  subtitle: {
    color: artDeco.color.muted,
    fontFamily: artDeco.font.serifRegular,
  },
  card: {
    borderRadius: artDeco.radius.none,
    borderWidth: 1.5,
    borderColor: artDeco.color.line,
    backgroundColor: artDeco.color.surface,
  },
  cardTitle: {
    color: artDeco.color.ink,
    fontFamily: artDeco.font.serifBold,
  },
  cardDescription: {
    color: artDeco.color.muted,
  },
  onlineBadge: {
    backgroundColor: artDeco.color.rubySoft,
    borderRadius: artDeco.radius.none,
    borderWidth: 1,
    borderColor: artDeco.color.ruby,
  },
  onlineBadgeText: {
    color: artDeco.color.rubyStrong,
  },
});

const glass = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  backLink: {
    color: liquidGlass.color.muted,
  },
  title: {
    color: liquidGlass.color.accentText,
  },
  subtitle: {
    color: liquidGlass.color.inkSoft,
  },
  cardContent: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  cardTitle: {
    color: liquidGlass.color.ink2,
  },
  cardDescription: {
    color: liquidGlass.color.muted,
  },
  onlineBadge: {
    backgroundColor: 'rgba(59,130,246,0.16)',
  },
  onlineBadgeText: {
    color: '#3b82f6',
  },
});
