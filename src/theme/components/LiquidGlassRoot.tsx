// Real (not faked) blur on Android needs more than <BlurView> alone.
// expo-blur's `blurMethod` defaults to `'none'` on Android, which -- per
// its own type docs -- "Renders a semi-transparent view instead of
// rendering a blur effect." Every BlurView in this app was relying on that
// default, so none of the "glass" panels were ever actually blurring
// anything on Android -- just a flat translucent tint, which is why the
// theme didn't read as "glassy". The real methods (`dimezisBlurView` /
// `dimezisBlurViewSdk31Plus`) need a `blurTarget`: a ref to the View
// subtree to sample pixels from, since Android has no OS-level "blur
// whatever is behind me" primitive the way iOS does.
//
// Rather than threading a ref through every glass component's props, one
// `<LiquidGlassRoot>` wraps a screen's whole background+content once, and
// every BlurView on that screen reads the ref back out via
// `useGlassBlurProps()`. Wrap the OUTERMOST container of a glass screen in
// this (background + scrollable content, glass panels included -- nesting
// is fine, this mirrors how iOS's own UIVisualEffectView works: it blurs
// whatever was rendered behind it at that point, not a separate pass).
import { BlurTargetView } from 'expo-blur';
import { createContext, useContext, useRef, type ReactNode, type RefObject } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

const BlurTargetContext = createContext<RefObject<View | null> | null>(null);

export function LiquidGlassRoot({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const ref = useRef<View>(null);
  return (
    <BlurTargetContext.Provider value={ref}>
      <BlurTargetView ref={ref} style={[{ flex: 1 }, style]}>
        {children}
      </BlurTargetView>
    </BlurTargetContext.Provider>
  );
}

// Spread this onto every <BlurView>'s props. Safe with no <LiquidGlassRoot>
// ancestor (e.g. a glass component rendered somewhere not yet wrapped) --
// expo-blur itself falls back to 'none' (a plain tint, not a crash) when a
// dimezis method is requested without a blurTarget.
export function useGlassBlurProps() {
  const blurTarget = useContext(BlurTargetContext);
  return {
    blurMethod: 'dimezisBlurViewSdk31Plus' as const,
    blurTarget: blurTarget ?? undefined,
  };
}
