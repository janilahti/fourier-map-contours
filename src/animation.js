export const BASE_PLAYBACK_RATE = 1.75;
export const CYCLE_SECONDS = 20;
export const HIGHLIGHT_SECONDS = 1.1;
export const MAX_EPICYCLES = 512;

export function nextCount(count, limit = MAX_EPICYCLES) {
  const step = count < 64 ? count : count < 128 ? 32 : 64;
  return Math.min(MAX_EPICYCLES, limit, count + step);
}

export function growthRate(count) {
  return count < 8 ? 4 : count < 32 ? 2 : 1;
}

export const LAP_FADE_SECONDS = 0.8;
// Whole completed outlines fade on a real-time clock, not along the path.
export function traceOpacity(age) {
  return Math.max(0, Math.min(1, 1 - age / LAP_FADE_SECONDS));
}
export function highlightOpacity(age) {
  return Math.max(0, Math.min(1, 1 - age / HIGHLIGHT_SECONDS));
}

export class ContourAnimation {
  constructor(
    pointAt,
    { count = 64, growing = false, limit = MAX_EPICYCLES, startCount = 1 } = {},
  ) {
    this.pointAt = pointAt;
    this.growing = growing;
    this.limit = Math.max(
      1,
      Math.min(MAX_EPICYCLES, Math.round(limit) || MAX_EPICYCLES),
    );
    this.count = growing
      ? Math.max(1, Math.min(this.limit, Math.round(startCount) || 1))
      : count;
    this.startCount = this.count;
    this.curveCache = new Map();
    this.time = 0;
    this.elapsed = 0;
    this.cycle = 0;
    this.strokes = [this.newStroke()];
  }
  stopGrowing() {
    // Keep the clock, in-progress stroke, completed laps, and manual play state.
    this.growing = false;
    this.startCount = this.count;
  }
  newStroke() {
    return {
      count: this.count,
      samples: [{ p: this.pointAt(0, this.count), time: this.time }],
      completedAt: null,
      fadeAt: null,
    };
  }
  get phase() {
    return (this.time - this.cycle * CYCLE_SECONDS) / CYCLE_SECONDS;
  }
  countAtCycle(cycle) {
    let count = this.startCount;
    if (this.growing)
      for (let i = 0; i < cycle && count < this.limit; i++)
        count = nextCount(count, this.limit);
    return count;
  }
  curve(count) {
    if (!this.curveCache.has(count)) {
      const curve = Array.from({ length: 1024 }, (_, i) =>
        this.pointAt(i / 1024, count),
      );
      curve.push(curve[0].slice());
      this.curveCache.set(count, curve);
    }
    return this.curveCache.get(count);
  }
  opacity(stroke) {
    return stroke.fadeAt === null
      ? 1
      : traceOpacity(this.elapsed - stroke.fadeAt);
  }
  fadeOldStrokes() {
    for (const stroke of this.strokes)
      if (
        stroke.completedAt !== null &&
        stroke.fadeAt === null &&
        this.time >= stroke.completedAt + CYCLE_SECONDS
      )
        stroke.fadeAt = this.elapsed;
    this.strokes = this.strokes.filter((stroke) => this.opacity(stroke) > 0);
  }
  // Reconstruct only the visible recent laps, so seeking far ahead stays bounded.
  seek(seconds, rate = 1) {
    if (!Number.isFinite(seconds))
      throw new RangeError("Animation position must be finite");
    this.time = Math.max(0, seconds);
    this.elapsed = this.time / rate;
    this.cycle = Math.floor(this.time / CYCLE_SECONDS);
    this.count = this.countAtCycle(this.cycle);
    this.strokes = [];
    const first = Math.max(
      0,
      this.cycle - 1 - Math.ceil((LAP_FADE_SECONDS * rate) / CYCLE_SECONDS),
    );
    for (let cycle = first; cycle <= this.cycle; cycle++) {
      const count = this.countAtCycle(cycle),
        completedAt = cycle < this.cycle ? (cycle + 1) * CYCLE_SECONDS : null;
      const fadeAt =
        completedAt !== null && this.time >= completedAt + CYCLE_SECONDS
          ? (completedAt + CYCLE_SECONDS) / rate
          : null;
      if (fadeAt !== null && traceOpacity(this.elapsed - fadeAt) <= 0) continue;
      const phase = cycle < this.cycle ? 1 : this.phase,
        curve = this.curve(count),
        samples = [];
      for (let i = 0; i <= Math.floor(phase * 1024); i++)
        samples.push({
          p: curve[i],
          time: cycle * CYCLE_SECONDS + (i * CYCLE_SECONDS) / 1024,
        });
      if ((phase * 1024) % 1)
        samples.push({ p: this.pointAt(phase, count), time: this.time });
      this.strokes.push({ count, samples, completedAt, fadeAt });
    }
  }
  advance(seconds, elapsedSeconds = seconds) {
    if (seconds <= 0) return;
    const startTime = this.time,
      startElapsed = this.elapsed;
    const target = this.time + seconds;
    while (this.time < target - 1e-10) {
      const boundary = (this.cycle + 1) * CYCLE_SECONDS;
      const end = Math.min(target, boundary);
      const steps = Math.max(
        1,
        Math.ceil(((end - this.time) / CYCLE_SECONDS) * 1024),
      );
      const start = this.time;
      const stroke = this.strokes.at(-1);
      for (let i = 1; i <= steps; i++) {
        const time = start + ((end - start) * i) / steps;
        const phase = (time - this.cycle * CYCLE_SECONDS) / CYCLE_SECONDS;
        stroke.samples.push({ p: this.pointAt(phase, this.count), time });
      }
      this.time = end;
      if (end === boundary) {
        // Exact closure also avoids a visible open-path cap at low counts.
        stroke.samples.at(-1).p = stroke.samples[0].p.slice();
        stroke.completedAt = end;
        this.elapsed =
          startElapsed + ((end - startTime) / seconds) * elapsedSeconds;
        this.cycle++;
        if (this.growing) this.count = nextCount(this.count, this.limit);
        this.strokes.push(this.newStroke());
        this.fadeOldStrokes();
      }
    }
    this.elapsed = startElapsed + elapsedSeconds;
    this.fadeOldStrokes();
  }
}
