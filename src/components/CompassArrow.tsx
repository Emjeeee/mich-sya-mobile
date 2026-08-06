import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { bearingDegrees, distanceMeters, formatDistance, proximityStatus } from '../lib/geo';

interface CompassArrowProps {
  myLocation: { lat: number; lng: number } | null;
  partnerLocation: { lat: number; lng: number } | null;
}

const STATUS_LABEL: Record<string, string> = {
  bersama: 'Bersama 💕',
  berdekatan: 'Berdekatan',
  jauh: 'Jauh',
};

export default function CompassArrow({ myLocation, partnerLocation }: CompassArrowProps) {
  const [deviceHeading, setDeviceHeading] = useState(0);
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return;
      subscription = await Location.watchHeadingAsync((heading) => {
        setDeviceHeading(heading.trueHeading >= 0 ? heading.trueHeading : heading.magHeading);
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
        <View style={[styles.compassCircle, styles.compassCircleIdle]}>
          <Ionicons name="compass-outline" size={56} color="#f3c9d9" />
        </View>
        <Text style={styles.waitingText}>Menunggu pasangan buka Cari Pasangan juga...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.compassCircle}>
        <View style={[styles.tick, styles.tickTop]} />
        <View style={[styles.tick, styles.tickRight]} />
        <View style={[styles.tick, styles.tickBottom]} />
        <View style={[styles.tick, styles.tickLeft]} />

        <Animated.View
          style={[
            styles.arrow,
            {
              transform: [
                {
                  rotate: rotation.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons name="navigate" size={76} color="#e11d74" />
        </Animated.View>
      </View>
      <Text style={styles.distanceText}>{formatDistance(distance!)}</Text>
      {status && <Text style={styles.statusText}>{STATUS_LABEL[status]}</Text>}
      <Text style={styles.helperText}>Panah menunjuk ke arah pasanganmu</Text>
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
    color: '#999',
  },
  waitingText: {
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 24,
    marginTop: 12,
  },
});
