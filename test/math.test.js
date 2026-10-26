import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  TAU,
  transform,
  evaluate,
  resample,
  mainRing,
  projectRing,
  area,
} from "../src/math.js";
test("DFT reconstructs a closed curve at every input sample", () => {
  const p = Array.from({ length: 64 }, (_, i) => [
    Math.cos((TAU * i) / 64) + 0.2 * Math.sin((3 * TAU * i) / 64),
    0.7 * Math.sin((TAU * i) / 64),
  ]);
  const tr = transform(p);
  p.forEach((v, i) => {
    const q = evaluate(tr, i / 64);
    assert.ok(Math.hypot(q[0] - v[0], q[1] - v[1]) < 1e-12);
  });
});
test("complex circle uses one positive-frequency epicycle and reverses correctly", () => {
  const p = Array.from({ length: 64 }, (_, i) => [
    Math.cos((TAU * i) / 64),
    Math.sin((TAU * i) / 64),
  ]);
  const tr = transform(p);
  assert.equal(tr[0].frequency, 1);
  assert.ok(Math.abs(tr[0].amplitude - 1) < 1e-12);
  assert.ok(evaluate(tr.slice(0, 1), 0.25)[1] > 0.99);
  assert.ok(evaluate(tr.slice(0, 1), -0.25)[1] < -0.99);
});
test("separate real series reconstruct both coordinates", () => {
  const p = resample(
      [
        [0, 0],
        [4, 0],
        [4, 2],
        [0, 2],
      ],
      64,
    ),
    x = transform(p.map((p) => [p[0], 0])),
    y = transform(p.map((p) => [p[1], 0]));
  p.forEach((v, i) => {
    assert.ok(Math.abs(evaluate(x, i / 64)[0] - v[0]) < 1e-12);
    assert.ok(Math.abs(evaluate(y, i / 64)[0] - v[1]) < 1e-12);
  });
});
test("main region is selected by area, rather than vertex count", () => {
  const g = {
    type: "MultiPolygon",
    coordinates: [
      [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
      [
        [
          [10, 0],
          [20, 0],
          [20, 10],
          [10, 10],
          [10, 0],
        ],
      ],
    ],
  };
  assert.ok(area(mainRing(g)) > 90);
});
test("antimeridian is unwrapped", () => {
  const p = projectRing([
    [179, 0],
    [-179, 0],
    [-179, 1],
    [179, 1],
    [179, 0],
  ]);
  assert.ok(
    Math.max(...p.map((p) => p[0])) - Math.min(...p.map((p) => p[0])) < 3,
  );
});
test("every bundled country produces finite, closed Fourier output", () => {
  const data = JSON.parse(
    readFileSync(new URL("../public/data/countries.geojson", import.meta.url)),
  );
  assert.equal(data.features.length, 242);
  const ids = new Set();
  for (const f of data.features) {
    assert.ok(!ids.has(f.properties.id));
    ids.add(f.properties.id);
    const p = resample(mainRing(f.geometry), 64);
    assert.ok(
      p.every((p) => p.every(Number.isFinite)),
      f.properties.name,
    );
    const tr = transform(p).slice(0, 32),
      a = evaluate(tr, 0),
      b = evaluate(tr, 1);
    assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-10, f.properties.name);
  }
});

test("contour fills the separate-mode canvas without clipping its reference outline", async () => {
  const { fitContour } = await import("../src/math.js");
  for (const [width, height] of [
    [900, 650],
    [390, 310],
  ]) {
    for (const shape of [
      [
        [0, -1],
        [0.6, 0],
        [0, 1],
        [-0.6, 0],
      ],
      [
        [-1, -0.3],
        [1, -0.3],
        [1, 0.3],
        [-1, 0.3],
      ],
    ]) {
      const { scale, origin } = fitContour(shape, width, height, true);
      const projected = shape.map((p) => [
        origin[0] + p[0] * scale,
        origin[1] + p[1] * scale,
      ]);
      assert.ok(
        projected.every(
          (p) =>
            p[0] >= width * 0.12 - 1e-8 &&
            p[0] <= width * 0.94 + 1e-8 &&
            p[1] >= height * 0.12 - 1e-8 &&
            p[1] <= height * 0.94 + 1e-8,
        ),
      );
      const occupied = Math.max(
        (Math.max(...projected.map((p) => p[0])) -
          Math.min(...projected.map((p) => p[0]))) /
          width,
        (Math.max(...projected.map((p) => p[1])) -
          Math.min(...projected.map((p) => p[1]))) /
          height,
      );
      assert.ok(
        occupied >= 0.81,
        "map uses at least 81% of one canvas dimension",
      );
    }
  }
});
