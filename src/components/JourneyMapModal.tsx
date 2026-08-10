import { useMemo } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useJourneyMap, type JourneyPin, type RoutePoint } from '../hooks/useJourneyMap';

interface JourneyMapModalProps {
  visible: boolean;
  coupleId: string;
  onClose: () => void;
}

// Jakarta -- only used if there's truly nothing to center on yet.
const FALLBACK_CENTER = { lat: -6.2, lng: 106.8 };

function buildMapHtml(pins: JourneyPin[], route: RoutePoint[]): string {
  const points = [...pins, ...route];
  const center =
    points.length > 0
      ? {
          lat: points.reduce((sum, p) => sum + p.lat, 0) / points.length,
          lng: points.reduce((sum, p) => sum + p.lng, 0) / points.length,
        }
      : FALLBACK_CENTER;
  const zoom = points.length > 0 ? 13 : 5;

  const pinsJson = JSON.stringify(pins);
  const routeJson = JSON.stringify(route.map((r) => [r.lat, r.lng]));

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>html, body, #map { height: 100%; margin: 0; padding: 0; }</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map').setView([${center.lat}, ${center.lng}], ${zoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const pins = ${pinsJson};
    pins.forEach(function (pin) {
      const marker = L.marker([pin.lat, pin.lng]).addTo(map);
      let popupHtml = '<b>' + pin.placeName + '</b>';
      if (pin.visitedDate) popupHtml += '<br/>' + pin.visitedDate;
      if (pin.description) popupHtml += '<br/>' + pin.description;
      if (pin.photoUrl) {
        popupHtml += '<br/><img src="' + pin.photoUrl + '" style="width:120px;border-radius:8px;margin-top:4px;" />';
      }
      marker.bindPopup(popupHtml);
    });

    const routeCoords = ${routeJson};
    if (routeCoords.length > 1) {
      L.polyline(routeCoords, { color: '#e11d74', weight: 4 }).addTo(map);
    }
  </script>
</body>
</html>`;
}

export default function JourneyMapModal({ visible, coupleId, onClose }: JourneyMapModalProps) {
  const insets = useSafeAreaInsets();
  const { pins, route, loading } = useJourneyMap(coupleId);
  const html = useMemo(() => buildMapHtml(pins, route), [pins, route]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.heading}>Journey Map</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.closeText}>Tutup</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        ) : pins.length === 0 && route.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              Belum ada journey map. Tambahkan lewat notifikasi yang muncul saat kalian
              berlama-lama di satu tempat selagi kencan aktif!
            </Text>
          </View>
        ) : (
          <WebView source={{ html }} style={styles.webview} originWhitelist={['*']} />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e11d74',
  },
  closeText: {
    color: '#666',
    fontWeight: '600',
  },
  webview: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    color: '#767676',
    textAlign: 'center',
  },
});
