import { describe, expect, it } from "vitest";
import { BANDRA_ZONE, calculateDistanceMeters, isWithinGeofence } from "@/lib/geofence";

describe("Bandra Zone A punch-in geofence", () => {
  it("accepts a GPS location inside the 250 m zone, including its reported accuracy", () => {
    expect(isWithinGeofence(BANDRA_ZONE.latitude, BANDRA_ZONE.longitude, 30)).toBe(true);
  });

  it("rejects a location outside the 250 m zone", () => {
    expect(isWithinGeofence(BANDRA_ZONE.latitude, BANDRA_ZONE.longitude + 0.003, 10)).toBe(false);
  });

  it("rejects a boundary reading when GPS uncertainty could put the device outside the zone", () => {
    const nearBoundary = BANDRA_ZONE.latitude + 0.0019;
    expect(isWithinGeofence(nearBoundary, BANDRA_ZONE.longitude, 50)).toBe(false);
  });

  it("reports a zero distance from the zone center", () => {
    expect(calculateDistanceMeters(
      BANDRA_ZONE.latitude,
      BANDRA_ZONE.longitude,
      BANDRA_ZONE.latitude,
      BANDRA_ZONE.longitude,
    )).toBe(0);
  });

  it("rejects invalid GPS coordinates", () => {
    expect(isWithinGeofence(91, BANDRA_ZONE.longitude)).toBe(false);
  });
});