import * as Location from 'expo-location';

export interface Coords {
  lat: number;
  lng: number;
}

const LOCATION_TIMEOUT_MS = 8000;

// Never throws: location services off / no fix / timeout all resolve to null,
// so callers (start/end date, widget) never get stuck mid-action.
export async function getCurrentCoords(): Promise<Coords | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    return await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then((position) => ({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      })),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), LOCATION_TIMEOUT_MS)),
    ]);
  } catch {
    return null;
  }
}
