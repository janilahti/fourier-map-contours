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
      pending: null,
    });
    this.tick = (now) => {
      this.pending = null;
      if (!this.visible) return;
      this.draw(now);
      if (this.running) this.invalidate();
    };
  }
  invalidate() {
    if (this.visible && this.pending === null)
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
  setVisible(value) {
    if (value === this.visible) return;
    this.visible = value;
    if (!value && this.pending !== null) {
      this.cancel(this.pending);
      this.pending = null;
    }
    if (value) {
      this.onResume();
      this.invalidate();
    }
  }
}
