import { STORE_LOCATION } from './semantic/picosoModel.js';

const EARTH_RADIUS_KM = 6371;

/**
 * Haversine distance in km.
 * coords: longitude first not required — takes lat, lng explicitly.
 */
export function haversineKm(lat1, lng1, lat2, lng2) {
  if (![lat1, lng1, lat2, lng2].every((n) => Number.isFinite(Number(n)))) {
    return null;
  }
  const toRad = (d) => (Number(d) * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function storeCoords(overrides) {
  const o =
    overrides && typeof overrides === 'object' && !Array.isArray(overrides)
      ? overrides
      : {};
  const lat = Number(o.lat ?? STORE_LOCATION.lat);
  const lng = Number(o.lng ?? STORE_LOCATION.lng);
  return {
    lat: Number.isFinite(lat) ? lat : STORE_LOCATION.lat,
    lng: Number.isFinite(lng) ? lng : STORE_LOCATION.lng,
  };
}

/**
 * Approximate bounding box for pre-filtering lat/lng fields.
 * maxDistanceKm converted with ~111 km per degree latitude.
 */
export function latLngBoundingBox(centerLat, centerLng, radiusKm) {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((centerLat * Math.PI) / 180) || 1);
  return {
    minLat: centerLat - latDelta,
    maxLat: centerLat + latDelta,
    minLng: centerLng - lngDelta,
    maxLng: centerLng + lngDelta,
  };
}

/**
 * Mongo expression pieces for distance from store using deliveryAddress.
 * Used after bbox prefilter; exact filter applied in $match with $expr or post $addFields.
 */
export function orderHasCoordsMatch(bbox) {
  return {
    'deliveryAddress.lat': { $gte: bbox.minLat, $lte: bbox.maxLat },
    'deliveryAddress.lng': { $gte: bbox.minLng, $lte: bbox.maxLng },
  };
}

/**
 * Filter array of docs that have lat/lng fields, by haversine radius.
 * Intended only for already-prefiltered candidate sets (bbox), never full scan.
 */
export function filterByRadius(docs, getLat, getLng, radiusKm, center = storeCoords()) {
  const max = Number(radiusKm);
  const results = [];
  for (const doc of docs) {
    const lat = getLat(doc);
    const lng = getLng(doc);
    const d = haversineKm(center.lat, center.lng, lat, lng);
    if (d != null && d <= max) {
      results.push({ ...doc, distanceKm: Math.round(d * 1000) / 1000 });
    }
  }
  return results;
}
