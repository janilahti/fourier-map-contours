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

// Fade envelope: growth fades immediately; ordinary traces hold an extra lap.
export function traceOpacity(age, growing = false) {
  return Math.max(
    0,
    Math.min(
      1,
      1 -
        (age - (growing ? 0 : CYCLE_SECONDS)) /
          ((growing ? 1 : 2) * CYCLE_SECONDS),
    ),
  );
}
// Age each piece from when it was drawn. Keep it until the next pass reaches
// the same position, then fade it; the still-undrawn end never dims early.
export function traceSampleOpacity(age, growing = false) {
  return traceOpacity(age - CYCLE_SECONDS, growing);
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
    this.cycle = 0;
    this.strokes = [this.newStroke()];
  }
  newStroke() {
    return {
      count: this.count,
      samples: [{ p: this.pointAt(0, this.count), time: this.time }],
      completedAt: null,
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
    if (!this.curveCache.has(count))
      this.curveCache.set(
        count,
        Array.from({ length: 1025 }, (_, i) => this.pointAt(i / 1024, count)),
      );
    return this.curveCache.get(count);
  }
  // Reconstruct only the visible recent laps, so seeking far ahead stays bounded.
  seek(seconds) {
    if (!Number.isFinite(seconds))
      throw new RangeError("Animation position must be finite");
    this.time = Math.max(0, seconds);
    this.cycle = Math.floor(this.time / CYCLE_SECONDS);
    this.count = this.countAtCycle(this.cycle);
    this.strokes = [];
    const first = Math.max(0, this.cycle - (this.growing ? 2 : 4));
    for (let cycle = first; cycle <= this.cycle; cycle++) {
      const count = this.countAtCycle(cycle),
        completedAt = cycle < this.cycle ? (cycle + 1) * CYCLE_SECONDS : null;
      if (
        completedAt !== null &&
        traceSampleOpacity(this.time - completedAt, this.growing) <= 0
      )
        continue;
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
      this.strokes.push({ count, samples, completedAt });
    }
  }
  advance(seconds) {
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
        stroke.completedAt = end;
        this.cycle++;
        if (this.growing) this.count = nextCount(this.count, this.limit);
        this.strokes.push(this.newStroke());
      }
    }
    this.strokes = this.strokes.filter(
      (stroke) =>
        stroke.completedAt === null ||
        traceSampleOpacity(this.time - stroke.completedAt, this.growing) > 0,
    );
  }
}
