import { test } from "node:test";
import assert from "node:assert/strict";
import { transform, TAU } from "../src/math.js";
import {
  soundHarmonics,
  periodicWaveCoefficients,
  harmonicsCsv,
} from "../src/harmonics.js";
const close = (a, b, tolerance = 1e-9) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
function analyticTerms() {
  return transform(
    Array.from({ length: 128 }, (_, i) => {
      const t = i / 128;
      return [
        5 +
          3 * Math.sin(TAU * t + Math.PI / 4) +
          1.5 * Math.sin(2 * TAU * t - Math.PI / 6) +
          0.75 * Math.sin(16 * TAU * t + 0.2),
        0,
      ];
    }),
  );
}
test("sound export selects harmonics 1–16 by frequency, removes DC, and preserves amplitude ratios", () => {
  const signal = soundHarmonics(analyticTerms());
  assert.deepEqual(
    signal.harmonics.map((h) => h.harmonic),
    Array.from({ length: 16 }, (_, i) => i + 1),
  );
  assert.equal(signal.referenceHarmonic, 1);
  close(signal.harmonics[0].amplitude, 3 / 5.25);
  close(signal.harmonics[1].amplitude, 1.5 / 5.25);
  close(signal.harmonics[15].amplitude, 0.75 / 5.25);
  close(signal.harmonics[1].levelDb, -6.020599913279624);
  close(signal.harmonics[0].phaseDegrees, 0);
  close(signal.harmonics[1].phaseDegrees, 240);
  close(
    signal.harmonics.reduce((sum, h) => sum + h.amplitude, 0),
    1,
  );
});
test("exported coefficients reproduce the DC-free signal shifted to the fundamental rising zero", () => {
  const signal = soundHarmonics(analyticTerms());
  for (let i = 0; i < 100; i++) {
    const t = i / 100,
      shifted = t - 1 / 8;
    const expected =
      (3 * Math.sin(TAU * shifted + Math.PI / 4) +
        1.5 * Math.sin(2 * TAU * shifted - Math.PI / 6) +
        0.75 * Math.sin(16 * TAU * shifted + 0.2)) /
      5.25;
    const result = signal.harmonics.reduce(
      (sum, h) =>
        sum +
        h.cosine * Math.cos(TAU * h.harmonic * t) +
        h.sine * Math.sin(TAU * h.harmonic * t),
      0,
    );
    close(result, expected);
    assert.ok(Math.abs(result) <= 1 + 1e-12);
  }
  const wave = periodicWaveCoefficients(signal);
  assert.equal(wave.real.length, 17);
  assert.equal(wave.real[0], 0);
  assert.equal(wave.imag[0], 0);
});
test("a missing fundamental uses a documented strongest-harmonic reference; silent signals remain finite", () => {
  const signal = soundHarmonics([
    { frequency: 2, re: 2, im: 0 },
    { frequency: -2, re: 2, im: 0 },
  ]);
  assert.equal(signal.referenceHarmonic, 2);
  assert.equal(signal.harmonics[0].phaseDegrees, null);
  close(signal.harmonics[1].phaseDegrees, 0);
  const silent = soundHarmonics([{ frequency: 0, re: 10, im: 0 }]);
  assert.equal(silent.silent, true);
  assert.equal(silent.referenceHarmonic, null);
  assert.ok(
    silent.harmonics.every(
      (h) => h.amplitude === 0 && h.phaseDegrees === null && h.levelDb === null,
    ),
  );
  assert.ok([...periodicWaveCoefficients(silent).real].every(Number.isFinite));
});
test("CSV exports both axes, pitch, phase reference and geographic metadata with proper escaping", () => {
  const signal = soundHarmonics(analyticTerms());
  const csv = harmonicsCsv(
    { x: signal, y: signal },
    {
      name: 'Test, "island"',
      id: "TEST",
      projection: "Equal Earth",
      scale: "1:10M",
      samples: 1024,
    },
    110,
  );
  const rows = csv.trim().split("\r\n");
  assert.equal(rows.length, 33);
  assert.ok(rows[1].startsWith("x,1,110,"));
  assert.ok(rows[16].startsWith("x,16,1760,"));
  assert.ok(rows[17].startsWith("y,1,110,"));
  assert.ok(csv.includes('"Test, ""island"""'));
  assert.ok(csv.includes("Equal Earth,1:10M,1024"));
  assert.ok(csv.includes("phase_degrees"));
});
