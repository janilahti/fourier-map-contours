export const TAU = 2 * Math.PI;
// Unwrap the antimeridian before projecting; preserve a closed outer ring.
export function projectRing(ring) {
  const unwrapped = [ring[0].slice()];
  for (const [longitude, latitude] of ring.slice(1)) {
    let x = longitude,
      previous = unwrapped.at(-1)[0];
    while (x - previous > 180) x -= 360;
    while (x - previous < -180) x += 360;
    unwrapped.push([x, latitude]);
  }
  const latitude = unwrapped.reduce((s, p) => s + p[1], 0) / unwrapped.length;
  const scale = Math.cos((latitude * Math.PI) / 180);
  return unwrapped.map(([x, y]) => [x * scale, -y]);
}
export function area(ring) {
  return Math.abs(
    ring.reduce((s, p, i) => {
      const q = ring[(i + 1) % ring.length];
      return s + p[0] * q[1] - q[0] * p[1];
    }, 0) / 2,
  );
}
export function mainRing(geometry) {
  const rings =
    geometry.type === "Polygon"
      ? [geometry.coordinates[0]]
      : geometry.coordinates.map((p) => p[0]);
  return rings.map(projectRing).sort((a, b) => area(b) - area(a))[0];
}
export function resample(ring, count = 1024) {
  const lengths = [0];
  for (let i = 1; i <= ring.length; i++) {
    const a = ring[i - 1],
      b = ring[i % ring.length];
    lengths.push(lengths.at(-1) + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  let segment = 1;
  const points = Array.from({ length: count }, (_, i) => {
    const d = (i * lengths.at(-1)) / count;
    while (segment < ring.length && lengths[segment] < d) segment++;
    const a = ring[segment - 1],
      b = ring[segment % ring.length],
      span = lengths[segment] - lengths[segment - 1],
      t = span ? (d - lengths[segment - 1]) / span : 0;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  });
  const mean = points.reduce(
    (s, p) => [s[0] + p[0] / count, s[1] + p[1] / count],
    [0, 0],
  );
  const size = Math.max(
    ...points.map((p) => Math.abs(p[0] - mean[0])),
    ...points.map((p) => Math.abs(p[1] - mean[1])),
  );
  return points.map((p) => [(p[0] - mean[0]) / size, (p[1] - mean[1]) / size]);
}
export function transform(points) {
  const n = points.length,
    terms = [];
  for (let k = 0; k < n; k++) {
    let re = 0,
      im = 0;
    for (let j = 0; j < n; j++) {
      const a = (TAU * k * j) / n,
        c = Math.cos(a),
        s = Math.sin(a);
      re += points[j][0] * c + points[j][1] * s;
      im += points[j][1] * c - points[j][0] * s;
    }
    re /= n;
    im /= n;
    terms.push({
      frequency: k > n / 2 ? k - n : k,
      re,
      im,
      amplitude: Math.hypot(re, im),
    });
  }
  return terms.sort((a, b) => b.amplitude - a.amplitude);
}
export function evaluate(terms, t) {
  return terms.reduce(
    (p, c) => {
      const a = TAU * c.frequency * t;
      return [
        p[0] + c.re * Math.cos(a) - c.im * Math.sin(a),
        p[1] + c.re * Math.sin(a) + c.im * Math.cos(a),
      ];
    },
    [0, 0],
  );
}

// Fit the actual bounds, allowing axis sources to overlap the map in separate mode.
export function fitContour(points, width, height, separate = false) {
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs);
  const minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const left = width * (separate ? 0.12 : 0.08);
  const top = height * (separate ? 0.12 : 0.08);
  const right = width * 0.94,
    bottom = height * 0.94;
  const scale = Math.min(
    (right - left) / (maxX - minX || 1),
    (bottom - top) / (maxY - minY || 1),
  );
  return {
    scale,
    origin: [
      (left + right) / 2 - ((minX + maxX) * scale) / 2,
      (top + bottom) / 2 - ((minY + maxY) * scale) / 2,
    ],
  };
}
