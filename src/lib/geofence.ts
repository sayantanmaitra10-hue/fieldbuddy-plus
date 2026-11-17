export const BANDRA_ZONE = {
  name: "Bandra Zone A",
  latitude: 19.0596,
  longitude: 72.8295,
  radiusMeters: 250,
} as const;

const EARTH_RADIUS_METERS = 6_371_000;

export const calculateDistanceMeters = (
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number => {
  const coordinates = [latitudeA, longitudeA, latitudeB, longitudeB];
  if (
    coordinates.some((coordinate) => !Number.isFinite(coordinate)) ||
    Math.abs(latitudeA) > 90 || Math.abs(latitudeB) > 90 ||
    Math.abs(longitudeA) > 180 || Math.abs(longitudeB) > 180
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(latitudeB - latitudeA);
  const longitudeDelta = toRadians(longitudeB - longitudeA);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) * Math.cos(toRadians(latitudeB)) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(Math.min(1, haversine)));
};

export const isWithinGeofence = (
  latitude: number,
  longitude: number,
  accuracyMeters = 0,
  zone: typeof BANDRA_ZONE = BANDRA_ZONE,
): boolean => {
  if (!Number.isFinite(accuracyMeters) || accuracyMeters < 0) return false;

  const distance = calculateDistanceMeters(latitude, longitude, zone.latitude, zone.longitude);
  return distance + accuracyMeters <= zone.radiusMeters;
};