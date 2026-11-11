import { test } from "node:test";
import assert from "node:assert/strict";
import { AudioPreview } from "../src/audio-preview.js";
import { soundHarmonics } from "../src/harmonics.js";
function fakeContext(resume) {
  const parameter = () => ({
    value: 0,
    events: [],
    setValueAtTime(value, time) {
      this.value = value;
      this.events.push(["set", value, time]);
    },
    linearRampToValueAtTime(value, time) {
      this.events.push(["ramp", value, time]);
    },
    setTargetAtTime(value, time, constant) {
      this.events.push(["target", value, time, constant]);
    },
    cancelAndHoldAtTime() {},
  });
  const node = () => ({
    connections: [],
    connect(...args) {
      this.connections.push(args);
    },
    disconnect() {
      this.disconnected = true;
    },
  });
  const context = {
    currentTime: 1,
    state: "suspended",
    destination: {},
    oscillators: [],
    waves: [],
    gains: [],
    mergers: [],
    suspends: 0,
    async resume() {
      if (resume) await resume();
      this.state = "running";
    },
    async suspend() {
      this.suspends++;
      this.state = "suspended";
    },
    createGain() {
      const gain = { ...node(), gain: parameter() };
      this.gains.push(gain);
      return gain;
    },
    createChannelMerger(channels) {
      const merger = { ...node(), channels };
      this.mergers.push(merger);
      return merger;
    },
    createPeriodicWave(real, imag, options) {
      const wave = { real, imag, options };
      this.waves.push(wave);
      return wave;
    },
    createOscillator() {
      const oscillator = {
        ...node(),
        frequency: parameter(),
        setPeriodicWave(wave) {
          this.wave = wave;
        },
        start(time) {
          this.startTime = time;
        },
        stop(time) {
          this.stopTime = time;
        },
      };
      this.oscillators.push(oscillator);
      return oscillator;
    },
  };
  return context;
}
const signal = soundHarmonics([
  { frequency: 1, re: 0.5, im: 0 },
  { frequency: -1, re: 0.5, im: 0 },
]);
test("preview starts only on request, creates coherent stereo, and releases nodes/context when stopped", async () => {
  const context = fakeContext();
  let created = 0;
  const preview = new AudioPreview({
    createContext: () => {
      created++;
      return context;
    },
  });
  assert.equal(created, 0);
  await preview.play(
    { x: signal, y: signal },
    { mode: "stereo", pitch: 220, volume: 0.2 },
  );
  assert.equal(created, 1);
  assert.equal(preview.state, "playing");
  assert.equal(context.oscillators.length, 2);
  assert.equal(
    context.oscillators[0].startTime,
    context.oscillators[1].startTime,
  );
  assert.deepEqual(
    context.oscillators.map((o) => o.connections[0][2]),
    [0, 1],
  );
  assert.ok(
    context.waves.every(
      (w) =>
        w.options.disableNormalization && w.real[0] === 0 && w.imag[0] === 0,
    ),
  );
  preview.setPitch(110);
  assert.equal(context.oscillators[0].frequency.events.at(-1)[1], 110);
  preview.setVolume(0.1);
  assert.equal(context.gains[0].gain.events.at(-1)[1], 0.1);
  preview.stop();
  assert.equal(preview.state, "stopped");
  assert.ok(
    context.gains[0].gain.events.some((e) => e[0] === "ramp" && e[1] === 0),
  );
  for (const oscillator of context.oscillators) oscillator.onended();
  assert.ok(context.gains[0].disconnected);
  assert.ok(context.mergers[0].disconnected);
  assert.equal(context.suspends, 1);
});
test("stopping a pending resume prevents any later autoplay", async () => {
  let resolve;
  const context = fakeContext(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const preview = new AudioPreview({ createContext: () => context });
  const starting = preview.play({ x: signal, y: signal });
  preview.stop();
  resolve();
  assert.equal(await starting, false);
  assert.equal(preview.state, "stopped");
  assert.equal(context.oscillators.length, 0);
  assert.equal(context.state, "suspended");
});
test("changing signals crossfades old voices and never suspends the new active preview", async () => {
  const context = fakeContext();
  const preview = new AudioPreview({ createContext: () => context });
  await preview.play({ x: signal, y: signal });
  const old = context.oscillators[0];
  await preview.play({ x: signal, y: signal }, { mode: "y" });
  assert.ok(old.stopTime > context.currentTime);
  old.onended();
  assert.equal(context.suspends, 0);
  assert.equal(preview.state, "playing");
  preview.stop();
  context.oscillators[1].onended();
  assert.equal(context.state, "suspended");
});

test("a rejected audio resume returns to a stopped state without creating oscillators", async () => {
  const context = fakeContext(async () => {
    throw new Error("Audio unavailable");
  });
  const preview = new AudioPreview({ createContext: () => context });
  await assert.rejects(
    preview.play({ x: signal, y: signal }),
    /Audio unavailable/,
  );
  assert.equal(preview.state, "stopped");
  assert.equal(context.oscillators.length, 0);
});
