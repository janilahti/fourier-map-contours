import { test } from "node:test";
import assert from "node:assert/strict";
import { transform, evaluate, TAU } from "../src/math.js";
import { coordinateSeries } from "../src/equations.js";
test("both equation notations reproduce the selected epicycles including unpaired signed frequencies", () => {
  const p = Array.from({ length: 64 }, (_, i) => [
    Math.cos((TAU * i) / 64) + 0.3 * Math.sin((3 * TAU * i) / 64),
    0.7 * Math.sin((TAU * i) / 64),
  ]);
  for (const count of [1, 2, 5, 17, 64])
    for (const separate of [false, true]) {
      const series = {
        c: transform(p).slice(0, count),
        x: transform(p.map((p) => [p[0], 0])).slice(0, count),
        y: transform(p.map((p) => [p[1], 0])).slice(0, count),
      };
      const real = coordinateSeries(series, separate);
      for (const t of [0, 0.13, 0.5, 0.89]) {
        const expected = separate
          ? [evaluate(series.x, t)[0], evaluate(series.y, t)[0]]
          : evaluate(series.c, t);
        Object.values(real).forEach((harmonics, axis) => {
          const sine = harmonics.reduce(
            (s, h) =>
              s +
              h.a * Math.cos(TAU * h.frequency * t) +
              h.b * Math.sin(TAU * h.frequency * t),
            0,
          );
          const phase = harmonics.reduce(
            (s, h) =>
              s + h.amplitude * Math.cos(TAU * h.frequency * t + h.phase),
            0,
          );
          assert.ok(Math.abs(sine - expected[axis]) < 1e-12);
          assert.ok(Math.abs(phase - expected[axis]) < 1e-12);
        });
      }
    }
});
