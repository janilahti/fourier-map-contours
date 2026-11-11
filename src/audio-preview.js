import { periodicWaveCoefficients } from "./harmonics.js";
const FADE_SECONDS = 0.04;
function hold(parameter, now) {
  if (parameter.cancelAndHoldAtTime) parameter.cancelAndHoldAtTime(now);
  else {
    parameter.cancelScheduledValues(now);
    parameter.setValueAtTime(parameter.value, now);
  }
}

export class AudioPreview {
  constructor({
    createContext = () =>
      new (globalThis.AudioContext || globalThis.webkitAudioContext)(),
    onStateChange = () => {},
  } = {}) {
    Object.assign(this, {
      createContext,
      onStateChange,
      context: null,
      state: "stopped",
      generation: 0,
      active: null,
      retiring: new Set(),
    });
  }
  setState(state) {
    this.state = state;
    this.onStateChange(state);
  }
  suspendIfIdle() {
    if (
      this.context &&
      this.state === "stopped" &&
      !this.active &&
      !this.retiring.size
    )
      Promise.resolve(this.context.suspend()).catch(() => {});
  }
  releaseActive() {
    const voice = this.active;
    if (!voice) return;
    this.active = null;
    this.retiring.add(voice);
    const now = this.context.currentTime;
    if (this.context.state === "running") {
      const gain = voice.gain.gain;
      hold(gain, now);
      gain.linearRampToValueAtTime(0, now + FADE_SECONDS);
      for (const oscillator of voice.oscillators)
        oscillator.stop(now + FADE_SECONDS + 0.005);
    } else {
      for (const oscillator of voice.oscillators) {
        oscillator.stop();
        oscillator.disconnect();
      }
      voice.gain.disconnect();
      voice.merger?.disconnect();
      this.retiring.delete(voice);
    }
  }
  async play(signals, { mode = "x", pitch = 110, volume = 0.15 } = {}) {
    const generation = ++this.generation;
    this.setState("starting");
    try {
      if (!this.context || this.context.state === "closed")
        this.context = this.createContext();
      await this.context.resume();
      if (generation !== this.generation) {
        this.suspendIfIdle();
        return false;
      }
      this.releaseActive();
      const context = this.context,
        start = context.currentTime + 0.005;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(volume, start + FADE_SECONDS);
      gain.connect(context.destination);
      const voice = {
        gain,
        merger: mode === "stereo" ? context.createChannelMerger(2) : null,
        oscillators: [],
      };
      voice.merger?.connect(gain);
      const axes = mode === "stereo" ? ["x", "y"] : [mode];
      for (const [channel, axis] of axes.entries()) {
        const oscillator = context.createOscillator();
        const { real, imag } = periodicWaveCoefficients(signals[axis]);
        oscillator.setPeriodicWave(
          context.createPeriodicWave(real, imag, {
            disableNormalization: true,
          }),
        );
        oscillator.frequency.setValueAtTime(pitch, start);
        if (voice.merger) oscillator.connect(voice.merger, 0, channel);
        else oscillator.connect(gain);
        voice.oscillators.push(oscillator);
      }
      let remaining = voice.oscillators.length;
      for (const oscillator of voice.oscillators) {
        oscillator.onended = () => {
          oscillator.disconnect();
          if (--remaining === 0) {
            gain.disconnect();
            voice.merger?.disconnect();
            this.retiring.delete(voice);
            this.suspendIfIdle();
          }
        };
        oscillator.start(start);
      }
      this.active = voice;
      this.setState("playing");
      return true;
    } catch (error) {
      if (generation === this.generation) {
        this.stop();
        throw error;
      }
      return false;
    }
  }
  setPitch(pitch) {
    for (const oscillator of this.active?.oscillators ?? []) {
      hold(oscillator.frequency, this.context.currentTime);
      oscillator.frequency.setTargetAtTime(
        pitch,
        this.context.currentTime,
        0.02,
      );
    }
  }
  setVolume(volume) {
    if (this.active) {
      hold(this.active.gain.gain, this.context.currentTime);
      this.active.gain.gain.setTargetAtTime(
        volume,
        this.context.currentTime,
        0.015,
      );
    }
  }
  stop() {
    this.generation++;
    this.releaseActive();
    this.setState("stopped");
    this.suspendIfIdle();
  }
}
