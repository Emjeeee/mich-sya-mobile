import { StyleSheet, Text, View } from 'react-native';

import { useGameScores } from '../../hooks/useGameScores';
import type { ScoreMode } from '../../lib/games/types';
import { artDeco } from '../../theme/artDecoTokens';
import { useAppTheme } from '../../theme/ThemeContext';

// Ported from the web app's Leaderboard.tsx. Uses static "Kamu"/"Pasangan"
// labels instead of the web's useCouple() nickname context, which this app
// doesn't have.
export function Leaderboard({
  coupleId,
  userId,
  gameKey,
  mode,
  sort = 'desc',
  unit = '',
}: {
  coupleId: string | null;
  userId: string | null;
  gameKey: string;
  mode: ScoreMode;
  sort?: 'asc' | 'desc';
  unit?: string;
}) {
  const { isArtDeco } = useAppTheme();
  const { data } = useGameScores(coupleId, gameKey);

  if (mode === 'none') return null;

  if (!data || data.length === 0) {
    return <Text style={[styles.empty, isArtDeco && deco.empty]}>Belum ada skor tercatat.</Text>;
  }

  if (mode === 'wins') {
    const myWins = data.filter((s) => s.winner_user_id === userId).length;
    const partnerWins = data.filter((s) => s.winner_user_id && s.winner_user_id !== userId).length;
    const draws = data.filter((s) => !s.winner_user_id).length;

    return (
      <View style={styles.winsRow}>
        <View style={styles.winsItem}>
          <Text style={[styles.winsValue, isArtDeco && deco.winsValue]}>{myWins}</Text>
          <Text style={[styles.winsLabel, isArtDeco && deco.winsLabel]}>Kamu</Text>
        </View>
        {draws > 0 && (
          <View style={styles.winsItem}>
            <Text style={[styles.winsValue, styles.drawValue, isArtDeco && deco.drawValue]}>{draws}</Text>
            <Text style={[styles.winsLabel, isArtDeco && deco.winsLabel]}>Seri</Text>
          </View>
        )}
        <View style={styles.winsItem}>
          <Text style={[styles.winsValue, styles.accentValue, isArtDeco && deco.accentValue]}>{partnerWins}</Text>
          <Text style={[styles.winsLabel, isArtDeco && deco.winsLabel]}>Pasangan</Text>
        </View>
      </View>
    );
  }

  // One row per player -- their personal best out of the fetched history --
  // not the top 5 individual play-throughs. The couple is exactly 2 people,
  // but ranking raw rounds could let one person's several attempts fill
  // most/all of the top 5 (a very active player still shows up multiple
  // times), which reads as "more than 2 players" even though every row is
  // still labeled either "Kamu" or "Pasangan". Aggregating first guarantees
  // at most 2 rows -- exactly what a 2-person leaderboard should show.
  const bestByUser = new Map<string, (typeof data)[number]>();
  for (const s of data) {
    if (s.score === null) continue;
    const key = s.user_id ?? 'unknown';
    const existing = bestByUser.get(key);
    const isBetter = !existing || (sort === 'asc' ? s.score! < existing.score! : s.score! > existing.score!);
    if (isBetter) bestByUser.set(key, s);
  }
  const sorted = [...bestByUser.values()].sort((a, b) =>
    sort === 'asc' ? a.score! - b.score! : b.score! - a.score!
  );

  if (sorted.length === 0) {
    return <Text style={[styles.empty, isArtDeco && deco.empty]}>Belum ada skor tercatat.</Text>;
  }

  return (
    <View style={styles.list}>
      {sorted.map((s, i) => (
        <View key={s.id} style={styles.listRow}>
          <Text style={[styles.listLabel, isArtDeco && deco.listLabel]}>
            #{i + 1} {s.user_id === userId ? 'Kamu' : 'Pasangan'}
          </Text>
          <Text style={[styles.listValue, isArtDeco && deco.listValue]}>
            {s.score}
            {unit}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    textAlign: 'center',
    fontSize: 12,
    color: '#767676',
  },
  winsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  winsItem: {
    alignItems: 'center',
  },
  winsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e11d74',
  },
  drawValue: {
    color: '#767676',
  },
  accentValue: {
    color: '#3b82f6',
  },
  winsLabel: {
    fontSize: 11,
    color: '#767676',
  },
  list: {
    gap: 6,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listLabel: {
    fontSize: 13,
    color: '#767676',
  },
  listValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
});

const deco = StyleSheet.create({
  empty: {
    color: artDeco.color.muted,
  },
  winsValue: {
    color: artDeco.color.gold,
  },
  drawValue: {
    color: artDeco.color.muted,
  },
  accentValue: {
    color: artDeco.color.ruby,
  },
  winsLabel: {
    color: artDeco.color.muted,
  },
  listLabel: {
    color: artDeco.color.muted,
  },
  listValue: {
    color: artDeco.color.ink,
    fontFamily: artDeco.font.serifBold,
  },
});
