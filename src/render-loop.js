export class RenderLoop {
  constructor(
    draw,
    {
      request = (callback) => requestAnimationFrame(callback),
      cancel = (id) => cancelAnimationFrame(id),
      now = () => performance.now(),
      focusTransitionMs = 0,
      onResume = () => {},
      onSuspend = () => {},
    } = {},
  ) {
    Object.assign(this, {
      draw,
      request,
      cancel,
      now,
      focusTransitionMs,
      onResume,
      onSuspend,
      running: false,
      visible: true,
      focused: true,
      pending: null,
      motionScale: 1,
      focusTransition: null,
    });
    this.tick = (now) => {
      this.pending = null;
      this.sampleMotion(now);
      if (!this.active) {
        this.onSuspend();
        return;
      }
      this.draw(now, this.motionScale);
      if (this.running) this.invalidate();
    };
  }
  sampleMotion(now) {
    const transition = this.focusTransition;
    if (!transition) return;
    const progress = Math.max(
      0,
      Math.min(1, (now - transition.start) / this.focusTransitionMs),
    );
    const eased = progress * progress * (3 - 2 * progress);
    this.motionScale =
      transition.from + (transition.to - transition.from) * eased;
    if (progress === 1) {
      this.motionScale = transition.to;
      this.focusTransition = null;
    }
  }
  transitionTo(target) {
    this.sampleMotion(this.now());
    if (
      this.focusTransitionMs > 0 &&
      this.running &&
      this.visible &&
      this.motionScale !== target
    ) {
      this.focusTransition = {
        from: this.motionScale,
        to: target,
        start: this.now(),
      };
    } else {
      this.motionScale = target;
      this.focusTransition = null;
    }
  }
  invalidate() {
    if (this.active && this.pending === null)
      this.pending = this.request(this.tick);
  }
  setRunning(value) {
    if (value && !this.running) this.onResume();
    if (!value) {
      this.focusTransition = null;
      this.motionScale = this.focused && this.visible ? 1 : 0;
      this.cancelPending();
    }
    this.running = value;
    this.invalidate();
  }
  get active() {
    return (
      this.visible &&
      (this.focused || (this.running && this.focusTransition !== null))
    );
  }
  cancelPending() {
    if (this.pending !== null) {
      this.cancel(this.pending);
      this.pending = null;
    }
  }
  refresh(wasActive) {
    if (!this.active) {
      this.cancelPending();
      if (wasActive) this.onSuspend();
    } else {
      if (!wasActive) this.onResume();
      this.invalidate();
    }
  }
  setVisible(value) {
    if (value === this.visible) return;
    const wasActive = this.active;
    this.visible = value;
    if (!value) {
      // Hidden tabs and offscreen canvases must never spend frames easing out.
      this.motionScale = 0;
      this.focusTransition = null;
    } else this.transitionTo(this.focused ? 1 : 0);
    this.refresh(wasActive);
  }
  setFocused(value) {
    if (value === this.focused) return;
    // A covered window may have throttled RAF before the final ease-out tick.
    this.sampleMotion(this.now());
    const wasActive = this.active;
    this.focused = value;
    if (this.visible) this.transitionTo(value ? 1 : 0);
    else {
      this.motionScale = 0;
      this.focusTransition = null;
    }
    this.refresh(wasActive);
  }
}
