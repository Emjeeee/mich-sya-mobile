// App-wide theme switch between the original design and the new Art Deco
// design. Purely additive: original screens keep their hardcoded styles
// untouched, and only apply `deco` overrides when `isArtDeco` is true (see
// src/theme/THEMING_GUIDE.md). Switching back to "Klasik" is instant and
// lossless because nothing about the original styling is ever removed.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { artDecoFontMap } from './fonts';

export type ThemeName = 'original' | 'artdeco';

const STORAGE_KEY = 'michsya:themeName';

interface ThemeContextValue {
  themeName: ThemeName;
  isArtDeco: boolean;
  setThemeName: (name: ThemeName) => void;
  ready: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeNameState] = useState<ThemeName>('original');
  const [storageReady, setStorageReady] = useState(false);
  const [fontsLoaded] = useFonts(artDecoFontMap);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (value === 'artdeco' || value === 'original') setThemeNameState(value);
      })
      .finally(() => setStorageReady(true));
  }, []);

  const setThemeName = (name: ThemeName) => {
    setThemeNameState(name);
    AsyncStorage.setItem(STORAGE_KEY, name).catch(() => {});
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeName,
      isArtDeco: themeName === 'artdeco',
      setThemeName,
      ready: storageReady && fontsLoaded,
    }),
    [themeName, storageReady, fontsLoaded]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within a ThemeProvider');
  return ctx;
}
