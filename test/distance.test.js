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
