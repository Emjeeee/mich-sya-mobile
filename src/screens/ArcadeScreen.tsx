import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pixel } from '../components/ui/pixel-icons';
import { GAMES } from '../lib/games/registry';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Arcade'>;

// Ports the web app's ArcadePage.tsx -- a grid of every game in the registry.
export default function ArcadeScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { coupleId } = route.params;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>‹ Kembali</Text>
        </Pressable>
        <Text style={styles.title}>Arcade Room</Text>
        <Text style={styles.subtitle}>{GAMES.length} mini game buat seru-seruan berdua</Text>
      </View>

      <FlatList
        data={GAMES}
        keyExtractor={(g) => g.key}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('Game', { gameKey: item.key, coupleId })}
          >
            <Pixel name={item.icon} size={32} />
            <View style={styles.cardText}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {item.hasOnline && (
                  <View style={styles.onlineBadge}>
                    <Text style={styles.onlineBadgeText}>ONLINE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardDescription}>{item.description}</Text>
            </View>
          </Pressable>
        )}
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
