export class RenderLoop {
  constructor(
    draw,
    {
      request = (callback) => requestAnimationFrame(callback),
      cancel = (id) => cancelAnimationFrame(id),
      onResume = () => {},
    } = {},
  ) {
    Object.assign(this, {
      draw,
      request,
      cancel,
      onResume,
      running: false,
      visible: true,
      focused: true,
      pending: null,
    });
    this.tick = (now) => {
      this.pending = null;
      if (!this.active) return;
      this.draw(now);
      if (this.running) this.invalidate();
    };
  }
  invalidate() {
    if (this.active && this.pending === null)
      this.pending = this.request(this.tick);
  }
  setRunning(value) {
    if (value && !this.running) this.onResume();
    this.running = value;
    if (!value && this.pending !== null) {
      this.cancel(this.pending);
      this.pending = null;
    }
    this.invalidate();
  }
  get active() {
    return this.visible && this.focused;
  }
  setVisible(value) {
    this.setAvailability("visible", value);
  }
  setFocused(value) {
    this.setAvailability("focused", value);
  }
  setAvailability(key, value) {
    const wasActive = this.active;
    this[key] = value;
    if (this.active === wasActive) return;
    if (!this.active && this.pending !== null) {
      this.cancel(this.pending);
      this.pending = null;
    }
    if (this.active) {
      this.onResume();
      this.invalidate();
    }
  }
}
