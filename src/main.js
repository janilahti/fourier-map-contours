import "./style.css";
import {
  TAU,
  mainRing,
  resample,
  transform,
  evaluate,
  fitDrawing,
  reconstructionError,
} from "./math.js";
import {
  ContourAnimation,
  highlightOpacity,
  traceOpacity,
  BASE_PLAYBACK_RATE,
} from "./animation.js";
import { palettes, canvasColors } from "./palettes.js";
const $ = (s) => document.querySelector(s);
$("#app").innerHTML =
  `<main><section class="intro"><div class="intro-kicker"><span>GEOGRAPHY, IN FREQUENCY SPACE</span><span>AN INTERACTIVE FOURIER ATLAS</span></div><div class="intro-body"><h1>A world drawn<br>by <em>circles.</em></h1><p class="lede">Every coastline is a rhythm.<br>Watch rotating vectors reconstruct the<br>outline of a country, one orbit at a time.</p></div></section>
<section class="studio"><aside><div class="panel-heading"><span class="eyebrow">THE INSTRUMENT</span><span class="dot"></span></div>
<div class="control-heading"><label for="country">Choose a country</label><button class="info-button" type="button" aria-label="About country outlines" aria-expanded="false" aria-controls="country-info">i</button><p class="info-tip" id="country-info" role="tooltip" hidden>Only the largest connected outer region is drawn. This Fourier drawing follows one continuous, closed path; separate islands would require pen lifts or artificial connecting lines.</p></div><select id="country" disabled><option>Loading atlas…</option></select>
<div class="control-heading"><label for="mode">Fourier representation</label><button class="info-button" type="button" aria-label="About Fourier representations" aria-expanded="false" aria-controls="mode-info">i</button><p class="info-tip" id="mode-info" role="tooltip" hidden>Complex mode treats x + iy as one signal and adds one chain of rotating vectors. Separate mode reconstructs x and y independently; their crosshair marks the drawing point.</p></div><select id="mode"><option value="complex">Complex plane · z(t) = x(t) + iy(t)</option><option value="separate">Separate series · x(t) and y(t)</option></select>
<div class="control-heading"><label for="count">Epicycles <output id="count-value">64</output></label><button class="info-button" type="button" aria-label="About epicycles" aria-expanded="false" aria-controls="count-info">i</button><p class="info-tip" id="count-info" role="tooltip" hidden>Epicycles are circles traced by rotating Fourier vectors. Radius is amplitude, rotation rate is frequency, and starting angle is phase. More circles recover finer detail. The count is per chain in separate mode.</p></div><div class="count-control"><button id="decrease" type="button" aria-label="Decrease epicycles by one">−</button><input id="count" type="range" min="1" max="256" value="64"><button id="increase" type="button" aria-label="Increase epicycles by one">+</button></div><div class="range-labels"><span>ABSTRACT</span><span>DETAILED</span></div><p class="hint" id="budget">64 rotating vectors, largest amplitudes first</p>
<div class="growth-controls"><label><input id="grow" type="checkbox"> Build up epicycles</label><p class="hint">Start with one and grow to 256. Older outlines gradually fade.</p></div>
<label for="speed"><span>Drawing speed <output id="speed-value">1×</output></span></label><div class="count-control"><button id="slower" type="button" aria-label="Decrease drawing speed one notch">−</button><input id="speed" type="range" min="0.25" max="3" step="0.25" value="1"><button id="faster" type="button" aria-label="Increase drawing speed one notch">+</button></div>
<label class="checkbox-row reverse-control"><input id="direction" type="checkbox"> Reverse playback</label>
<label for="palette"><span>Colour palette</span></label><select id="palette">${palettes.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}</select>

<div class="toggles"><label><input id="circles" type="checkbox" checked> Show epicycles</label><label><input id="guide" type="checkbox" checked> Reference outline</label><label><input id="glow" type="checkbox" checked> Highlight the drawing tip</label><label><input id="values" type="checkbox" aria-controls="math-panel"> Show equations &amp; live values</label></div>
<div class="actions"><button id="play" disabled>Ⅱ Pause</button><button id="reset" disabled aria-label="Restart drawing">↺ Restart</button></div>
</aside><div class="drawing"><div class="canvas-heading"><span><span class="dot"></span> <span id="state">LOADING ATLAS</span></span><span id="mode-label">COMPLEX SERIES</span></div><canvas aria-label="Animated country outline drawn by Fourier epicycles" role="img"></canvas><div class="canvas-footer"><span id="country-name">—</span><span class="canvas-metrics"><span id="canvas-count">64 epicycles</span><span id="progress" title="Estimated root-mean-square distance between matching points on the reconstructed and original outline, as a percentage of the outline’s bounding-box diagonal.">RMS error —</span></span></div><section id="math-panel" class="math-panel" aria-label="Fourier equations and live values" hidden><p id="equation"></p><p class="math-units">Coordinates are normalized to the selected outline. t is measured in cycles.</p><output id="live-values"></output><details id="coefficients"><summary>Largest coefficients · amplitude, frequency &amp; phase</summary><div id="coefficient-table"></div></details></section><div id="error" role="alert" hidden></div></div></section>
<section class="notes"><div><span class="eyebrow">THE IDEA</span><h2>From a border to a wave.</h2><p>Sample an outline at equal distances. A discrete Fourier transform turns those points into rotating vectors. Add their tips together, and the border appears again.</p></div><div><span class="eyebrow">THE CIRCLES</span><h2>Small orbits. Fine details.</h2><p>Each epicycle has an amplitude (radius), frequency (rotation rate), and phase (starting angle). The largest amplitudes are drawn first. More circles recover finer details.</p></div><div><span class="eyebrow">TWO WAYS TO DRAW</span><h2>One plane, or two axes.</h2><p>The complex mode draws a single vector chain. Separate mode uses one chain for x and one for y; their crosshair locates the drawing tip. The circle count applies to each chain.</p></div></section></main>
<footer><span>BORDER / ORBIT <span class="muted">· A little mathematics, a whole world.</span></span><a class="repo-link" href="https://github.com/janilahti/fourier-map-contours" target="_blank" rel="noreferrer">Source on GitHub ↗</a><span>Map data: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a> · 1:50m · Public domain</span></footer>`;
const canvas = $("canvas"),
  ctx = canvas.getContext("2d");
