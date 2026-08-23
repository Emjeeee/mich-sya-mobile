// Font map for expo-font's useFonts(), loaded once in App.tsx. Kept in its own
// module so any screen can check `useAppTheme().fontsReady` without importing
// the (fairly large) font binaries itself.
import {
  CinzelDecorative_400Regular,
  CinzelDecorative_700Bold,
  CinzelDecorative_900Black,
} from '@expo-google-fonts/cinzel-decorative';
import {
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_600SemiBold_Italic,
  CormorantGaramond_700Bold,
} from '@expo-google-fonts/cormorant-garamond';

export const artDecoFontMap = {
  CinzelDecorative_400Regular,
  CinzelDecorative_700Bold,
  CinzelDecorative_900Black,
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_600SemiBold_Italic,
  CormorantGaramond_700Bold,
};
