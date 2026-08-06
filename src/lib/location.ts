import * as Location from 'expo-location';

export interface Coords {
  lat: number;
  lng: number;
}

export async function getCurrentCoords(): Promise<Coords | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    return null;
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return { lat: position.coords.latitude, lng: position.coords.longitude };
}