let countries = [],
  points = [],
  complex = [],
  xs = [],
  ys = [],
  animation = null,
  playing = !matchMedia("(prefers-reduced-motion: reduce)").matches,
  last = 0,
  width = 0,
  height = 0,
  scale = 1,
  origin = [0, 0],
  xSource = [0, 0],
  ySource = [0, 0];
const val = (id) => $(id).value;
const direction = () => ($("#direction").checked ? -1 : 1);
let colors = canvasColors(),
  lastReadout = 0;
const equationComplex = "z(t) = Σ Aₖ exp(i(2πk t + φₖ)) = x(t) + i y(t)";
const equationSeparate =
  "x(t) = Σ Aₓ,ₖ cos(2πk t + φₓ,ₖ) · y(t) = Σ Aᵧ,ₖ cos(2πk t + φᵧ,ₖ)";
function updateMath(tr) {
  const separate = val("#mode") === "separate";
  $("#equation").textContent = separate ? equationSeparate : equationComplex;
  const groups = separate
    ? [
        ["x", tr.x],
        ["y", tr.y],
      ]
    : [["z", tr.c]];
  $("#coefficient-table").innerHTML = groups
    .map(
      ([label, series]) =>
        `<table><caption>${label}(t) · largest ${Math.min(8, series.length)} of ${series.length} terms</caption><thead><tr><th scope="col">k</th><th scope="col">A</th><th scope="col">φ (rad)</th></tr></thead><tbody>${series
          .slice(0, 8)
          .map(
            (c) =>
              `<tr><td>${c.frequency}</td><td>${c.amplitude.toFixed(4)}</td><td>${Math.atan2(c.im, c.re).toFixed(3)}</td></tr>`,
          )
          .join("")}</tbody></table>`,
    )
    .join("");
}
$("#palette").addEventListener("change", () => {
  document.documentElement.dataset.palette = val("#palette");
  colors = canvasColors();
});
$("#values").addEventListener("change", () => {
  $("#math-panel").hidden = !$("#values").checked;
  updateMath(terms());
  lastReadout = 0;
});
function syncCount() {
  const count = animation?.count ?? +val("#count");
  $("#count").value = count;
  $("#count-value").textContent = count;
  $("#budget").textContent =
    `${count} rotating vector${count === 1 ? "" : "s"}${val("#mode") === "separate" ? " per axis" : ""}, largest amplitudes first`;
  $("#count").disabled = $("#grow").checked;
  $("#decrease").disabled = $("#grow").checked || count <= 1;
  $("#increase").disabled = $("#grow").checked || count >= 256;
  $("#canvas-count").textContent =
    val("#mode") === "separate"
      ? `${count} ${count === 1 ? "epicycle" : "epicycles"} / axis`
      : `${count} ${count === 1 ? "epicycle" : "epicycles"}`;
  if (points.length)
    $("#progress").textContent =
      `RMS error ${reconstructionError(points, terms(count), val("#mode") === "separate").toFixed(2)}%`;
  updateMath(terms(count));
}
function reset() {
  animation = points.length
    ? new ContourAnimation(
        (phase, count) => pointAt(phase * direction(), terms(count)),
        {
          count: +val("#count"),
          growing: $("#grow").checked,
          limit: 256,
        },
      )
    : null;
  last = 0;
  syncCount();
}
function choose() {
  const feature = countries.find((f) => f.properties.id === val("#country"));
  points = resample(mainRing(feature.geometry));
  complex = transform(points);
  xs = transform(points.map((p) => [p[0], 0]));
  ys = transform(points.map((p) => [p[1], 0]));
  $("#country-name").textContent = feature.properties.name;
  reset();
  layout();
  updateMath(terms());
}
function terms(n = animation?.count ?? +val("#count")) {
  return { c: complex.slice(0, n), x: xs.slice(0, n), y: ys.slice(0, n) };
}
function pointAt(u, tr) {
  return val("#mode") === "complex"
    ? evaluate(tr.c, u)
    : [evaluate(tr.x, u)[0], evaluate(tr.y, u)[0]];
}
function layout() {
  const r = canvas.getBoundingClientRect(),
    d = Math.min(devicePixelRatio || 1, 2);
  width = r.width;
  height = r.height;
  canvas.width = Math.round(width * d);
  canvas.height = Math.round(height * d);
  ctx.setTransform(d, 0, 0, d, 0, 0);
  if (points.length) {
    const fit = fitDrawing(points, width, height, val("#mode") === "separate", {
      c: complex,
      x: xs,
      y: ys,
    });
    xSource = fit.xSource;
    ySource = fit.ySource;
    scale = fit.scale;
    origin = fit.origin;
  }
}
const screen = (p) => [origin[0] + p[0] * scale, origin[1] + p[1] * scale];
function path(points, color, lineWidth = 1) {
  if (!points.length) return;
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p)));
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}
function chain(tr, u, start, rotation = 0) {
  let p = start.slice();
  for (const c of tr) {
    const angle = TAU * c.frequency * u + rotation,
      dx = (c.re * Math.cos(angle) - c.im * Math.sin(angle)) * scale,
      dy = (c.re * Math.sin(angle) + c.im * Math.cos(angle)) * scale;
    const q = [p[0] + dx, p[1] + dy];
    if ($("#circles").checked) {
      ctx.beginPath();
      ctx.arc(...p, c.amplitude * scale, 0, TAU);
      ctx.strokeStyle = colors.circle;
      ctx.lineWidth = colors.circleWidth;
      ctx.stroke();
      path([p, q], colors.vector, colors.circleWidth);
    }
    p = q;
  }
  return p;
}
function render(now) {
  if (!last) last = now;
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (animation && playing) {
    const previousCount = animation.count;
    animation.advance(dt * +val("#speed") * BASE_PLAYBACK_RATE);
    if (animation.count !== previousCount) syncCount();
  }
  const tr = terms();
  const t = animation?.phase ?? 0;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = colors.canvas;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = colors.grid;
  for (let x = 20; x < width; x += 28)
    for (let y = 20; y < height; y += 28) ctx.fillRect(x, y, 1, 1);
  if (points.length) {
    if ($("#guide").checked)
      path([...points, points[0]].map(screen), colors.guide, 1);
    const u = t * direction();
    let end;
    if (val("#mode") === "complex") end = chain(tr.c, u, origin);
    else {
      const a = chain(tr.x, u, xSource);
      const b = chain(tr.y, u, ySource, Math.PI / 2);
      end = [a[0], b[1]];
      ctx.setLineDash([3, 5]);
      path([a, end, b], colors.crosshair, 1);
      ctx.setLineDash([]);
    }
    for (const stroke of animation.strokes) {
      ctx.globalAlpha =
        stroke.completedAt === null
          ? 1
          : traceOpacity(animation.time - stroke.completedAt);
      path(
        stroke.samples.map((sample) => screen(sample.p)),
        colors.trace,
        colors.traceWidth,
      );
    }
    ctx.globalAlpha = 1;
    if ($("#glow").checked) {
      for (const stroke of animation.strokes) {
        for (let i = stroke.samples.length - 1; i > 0; i--) {
          const alpha = highlightOpacity(
            animation.time - stroke.samples[i].time,
          );
          if (alpha <= 0) break;
          ctx.globalAlpha = alpha;
          path(
            [screen(stroke.samples[i - 1].p), screen(stroke.samples[i].p)],
            colors.highlight,
            colors.traceWidth + 0.6,
          );
        }
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 14;
      ctx.shadowColor = colors.tip;
    }
    ctx.beginPath();
    ctx.arc(...end, 3.5, 0, TAU);
    ctx.fillStyle = colors.tip;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  if (points.length && $("#values").checked && now - lastReadout >= 100) {
    const p = pointAt(t * direction(), tr);
    $("#live-values").textContent =
      `t = ${(t * direction()).toFixed(3)} · x(t) = ${p[0].toFixed(4)} · y(t) = ${p[1].toFixed(4)}`;
    lastReadout = now;
  }
  requestAnimationFrame(render);
}
$("#country").addEventListener("change", choose);
for (const id of ["#count", "#mode", "#direction", "#grow"])
  $(id).addEventListener("input", () => {
    reset();
    layout();
    $("#mode-label").textContent =
      val("#mode") === "complex" ? "COMPLEX SERIES" : "SEPARATE X / Y SERIES";
  });
for (const [id, step] of [
  ["#decrease", -1],
  ["#increase", 1],
])
  $(id).addEventListener("click", () => {
    $("#count").value = Math.max(1, Math.min(256, +val("#count") + step));
    reset();
  });
const infoButtons = [...document.querySelectorAll(".info-button")];
const closeInfo = (button) => {
  document.getElementById(button.getAttribute("aria-controls")).hidden = true;
  button.setAttribute("aria-expanded", "false");
};
// Capture before a new button's handler runs: every click dismisses the old box.
document.addEventListener(
  "click",
  (event) => {
    const alreadyOpen = infoButtons.find(
      (button) => button.getAttribute("aria-expanded") === "true",
    );
    for (const button of infoButtons) closeInfo(button);
    if (alreadyOpen && event.target.closest(".info-button") === alreadyOpen)
      event.preventDefault();
  },
  true,
);
for (const button of infoButtons) {
  const tip = document.getElementById(button.getAttribute("aria-controls"));
  button.setAttribute("aria-describedby", tip.id);
  button.addEventListener("click", (event) => {
    if (event.defaultPrevented) return;
    tip.hidden = false;
    button.setAttribute("aria-expanded", "true");
  });
  button.addEventListener("mouseenter", () => {
    if (matchMedia("(hover: hover)").matches) tip.hidden = false;
  });
  button.parentElement.addEventListener("mouseleave", () => {
    if (button.getAttribute("aria-expanded") !== "true") tip.hidden = true;
  });
  button.addEventListener("focus", () => (tip.hidden = false));
  button.addEventListener("blur", () => {
    if (button.getAttribute("aria-expanded") !== "true") tip.hidden = true;
  });
  button.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeInfo(button);
      button.blur();
    }
  });
}
$("#coefficients").addEventListener("toggle", () =>
  $("#math-panel").classList.toggle("expanded", $("#coefficients").open),
);
function syncSpeed() {
  $("#speed-value").textContent = `${val("#speed")}×`;
  $("#slower").disabled = +val("#speed") <= 0.25;
  $("#faster").disabled = +val("#speed") >= 3;
}
$("#speed").addEventListener("input", syncSpeed);
for (const [id, step] of [
  ["#slower", -0.25],
  ["#faster", 0.25],
])
  $(id).addEventListener("click", () => {
    $("#speed").value = Math.max(0.25, Math.min(3, +val("#speed") + step));
    syncSpeed();
  });
