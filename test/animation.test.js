import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ContourAnimation,
  nextCount,
  traceOpacity,
  LAP_FADE_SECONDS,
  highlightOpacity,
  CYCLE_SECONDS,
  growthRate,
} from "../src/animation.js";
const point = (phase, count) => [
  Math.cos(phase * 2 * Math.PI) * count,
  Math.sin(phase * 2 * Math.PI) * count,
];

test("cycle rollover preserves exact endpoints and the recent highlight", () => {
  const animation = new ContourAnimation(point, { count: 3 });
  animation.advance(19.9);
  const recent = animation.strokes[0].samples.at(-1);
  animation.advance(0.2);
  assert.equal(animation.cycle, 1);
  assert.ok(Math.abs(animation.phase - 0.005) < 1e-12);
  assert.equal(animation.strokes.length, 2);
  const old = animation.strokes[0];
  assert.deepEqual(old.samples[0].p, [3, 0]);
  assert.ok(
    Math.hypot(old.samples.at(-1).p[0] - 3, old.samples.at(-1).p[1]) < 1e-12,
  );
  assert.ok(highlightOpacity(animation.time - recent.time) > 0.8);
  assert.ok(
    Math.abs(highlightOpacity(1.099) - highlightOpacity(1.101)) < 0.002,
  );
  assert.equal(animation.opacity(old), 1);
});

test("completed loops hold for a following lap, fade together, and do not retain unbounded history", () => {
  const animation = new ContourAnimation(point);
  animation.advance(39.9);
  const old = animation.strokes[0];
  assert.equal(animation.opacity(old), 1);
  animation.advance(0.5);
  assert.ok(Math.abs(animation.opacity(old) - 0.5) < 1e-10);
  animation.advance(0.5);
  assert.ok(!animation.strokes.includes(old));
  animation.advance(400);
  assert.ok(animation.strokes.length <= 3);
});

test("progression begins with one, accelerates in steps, and stops at the limit", () => {
  const animation = new ContourAnimation(point, {
    count: 64,
    growing: true,
    limit: 512,
  });
  assert.equal(animation.count, 1);
  for (const n of [2, 4, 8, 16, 32, 64]) {
    animation.advance(CYCLE_SECONDS);
    assert.equal(animation.count, n);
  }
  assert.equal(nextCount(16), 32);
  assert.equal(nextCount(32), 64);
  assert.equal(nextCount(64), 96);
  assert.equal(nextCount(128), 192);
  assert.equal(growthRate(1), 4);
  assert.equal(growthRate(8), 2);
  assert.equal(growthRate(64), 1);
  assert.equal(nextCount(256), 320);
  assert.equal(nextCount(511), 512);
  assert.equal(nextCount(512, Infinity), 512);
  animation.advance(CYCLE_SECONDS * 35);
  assert.equal(animation.count, 512);
  animation.advance(CYCLE_SECONDS * 5);
  assert.equal(animation.count, 512);
  const custom = new ContourAnimation(point, { growing: true, limit: 11 });
  custom.advance(CYCLE_SECONDS * 20);
  assert.equal(custom.count, 11);
  const one = new ContourAnimation(point, { growing: true, limit: 1 });
  one.advance(CYCLE_SECONDS * 5);
  assert.equal(one.count, 1);
});

test("successive approximations are separate paths, with correct count at each boundary", () => {
  const animation = new ContourAnimation(point, { growing: true });
  animation.advance(20.05);
  assert.equal(animation.strokes[0].count, 1);
  assert.equal(animation.strokes[1].count, 2);
  assert.deepEqual(animation.strokes[1].samples[0].p, [2, 0]);
  assert.ok(
    animation.strokes[0].samples.every(
      (s) => Math.abs(Math.hypot(...s.p) - 1) < 1e-12,
    ),
  );
});

test("whole-lap fade duration is independent of drawing speed and coefficient count", () => {
  for (const count of [1, 4, 128, 512])
    for (const rate of [0.25, 1, 5.25, 21]) {
      const a = new ContourAnimation(point, {
        growing: true,
        startCount: count,
      });
      a.seek(2 * CYCLE_SECONDS, rate);
      const old = a.strokes[0];
      assert.equal(a.opacity(old), 1);
      a.advance((rate * LAP_FADE_SECONDS) / 2, LAP_FADE_SECONDS / 2);
      assert.ok(Math.abs(a.opacity(old) - 0.5) < 1e-10);
      a.advance(rate * LAP_FADE_SECONDS, LAP_FADE_SECONDS);
      assert.ok(!a.strokes.includes(old));
    }
});

test("a shared build-up view continues from the shared epicycle count", () => {
  const animation = new ContourAnimation(point, {
    growing: true,
    startCount: 16,
  });
  assert.equal(animation.count, 16);
  animation.advance(CYCLE_SECONDS);
  assert.equal(animation.count, 32);
  const capped = new ContourAnimation(point, {
    growing: true,
    startCount: 9999,
  });
  assert.equal(capped.count, 512);
});

test("seeking backward and forward reconstructs the correct lap, count and tip", () => {
  const a = new ContourAnimation(point, { growing: true });
  a.seek(6.5 * CYCLE_SECONDS);
  assert.equal(a.cycle, 6);
  assert.equal(a.count, 64);
  assert.ok(Math.abs(a.phase - 0.5) < 1e-12);
  let tip = a.strokes.at(-1).samples.at(-1).p;
  assert.ok(Math.hypot(tip[0] + 64, tip[1]) < 1e-10);
  a.seek(1.25 * CYCLE_SECONDS);
  assert.equal(a.count, 2);
  assert.equal(a.cycle, 1);
  tip = a.strokes.at(-1).samples.at(-1).p;
  assert.ok(Math.hypot(tip[0], tip[1] - 2) < 1e-10);
  a.advance(0.1);
  assert.ok(a.phase > 0.25);
  a.seek(-1);
  assert.equal(a.time, 0);
  assert.equal(a.count, 1);
  a.seek(1e7);
  assert.equal(a.count, 512);
  assert.ok(a.strokes.length <= 3);
  assert.throws(() => a.seek(Infinity), RangeError);
});
test("seeking in manual mode preserves count and retains ordinary fade history", () => {
  const a = new ContourAnimation(point, { count: 17 });
  a.seek(4.3 * CYCLE_SECONDS);
  assert.equal(a.count, 17);
  assert.ok(a.strokes.length <= 5);
  assert.ok(a.strokes.every((s) => s.count === 17));
  const samples = a.strokes.at(-1).samples;
  assert.ok(Math.abs(Math.hypot(...samples.at(-1).p) - 17) < 1e-10);
});

test("completed low-count laps and seek-rebuilt laps have exactly closed endpoints", () => {
  for (const count of [1, 2, 4, 8, 128, 512]) {
    const a = new ContourAnimation(point, { growing: true, startCount: count });
    a.advance(CYCLE_SECONDS + 0.01);
    let samples = a.strokes[0].samples;
    assert.deepEqual(samples[0].p, samples.at(-1).p);
    a.seek(1.5 * CYCLE_SECONDS);
    samples = a.strokes[0].samples;
    assert.deepEqual(samples[0].p, samples.at(-1).p);
    assert.equal(a.opacity(a.strokes[0]), 1);
  }
});
