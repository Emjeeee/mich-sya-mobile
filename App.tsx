import notifee, { EventType } from '@notifee/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as QuickActions from 'expo-quick-actions';
import type { Session } from '@supabase/supabase-js';

import { startBleRingListener } from './src/lib/bleRing';
import { flushPendingMemories } from './src/lib/offlineQueue';
import { checkOnThisDayNow } from './src/lib/onThisDay';
import { subscribeRingSignal } from './src/lib/ringSignal';
import { supabase } from './src/lib/supabase';
import { refreshWidget } from './src/lib/widget';
import type { RootStackParamList } from './src/navigation/types';
import ArcadeScreen from './src/screens/ArcadeScreen';
import GameScreen from './src/screens/GameScreen';
import RingAlertScreen from './src/screens/RingAlertScreen';
import SignInScreen from './src/screens/SignInScreen';
import HomeScreen from './src/screens/HomeScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [ringActive, setRingActive] = useState(false);

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
    // Arms the always-on Bluetooth ring listener so "Bunyikan HP pasangan"
    // works even without internet -- see src/lib/bleRing.ts.
    startBleRingListener();
  }, []);

  useEffect(() => {
    // AppState 'change' doesn't fire on the very first cold launch, so also run once on mount.
    flushPendingMemories();
    checkOnThisDayNow();
    refreshWidget().catch(() => {});

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        flushPendingMemories();
        checkOnThisDayNow();
        refreshWidget().catch(() => {});
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // Cold start (app was killed): the notifee full-screen intent already
    // launched this activity for a 'ring' notification -- pick that up here.
    notifee.getInitialNotification().then((initial) => {
      if (initial?.notification.data?.type === 'ring') setRingActive(true);
    });

    // App already alive (foreground or backgrounded): the background
    // notification task notifies this directly since Android suppresses the
    // full-screen intent while the app isn't in the foreground on an unlocked
    // device -- see src/lib/ringSignal.ts.
    const unsubscribeRingSignal = subscribeRingSignal(() => setRingActive(true));

    const unsubscribeForeground = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.DELIVERED && detail.notification?.data?.type === 'ring') {
        setRingActive(true);
      }
    });

    return () => {
      unsubscribeRingSignal();
      unsubscribeForeground();
    };
  }, []);

  if (ringActive) {
    return (
      <GestureHandlerRootView style={styles.flex}>
        <SafeAreaProvider>
          <RingAlertScreen onDismiss={() => setRingActive(false)} />
          <StatusBar style="light" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {session ? (
              <>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Arcade" component={ArcadeScreen} />
                <Stack.Screen name="Game" component={GameScreen} />
              </>
            ) : (
              <Stack.Screen name="SignIn" component={SignInScreen} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
