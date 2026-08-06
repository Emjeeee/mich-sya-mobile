import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as QuickActions from 'expo-quick-actions';
import type { Session } from '@supabase/supabase-js';

import { flushPendingMemories } from './src/lib/offlineQueue';
import { checkOnThisDayNow } from './src/lib/onThisDay';
import { stopRingtone } from './src/lib/ringtone';
import { supabase } from './src/lib/supabase';
import SignInScreen from './src/screens/SignInScreen';
import HomeScreen from './src/screens/HomeScreen';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitializing(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    QuickActions.setItems([
      { id: 'start_date', title: 'Mulai Kencan', icon: 'favorite' },
      { id: 'ring_partner', title: 'Bunyikan HP Pasangan', icon: 'audio' },
    ]);
  }, []);

  useEffect(() => {
    // AppState 'change' doesn't fire on the very first cold launch, so also run once on mount.
    flushPendingMemories();
    checkOnThisDayNow();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        stopRingtone();
        flushPendingMemories();
        checkOnThisDayNow();
      }
    });
    return () => subscription.remove();
  }, []);

  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      {session ? <HomeScreen /> : <SignInScreen />}
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
