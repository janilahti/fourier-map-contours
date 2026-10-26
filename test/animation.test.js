import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ContourAnimation,
  nextCount,
  traceOpacity,
  highlightOpacity,
  CYCLE_SECONDS,
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
  assert.equal(traceOpacity(animation.time - old.completedAt), 1);
});

test("old cycles fade smoothly and are eventually removed without unbounded history", () => {
  const animation = new ContourAnimation(point);
  animation.advance(60);
  assert.equal(animation.strokes.length, 4);
  assert.equal(
    traceOpacity(animation.time - animation.strokes[0].completedAt),
    0.5,
  );
  assert.equal(traceOpacity(20), 1);
  assert.equal(traceOpacity(60), 0);
  animation.advance(400);
  assert.ok(animation.strokes.length <= 4);
  assert.ok(
    animation.strokes.every(
      (s) => s.completedAt === null || animation.time - s.completedAt < 60,
    ),
  );
});

test("progression begins with one, accelerates in steps, and stops at the limit", () => {
  const animation = new ContourAnimation(point, {
    count: 64,
    growing: true,
    limit: 256,
  });
  assert.equal(animation.count, 1);
  for (let n = 2; n <= 8; n++) {
    animation.advance(CYCLE_SECONDS);
    assert.equal(animation.count, n);
  }
  animation.advance(CYCLE_SECONDS);
  assert.equal(animation.count, 10);
  assert.equal(nextCount(16), 20);
  assert.equal(nextCount(32), 40);
  assert.equal(nextCount(64), 80);
  assert.equal(nextCount(128), 160);
  assert.equal(nextCount(256, Infinity), 256);
  animation.advance(CYCLE_SECONDS * 35);
  assert.equal(animation.count, 256);
  animation.advance(CYCLE_SECONDS * 5);
  assert.equal(animation.count, 256);
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

test("build-up traces start fading one cycle earlier than ordinary traces", () => {
  const growing = new ContourAnimation(point, { growing: true });
  growing.advance(20.1);
  const age = growing.time - growing.strokes[0].completedAt;
  assert.ok(traceOpacity(age, true) < 1);
  assert.equal(traceOpacity(age, false), 1);
  assert.equal(traceOpacity(20, true), 0.5);
  assert.equal(traceOpacity(40, true), 0);
  growing.advance(39.9);
  assert.ok(
    growing.strokes.every(
      (s) => s.completedAt === null || growing.time - s.completedAt < 40,
    ),
  );
});