syncSpeed();
$("#play").addEventListener("click", () => {
  playing = !playing;
  $("#play").textContent = playing ? "Ⅱ Pause" : "▶ Play";
  $("#state").textContent = playing ? "DRAWING THE WORLD" : "PAUSED";
});
$("#reset").addEventListener("click", reset);
new ResizeObserver(layout).observe(canvas);
requestAnimationFrame(render);
async function loadAtlas() {
  try {
    const response = await fetch(
      `${import.meta.env.BASE_URL}data/countries.geojson`,
    );
    if (!response.ok) throw Error(`Atlas request failed (${response.status})`);
    const data = await response.json();
    countries = data.features.sort((a, b) =>
      a.properties.name.localeCompare(b.properties.name),
    );
    $("#country").replaceChildren(
      ...countries.map((f) => new Option(f.properties.name, f.properties.id)),
    );
    $("#country").value = "FIN";
    choose();
    $("#country").disabled = false;
    $("#play").disabled = false;
    $("#reset").disabled = false;
    $("#state").textContent = playing ? "DRAWING THE WORLD" : "PAUSED";
    $("#play").textContent = playing ? "Ⅱ Pause" : "▶ Play";
  } catch (error) {
    $("#error").hidden = false;
    $("#error").textContent =
      `Could not load the atlas. Reload to try again. ${error.message}`;
    $("#state").textContent = "ATLAS UNAVAILABLE";
  }
}
loadAtlas();
