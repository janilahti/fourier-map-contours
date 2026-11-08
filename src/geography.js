import { area, projectRing, resample } from "./math.js";
import polygonClipping from "polygon-clipping";

function unwrap(ring, anchor) {
  let previous = ring[0][0];
  const result = ring.map(([lon, lat]) => {
    while (lon - previous > 180) lon -= 360;
    while (lon - previous < -180) lon += 360;
    previous = lon;
    return [lon, lat];
  });
  const mean = result.reduce((s, p) => s + p[0], 0) / result.length;
  const shift = 360 * Math.round((anchor - mean) / 360);
  return result.map(([lon, lat]) => [lon + shift, lat]);
}

// GeoJSON cuts connected land at ±180°. Unite only these seam polygons
// in a shared longitude frame; disjoint islands remain separate polygons.
function joinDateLine(polygons) {
  const largest = polygons.reduce((a, b) =>
    area(projectRing(a[0])) >= area(projectRing(b[0])) ? a : b,
  );
  const unwrapped = unwrap(largest[0], largest[0][0][0]);
  const anchor = unwrapped.reduce((s, p) => s + p[0], 0) / unwrapped.length;
  const seam = [],
    other = [];
  for (const polygon of polygons) {
    if (polygon[0].some(([lon]) => Math.abs(lon) === 180)) {
      const outer = unwrap(polygon[0], anchor);
      const center = outer.reduce((s, p) => s + p[0], 0) / outer.length;
      seam.push([outer, ...polygon.slice(1).map((r) => unwrap(r, center))]);
    } else other.push(polygon);
  }
  return seam.length > 1
    ? [...other, ...polygonClipping.union(...seam)]
    : polygons;
}

export function prepareGeometry(geometry) {
  const polygons = joinDateLine(
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates,
  );
  const sorted = polygons
    .map((polygon) => ({
      polygon,
      raw: polygon[0],
      area: area(projectRing(polygon[0])),
    }))
    .sort((a, b) => b.area - a.area);
  const mainRaw = sorted[0].raw;
  const latitude = mainRaw.reduce((s, p) => s + p[1], 0) / mainRaw.length,
    cos = Math.cos((latitude * Math.PI) / 180);
  const main = projectRing(mainRaw),
    anchor = main.reduce((s, p) => s + p[0] / cos, 0) / main.length;
  const samples = resample(main, 1024, { normalize: false });
  const center = samples.reduce(
    (a, p) => [a[0] + p[0] / samples.length, a[1] + p[1] / samples.length],
    [0, 0],
  );
  const size = Math.max(
    ...samples.flatMap((p) => [
      Math.abs(p[0] - center[0]),
      Math.abs(p[1] - center[1]),
    ]),
  );
  const normalize = (p) => [
    (p[0] - center[0]) / size,
    (p[1] - center[1]) / size,
  ];
  const bbox = (ring) => [
    Math.min(...ring.map((p) => p[0])),
    Math.min(...ring.map((p) => p[1])),
    Math.max(...ring.map((p) => p[0])),
    Math.max(...ring.map((p) => p[1])),
  ];
  const bounds = bbox(main),
    diagonal = Math.hypot(bounds[2] - bounds[0], bounds[3] - bounds[1]);
  const project = (ring) =>
    unwrap(ring, anchor).map(([lon, lat]) => [lon * cos, -lat]);
  const fillPolygons = [
    [
      main.map(normalize),
      ...sorted[0].polygon.slice(1).map((r) => project(r).map(normalize)),
    ],
  ];
  const nearby = [];
  for (const candidate of sorted.slice(1)) {
    if (candidate.area < sorted[0].area * 0.005) continue;
    const ring = project(candidate.raw);
    const b = bbox(ring),
      gap = Math.hypot(
        Math.max(bounds[0] - b[2], b[0] - bounds[2], 0),
        Math.max(bounds[1] - b[3], b[1] - bounds[3], 0),
      );
    if (gap <= diagonal * 0.35) {
      nearby.push(ring.map(normalize));
      fillPolygons.push([
        ring.map(normalize),
        ...candidate.polygon.slice(1).map((r) => project(r).map(normalize)),
      ]);
    }
    if (nearby.length >= 12) break;
  }
  return {
    projection: { cos, center, size },
    points: samples.map(normalize),
    reference: main.map(normalize),
    nearby,
    fillPolygons,
  };
}

export function geographicPoint(point, projection) {
  return [
    (point[0] * projection.size + projection.center[0]) / projection.cos,
    -(point[1] * projection.size + projection.center[1]),
  ];
}
