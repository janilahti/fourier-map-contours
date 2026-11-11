import { area, projectRing, resample } from "./math.js";
import { equalEarth, invertEqualEarth } from "./equal-earth.js";
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

// A world-sheet polygon closes Antarctica down both sides of the date line
// and across the pole. Those edges are not coastline in a polar view.
function polarCoast(ring) {
  if (!ring.some((p) => p[1] < -89.9)) return ring;
  const seamLatitude = (sign) =>
    Math.max(
      ...ring
        .filter((p) => Math.abs(p[0] - sign * 180) < 1e-6)
        .map((p) => p[1]),
    );
  const east = seamLatitude(1),
    west = seamLatitude(-1);
  return ring.filter(
    ([lon, lat]) =>
      lat > -89.9 &&
      !(Math.abs(lon - 180) < 1e-6 && lat < east - 1e-6) &&
      !(Math.abs(lon + 180) < 1e-6 && lat < west - 1e-6),
  );
}
function polarProject(ring) {
  return polarCoast(ring).map(([lon, lat]) => {
    const angle = (lon * Math.PI) / 180,
      radius = 90 + lat;
    return [radius * Math.sin(angle), -radius * Math.cos(angle)];
  });
}

export function prepareGeometry(
  geometry,
  { continent = false, projection: selectedProjection = "local" } = {},
) {
  const input =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const polar = input.some((p) => p[0].some((v) => v[1] < -89.9));
  const polygons = polar ? input : joinDateLine(input);
  const initialProject = polar ? polarProject : projectRing;
  const sorted = polygons
    .map((polygon) => ({
      polygon,
      raw: polygon[0],
      area: area(initialProject(polygon[0])),
    }))
    .sort((a, b) => b.area - a.area);
  const mainRaw = sorted[0].raw;
  const latitude = mainRaw.reduce((s, p) => s + p[1], 0) / mainRaw.length;
  const cos = polar ? 1 : Math.cos((latitude * Math.PI) / 180);
  const useEqualEarth = selectedProjection === "equal-earth";
  const localMain = initialProject(mainRaw);
  const unwrappedMain = useEqualEarth ? unwrap(mainRaw, mainRaw[0][0]) : null;
  const centralLongitude =
    polar || !useEqualEarth
      ? 0
      : (Math.min(...unwrappedMain.map((p) => p[0])) +
          Math.max(...unwrappedMain.map((p) => p[0]))) /
        2;
  const equalProject = (ring) => {
    const unwrapped = unwrap(ring, centralLongitude),
      result = [];
    for (let i = 0; i < unwrapped.length; i++) {
      const p = unwrapped[i],
        q = unwrapped[Math.min(i + 1, unwrapped.length - 1)];
      const steps = Math.max(
        1,
        Math.ceil(Math.max(Math.abs(q[0] - p[0]), Math.abs(q[1] - p[1]))),
      );
      for (let j = 0; j < steps; j++) {
        const t = j / steps;
        const projected = equalEarth([
          p[0] + t * (q[0] - p[0]) - centralLongitude,
          p[1] + t * (q[1] - p[1]),
        ]);
        result.push([projected[0], -projected[1]]);
      }
    }
    return result;
  };
  const main = useEqualEarth ? equalProject(mainRaw) : localMain;
  const anchor = polar
    ? 0
    : localMain.reduce((s, p) => s + p[0] / cos, 0) / localMain.length;
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
  const project = useEqualEarth
    ? equalProject
    : polar
      ? polarProject
      : (ring) => unwrap(ring, anchor).map(([lon, lat]) => [lon * cos, -lat]);
  const fillPolygons = [
    [
      main.map(normalize),
      ...sorted[0].polygon.slice(1).map((r) => project(r).map(normalize)),
    ],
  ];
  const nearby = [];
  for (const candidate of sorted.slice(1)) {
    if (candidate.area < sorted[0].area * (continent ? 0.00025 : 0.005))
      continue;
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
    if (nearby.length >= (continent ? 32 : 12)) break;
  }
  return {
    projection: {
      kind: useEqualEarth
        ? "equal-earth"
        : polar
          ? "south-polar"
          : "equirectangular",
      centralLongitude,
      cos,
      center,
      size,
    },
    points: samples.map(normalize),
    reference: main.map(normalize),
    nearby,
    fillPolygons,
  };
}

export function geographicPoint(point, projection) {
  const x = point[0] * projection.size + projection.center[0];
  const y = point[1] * projection.size + projection.center[1];
  if (projection.kind === "equal-earth") {
    const [longitude, latitude] = invertEqualEarth([x, -y]);
    return [longitude + projection.centralLongitude, latitude];
  }
  if (projection.kind === "south-polar")
    return [(Math.atan2(x, -y) * 180) / Math.PI, Math.hypot(x, y) - 90];
  return [x / projection.cos, -y];
}
