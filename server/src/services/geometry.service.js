import { getPrisma } from "../lib/prisma.js";

export function normalizePolygon(geometry) {
  if (!geometry || geometry.type !== "Polygon" || !Array.isArray(geometry.coordinates) || geometry.coordinates.length !== 1) {
    throw Object.assign(new Error("A GeoJSON Polygon is required"), { status: 422 });
  }
  const ring = geometry.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 4) throw Object.assign(new Error("A polygon requires at least three corners and a closed ring"), { status: 422 });
  if (ring.length > 101) throw Object.assign(new Error("A parcel boundary may contain at most 100 corners"), { status: 422 });
  const normalizedRing = ring.map((coordinate) => {
    if (!Array.isArray(coordinate) || coordinate.length !== 2 || !coordinate.every(Number.isFinite)) throw Object.assign(new Error("Every corner must contain finite longitude and latitude values"), { status: 422 });
    const [longitude, latitude] = coordinate;
    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) throw Object.assign(new Error("A corner is outside the valid longitude or latitude range"), { status: 422 });
    return [longitude, latitude];
  });
  const first = normalizedRing[0];
  const last = normalizedRing.at(-1);
  if (first[0] !== last[0] || first[1] !== last[1]) throw Object.assign(new Error("The polygon ring must be closed"), { status: 422 });
  const uniqueCorners = new Set(normalizedRing.slice(0, -1).map(([longitude, latitude]) => `${longitude},${latitude}`));
  if (uniqueCorners.size < 3) throw Object.assign(new Error("A polygon requires at least three distinct corners"), { status: 422 });
  const corners = normalizedRing.slice(0, -1);
  const [x1, y1] = corners[0]; const [x2, y2] = corners[1];
  const allCollinear = corners.slice(2).every(([x3, y3]) => Math.abs((x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1)) < 1e-14);
  if (allCollinear) throw Object.assign(new Error("Polygon corners must not be collinear"), { status: 422 });
  return { type: "Polygon", coordinates: [normalizedRing] };
}

function geoJsonText(geometry) {
  return JSON.stringify(normalizePolygon(geometry));
}

/** Validates bound GeoJSON as a simple SRID-4326 polygon; returns PostGIS facts and never interpolates user SQL. */
export async function validatePolygon(geometry, database = getPrisma()) {
  const input = geoJsonText(geometry);
  const [result] = await database.$queryRaw`
    SELECT
      ST_IsValid(ST_SetSRID(ST_GeomFromGeoJSON(${input}), 4326)) AS "isValid",
      ST_IsValidReason(ST_SetSRID(ST_GeomFromGeoJSON(${input}), 4326)) AS reason,
      ST_NPoints(ST_ExteriorRing(ST_SetSRID(ST_GeomFromGeoJSON(${input}), 4326))) - 1 AS "cornerCount"
  `;
  return { isValid: result.isValid && result.cornerCount >= 3, reason: result.cornerCount < 3 ? "Polygon requires at least three corners" : result.reason, cornerCount: result.cornerCount };
}

/** Calculates authoritative geodesic square metres for GeoJSON; throws when PostGIS cannot construct the polygon. */
export async function calculateAreaM2(geometry, database = getPrisma()) {
  const input = geoJsonText(geometry);
  const [result] = await database.$queryRaw`
    SELECT ST_Area(ST_SetSRID(ST_GeomFromGeoJSON(${input}), 4326)::geography) AS "areaM2"
  `;
  return Number(result.areaM2);
}

export async function calculateOverlapM2(firstGeometry, secondGeometry, database = getPrisma()) {
  const first = geoJsonText(firstGeometry);
  const second = geoJsonText(secondGeometry);
  const [result] = await database.$queryRaw`
    WITH shapes AS (
      SELECT ST_SetSRID(ST_GeomFromGeoJSON(${first}), 4326) AS a,
             ST_SetSRID(ST_GeomFromGeoJSON(${second}), 4326) AS b
    )
    SELECT ST_Intersects(a, b) AS intersects,
           CASE WHEN ST_Intersects(a, b)
             THEN ST_Area(ST_Intersection(a, b)::geography)
             ELSE 0 END AS "overlapM2"
    FROM shapes
  `;
  return { intersects: result.intersects, overlapM2: Number(result.overlapM2) };
}

/** Returns every protected parcel overlapping the input by more than 1 m², optionally excluding one parcel ID. */
export async function findParcelOverlaps(geometry, excludedParcelId = null, database = getPrisma()) {
  const input = geoJsonText(geometry);
  return database.$queryRaw`
    WITH candidate AS (SELECT ST_SetSRID(ST_GeomFromGeoJSON(${input}), 4326) AS geom)
    SELECT p.id, p.parcel_number AS "parcelNumber", p.status,
           ST_Area(ST_Intersection(p.geometry, candidate.geom)::geography) AS "overlapAreaM2",
           ST_AsGeoJSON(p.geometry)::json AS geometry,
           ST_AsGeoJSON(ST_Intersection(p.geometry, candidate.geom))::json AS "intersectionGeometry"
    FROM parcels p, candidate
    WHERE p.status IN ('PENDING_SURVEY', 'VERIFIED', 'REGISTERED', 'RETURNED_FOR_CORRECTION', 'DISPUTED')
      AND (${excludedParcelId}::integer IS NULL OR p.id <> ${excludedParcelId})
      AND ST_Intersects(p.geometry, candidate.geom)
      AND ST_Area(ST_Intersection(p.geometry, candidate.geom)::geography) > 1
    ORDER BY "overlapAreaM2" DESC
  `;
}

export async function getParcelGeometry(parcelId, database = getPrisma()) {
  const [result] = await database.$queryRaw`
    SELECT ST_AsGeoJSON(geometry)::json AS geometry FROM parcels WHERE id = ${parcelId}
  `;
  return result?.geometry ?? null;
}

export { geoJsonText };
