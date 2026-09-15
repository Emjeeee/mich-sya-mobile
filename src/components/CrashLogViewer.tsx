import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { clearCrashLog, getCrashLog, type CrashEntry } from '../lib/crashLog';
import { artDeco } from '../theme/artDecoTokens';
import { liquidGlass } from '../theme/liquidGlassTokens';
import { useAppTheme } from '../theme/ThemeContext';

// Self-hides when there's nothing to show -- renders on BOTH accounts
// (unlike RemoteControlAccess/Panel) since a crash log lives on whichever
// device actually crashed, and there's no way to know in advance which
// account that'll be. Exists so a partner report of "the app force closes"
// leaves a trace either of us can read from inside the app itself, without
// needing adb/a PC connected to the device that crashed -- see
// src/lib/crashLog.ts and the global handler installed in index.ts /
// ErrorBoundary.tsx.
export default function CrashLogViewer() {
  const { isArtDeco, isLiquidGlass } = useAppTheme();
  const [entries, setEntries] = useState<CrashEntry[]>([]);

  const refresh = useCallback(() => {
    getCrashLog().then(setEntries);
  }, []);

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  if (entries.length === 0) return null;

  const handleClear = () => {
    clearCrashLog().then(refresh);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, isArtDeco && deco.title, isLiquidGlass && glass.title]}>
          Riwayat error terakhir
        </Text>
        <Pressable onPress={handleClear} hitSlop={8}>
          <Text style={[styles.clear, isArtDeco && deco.clear, isLiquidGlass && glass.clear]}>Hapus</Text>
        </Pressable>
      </View>
      {entries.map((entry, i) => (
        <View key={i} style={[styles.entry, isArtDeco && deco.entry, isLiquidGlass && glass.entry]}>
          <Text style={[styles.entryMeta, isArtDeco && deco.entryMeta, isLiquidGlass && glass.entryMeta]}>
            {new Date(entry.timestamp).toLocaleString('id-ID')} ({entry.source}
            {entry.isFatal ? ', fatal' : ''})
          </Text>
          <Text style={[styles.entryMessage, isArtDeco && deco.entryMessage, isLiquidGlass && glass.entryMessage]}>
            {entry.message}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#767676',
  },
  clear: {
    fontSize: 12,
    fontWeight: '600',
    color: '#c0392b',
  },
  entry: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fafafa',
    padding: 10,
    gap: 2,
  },
  entryMeta: {
    fontSize: 10,
    color: '#999',
  },
  entryMessage: {
    fontSize: 12,
    color: '#333',
  },
});

const deco = StyleSheet.create({
  title: {
    color: artDeco.color.muted,
  },
  clear: {
    color: artDeco.color.ruby,
  },
  entry: {
    borderRadius: artDeco.radius.none,
    borderColor: artDeco.color.lineSoft,
    backgroundColor: artDeco.color.surface2,
  },
  entryMeta: {
    color: artDeco.color.muted,
  },
  entryMessage: {
    color: artDeco.color.ink,
  },
});

const glass = StyleSheet.create({
  title: {
    color: liquidGlass.color.muted,
  },
  clear: {
    color: '#a8434a',
  },
  entry: {
    borderRadius: liquidGlass.radius.control,
    borderColor: liquidGlass.color.glassChipBorder,
    backgroundColor: liquidGlass.color.glassChipWash,
  },
  entryMeta: {
    color: liquidGlass.color.muted,
  },
  entryMessage: {
    color: liquidGlass.color.ink2,
  },
});
