import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import { recordCrash } from './src/lib/crashLog';
import './src/lib/autoDate';
import './src/lib/backgroundLocation';
import './src/lib/backgroundNotifications';
import './src/lib/onThisDay';
import './widget-task-handler';
import App from './App';

// Partner reports of the app "force closing" with no device access to
// reproduce it on -- this can't fix the underlying bug blind, but it turns
// every future crash into a message either of us can read from
// AdvancedSettingsScreen (see crashLog.ts's getCrashLog) instead of a
// silent app-vanishes-with-no-trace event. Only catches errors that reach
// React Native's global handler (JS thread exceptions outside a render
// pass -- timers, event handlers, promise callbacks); render-time errors
// are caught separately by the ErrorBoundary in App.tsx. Always re-throws
// to the original handler afterward -- this must never change whether or
// how the app actually crashes, only log before it does.
const originalHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  const written = recordCrash({
    message: error?.message ?? String(error),
    stack: error?.stack ?? null,
    isFatal: !!isFatal,
    source: 'global',
    screen: null,
  });
  if (!isFatal) {
    originalHandler(error, isFatal);
    return;
  }
  // The AsyncStorage write is async -- give it a moment to land before the
  // fatal handler tears the process down.
  let called = false;
  const proceed = () => {
    if (called) return;
    called = true;
    originalHandler(error, isFatal);
  };
  setTimeout(proceed, 500);
  written.then(proceed, proceed);
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
