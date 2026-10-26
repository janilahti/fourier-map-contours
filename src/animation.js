export const BASE_PLAYBACK_RATE = 1.75;
export const CYCLE_SECONDS = 20;
export const HIGHLIGHT_SECONDS = 1.1;
export const MAX_EPICYCLES = 256;

export function nextCount(count, limit = MAX_EPICYCLES) {
  const step =
    count < 8
      ? 1
      : count < 16
        ? 2
        : count < 32
          ? 4
          : count < 64
            ? 8
            : count < 128
              ? 16
              : 32;
  return Math.min(MAX_EPICYCLES, limit, count + step);
}

// Growth traces fade immediately; ordinary traces hold for one extra cycle.
export function traceOpacity(age, growing = false) {
  return Math.max(
    0,
    Math.min(
      1,
      1 - (age - (growing ? 0 : CYCLE_SECONDS)) / (2 * CYCLE_SECONDS),
    ),
  );
}
export function highlightOpacity(age) {
  return Math.max(0, Math.min(1, 1 - age / HIGHLIGHT_SECONDS));
}

export class ContourAnimation {
  constructor(
    pointAt,
    { count = 64, growing = false, limit = MAX_EPICYCLES } = {},
  ) {
    this.pointAt = pointAt;
    this.growing = growing;
    this.limit = Math.max(
      1,
      Math.min(MAX_EPICYCLES, Math.round(limit) || MAX_EPICYCLES),
    );
    this.count = growing ? 1 : count;
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
        traceOpacity(this.time - stroke.completedAt, this.growing) > 0,
    );
  }
}
