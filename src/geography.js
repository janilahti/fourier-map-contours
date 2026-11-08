import { area, projectRing, resample } from "./math.js";
export function prepareGeometry(geometry) {
  const rings =
    geometry.type === "Polygon"
      ? [geometry.coordinates[0]]
      : geometry.coordinates.map((p) => p[0]);
  const sorted = rings
    .map((raw) => ({ raw, area: area(projectRing(raw)) }))
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
  const nearby = [];
  for (const candidate of sorted.slice(1)) {
    if (candidate.area < sorted[0].area * 0.005) continue;
    let previous = candidate.raw[0][0];
    let unwrapped = candidate.raw.map(([lon, lat]) => {
      while (lon - previous > 180) lon -= 360;
      while (lon - previous < -180) lon += 360;
      previous = lon;
      return [lon, lat];
    });
    const mean = unwrapped.reduce((s, p) => s + p[0], 0) / unwrapped.length,
      shift = 360 * Math.round((anchor - mean) / 360);
    const ring = unwrapped.map(([lon, lat]) => [(lon + shift) * cos, -lat]);
    const b = bbox(ring),
      gap = Math.hypot(
        Math.max(bounds[0] - b[2], b[0] - bounds[2], 0),
        Math.max(bounds[1] - b[3], b[1] - bounds[3], 0),
      );
    if (gap <= diagonal * 0.35) nearby.push(ring.map(normalize));
    if (nearby.length >= 12) break;
  }
  return {
    projection: { cos, center, size },
    points: samples.map(normalize),
    reference: main.map(normalize),
    nearby,
  };
}

export function geographicPoint(point, projection) {
  return [
    (point[0] * projection.size + projection.center[0]) / projection.cos,
    -(point[1] * projection.size + projection.center[1]),
  ];
}
