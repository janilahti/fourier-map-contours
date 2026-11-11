import { test } from "node:test";
import assert from "node:assert/strict";
import { equalEarth, invertEqualEarth } from "../src/equal-earth.js";

test("Equal Earth forward/inverse coordinates round-trip across latitudes and the date line", () => {
  assert.deepEqual(equalEarth([0, 0]), [0, 0]);
  for (const lon of [-180, -90, 0, 25, 120, 180])
    for (const lat of [-90, -80, -40, 0, 60, 80, 90]) {
      const result = invertEqualEarth(equalEarth([lon, lat]));
      assert.ok(Math.abs(result[0] - lon) < 1e-8);
      assert.ok(Math.abs(result[1] - lat) < 2e-6);
    }
  assert.ok(invertEqualEarth([100, -100]).every(Number.isFinite));
});

test("Equal Earth preserves spherical area, rather than locally rescaling each latitude", () => {
  const delta = 1e-4,
    rad = Math.PI / 180;
  for (const lon of [-120, 0, 90])
    for (const lat of [-70, -30, 0, 45, 75]) {
      const a = equalEarth([lon + delta, lat]),
        b = equalEarth([lon - delta, lat]);
      const c = equalEarth([lon, lat + delta]),
        d = equalEarth([lon, lat - delta]);
      const determinant =
        ((a[0] - b[0]) * (c[1] - d[1]) - (c[0] - d[0]) * (a[1] - b[1])) /
        (4 * delta * delta);
      assert.ok(
        Math.abs(determinant / (rad * rad * Math.cos(lat * rad)) - 1) < 1e-7,
      );
    }
});
