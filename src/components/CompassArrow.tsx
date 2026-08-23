import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polygon } from 'react-native-svg';

import { bearingDegrees, distanceMeters, formatDistance, proximityStatus } from '../lib/geo';
import { artDeco } from '../theme/artDecoTokens';
import { useAppTheme } from '../theme/ThemeContext';

interface CompassArrowProps {
  myLocation: { lat: number; lng: number } | null;
  partnerLocation: { lat: number; lng: number } | null;
}

const STATUS_LABEL: Record<string, string> = {
  bersama: 'Bersama 💕',
  berdekatan: 'Berdekatan',
  jauh: 'Jauh',
};

// Cheap magnetometers (older/budget devices) produce noisy raw heading readings
// that make the arrow visibly jitter even when roughly pointing the right way --
// average the last few readings (circular mean, since heading wraps at 360) to
// smooth that out. This can't fix genuine sensor bias, just the jitter.
const HEADING_SAMPLE_SIZE = 5;
const LOW_ACCURACY_THRESHOLD = 1;

function circularMeanDegrees(samples: number[]): number {
  const sumSin = samples.reduce((sum, deg) => sum + Math.sin((deg * Math.PI) / 180), 0);
  const sumCos = samples.reduce((sum, deg) => sum + Math.cos((deg * Math.PI) / 180), 0);
  const meanRad = Math.atan2(sumSin / samples.length, sumCos / samples.length);
  return ((meanRad * 180) / Math.PI + 360) % 360;
}

