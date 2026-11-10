import "./style.css";
import { icon } from "./icons.js";
import { TAU, transform, evaluate, fitDrawing } from "./math.js";
import {
  ContourAnimation,
  highlightOpacity,
  BASE_PLAYBACK_RATE,
  growthRate,
  CYCLE_SECONDS,
  MAX_EPICYCLES,
} from "./animation.js";
import { reconstructionMetrics, formatDistance } from "./distance.js";
import { prepareGeometry } from "./geography.js";
import { coordinateSeries, equationText } from "./equations.js";
import { RenderLoop } from "./render-loop.js";
import { wikipediaUrl, randomCountry } from "./countries.js";
import { readSettings, shareUrl } from "./share.js";
import { palettes, canvasColors } from "./palettes.js";
// Controls are created once; avoid selector lookups in every vector/frame.
const elements = new Map();
const $ = (selector) => {
  if (!elements.has(selector))
    elements.set(selector, document.querySelector(selector));
  return elements.get(selector);
};
$("#app").innerHTML =
  `<main><section class="intro"><div class="intro-kicker"><span>GEOGRAPHY, IN FREQUENCY SPACE</span><span>AN INTERACTIVE FOURIER ATLAS</span></div><div class="intro-body"><h1>A world drawn<br>by <em>circles.</em></h1><p class="lede">Every coastline is a rhythm.<br> Watch rotating vectors reconstruct the<br> outline of a country, one orbit at a time.</p></div></section>
<section class="studio"><aside><div class="panel-heading"><span class="eyebrow">THE INSTRUMENT</span><span class="dot"></span></div>
<div class="control-heading"><label for="country">Country or continent</label><button class="info-button" type="button" aria-label="About country outlines" aria-expanded="false" aria-controls="country-info">i</button><p class="info-tip" id="country-info" role="tooltip" hidden>Only the largest connected outer region is animated. Substantial nearby parts can appear in the reference outline. This Fourier drawing follows one continuous, closed path; separate islands would require pen lifts or artificial connecting lines.</p></div><select id="country" disabled><option>Loading atlas…</option></select><button id="random-country" type="button" disabled title="Choose a random outline and build up epicycles">${icon("random")}<span>Surprise me</span></button>
<div class="control-heading"><label for="mode">Fourier representation</label><button class="info-button" type="button" aria-label="About Fourier representations" aria-expanded="false" aria-controls="mode-info">i</button><p class="info-tip" id="mode-info" role="tooltip" hidden>Complex mode treats x + iy as one signal and adds one chain of rotating vectors. Separate mode reconstructs x and y independently; their crosshair marks the drawing point.</p></div><select id="mode"><option value="complex">Complex plane · z(t) = x(t) + iy(t)</option><option value="separate" selected>Separate series · x(t) and y(t)</option></select>
<div class="control-heading"><label for="count">Epicycles <output id="count-value">1</output></label><button class="info-button" type="button" aria-label="About epicycles" aria-expanded="false" aria-controls="count-info">i</button><p class="info-tip" id="count-info" role="tooltip" hidden>Epicycles are circles traced by rotating Fourier vectors. Radius is amplitude, rotation rate is frequency, and starting angle is phase. More circles recover finer detail. The count is per chain in separate mode. <span id="budget">1 rotating vector, largest amplitudes first</span>.</p></div><div class="count-control"><button id="decrease" type="button" aria-label="Decrease epicycles by one">−</button><input id="count" type="range" min="1" max="${MAX_EPICYCLES}" value="1"><button id="increase" type="button" aria-label="Increase epicycles by one">+</button></div><div class="range-labels"><span>ABSTRACT</span><span>DETAILED</span></div>
<div class="growth-controls"><div class="control-heading"><label><input id="grow" type="checkbox" checked> Build up epicycles</label><button class="info-button" type="button" aria-label="About building up epicycles" aria-expanded="false" aria-controls="grow-info">i</button><p class="info-tip" id="grow-info" role="tooltip" hidden>Build from one to ${MAX_EPICYCLES} epicycles. Quick early steps, then finer detail.</p></div></div>
<label for="speed"><span>Drawing speed <output id="speed-value">1×</output></span></label><div class="count-control"><button id="slower" type="button" aria-label="Decrease drawing speed one notch">−</button><input id="speed" type="range" min="0.25" max="3" step="0.25" value="1"><button id="faster" type="button" aria-label="Increase drawing speed one notch">+</button></div>
<div class="control-heading"><label for="position"><span>Position in lap <output id="position-value"><span id="lap-number">Lap 1</span><span id="lap-separator" aria-hidden="true">·</span><span id="lap-percent">0%</span></output></span></label><button class="info-button" type="button" aria-label="About position in lap" aria-expanded="false" aria-controls="position-info">i</button><p class="info-tip" id="position-info" role="tooltip" hidden>Scrub or step in either direction. Play continues from that point.</p></div><div class="count-control"><button id="step-back" type="button" aria-label="Step animation backward by five percent of a lap" disabled>←</button><input id="position" type="range" min="0" max="1000" step="1" value="0" disabled><button id="step-forward" type="button" aria-label="Step animation forward by five percent of a lap" disabled>→</button></div>
<label class="checkbox-row reverse-control"><input id="direction" type="checkbox"> Reverse drawing direction</label>
<label for="palette"><span>Colour palette</span></label><select id="palette">${palettes.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}</select>

<label for="notation"><span>Equation notation</span></label><select id="notation"><option value="hidden">Hidden</option><option value="phase">Amplitude &amp; phase</option><option value="sine-cosine">Sine &amp; cosine coefficients</option></select>
<div class="toggles"><label><input id="circles" type="checkbox" checked> Show epicycles</label><label><input id="fill" type="checkbox"> Fill map area</label><label><input id="guide" type="checkbox" checked> Reference outline</label></div>
<div class="actions"><button id="play" disabled>${icon("pause")}<span>Pause</span></button><button id="reset" disabled aria-label="Restart drawing">${icon("restart")}<span>Restart</span></button></div>
</aside><div class="drawing"><div class="canvas-heading"><span><span class="dot"></span> <span id="state">LOADING ATLAS</span><span id="map-scale" aria-label="Map data scale"></span></span><div class="canvas-tools"><span id="mode-label">COMPLEX SERIES</span><button id="share" type="button" disabled>Share view</button></div></div><div class="canvas-viewport"><div id="projection-label" class="projection-label" hidden>Polar view</div><canvas aria-label="Animated country outline drawn by Fourier epicycles" role="img"></canvas></div><div class="canvas-footer"><a id="country-name" href="https://en.wikipedia.org/" target="_blank" rel="noreferrer" title="Read about this country on Wikipedia">—</a><span class="canvas-metrics"><span id="canvas-count">1 epicycle</span><span id="progress" title="Root-mean-square error across all 1,024 matching samples of the reconstructed and original outline, as a percentage of the outline’s bounding-box diagonal.">RMS error —</span><span id="distance-error" title="RMS great-circle distance across all 1,024 corresponding original and reconstructed samples on a spherical Earth. This is not a nearest-border distance.">≈ — km</span></span></div><section id="math-panel" class="math-panel" aria-label="Fourier equations and live values" hidden><p id="equation"></p><p class="math-units">Coordinates are normalized to the selected outline. t is measured in cycles.</p><output id="live-values"></output><details id="coefficients"><summary>Largest coefficients · amplitude, frequency &amp; phase</summary><div id="coefficient-table"></div></details></section><div id="error" role="alert" hidden></div></div></section>
<section class="notes"><div><span class="eyebrow">THE IDEA</span><h2>From a border to a wave.</h2><p>Sample an outline at equal distances. A discrete Fourier transform turns those points into rotating vectors. Add their tips together, and the border appears again.</p></div><div><span class="eyebrow">THE CIRCLES</span><h2>Small orbits. Fine details.</h2><p>Each epicycle has an amplitude (radius), frequency (rotation rate), and phase (starting angle). The largest amplitudes are drawn first. More circles recover finer details.</p></div><div><span class="eyebrow">TWO WAYS TO DRAW</span><h2>One plane, or two axes.</h2><p>The complex mode draws a single vector chain. Separate mode uses one chain for x and one for y; their crosshair locates the drawing tip. The circle count applies to each chain.</p></div></section></main>
<footer><span class="footer-brand"><svg class="footer-mark" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13"/><circle cx="16" cy="16" r="6"/></svg><span>BORDER / ORBIT <span class="muted">· A little mathematics, a whole world.</span></span></span><a class="repo-link" href="https://github.com/janilahti/fourier-map-contours" target="_blank" rel="noreferrer">Source and feedback on GitHub</a><span>Map data: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a> · Public domain</span></footer>
<dialog id="share-dialog" aria-labelledby="share-title"><h2 id="share-title">Share this view</h2><p>The link keeps your country and settings. The drawing starts with a fresh trace.</p><label for="share-url">Link to this view</label><input id="share-url" type="url" readonly><div class="share-actions"><button id="copy-link" class="share-primary" type="button">Copy link</button><button id="native-share" type="button" hidden>Share…</button><form method="dialog"><button type="submit">Close</button></form></div><p id="share-status" role="status" aria-live="polite"></p></dialog>`;
const canvas = $("canvas"),
  ctx = canvas.getContext("2d", { alpha: false });
