import { Component, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { recordCrash } from '../lib/crashLog';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Wraps the whole app (see App.tsx) so a render-time error in any one
// screen shows a recoverable fallback instead of the app vanishing --
// which is what a partner report of "sering force close" looks like from
// the outside when there's no way to attach a debugger. React error
// boundaries only catch errors thrown during render/lifecycle of their
// child tree; errors from timers, event handlers, and promise callbacks
// never reach this and are instead caught by index.ts's ErrorUtils global
// handler. Both funnel into the same persisted log (crashLog.ts) so
// AdvancedSettingsScreen can show either kind after the fact.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    recordCrash({
      message: error.message,
      stack: info.componentStack ?? error.stack ?? null,
      isFatal: false,
      source: 'boundary',
      screen: null,
    });
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Ada masalah</Text>
          <Text style={styles.message}>
            MichSya mengalami kendala teknis. Tenang, tidak ada data yang hilang.
          </Text>
          <Pressable style={styles.button} onPress={this.reset}>
            <Text style={styles.buttonText}>Coba Lagi</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 32,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  message: {
    fontSize: 14,
    color: '#767676',
    textAlign: 'center',
  },
  button: {
    marginTop: 12,
    backgroundColor: '#e11d74',
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
