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