let countries = [],
  points = [],
  nearby = [],
  alaskaInset = false,
  reference = [],
  fillPolygons = [],
  projection = null,
  selectionVersion = 0,
  backgroundCanvas = null,
  tipGlow = null,
  tipGlowSize = 64,
  referencePath = null,
  gridPath = null,
  strokePaths = new WeakMap(),
  circlePaths = new WeakMap(),
  pixelRatio = 1,
  termsCache = new Map(),
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
function updateMath(tr) {
  const notation = val("#notation"),
    series = coordinateSeries(tr, val("#mode") === "separate");
  $("#equation").textContent = equationText(notation);
  $("#coefficient-table").innerHTML = Object.entries(series)
    .map(
      ([name, terms]) =>
        `<table><caption>${name}(t) · largest ${Math.min(8, terms.length)} of ${terms.length} real harmonics</caption><thead><tr><th scope="col">k</th>${notation === "phase" ? '<th scope="col">A</th><th scope="col">φ (rad)</th>' : `<th scope="col">${name === "x" ? "a" : "c"} (cos)</th><th scope="col">${name === "x" ? "b" : "d"} (sin)</th>`}</tr></thead><tbody>${terms
          .slice(0, 8)
          .map(
            (h) =>
              `<tr><td>${h.frequency}</td><td>${(notation === "phase" ? h.amplitude : h.a).toFixed(4)}</td><td>${(notation === "phase" ? h.phase : h.b).toFixed(4)}</td></tr>`,
          )
          .join("")}</tbody></table>`,
    )
    .join("");
}
$("#notation").addEventListener("change", () => {
  $("#math-panel").hidden = val("#notation") === "hidden";
  updateMath(terms());
  loop.invalidate();
});
$("#guide").addEventListener("input", layout);
$("#fill").addEventListener("input", layout);
$("#palette").addEventListener("change", () => {
  document.documentElement.dataset.palette = val("#palette");
  colors = canvasColors();
  layout();
});
function syncCount() {
  const count = animation?.count ?? +val("#count");
  $("#count").value = count;
  $("#count-value").textContent = count;
  $("#budget").textContent =
    `${count} rotating vector${count === 1 ? "" : "s"}${val("#mode") === "separate" ? " per axis" : ""}, largest amplitudes first`;
  $("#count").disabled = $("#grow").checked;
  $("#decrease").disabled = $("#grow").checked || count <= 1;
  $("#increase").disabled = $("#grow").checked || count >= MAX_EPICYCLES;
  $("#canvas-count").textContent =
    val("#mode") === "separate"
      ? `${count} ${count === 1 ? "epicycle" : "epicycles"} / axis`
      : `${count} ${count === 1 ? "epicycle" : "epicycles"}`;
  if (points.length) {
    const metrics = reconstructionMetrics(
      points,
      terms(count),
      val("#mode") === "separate",
      projection,
    );
    $("#progress").textContent = `RMS error ${metrics.percent.toFixed(2)}%`;
    $("#distance-error").textContent =
      `≈ ${formatDistance(metrics.kilometers)}`;
  }
  updateMath(terms(count));
}
function reset(startCount = 1) {
  animation = points.length
    ? new ContourAnimation(
        (phase, count) => pointAt(phase * direction(), terms(count)),
        {
          count: +val("#count"),
          growing: $("#grow").checked,
          limit: MAX_EPICYCLES,
          startCount,
        },
      )
    : null;
  last = 0;
  syncCount();
  syncTransport();
  loop.setRunning(playing && !!animation);
}
const detailedCache = new Map();
let fallbackAtlas = null;
async function choose(options = {}) {
  try {
    await loadSelection(options);
  } catch (error) {
    $("#error").hidden = false;
    $("#error").textContent = `Could not load this outline. ${error.message}`;
    $("#share").disabled = true;
    setPlaying(false);
  }
}
async function loadSelection({ startCount = 1 } = {}) {
  const version = ++selectionVersion;
  $("#share").disabled = true;
  const feature = countries.find((f) => f.properties.id === val("#country"));
  const continent = feature.properties.kind === "continent";
  let geometry = feature.geometry;
  let sourceScale = continent ? "1:110M" : "1:10M";
  $("#error").hidden = true;
  {
    $("#state").textContent = "LOADING OUTLINE";
    try {
      const id = feature.properties.id;
      if (!detailedCache.has(id)) {
        const response = await fetch(
          `${import.meta.env.BASE_URL}data/${continent ? "continents" : "detailed"}/${id}.json`,
        );
        if (!response.ok) throw new Error("Map download failed");
        detailedCache.set(id, await response.json());
        if (detailedCache.size > 8)
          detailedCache.delete(detailedCache.keys().next().value);
      }
      if (version !== selectionVersion) return;
      geometry = detailedCache.get(id);
    } catch (error) {
      if (version !== selectionVersion) return;
      if (continent) {
        $("#country").value = "FIN";
        await choose({ startCount });
        $("#error").hidden = false;
        $("#error").textContent =
          "Continent unavailable. Showing Finland; select the continent again to retry.";
        return;
      }
      sourceScale = "1:50M";
      if (!fallbackAtlas) {
        const response = await fetch(
          `${import.meta.env.BASE_URL}data/countries.geojson`,
        );
        if (!response.ok) throw new Error("Fallback map unavailable");
        fallbackAtlas = await response.json();
      }
      if (version !== selectionVersion) return;
      geometry = fallbackAtlas.features.find(
        (f) => f.properties.id === feature.properties.id,
      ).geometry;
      $("#error").hidden = false;
      $("#error").textContent =
        "Detailed map unavailable. Showing a lower-detail outline.";
    }
  }
  if (version !== selectionVersion) return;
  const prepared = prepareGeometry(geometry, { continent });
  projection = prepared.projection;
  points = prepared.points;
  reference = prepared.reference;
  nearby = prepared.nearby;
  alaskaInset = feature.properties.id === "USA" && nearby.length > 0;
  fillPolygons = prepared.fillPolygons;
  termsCache.clear();
  complex = transform(points);
  xs = transform(points.map((p) => [p[0], 0]));
  ys = transform(points.map((p) => [p[1], 0]));
  $("#map-scale").textContent = sourceScale;
  $("#projection-label").hidden = projection.kind !== "south-polar";
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
  setPlaying(playing);
  $("#share").disabled = false;
  $("#position").disabled = false;
  syncTransport();
}
function terms(n = animation?.count ?? +val("#count")) {
  if (!termsCache.has(n))
    termsCache.set(n, {
      c: complex.slice(0, n),
      x: xs.slice(0, n),
      y: ys.slice(0, n),
    });
  return termsCache.get(n);
}
function pointAt(u, tr) {
  return val("#mode") === "complex"
    ? evaluate(tr.c, u)
    : [evaluate(tr.x, u)[0], evaluate(tr.y, u)[0]];
}
function layout() {
  const r = canvas.getBoundingClientRect(),
    d = Math.min(devicePixelRatio || 1, 2);
  pixelRatio = d;
  circlePaths = new WeakMap();
  width = r.width;
  height = r.height;
  canvas.width = Math.round(width * d);
  canvas.height = Math.round(height * d);
  ctx.setTransform(d, 0, 0, d, 0, 0);
  if (points.length) {
    const fit = fitDrawing(
      points,
      width,
      height,
      val("#mode") === "separate",
      alaskaInset ? reference : reference.concat(nearby.flat()),
    );
    xSource = fit.xSource;
    ySource = fit.ySource;
    scale = fit.scale;
    origin = fit.origin;
    referencePath = new Path2D();
    for (const ring of (alaskaInset
      ? fillPolygons.slice(0, 1)
      : fillPolygons
    ).flat()) {
      ring.forEach((p, i) =>
        i
          ? referencePath.lineTo(...screen(p))
          : referencePath.moveTo(...screen(p)),
      );
      referencePath.closePath();
    }
  }
  gridPath = new Path2D();
  for (let x = 20; x < width; x += 28)
    for (let y = 20; y < height; y += 28) gridPath.rect(x, y, 1, 1);
  backgroundCanvas = document.createElement("canvas");
  backgroundCanvas.width = canvas.width;
  backgroundCanvas.height = canvas.height;
  const bg = backgroundCanvas.getContext("2d");
  bg.setTransform(d, 0, 0, d, 0, 0);
  bg.fillStyle = colors.canvas;
  bg.fillRect(0, 0, width, height);
  bg.fillStyle = colors.grid;
  if (gridPath) bg.fill(gridPath);
  if ($("#fill").checked && referencePath) {
    bg.fillStyle = colors.trace;
    bg.globalAlpha = 0.14;
    bg.fill(referencePath, "evenodd");
    bg.globalAlpha = 1;
  }
  if ($("#guide").checked && referencePath) {
    bg.strokeStyle = colors.guide;
    bg.lineWidth = 1;
    bg.stroke(referencePath);
  }
  if (alaskaInset && ($("#guide").checked || $("#fill").checked)) {
    const iw = Math.min(190, width * 0.26),
      ih = Math.min(140, height * 0.25);
    const x = 18,
      y = height - ih - 42;
    const fit = fitDrawing(nearby.flat(), iw, ih, false);
    const inset = new Path2D();
    for (const ring of fillPolygons.slice(1).flat()) {
      ring.forEach((p, i) => {
        const q = [
          x + fit.origin[0] + p[0] * fit.scale,
          y + fit.origin[1] + p[1] * fit.scale,
        ];
        i ? inset.lineTo(...q) : inset.moveTo(...q);
      });
      inset.closePath();
    }
    bg.fillStyle = colors.canvas;
    bg.fillRect(x, y, iw, ih);
    bg.strokeStyle = colors.guide;
    bg.strokeRect(x, y, iw, ih);
    if ($("#fill").checked) {
      bg.fillStyle = colors.trace;
      bg.globalAlpha = 0.14;
      bg.fill(inset, "evenodd");
      bg.globalAlpha = 1;
    }
    if ($("#guide").checked) bg.stroke(inset);
  }
  // Shadow blur is constant; rasterize its soft halo once, not on every frame.
  tipGlow = document.createElement("canvas");
  tipGlow.width = tipGlow.height = Math.ceil(64 * Math.max(1, d));
  tipGlowSize = tipGlow.width / d;
  const glow = tipGlow.getContext("2d");
  glow.setTransform(d, 0, 0, d, 0, 0);
  glow.fillStyle = glow.shadowColor = colors.tip;
  glow.shadowBlur = 14;
  glow.shadowOffsetX = tipGlow.width * 2;
  glow.beginPath();
  // Keep the source circle outside the sprite; retain only its shadow inside.
  glow.arc(
    tipGlowSize / 2 - glow.shadowOffsetX / d,
    tipGlowSize / 2,
    3.5,
    0,
    TAU,
  );
  glow.fill();
  strokePaths = new WeakMap();
  loop.invalidate();
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
function chain(tr, u, start, rotation = 0, axis = null) {
  const showCircles = $("#circles").checked;
  let p = start.slice();
  for (const c of tr) {
    const angle = TAU * c.frequency * u + rotation,
      cos = Math.cos(angle),
      sin = Math.sin(angle),
      dx = (c.re * cos - c.im * sin) * scale,
      dy = (c.re * sin + c.im * cos) * scale;
    const q = [p[0] + dx, p[1] + dy];
    if (showCircles) {
      let circle = circlePaths.get(c);
      if (!circle) {
        circle = new Path2D();
        circle.arc(0, 0, c.amplitude * scale, 0, TAU);
        circlePaths.set(c, circle);
      }
      ctx.setTransform(
        pixelRatio,
        0,
        0,
        pixelRatio,
        p[0] * pixelRatio,
        p[1] * pixelRatio,
      );
      ctx.strokeStyle =
        axis === "x"
          ? colors.circleX
          : axis === "y"
            ? colors.circleY
            : colors.circle;
      ctx.lineWidth = colors.circleWidth;
      ctx.stroke(circle);
      path(
        [
          [0, 0],
          [dx, dy],
        ],
        axis === "x"
          ? colors.vectorX
          : axis === "y"
            ? colors.vectorY
            : colors.vector,
        colors.circleWidth,
      );
    }
    p = q;
  }
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  return p;
}
function render(now) {
  if (!last) last = now;
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (animation && playing) {
    const previousCount = animation.count;
    animation.advance(
      dt *
        +val("#speed") *
        BASE_PLAYBACK_RATE *
        (animation.growing ? growthRate(animation.count) : 1),
      dt,
    );
    if (animation.count !== previousCount) syncCount();
  }
  syncTransport();
  const tr = terms();
  const t = animation?.phase ?? 0;
  if (backgroundCanvas?.width && backgroundCanvas?.height)
    ctx.drawImage(backgroundCanvas, 0, 0, width, height);
  else {
    ctx.fillStyle = colors.canvas;
    ctx.fillRect(0, 0, width, height);
  }
  if (points.length) {
    const u = t * direction();
    let end;
    if (val("#mode") === "complex") end = chain(tr.c, u, origin);
    else {
      const a = chain(tr.x, u, xSource, 0, "x");
      const b = chain(tr.y, u, ySource, Math.PI / 2, "y");
      end = [a[0], b[1]];
      if ($("#circles").checked) {
        ctx.setLineDash([3, 5]);
        path([a, end], colors.vectorX, 1);
        path([end, b], colors.vectorY, 1);
        ctx.setLineDash([]);
      }
    }
    for (const stroke of animation.strokes) {
      let cached = strokePaths.get(stroke);
      if (!cached) {
        cached = { path: new Path2D(), index: 0, closed: false };
        strokePaths.set(stroke, cached);
      }
      while (cached.index < stroke.samples.length) {
        const point = screen(stroke.samples[cached.index].p);
        cached.index
          ? cached.path.lineTo(...point)
          : cached.path.moveTo(...point);
        cached.index++;
      }
      ctx.strokeStyle = colors.trace;
      ctx.lineWidth = colors.traceWidth;
      if (stroke.completedAt !== null && !cached.closed) {
        cached.path.closePath();
        cached.closed = true;
      }
      ctx.globalAlpha = animation.opacity(stroke);
      ctx.stroke(cached.path);
    }
    ctx.globalAlpha = 1;
    {
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
      if (tipGlow)
        ctx.drawImage(
          tipGlow,
          end[0] - tipGlowSize / 2,
          end[1] - tipGlowSize / 2,
          tipGlowSize,
          tipGlowSize,
        );
    }
    ctx.beginPath();
    ctx.arc(...end, 3.5, 0, TAU);
    ctx.fillStyle = colors.tip;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  if (
    points.length &&
    val("#notation") !== "hidden" &&
    (!playing || now - lastReadout >= 100)
  ) {
    const p = pointAt(t * direction(), tr);
    $("#live-values").textContent =
      `t = ${(t * direction()).toFixed(3)} · x(t) = ${p[0].toFixed(4)} · y(t) = ${p[1].toFixed(4)}`;
    lastReadout = now;
  }
}
$("#country").addEventListener("change", choose);
for (const id of ["#count", "#mode", "#direction"])
  $(id).addEventListener("input", () => {
    reset();
    if (id === "#mode") layout();
    $("#mode-label").textContent =
      val("#mode") === "complex" ? "COMPLEX SERIES" : "SEPARATE X / Y SERIES";
  });
$("#grow").addEventListener("input", () => {
  if ($("#grow").checked) reset();
  else {
    animation?.stopGrowing();
    syncCount();
    loop.invalidate();
  }
});
for (const [id, step] of [
  ["#decrease", -1],
  ["#increase", 1],
])
  $(id).addEventListener("click", () => {
    $("#count").value = Math.max(
      1,
      Math.min(MAX_EPICYCLES, +val("#count") + step),
    );
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
$("aside").addEventListener("scroll", () => infoButtons.forEach(closeInfo), {
  passive: true,
});
for (const button of infoButtons) {
  const tip = document.getElementById(button.getAttribute("aria-controls"));
  button.setAttribute("aria-describedby", tip.id);
  const positionTip = () => {
    const r = button.getBoundingClientRect();
    tip.style.setProperty("--info-left", `${r.right + 18}px`);
    tip.style.setProperty(
      "--info-top",
      `${Math.max(16, Math.min(r.top, innerHeight - 220))}px`,
    );
  };
  button.addEventListener("click", (event) => {
    if (event.defaultPrevented) return;
    positionTip();
    tip.hidden = false;
    button.setAttribute("aria-expanded", "true");
  });
  button.addEventListener("mouseenter", () => {
    if (matchMedia("(hover: hover)").matches) {
      for (const other of infoButtons) if (other !== button) closeInfo(other);
      positionTip();
      tip.hidden = false;
    }
  });
  button.parentElement.addEventListener("mouseleave", () => {
    if (button.getAttribute("aria-expanded") !== "true") tip.hidden = true;
  });
  button.addEventListener("focus", () => {
    for (const other of infoButtons) if (other !== button) closeInfo(other);
    positionTip();
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
function syncPlaybackStatus() {
  $("#state").textContent = !playing
    ? "PAUSED"
    : loop.active
      ? "DRAWING THE WORLD"
      : "SUSPENDED";
}
function setPlaying(value) {
  playing = value;
  loop.setRunning(playing && !!animation);
  $("#play").innerHTML =
    `${icon(playing ? "pause" : "play")}<span>${playing ? "Pause" : "Play"}</span>`;
  syncPlaybackStatus();
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
function syncTransport() {
  if (!animation) return;
  const position = String(Math.round(animation.phase * 1000));
  if ($("#position").value !== position) $("#position").value = position;
  const lap = `Lap ${animation.cycle + 1}`;
  if ($("#lap-number").textContent !== lap) $("#lap-number").textContent = lap;
  const percent = `${Math.round(animation.phase * 100)}%`;
  if ($("#lap-percent").textContent !== percent)
    $("#lap-percent").textContent = percent;
  const atStart = animation.time <= 0;
  if ($("#step-back").disabled !== atStart) $("#step-back").disabled = atStart;
  if ($("#step-forward").disabled) $("#step-forward").disabled = false;
}
function seek(time) {
  if (!animation) return;
  const previousCount = animation.count;
  setPlaying(false);
  animation.seek(
    time,
    +val("#speed") *
      BASE_PLAYBACK_RATE *
      (animation.growing ? growthRate(animation.count) : 1),
  );
  last = 0;
  lastReadout = 0;
  strokePaths = new WeakMap();
  if (animation.count !== previousCount) syncCount();
  syncTransport();
  loop.invalidate();
}
$("#position").addEventListener("input", () => {
  if (animation)
    seek(
      (animation.cycle + Math.min(0.999999, +val("#position") / 1000)) *
        CYCLE_SECONDS,
    );
});
for (const [id, step] of [
  ["#step-back", -0.05],
  ["#step-forward", 0.05],
])
  $(id).addEventListener("click", () => {
    if (animation) seek(animation.time + step * CYCLE_SECONDS);
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
    fill: $("#fill").checked,
    equations: val("#notation") !== "hidden",
    coefficients: $("#coefficients").open,
    paused: !playing,
    notation: val("#notation"),
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
const loop = new RenderLoop(render, {
  onResume: () => {
    last = 0;
  },
});
let inView = true;
const visibility = () => {
  loop.setVisible(!document.hidden && inView);
  loop.setFocused(document.hasFocus());
  syncPlaybackStatus();
};
window.addEventListener("blur", () => {
  loop.setFocused(false);
  syncPlaybackStatus();
});
window.addEventListener("focus", visibility);
window.addEventListener("pageshow", visibility);
window.addEventListener("pagehide", () => {
  loop.setVisible(false);
  syncPlaybackStatus();
});
document.addEventListener("visibilitychange", visibility);
new IntersectionObserver((entries) => {
  inView = entries[0].isIntersecting;
  visibility();
}).observe(canvas);
for (const event of ["input", "change", "click"])
  document.addEventListener(event, () => loop.invalidate());
function sizeStudio() {
  if (!matchMedia("(min-width:900px)").matches) return;
  const top = Math.max(16, $(".studio").getBoundingClientRect().top);
  const height = Math.max(300, window.innerHeight - top - 16);
  $(".studio").style.setProperty("--studio-height", `${height}px`);
}
let sizingFrame = null;
const requestStudioSize = () => {
  if (sizingFrame === null)
    sizingFrame = requestAnimationFrame(() => {
      sizingFrame = null;
      sizeStudio();
    });
};
window.addEventListener("resize", requestStudioSize);
window.addEventListener("scroll", requestStudioSize, { passive: true });
new ResizeObserver(requestStudioSize).observe($(".intro"));
sizeStudio();
new ResizeObserver((entries) => {
  $(".drawing").style.setProperty(
    "--footer-height",
    `${entries[0].target.getBoundingClientRect().height}px`,
  );
}).observe($(".canvas-footer"));
new ResizeObserver(layout).observe(canvas);
visibility();
loop.invalidate();
async function loadAtlas() {
  try {
    const response = await fetch(
      `${import.meta.env.BASE_URL}data/catalog.json`,
    );
    if (!response.ok) throw Error(`Atlas request failed (${response.status})`);
    const data = await response.json();
    const continentResponse = await fetch(
      `${import.meta.env.BASE_URL}data/continents/index.json`,
    );
    if (!continentResponse.ok) throw new Error("Continent atlas unavailable");
    const continents = await continentResponse.json();
    countries = [...data.features, ...continents.features].sort((a, b) =>
      a.properties.name.localeCompare(b.properties.name),
    );
    const groups = [
      ["Continents", "continent"],
      ["Countries & territories", "country"],
    ].map(([label, kind]) => {
      const group = document.createElement("optgroup");
      group.label = label;
      group.append(
        ...countries
          .filter(
            (f) =>
              (f.properties.kind === "continent") === (kind === "continent"),
          )
          .map(
            (f) =>
              new Option(
                f.properties.id === "CONT_AUSTRALIA"
                  ? "Australia (continent)"
                  : f.properties.name,
                f.properties.id,
              ),
          ),
      );
      return group;
    });
    $("#country").replaceChildren(...groups);
    const restored = readSettings(
      location.search,
      countries.map((f) => f.properties.id),
      palettes.map((p) => p.id),
    );
    $("#notation").value = restored.notation;
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
      ["fill", "fill"],
    ])
      $("#" + id).checked = restored[key];
    $("#coefficients").open = restored.coefficients;
    $("#math-panel").hidden = restored.notation === "hidden";
    $("#math-panel").classList.toggle("expanded", restored.coefficients);
    document.documentElement.dataset.palette = restored.palette;
    colors = canvasColors();
    playing =
      !restored.paused &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches;
    syncSpeed();
    $("#mode-label").textContent =
      restored.mode === "complex" ? "COMPLEX SERIES" : "SEPARATE X / Y SERIES";
    await choose({ startCount: restored.count });
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
