import * as Location from 'expo-location';

export async function getEmergencyLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { lat: current.coords.latitude, lng: current.coords.longitude };
  } catch {
    return null;
  }
}