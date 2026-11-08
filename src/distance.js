import { evaluate } from "./math.js";
import { geographicPoint } from "./geography.js";
export function haversineKm(a, b) {
  const rad = Math.PI / 180,
    dlat = (b[1] - a[1]) * rad,
    dlon = (b[0] - a[0]) * rad;
  const h =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dlon / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, h))));
}
export function reconstructionMetrics(points, series, separate, projection) {
  const diagonal = Math.hypot(
    Math.max(...points.map((p) => p[0])) - Math.min(...points.map((p) => p[0])),
    Math.max(...points.map((p) => p[1])) - Math.min(...points.map((p) => p[1])),
  );
  const count = points.length;
  let squared = 0,
    kmSquared = 0;
  for (let i = 0; i < count; i++) {
    const t = i / count,
      p = points[i];
    const q = separate
      ? [evaluate(series.x, t)[0], evaluate(series.y, t)[0]]
      : evaluate(series.c, t);
    squared += (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2;
    const km = haversineKm(
      geographicPoint(p, projection),
      geographicPoint(q, projection),
    );
    kmSquared += km * km;
  }
  return {
    percent: diagonal ? (100 * Math.sqrt(squared / count)) / diagonal : 0,
    kilometers: Math.sqrt(kmSquared / count),
  };
}
export function formatDistance(km) {
  return km < 1
    ? `${Math.round(km * 1000)} m`
    : `${new Intl.NumberFormat("en", { maximumFractionDigits: km < 10 ? 2 : 1 }).format(km)} km`;
}
