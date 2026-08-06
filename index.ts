import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import './src/lib/backgroundLocation';
import './src/lib/backgroundNotifications';
import './src/lib/onThisDay';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
