import { customType } from "drizzle-orm/pg-core";

// ─────────────────────────────────────────
// PostGIS geometry custom types for Drizzle ORM
// Drizzle does not have native PostGIS support.
// These types store WKT (Well-Known Text) as string in application layer
// and map to PostGIS geometry columns in PostgreSQL.
//
// Usage:
//   position: geometryPoint('position').notNull()
//   geometry: geometryLine('geometry')
//   boundary: geometryPolygon('boundary')
// ─────────────────────────────────────────

export const geometryPoint = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return "geometry(Point, 4326)";
  },
});

export const geometryLine = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return "geometry(LineString, 4326)";
  },
});

export const geometryPolygon = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return "geometry(Polygon, 4326)";
  },
});

// ─────────────────────────────────────────
// Helper — build WKT POINT string from lat/lng
// Usage: toWktPoint(106.827153, -6.175392)  → "POINT(106.827153 -6.175392)"
// ─────────────────────────────────────────
export function toWktPoint(longitude: number, latitude: number): string {
  return `POINT(${longitude} ${latitude})`;
}

// ─────────────────────────────────────────
// Helper — parse WKT POINT to { longitude, latitude }
// ─────────────────────────────────────────
export function fromWktPoint(
  wkt: string,
): { longitude: number; latitude: number } | null {
  const match = wkt.match(
    /POINT\s*\(\s*([+-]?\d+\.?\d*)\s+([+-]?\d+\.?\d*)\s*\)/,
  );
  if (!match || !match[1] || !match[2]) return null;
  return {
    longitude: parseFloat(match[1]),
    latitude: parseFloat(match[2]),
  };
}
