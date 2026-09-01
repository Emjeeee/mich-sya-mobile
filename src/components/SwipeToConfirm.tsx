import { BlurView } from 'expo-blur';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Pixel } from './ui/pixel-icons';
import { artDeco } from '../theme/artDecoTokens';
import { useGlassBlurProps } from '../theme/components/LiquidGlassRoot';
import { liquidGlass } from '../theme/liquidGlassTokens';
import { useAppTheme } from '../theme/ThemeContext';

const KNOB_SIZE = 56;
const TRACK_PADDING = 4;
const CONFIRM_THRESHOLD = 0.7;

interface SwipeToConfirmProps {
  label: string;
  color: string;
  onConfirm: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function SwipeToConfirm({
  label,
  color,
  onConfirm,
  disabled = false,
  loading = false,
}: SwipeToConfirmProps) {
  const { isArtDeco, isLiquidGlass } = useAppTheme();
  const blurProps = useGlassBlurProps();
  const [trackWidth, setTrackWidth] = useState(0);
  const pan = useRef(new Animated.Value(0)).current;
  const maxTranslateRef = useRef(0);
  const isLocked = disabled || loading;
  const wasLoadingRef = useRef(loading);

  // If the caller's onConfirm action fails (e.g. a network error), it sets
  // `loading` back to false without the screen unmounting -- previously
  // nothing reset `pan`, so the knob stayed visually pinned at the "done"
  // end of the track. One caller (HomeScreen.tsx's "Akhiri kencan") worked
  // around this with a remount-via-key trick, but "Mulai kencan" didn't, so
  // a failed start left the knob stuck and the next touch would jump
  // instead of tracking the finger (pan's internal value was still `max`).
  useEffect(() => {
    if (wasLoadingRef.current && !loading) {
      Animated.spring(pan, { toValue: 0, useNativeDriver: false, bounciness: 8 }).start();
    }
    wasLoadingRef.current = loading;
  }, [loading, pan]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    setTrackWidth(width);
    maxTranslateRef.current = Math.max(0, width - KNOB_SIZE - TRACK_PADDING * 2);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isLocked,
      onMoveShouldSetPanResponder: () => !isLocked,
      onPanResponderMove: (_, gestureState) => {
        const clamped = Math.max(0, Math.min(gestureState.dx, maxTranslateRef.current));
        pan.setValue(clamped);
      },
      onPanResponderRelease: (_, gestureState) => {
        const max = maxTranslateRef.current;
        if (max > 0 && gestureState.dx >= max * CONFIRM_THRESHOLD) {
          Animated.timing(pan, {
            toValue: max,
            duration: 120,
            useNativeDriver: false,
          }).start(() => onConfirm());
        } else {
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: false,
            bounciness: 8,
          }).start();
        }
      },
    })
  ).current;

  const labelOpacity =
    trackWidth > 0
      ? pan.interpolate({
          inputRange: [0, maxTranslateRef.current || 1],
          outputRange: [1, 0],
          extrapolate: 'clamp',
        })
      : 1;

  return (
    <View
      style={[
        styles.track,
        { borderColor: color },
        isArtDeco && deco.track,
        isLiquidGlass && glass.track,
        isLocked && styles.trackDisabled,
      ]}
      onLayout={handleLayout}
    >
      {/* Real frosted glass behind the track -- absolute-fill siblings
          rendered before the label/knob so they paint underneath, same
          layering GlassSurface.tsx uses. Not using GlassSurface itself here
          since the track's existing children (Animated label + Animated
          knob) already share this View's padded box and don't need
          splitting into a separate content layer. */}
      {isLiquidGlass && (
        <>
          <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} {...blurProps} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: liquidGlass.color.glassPanelWash }]} />
        </>
      )}
      <Animated.Text style={[styles.label, { color, opacity: labelOpacity }, isLiquidGlass && glass.label]}>
        {label}
      </Animated.Text>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.knob,
          { backgroundColor: color, transform: [{ translateX: pan }] },
          isArtDeco && deco.knob,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={isArtDeco ? artDeco.color.black : '#fff'} />
        ) : (
          <Pixel
            name="chevronRight"
            size={24}
            color={isArtDeco ? artDeco.color.black : '#fff'}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    alignSelf: 'stretch',
    height: KNOB_SIZE + TRACK_PADDING * 2,
    borderRadius: (KNOB_SIZE + TRACK_PADDING * 2) / 2,
    borderWidth: 1.5,
    justifyContent: 'center',
    padding: TRACK_PADDING,
    backgroundColor: '#fff',
  },
  trackDisabled: {
    opacity: 0.6,
  },
  label: {
    position: 'absolute',
    alignSelf: 'center',
    fontSize: 15,
    fontWeight: '600',
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const deco = StyleSheet.create({
  track: {
    borderRadius: artDeco.radius.none,
    backgroundColor: artDeco.color.surface,
  },
  knob: {
    borderRadius: artDeco.radius.none,
  },
});

const glass = StyleSheet.create({
  track: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderColor: liquidGlass.color.glassPanelBorder,
  },
  label: {
    color: liquidGlass.color.ink2,
  },
});
