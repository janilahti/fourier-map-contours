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
import { wikipediaUrl, randomCountry } from "./countries.js";
import { readSettings, shareUrl } from "./share.js";
import { palettes, canvasColors } from "./palettes.js";
const $ = (s) => document.querySelector(s);
$("#app").innerHTML =
  `<main><section class="intro"><div class="intro-kicker"><span>GEOGRAPHY, IN FREQUENCY SPACE</span><span>AN INTERACTIVE FOURIER ATLAS</span></div><div class="intro-body"><h1>A world drawn<br>by <em>circles.</em></h1><p class="lede">Every coastline is a rhythm.<br> Watch rotating vectors reconstruct the<br> outline of a country, one orbit at a time.</p></div></section>
<section class="studio"><aside><div class="panel-heading"><span class="eyebrow">THE INSTRUMENT</span><span class="dot"></span></div>
<div class="control-heading"><label for="country">Choose a country</label><button class="info-button" type="button" aria-label="About country outlines" aria-expanded="false" aria-controls="country-info">i</button><p class="info-tip" id="country-info" role="tooltip" hidden>Only the largest connected outer region is drawn. This Fourier drawing follows one continuous, closed path; separate islands would require pen lifts or artificial connecting lines.</p></div><select id="country" disabled><option>Loading atlas…</option></select><button id="random-country" type="button" disabled>↝ Random country &amp; build up</button>
<div class="control-heading"><label for="mode">Fourier representation</label><button class="info-button" type="button" aria-label="About Fourier representations" aria-expanded="false" aria-controls="mode-info">i</button><p class="info-tip" id="mode-info" role="tooltip" hidden>Complex mode treats x + iy as one signal and adds one chain of rotating vectors. Separate mode reconstructs x and y independently; their crosshair marks the drawing point.</p></div><select id="mode"><option value="complex">Complex plane · z(t) = x(t) + iy(t)</option><option value="separate">Separate series · x(t) and y(t)</option></select>
<div class="control-heading"><label for="count">Epicycles <output id="count-value">64</output></label><button class="info-button" type="button" aria-label="About epicycles" aria-expanded="false" aria-controls="count-info">i</button><p class="info-tip" id="count-info" role="tooltip" hidden>Epicycles are circles traced by rotating Fourier vectors. Radius is amplitude, rotation rate is frequency, and starting angle is phase. More circles recover finer detail. The count is per chain in separate mode.</p></div><div class="count-control"><button id="decrease" type="button" aria-label="Decrease epicycles by one">−</button><input id="count" type="range" min="1" max="256" value="64"><button id="increase" type="button" aria-label="Increase epicycles by one">+</button></div><div class="range-labels"><span>ABSTRACT</span><span>DETAILED</span></div><p class="hint" id="budget">64 rotating vectors, largest amplitudes first</p>
<div class="growth-controls"><label><input id="grow" type="checkbox"> Build up epicycles</label><p class="hint"><span>Start with one and grow to 256.</span> <span>Older outlines gradually fade.</span></p></div>
<label for="speed"><span>Drawing speed <output id="speed-value">1×</output></span></label><div class="count-control"><button id="slower" type="button" aria-label="Decrease drawing speed one notch">−</button><input id="speed" type="range" min="0.25" max="3" step="0.25" value="1"><button id="faster" type="button" aria-label="Increase drawing speed one notch">+</button></div>
<label class="checkbox-row reverse-control"><input id="direction" type="checkbox"> Reverse drawing direction</label>
<label for="palette"><span>Colour palette</span></label><select id="palette">${palettes.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}</select>

<div class="toggles"><label><input id="circles" type="checkbox" checked> Show epicycles</label><label><input id="guide" type="checkbox" checked> Reference outline</label><label><input id="glow" type="checkbox" checked> Highlight the drawing tip</label><label><input id="values" type="checkbox" aria-controls="math-panel"> Show equations &amp; live values</label></div>
<div class="actions"><button id="play" disabled>Ⅱ Pause</button><button id="reset" disabled aria-label="Restart drawing">↺ Restart</button></div>
</aside><div class="drawing"><div class="canvas-heading"><span><span class="dot"></span> <span id="state">LOADING ATLAS</span></span><div class="canvas-tools"><span id="mode-label">COMPLEX SERIES</span><button id="share" type="button" disabled>Share view</button></div></div><div class="canvas-viewport"><canvas aria-label="Animated country outline drawn by Fourier epicycles" role="img"></canvas></div><div class="canvas-footer"><a id="country-name" href="https://en.wikipedia.org/" target="_blank" rel="noreferrer" title="Read about this country on Wikipedia">—</a><span class="canvas-metrics"><span id="canvas-count">64 epicycles</span><span id="progress" title="Estimated root-mean-square distance between matching points on the reconstructed and original outline, as a percentage of the outline’s bounding-box diagonal.">RMS error —</span></span></div><section id="math-panel" class="math-panel" aria-label="Fourier equations and live values" hidden><p id="equation"></p><p class="math-units">Coordinates are normalized to the selected outline. t is measured in cycles.</p><output id="live-values"></output><details id="coefficients"><summary>Largest coefficients · amplitude, frequency &amp; phase</summary><div id="coefficient-table"></div></details></section><div id="error" role="alert" hidden></div></div></section>
<section class="notes"><div><span class="eyebrow">THE IDEA</span><h2>From a border to a wave.</h2><p>Sample an outline at equal distances. A discrete Fourier transform turns those points into rotating vectors. Add their tips together, and the border appears again.</p></div><div><span class="eyebrow">THE CIRCLES</span><h2>Small orbits. Fine details.</h2><p>Each epicycle has an amplitude (radius), frequency (rotation rate), and phase (starting angle). The largest amplitudes are drawn first. More circles recover finer details.</p></div><div><span class="eyebrow">TWO WAYS TO DRAW</span><h2>One plane, or two axes.</h2><p>The complex mode draws a single vector chain. Separate mode uses one chain for x and one for y; their crosshair locates the drawing tip. The circle count applies to each chain.</p></div></section></main>
<footer><span class="footer-brand"><svg class="footer-mark" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13"/><circle cx="16" cy="16" r="6"/></svg><span>BORDER / ORBIT <span class="muted">· A little mathematics, a whole world.</span></span></span><a class="repo-link" href="https://github.com/janilahti/fourier-map-contours" target="_blank" rel="noreferrer">Source and feedback on GitHub</a><span>Map data: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a> · 1:50m · Public domain</span></footer>
<dialog id="share-dialog" aria-labelledby="share-title"><h2 id="share-title">Share this view</h2><p>The link keeps your country and settings. The drawing starts with a fresh trace.</p><label for="share-url">Link to this view</label><input id="share-url" type="url" readonly><div class="share-actions"><button id="copy-link" class="share-primary" type="button">Copy link</button><button id="native-share" type="button" hidden>Share…</button><form method="dialog"><button type="submit">Close</button></form></div><p id="share-status" role="status" aria-live="polite"></p></dialog>`;
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
function reset(startCount = 1) {
  animation = points.length
    ? new ContourAnimation(
        (phase, count) => pointAt(phase * direction(), terms(count)),
        {
          count: +val("#count"),
          growing: $("#grow").checked,
          limit: 256,
          startCount,
        },
      )
    : null;
  last = 0;
  syncCount();
}
function choose({ startCount = 1 } = {}) {
  const feature = countries.find((f) => f.properties.id === val("#country"));
  points = resample(mainRing(feature.geometry));
  complex = transform(points);
  xs = transform(points.map((p) => [p[0], 0]));
  ys = transform(points.map((p) => [p[1], 0]));
  $("#country-name").textContent = feature.properties.name;
  $("#country-name").href = wikipediaUrl(feature.properties);
  $("#country-name").title =
    `Read about ${feature.properties.name} on Wikipedia`;
  $("#country-name").setAttribute(
    "aria-label",
    `${feature.properties.name} on Wikipedia (opens in a new tab)`,
  );
  reset(startCount);
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
    const fit = fitDrawing(points, width, height, val("#mode") === "separate");
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
      if ($("#circles").checked) {
        ctx.setLineDash([3, 5]);
        path([a, end, b], colors.crosshair, 1);
        ctx.setLineDash([]);
      }
    }
    for (const stroke of animation.strokes) {
      ctx.globalAlpha =
        stroke.completedAt === null
          ? 1
          : traceOpacity(
              animation.time - stroke.completedAt,
              animation.growing,
            );
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
    if (matchMedia("(hover: hover)").matches) {
      for (const other of infoButtons) if (other !== button) closeInfo(other);
      tip.hidden = false;
    }
  });
  button.parentElement.addEventListener("mouseleave", () => {
    if (button.getAttribute("aria-expanded") !== "true") tip.hidden = true;
  });
  button.addEventListener("focus", () => {
    for (const other of infoButtons) if (other !== button) closeInfo(other);
    tip.hidden = false;
  });
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
function setPlaying(value) {
  playing = value;
  $("#play").textContent = playing ? "Ⅱ Pause" : "▶ Play";
  $("#state").textContent = playing ? "DRAWING THE WORLD" : "PAUSED";
}
$("#play").addEventListener("click", () => setPlaying(!playing));
$("#random-country").addEventListener("click", () => {
  const selected = randomCountry(countries, val("#country"));
  if (!selected) return;
  $("#country").value = selected.properties.id;
  $("#grow").checked = true;
  choose();
  setPlaying(true);
});
$("#reset").addEventListener("click", () => reset());
function currentSettings() {
  return {
    country: val("#country"),
    mode: val("#mode"),
    count: animation?.count ?? +val("#count"),
    speed: +val("#speed"),
    reverse: $("#direction").checked,
    palette: val("#palette"),
    grow: $("#grow").checked,
    circles: $("#circles").checked,
    outline: $("#guide").checked,
    highlight: $("#glow").checked,
    equations: $("#values").checked,
    coefficients: $("#coefficients").open,
    paused: !playing,
  };
}
$("#share").addEventListener("click", () => {
  $("#share-url").value = shareUrl(location.href, currentSettings());
  $("#share-status").textContent = "";
  $("#native-share").hidden = typeof navigator.share !== "function";
  $("#share-dialog").showModal();
  $("#share-url").select();
});
$("#copy-link").addEventListener("click", async () => {
  try {
    if (!navigator.clipboard?.writeText)
      throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText($("#share-url").value);
    $("#share-status").textContent = "Link copied.";
  } catch {
    $("#share-url").focus();
    $("#share-url").select();
    $("#share-status").textContent = "Select and copy the link above.";
  }
});
$("#native-share").addEventListener("click", async () => {
  try {
    await navigator.share({
      title: `Border / Orbit — ${$("#country-name").textContent}`,
      text: "A world drawn by circles. Explore this Fourier contour.",
      url: $("#share-url").value,
    });
    $("#share-status").textContent = "Shared.";
  } catch (error) {
    $("#share-status").textContent =
      error.name === "AbortError"
        ? "Sharing cancelled."
        : "Sharing unavailable. Copy the link instead.";
  }
});
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
    const restored = readSettings(
      location.search,
      countries.map((f) => f.properties.id),
      palettes.map((p) => p.id),
    );
    $("#country").value = restored.country;
    $("#mode").value = restored.mode;
    $("#count").value = restored.count;
    $("#speed").value = restored.speed;
    $("#palette").value = restored.palette;
    for (const [id, key] of [
      ["direction", "reverse"],
      ["grow", "grow"],
      ["circles", "circles"],
      ["guide", "outline"],
      ["glow", "highlight"],
      ["values", "equations"],
    ])
      $("#" + id).checked = restored[key];
    $("#coefficients").open = restored.coefficients;
    $("#math-panel").hidden = !restored.equations;
    $("#math-panel").classList.toggle("expanded", restored.coefficients);
    document.documentElement.dataset.palette = restored.palette;
    colors = canvasColors();
    playing =
      !restored.paused &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches;
    syncSpeed();
    $("#mode-label").textContent =
      restored.mode === "complex" ? "COMPLEX SERIES" : "SEPARATE X / Y SERIES";
    choose({ startCount: restored.count });
    $("#country").disabled = false;
    $("#random-country").disabled = false;
    $("#play").disabled = false;
    $("#reset").disabled = false;
    $("#share").disabled = false;
    setPlaying(playing);
  } catch (error) {
    $("#error").hidden = false;
    $("#error").textContent =
      `Could not load the atlas. Reload to try again. ${error.message}`;
    $("#state").textContent = "ATLAS UNAVAILABLE";
  }
}
loadAtlas();
