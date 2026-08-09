import { StyleSheet, Text, View } from 'react-native';

import { useGameScores } from '../../hooks/useGameScores';
import type { ScoreMode } from '../../lib/games/types';

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
  const { data } = useGameScores(coupleId, gameKey);

  if (mode === 'none') return null;

  if (!data || data.length === 0) {
    return <Text style={styles.empty}>Belum ada skor tercatat.</Text>;
  }

  if (mode === 'wins') {
    const myWins = data.filter((s) => s.winner_user_id === userId).length;
    const partnerWins = data.filter((s) => s.winner_user_id && s.winner_user_id !== userId).length;
    const draws = data.filter((s) => !s.winner_user_id).length;

    return (
      <View style={styles.winsRow}>
        <View style={styles.winsItem}>
          <Text style={styles.winsValue}>{myWins}</Text>
          <Text style={styles.winsLabel}>Kamu</Text>
        </View>
        {draws > 0 && (
          <View style={styles.winsItem}>
            <Text style={[styles.winsValue, styles.drawValue]}>{draws}</Text>
            <Text style={styles.winsLabel}>Seri</Text>
          </View>
        )}
        <View style={styles.winsItem}>
          <Text style={[styles.winsValue, styles.accentValue]}>{partnerWins}</Text>
          <Text style={styles.winsLabel}>Pasangan</Text>
        </View>
      </View>
    );
  }

  const sorted = [...data]
    .filter((s) => s.score !== null)
    .sort((a, b) => (sort === 'asc' ? a.score! - b.score! : b.score! - a.score!))
    .slice(0, 5);

  if (sorted.length === 0) {
    return <Text style={styles.empty}>Belum ada skor tercatat.</Text>;
  }

  return (
    <View style={styles.list}>
      {sorted.map((s, i) => (
        <View key={s.id} style={styles.listRow}>
          <Text style={styles.listLabel}>
            #{i + 1} {s.user_id === userId ? 'Kamu' : 'Pasangan'}
          </Text>
          <Text style={styles.listValue}>
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
    color: '#999',
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
    color: '#999',
  },
  accentValue: {
    color: '#3b82f6',
  },
  winsLabel: {
    fontSize: 11,
    color: '#999',
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
    color: '#999',
  },
  listValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
});
