import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
// RNGH's ScrollView (not the plain react-native one) so it integrates with
// gesture-handler's own touch arbitration -- games with a Gesture.Pan()
// drag (e.g. Block Blast's tray pieces) were losing the touch mid-drag to
// this screen's ScrollView, since a plain RN ScrollView's native scroll
// recognizer competes with RNGH gestures for the same touch instead of
// negotiating with it.
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Leaderboard } from '../components/games/Leaderboard';
import { GAMES } from '../lib/games/registry';
import { supabase } from '../lib/supabase';
import type { RootStackParamList } from '../navigation/types';
import { artDeco } from '../theme/artDecoTokens';
import { ArtDecoBackground } from '../theme/components/ArtDecoBackground';
import { useAppTheme } from '../theme/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

// Combines the web app's GamePage.tsx (route -> registry lookup) and
// GameShell.tsx (header, Local/Online toggle, leaderboard visibility rule).
export default function GameScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { isArtDeco } = useAppTheme();
  const { gameKey, coupleId } = route.params;
  const game = GAMES.find((g) => g.key === gameKey);
  const [mode, setMode] = useState<'local' | 'online'>('local');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  if (!game) {
    return (
      <View style={[styles.container, isArtDeco && deco.container]}>
        {isArtDeco && <ArtDecoBackground />}
        <Text style={[styles.muted, isArtDeco && deco.backLink]}>Game tidak ditemukan.</Text>
      </View>
    );
  }

  const OnlineComponent = game.hasOnline ? game.OnlineComponent : undefined;
  const showOnline = !!OnlineComponent;

  // 'score' games record from local play too, so their leaderboard is always
  // relevant. 'wins' games' LocalComponents never record a score
  // (pass-and-play wins were never tracked), so keep it suppressed until
  // online mode -- same rule as the web version's GameShell.tsx.
  const showLeaderboard =
    game.implemented !== false &&
    (game.scoreMode === 'score' || (game.scoreMode === 'wins' && (!showOnline || mode === 'online')));

  return (
    <ScrollView
      style={[styles.container, isArtDeco && deco.container]}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
    >
      {isArtDeco && <ArtDecoBackground />}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={[styles.backLink, isArtDeco && deco.backLink]}>‹ Arcade Room</Text>
        </Pressable>
        <Text style={[styles.title, isArtDeco && deco.title]}>{game.title}</Text>
        <Text style={[styles.subtitle, isArtDeco && deco.subtitle]}>{game.description}</Text>
      </View>

      {showOnline && (
        <View style={styles.modeRow}>
          {(['local', 'online'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[
                styles.modeButton,
                isArtDeco && deco.modeButton,
                mode === m && styles.modeButtonActive,
                isArtDeco && mode === m && deco.modeButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  isArtDeco && deco.modeButtonText,
                  mode === m && styles.modeButtonTextActive,
                  isArtDeco && mode === m && deco.modeButtonTextActive,
                ]}
              >
                {m === 'local' ? '📱 Satu HP' : '🌐 Online'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.gameSlot}>
        {mode === 'online' && OnlineComponent ? (
          <OnlineComponent coupleId={coupleId} />
        ) : (
          <game.LocalComponent coupleId={coupleId} />
        )}
      </View>

      {showLeaderboard && (
        <View style={[styles.leaderboardCard, isArtDeco && deco.leaderboardCard]}>
          <Text style={[styles.leaderboardTitle, isArtDeco && deco.leaderboardTitle]}>Papan Skor</Text>
          <Leaderboard
            coupleId={coupleId}
            userId={userId}
            gameKey={game.key}
            mode={game.scoreMode}
            sort={game.scoreSort}
            unit={game.scoreUnit}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 16,
  },
  backLink: {
    color: '#666',
    fontWeight: '600',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  subtitle: {
    fontSize: 13,
    color: '#767676',
    marginTop: 2,
  },
  muted: {
    fontSize: 13,
    color: '#767676',
    textAlign: 'center',
    marginTop: 40,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  modeButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fdeef4',
  },
  modeButtonActive: {
    backgroundColor: '#e11d74',
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  gameSlot: {
    marginBottom: 16,
  },
  leaderboardCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fdeef4',
  },
  leaderboardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
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
  modeButton: {
    borderRadius: artDeco.radius.none,
    borderWidth: 1,
    borderColor: artDeco.color.line,
    backgroundColor: artDeco.color.surface,
  },
  modeButtonActive: {
    backgroundColor: artDeco.color.gold,
  },
  modeButtonText: {
    color: artDeco.color.ink,
  },
  modeButtonTextActive: {
    color: artDeco.color.black,
  },
  leaderboardCard: {
    backgroundColor: artDeco.color.surface,
    borderRadius: artDeco.radius.none,
    borderWidth: 1.5,
    borderColor: artDeco.color.line,
  },
  leaderboardTitle: {
    color: artDeco.color.gold,
    fontFamily: artDeco.font.serifBold,
  },
});
