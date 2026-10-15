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
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

const BlurTargetContext = createContext<RefObject<View | null> | null>(null);

export function LiquidGlassRoot({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const ref = useRef<View>(null);
  return (
    <BlurTargetContext.Provider value={ref}>
      <View style={[{ flex: 1 }, style]}>{children}</View>
    </BlurTargetContext.Provider>
  );
}

// The ONLY thing that may live inside the BlurTargetView is content with no
// BlurView in it (the screen's background art). expo-blur's Android blur is
// Dimezis BlurView 3.x, which draws the target into each BlurView's own
// RenderNode -- so a BlurView that is a DESCENDANT of its own target makes
// the target draw the BlurView which draws the target ... forever. On
// Android 12+ (where blur is actually enabled) that is an unbounded
// RenderNode::prepareTreeImpl recursion on RenderThread -> SIGSEGV stack
// overflow, i.e. an instant force close (seen on a Vivo V21 5G; the Samsung
// A9 never showed it because blur is disabled below API 31). Glass panels
// must therefore be SIBLINGS drawn after this, never children of it.
export function GlassBlurTarget({ children }: { children: ReactNode }) {
  const ref = useContext(BlurTargetContext);
  return (
    <BlurTargetView ref={ref ?? undefined} style={StyleSheet.absoluteFill} pointerEvents="none">
      {children}
    </BlurTargetView>
  );
}

// Spread this onto every <BlurView>'s props. Safe with no <LiquidGlassRoot>
// ancestor (e.g. a glass component rendered somewhere not yet wrapped) --
// expo-blur itself falls back to 'none' (a plain tint, not a crash) when a
// dimezis method is requested without a blurTarget.
//
// `blurReductionFactor` downsamples the target before blurring it --
// expo-blur's own default is 4; reported general app lag traced partly to
// real-time blur being one of the more expensive things a phone GPU does,
// especially stacked in several places on one screen (Home has 4-5 glass
// surfaces) or sitting beside something repainting frequently (Snake's
// board ticks every 160ms while running). Centralized here as one tunable
// instead of per BlurView so every glass surface in the app gets cheaper
// at once.
const BLUR_REDUCTION_FACTOR = 8;

export function useGlassBlurProps() {
  const blurTarget = useContext(BlurTargetContext);
  return {
    blurMethod: 'dimezisBlurViewSdk31Plus' as const,
    blurTarget: blurTarget ?? undefined,
    blurReductionFactor: BLUR_REDUCTION_FACTOR,
  };
}