export default function CompassArrow({ myLocation, partnerLocation }: CompassArrowProps) {
  const { isArtDeco } = useAppTheme();
  const [deviceHeading, setDeviceHeading] = useState(0);
  const [headingAccuracy, setHeadingAccuracy] = useState<number | null>(null);
  const rotation = useRef(new Animated.Value(0)).current;
  const recentHeadings = useRef<number[]>([]);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return;
      subscription = await Location.watchHeadingAsync((heading) => {
        const raw = heading.trueHeading >= 0 ? heading.trueHeading : heading.magHeading;
        const samples = recentHeadings.current;
        samples.push(raw);
        if (samples.length > HEADING_SAMPLE_SIZE) samples.shift();

        setDeviceHeading(circularMeanDegrees(samples));
        setHeadingAccuracy(heading.accuracy);
      });
    })();
    return () => subscription?.remove();
  }, []);

  const hasPartner = Boolean(myLocation && partnerLocation);
  const bearing = hasPartner ? bearingDegrees(myLocation!, partnerLocation!) : 0;
  const distance = hasPartner ? distanceMeters(myLocation!, partnerLocation!) : null;
  const status = distance !== null ? proximityStatus(distance) : null;
  const targetRotation = (((bearing - deviceHeading) % 360) + 360) % 360;

  useEffect(() => {
    Animated.timing(rotation, {
      toValue: targetRotation,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [targetRotation, rotation]);

  if (!hasPartner) {
    return (
      <View style={styles.container}>
        <View style={[styles.compassCircle, styles.compassCircleIdle, isArtDeco && deco.compassCircle, isArtDeco && deco.compassCircleIdle]}>
          <Ionicons name="compass-outline" size={56} color={isArtDeco ? artDeco.color.gold : '#f3c9d9'} />
        </View>
        <Text style={[styles.waitingText, isArtDeco && deco.waitingText]}>
          Menunggu pasangan buka Cari Pasangan juga...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.compassCircle, isArtDeco && deco.compassCircle]}>
        <View style={[styles.tick, styles.tickTop, isArtDeco && deco.tick]} />
        <View style={[styles.tick, styles.tickRight, isArtDeco && deco.tick]} />
        <View style={[styles.tick, styles.tickBottom, isArtDeco && deco.tick]} />
        <View style={[styles.tick, styles.tickLeft, isArtDeco && deco.tick]} />

        <Animated.View
          style={[
            styles.arrow,
            {
              transform: [
                {
                  // A previous fix compensated for Ionicons' "navigate" glyph
                  // not pointing straight up by default (tip at bearing
                  // 45°/NE, confirmed from its SVG path) -- that offset still
                  // didn't fully resolve reported direction inaccuracy, which
                  // left the icon's *exact* bundled orientation as one
                  // remaining unknown (the compensation was derived from the
                  // ionicons GitHub source, not necessarily byte-identical to
                  // whatever version is actually bundled in this font).
                  // Switching to a custom-drawn SVG triangle removes that
                  // uncertainty entirely: the coordinates below are authored
                  // here, so "points straight up at rotate(0deg)" is true by
                  // construction, not by inference -- no compensation offset
                  // needed. Any remaining inaccuracy is now isolated to the
                  // bearing/heading math or device sensor conditions, not
                  // icon rendering.
                  rotate: rotation.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        >
          <Svg width={76} height={76} viewBox="0 0 24 24">
            <Polygon points="12,1 19,21 12,16 5,21" fill={isArtDeco ? artDeco.color.gold : '#e11d74'} />
          </Svg>
        </Animated.View>
      </View>
      <Text style={[styles.distanceText, isArtDeco && deco.distanceText]}>{formatDistance(distance!)}</Text>
      {status && <Text style={[styles.statusText, isArtDeco && deco.statusText]}>{STATUS_LABEL[status]}</Text>}
      <Text style={[styles.helperText, isArtDeco && deco.helperText]}>Panah menunjuk ke arah pasanganmu</Text>
      {headingAccuracy !== null && headingAccuracy <= LOW_ACCURACY_THRESHOLD && (
        <Text style={[styles.calibrationHint, isArtDeco && deco.calibrationHint]}>
          Kompas kurang akurat -- goyangkan HP membentuk angka 8 untuk kalibrasi.
        </Text>
      )}
    </View>
  );
}

const CIRCLE_SIZE = 240;
const TICK_LENGTH = 12;
const TICK_THICKNESS = 3;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  compassCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2,
    borderColor: '#fdeef4',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    shadowColor: '#e11d74',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  compassCircleIdle: {
    borderColor: '#f3d3e0',
  },
  tick: {
    position: 'absolute',
    backgroundColor: '#fbd6e5',
    borderRadius: TICK_THICKNESS / 2,
  },
  tickTop: {
    top: 8,
    width: TICK_THICKNESS,
    height: TICK_LENGTH,
  },
  tickBottom: {
    bottom: 8,
    width: TICK_THICKNESS,
    height: TICK_LENGTH,
  },
  tickLeft: {
    left: 8,
    width: TICK_LENGTH,
    height: TICK_THICKNESS,
  },
  tickRight: {
    right: 8,
    width: TICK_LENGTH,
    height: TICK_THICKNESS,
  },
  arrow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  distanceText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
  },
  statusText: {
    fontSize: 15,
    color: '#e11d74',
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: '#767676',
  },
  calibrationHint: {
    fontSize: 12,
    color: '#c0392b',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
  },
  waitingText: {
    color: '#767676',
    textAlign: 'center',
    paddingHorizontal: 24,
    marginTop: 12,
  },
});

const deco = StyleSheet.create({
  compassCircle: {
    borderColor: artDeco.color.line,
    backgroundColor: artDeco.color.surface,
    shadowOpacity: 0,
  },
  compassCircleIdle: {
    borderColor: artDeco.color.lineSoft,
  },
  tick: {
    backgroundColor: artDeco.color.gold,
  },
  distanceText: {
    color: artDeco.color.ink,
    fontFamily: artDeco.font.serifBold,
  },
  statusText: {
    color: artDeco.color.gold,
  },
  helperText: {
    color: artDeco.color.muted,
  },
  calibrationHint: {
    color: artDeco.color.stop,
  },
  waitingText: {
    color: artDeco.color.muted,
  },
});
