import { test } from "node:test";
import assert from "node:assert/strict";
import { RenderLoop } from "../src/render-loop.js";
test("paused views render on demand and hidden views stop requesting frames without time catch-up", () => {
  let id = 0,
    draws = 0,
    resumes = 0;
  const queued = new Map();
  const loop = new RenderLoop(() => draws++, {
    request: (cb) => {
      queued.set(++id, cb);
      return id;
    },
    cancel: (id) => queued.delete(id),
    onResume: () => resumes++,
  });
  const tick = () => {
    const [id, cb] = queued.entries().next().value;
    queued.delete(id);
    cb(10);
  };
  loop.invalidate();
  loop.invalidate();
  assert.equal(queued.size, 1);
  tick();
  assert.equal(draws, 1);
  assert.equal(queued.size, 0);
  loop.setRunning(true);
  tick();
  assert.equal(queued.size, 1);
  loop.setVisible(false);
  assert.equal(queued.size, 0);
  loop.invalidate();
  assert.equal(queued.size, 0);
  loop.setVisible(true);
  assert.equal(resumes, 2);
  tick();
  assert.equal(queued.size, 1);
  loop.setRunning(false);
  tick();
  assert.equal(queued.size, 0);
});

test("unfocused windows cancel frames even while visible, and refocusing preserves manual pause", () => {
  let id = 0,
    draws = 0,
    resumes = 0;
  const queued = new Map();
  const loop = new RenderLoop(() => draws++, {
    request: (cb) => {
      queued.set(++id, cb);
      return id;
    },
    cancel: (id) => queued.delete(id),
    onResume: () => resumes++,
  });
  const tick = () => {
    const [id, cb] = queued.entries().next().value;
    queued.delete(id);
    cb(10);
  };
  loop.setRunning(true);
  tick();
  assert.equal(queued.size, 1);
  loop.setFocused(false);
  assert.equal(loop.visible, true);
  assert.equal(loop.active, false);
  assert.equal(queued.size, 0);
  loop.invalidate();
  loop.setVisible(false);
  loop.setVisible(true);
  assert.equal(queued.size, 0, "visibility alone does not override lost focus");
  const before = resumes;
  loop.setFocused(true);
  assert.equal(resumes, before + 1, "resume resets the animation clock");
  tick();
  assert.equal(draws, 2);
  loop.setFocused(false);
  loop.setRunning(false);
  loop.setFocused(true);
  tick();
  assert.equal(loop.running, false);
  assert.equal(queued.size, 0, "manual pause remains paused after refocus");
});

function easedLoop() {
  let time = 0,
    id = 0;
  const queued = new Map(),
    frames = [];
  const loop = new RenderLoop((now, scale) => frames.push({ now, scale }), {
    focusTransitionMs: 450,
    now: () => time,
    request: (cb) => {
      queued.set(++id, cb);
      return id;
    },
    cancel: (id) => queued.delete(id),
  });
  const tick = (now) => {
    time = now;
    const [key, cb] = queued.entries().next().value;
    queued.delete(key);
    cb(time);
  };
  return {
    loop,
    queued,
    frames,
    tick,
    setTime: (now) => {
      time = now;
    },
  };
}

test("focus easing decelerates to zero, stops frame requests, and accelerates on return", () => {
  const { loop, queued, frames, tick } = easedLoop();
  loop.setRunning(true);
  tick(0);
  loop.setFocused(false);
  assert.equal(loop.running, true);
  tick(225);
  assert.equal(frames.at(-1).scale, 0.5);
  tick(450);
  assert.equal(loop.motionScale, 0);
  assert.equal(loop.active, false);
  assert.equal(queued.size, 0);
  loop.setFocused(true);
  tick(450);
  assert.equal(frames.at(-1).scale, 0);
  tick(675);
  assert.equal(frames.at(-1).scale, 0.5);
  tick(900);
  assert.equal(frames.at(-1).scale, 1);
  assert.equal(loop.running, true);
});

test("refocusing midway reverses smoothly and repeated events do not prolong transitions", () => {
  const { loop, frames, tick } = easedLoop();
  loop.setRunning(true);
  tick(0);
  loop.setFocused(false);
  tick(225);
  const turningSpeed = loop.motionScale;
  loop.setFocused(true);
  tick(225);
  assert.equal(frames.at(-1).scale, turningSpeed);
  tick(450);
  assert.equal(frames.at(-1).scale, 0.75);
  loop.setFocused(true);
  tick(675);
  assert.equal(frames.at(-1).scale, 1);
});

test("hidden views and manual pause cancel focus easing immediately", () => {
  const { loop, queued, tick } = easedLoop();
  loop.setRunning(true);
  tick(0);
  loop.setFocused(false);
  tick(100);
  loop.setVisible(false);
  assert.equal(queued.size, 0);
  assert.equal(loop.motionScale, 0);
  loop.setFocused(true);
  assert.equal(queued.size, 0);
  loop.setVisible(true);
  tick(100);
  assert.equal(loop.motionScale, 0);
  tick(200);
  loop.setRunning(false);
  tick(225);
  assert.equal(loop.running, false);
  assert.equal(queued.size, 0);
  loop.setFocused(false);
  loop.setFocused(true);
  tick(300);
  assert.equal(queued.size, 0, "refocus never overrides manual pause");
});

test("refocus after browser-throttled frames resets the clock before accelerating", () => {
  const { loop, tick, setTime } = easedLoop();
  let resumes = 0;
  loop.onResume = () => resumes++;
  loop.setRunning(true);
  tick(0);
  loop.setFocused(false);
  tick(100);
  setTime(5000); // The browser stopped delivering RAF while the window was covered.
  loop.setFocused(true);
  assert.equal(resumes, 2);
  tick(5000);
  assert.equal(loop.motionScale, 0);
  tick(5225);
  assert.equal(loop.motionScale, 0.5);
});
