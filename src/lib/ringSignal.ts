// Bridges the background notification task (backgroundNotifications.ts) to the
// mounted React tree (App.tsx) when a 'ring' push arrives while the app process
// is already alive (foreground or backgrounded) -- the notifee full-screen
// intent only covers the locked-screen/fully-killed case, since Android
// suppresses full-screen intents while the app isn't in the foreground on an
// unlocked device.
type Listener = () => void;
let listeners: Listener[] = [];

export function notifyRingSignal() {
  listeners.forEach((listener) => listener());
}

export function subscribeRingSignal(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
