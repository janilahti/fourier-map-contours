import { soundHarmonics, harmonicsCsv } from "./harmonics.js";
import { AudioPreview } from "./audio-preview.js";
import { icon } from "./icons.js";
const pitches = [
  ["C2", 36],
  ["A2", 45],
  ["C3", 48],
  ["A3", 57],
  ["C4", 60],
  ["A4", 69],
];
export const soundPanelMarkup = `<details id="sound-panel" class="sound-panel"><summary>Hear the outline <span>· 16 harmonics</span></summary>
<div class="sound-content"><p id="sound-source">Choose an outline to explore its harmonics.</p><p class="sound-explanation">Uses the main region’s full projected outline, independently of animation controls. One trip around the border becomes one audio period. Harmonics are ordered by frequency.</p>
<div class="sound-controls"><div><label for="sound-axis">Signal</label><select id="sound-axis"><option value="x">x coordinate</option><option value="y">y coordinate</option><option value="stereo">Stereo · x left, y right</option></select></div><div><label for="sound-pitch">Pitch</label><select id="sound-pitch">${pitches
  .map(([name, midi]) => {
    const hz = 440 * 2 ** ((midi - 69) / 12);
    return `<option value="${hz}" ${midi === 45 ? "selected" : ""}>${name} · ${Number(hz.toFixed(2))} Hz</option>`;
  })
  .join(
    "",
  )}</select></div><div><label for="sound-volume">Volume <output id="sound-volume-value">15%</output></label><input id="sound-volume" type="range" min="0" max="100" value="15"></div></div>
<div class="sound-actions"><button id="sound-toggle" type="button" disabled>${icon("play")}<span>Listen</span></button><button id="sound-download" type="button" disabled>Download x/y CSV</button></div><p id="sound-status" role="status" aria-live="polite">Preview is off.</p>
<p class="sound-explanation">Constant offsets are removed. Each signal’s amplitudes sum to 1 for peak-safe normalization; dB levels are relative to its largest harmonic. Phases use sine waves and align each signal independently to its fundamental’s rising zero crossing. If that harmonic is negligible, the strongest harmonic supplies the reference.</p><div class="sound-tables"><div class="sound-table-wrap"><table id="sound-x-table"><caption>x(t)</caption><thead><tr><th scope="col">k</th><th scope="col">Amplitude</th><th scope="col">dB</th><th scope="col">Phase (°)</th></tr></thead><tbody></tbody></table></div><div class="sound-table-wrap"><table id="sound-y-table"><caption>y(t)</caption><thead><tr><th scope="col">k</th><th scope="col">Amplitude</th><th scope="col">dB</th><th scope="col">Phase (°)</th></tr></thead><tbody></tbody></table></div></div></div></details>`;

export function mountSoundPanel(root) {
  const get = (selector) => root.querySelector(selector);
  const button = get("#sound-toggle"),
    status = get("#sound-status");
  const supported = !!(
    globalThis.AudioContext || globalThis.webkitAudioContext
  );
  let signals = null,
    metadata = null,
    error = "";
  const options = () => ({
    mode: get("#sound-axis").value,
    pitch: +get("#sound-pitch").value,
    volume: +get("#sound-volume").value / 100,
  });
  const silent = () =>
    signals &&
    (options().mode === "stereo"
      ? signals.x.silent && signals.y.silent
      : signals[options().mode].silent);
  const renderState = () => {
    button.disabled = !signals || !supported || silent();
    const active = preview.state !== "stopped";
    button.innerHTML = `${icon(active ? "stop" : "play")}<span>${active ? "Stop" : "Listen"}</span>`;
    get("#sound-download").disabled = !signals;
    status.textContent =
      error ||
      (!supported
        ? "Audio preview is unavailable in this browser. The tables and CSV download still work."
        : !signals
          ? "Choose an outline to explore its harmonics."
          : silent()
            ? "This coordinate has no audible harmonics."
            : active
              ? preview.state === "starting"
                ? "Starting preview…"
                : "Listening. Pitch is independent of drawing speed."
              : "Preview is off.");
  };
  const preview = new AudioPreview({ onStateChange: renderState });
  const play = async () => {
    if (!signals || silent()) return;
    error = "";
    try {
      await preview.play(signals, options());
    } catch {
      error =
        "Could not start audio. You can still use the harmonic tables and CSV download.";
      renderState();
    }
  };
  button.addEventListener("click", () => {
    if (preview.state === "stopped") play();
    else preview.stop();
  });
  get("#sound-axis").addEventListener("change", () => {
    if (preview.state !== "stopped") {
      if (silent()) preview.stop();
      else play();
    }
    renderState();
  });
  get("#sound-pitch").addEventListener("change", () =>
    preview.setPitch(options().pitch),
  );
  get("#sound-volume").addEventListener("input", () => {
    get("#sound-volume-value").textContent = `${get("#sound-volume").value}%`;
    preview.setVolume(options().volume);
  });
  root.addEventListener("toggle", () => {
    if (!root.open) preview.stop();
  });
  window.addEventListener("blur", () => preview.stop());
  window.addEventListener("pagehide", () => preview.stop());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) preview.stop();
  });
  get("#sound-download").addEventListener("click", () => {
    if (!signals) return;
    const blob = new Blob(
      ["\ufeff", harmonicsCsv(signals, metadata, options().pitch)],
      { type: "text/csv;charset=utf-8" },
    );
    const href = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = href;
    link.download = `border-orbit-${metadata.id}-${metadata.projectionId}-harmonics.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  });
  const clear = (message = "Choose an outline to explore its harmonics.") => {
    signals = null;
    metadata = null;
    preview.stop();
    error = "";
    get("#sound-source").textContent = message;
    for (const axis of ["x", "y"]) {
      get(`#sound-${axis}-table tbody`).replaceChildren();
      get(`#sound-${axis}-table caption`).textContent = `${axis}(t)`;
    }
    renderState();
  };
  renderState();
  return {
    clear,
    setOutline(series, details) {
      preview.stop();
      error = "";
      signals = { x: soundHarmonics(series.x), y: soundHarmonics(series.y) };
      metadata = details;
      get("#sound-source").textContent =
        `${details.name} · ${details.projection} · harmonics 1–16`;
      for (const axis of ["x", "y"]) {
        const signal = signals[axis];
        get(`#sound-${axis}-table caption`).textContent =
          `${axis}(t) · ${signal.referenceHarmonic === 1 ? "fundamental reference" : signal.referenceHarmonic ? `k=${signal.referenceHarmonic} reference (fundamental negligible)` : "silent"}`;
        get(`#sound-${axis}-table tbody`).innerHTML = signal.harmonics
          .map(
            (h) =>
              `<tr><th scope="row">${h.harmonic}</th><td>${h.amplitude ? h.amplitude.toPrecision(4) : "0"}</td><td>${h.levelDb === null ? "−∞" : h.levelDb.toFixed(1)}</td><td>${h.phaseDegrees === null ? "—" : h.phaseDegrees.toFixed(1)}</td></tr>`,
          )
          .join("");
      }
      renderState();
    },
    stop: () => preview.stop(),
  };
}
