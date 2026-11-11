import { test } from "node:test";
import assert from "node:assert/strict";
import {
  haversineKm,
  reconstructionMetrics,
  formatDistance,
} from "../src/distance.js";
import { prepareGeometry, geographicPoint } from "../src/geography.js";
import { transform, reconstructionError } from "../src/math.js";
test("spherical distance handles known lengths and the antimeridian", () => {
  assert.ok(Math.abs(haversineKm([0, 0], [1, 0]) - 111.195) < 0.001);
  assert.ok(Math.abs(haversineKm([179, 0], [-179, 0]) - 222.39) < 0.001);
  assert.equal(haversineKm([25, 60], [25, 60]), 0);
  assert.equal(formatDistance(0.125), "125 m");
  assert.equal(formatDistance(12), "12 km");
});
test("projection inversion and full Fourier reconstruction have negligible distance error", () => {
  const p = prepareGeometry({
    type: "Polygon",
    coordinates: [
      [
        [10, 50],
        [12, 50],
        [12, 52],
        [10, 52],
        [10, 50],
      ],
    ],
  });
  const corner = geographicPoint(p.reference[0], p.projection);
  assert.ok(
    Math.abs(corner[0] - 10) < 1e-12 && Math.abs(corner[1] - 50) < 1e-12,
  );
  // Use a smaller, uniformly sampled signal to keep this full-transform check concise.
  const points = p.points.filter((_, i) => i % 16 === 0);
  const series = {
    c: transform(points),
    x: transform(points.map((p) => [p[0], 0])),
    y: transform(points.map((p) => [p[1], 0])),
  };
  for (const separate of [false, true]) {
    const metrics = reconstructionMetrics(
      points,
      series,
      separate,
      p.projection,
    );
    assert.ok(metrics.kilometers < 1e-8);
    assert.ok(metrics.percent < 1e-10);
  }
  const truncated = { ...series, c: series.c.slice(0, 1) };
  const m = reconstructionMetrics(points, truncated, false, p.projection);
  assert.ok(m.kilometers > 1);
  assert.ok(
    Math.abs(m.percent - reconstructionError(points, truncated, false)) < 1e-12,
  );
});

test("RMS uses every sample, including harmonics invisible to a 128-point check", () => {
  // sin(128 t) vanishes at all 128 formerly checked indices, although its
  // RMS is 1/√2. The reference has a 2 by 2 bounding box, giving 25% error.
  const points = Array.from({ length: 1024 }, (_, i) => [
    Math.cos((2 * Math.PI * i) / 1024),
    Math.sin((2 * Math.PI * 128 * i) / 1024),
  ]);
  const cosine = [1, -1].map((frequency) => ({ frequency, re: 0.5, im: 0 }));
  const series = { c: cosine, x: cosine, y: [] };
  for (const separate of [false, true]) {
    const metrics = reconstructionMetrics(points, series, separate, {
      cos: 1,
      center: [0, 0],
      size: 1,
    });
    assert.ok(Math.abs(metrics.percent - 25) < 1e-10);
    assert.ok(
      Math.abs(
        metrics.kilometers - haversineKm([0, 0], [0, 1]) / Math.sqrt(2),
      ) < 1e-8,
    );
  }
});

test("polar projection inversion preserves known coordinates and spherical reconstruction errors", () => {
  const projection = { kind: "south-polar", center: [0, 0], size: 1 };
  for (const [point, expected] of [
    [
      [0, -10],
      [0, -80],
    ],
    [
      [10, 0],
      [90, -80],
    ],
    [
      [0, 10],
      [180, -80],
    ],
    [
      [-10, 0],
      [-90, -80],
    ],
  ]) {
    const actual = geographicPoint(point, projection);
    assert.ok(
      Math.hypot(actual[0] - expected[0], actual[1] - expected[1]) < 1e-10,
    );
  }
  const points = Array.from({ length: 64 }, (_, i) => [
    10 * Math.sin((i * Math.PI) / 32),
    -10 * Math.cos((i * Math.PI) / 32),
  ]);
  const series = { c: [{ frequency: 0, re: 0, im: 0 }], x: [], y: [] };
  for (const separate of [false, true]) {
    const m = reconstructionMetrics(points, series, separate, projection);
    assert.ok(Math.abs(m.kilometers - haversineKm([0, -90], [0, -80])) < 1e-8);
  }
});

test("Equal Earth reconstruction metrics invert the selected projection correctly", () => {
  const prepared = prepareGeometry(
    {
      type: "Polygon",
      coordinates: [
        [
          [24, 59],
          [30, 59],
          [30, 65],
          [24, 65],
          [24, 59],
        ],
      ],
    },
    { projection: "equal-earth" },
  );
  const corner = geographicPoint(prepared.reference[0], prepared.projection);
  assert.ok(
    Math.abs(corner[0] - 24) < 1e-10 && Math.abs(corner[1] - 59) < 1e-10,
  );
  const points = prepared.points.filter((_, i) => i % 16 === 0);
  const series = {
    c: transform(points),
    x: transform(points.map((p) => [p[0], 0])),
    y: transform(points.map((p) => [p[1], 0])),
  };
  for (const separate of [false, true]) {
    const m = reconstructionMetrics(
      points,
      series,
      separate,
      prepared.projection,
    );
    assert.ok(m.percent < 1e-10);
    assert.ok(m.kilometers < 1e-8);
  }
});
