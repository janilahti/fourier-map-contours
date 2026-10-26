import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, readSettings, shareUrl } from "../src/share.js";
const countries = ["FIN", "JPN", "GEO"],
  palettes = ["botanical", "lagoon", "twilight"];
test("sharing round-trips every control and strips unrelated URL data", () => {
  const state = {
    country: "JPN",
    mode: "separate",
    count: 127,
    speed: 2.25,
    reverse: true,
    palette: "twilight",
    grow: true,
    circles: false,
    outline: false,
    highlight: false,
    equations: true,
    coefficients: true,
    paused: true,
  };
  const url = new URL(
    shareUrl("https://example.com/fourier-map-contours/?old=value#old", state),
  );
  assert.equal(url.pathname, "/fourier-map-contours/");
  assert.equal(url.hash, "");
  assert.equal(url.searchParams.has("old"), false);
  assert.deepEqual(readSettings(url.search, countries, palettes), state);
});
test("missing settings use the standard view", () =>
  assert.deepEqual(readSettings("", countries, palettes), DEFAULT_SETTINGS));
test("malformed and out-of-range settings are validated before use", () => {
  const state = readSettings(
    "?country=%3Cscript%3E&mode=evil&palette=unknown&count=99999&speed=-10&reverse=wrong&outline=0",
    countries,
    palettes,
  );
  assert.equal(state.country, "FIN");
  assert.equal(state.mode, "complex");
  assert.equal(state.palette, "botanical");
  assert.equal(state.count, 256);
  assert.equal(state.speed, 0.25);
  assert.equal(state.reverse, false);
  assert.equal(state.outline, false);
  assert.equal(
    readSettings("?count=Infinity&speed=NaN", countries, palettes).count,
    64,
  );
  assert.equal(readSettings("?count=&speed=", countries, palettes).speed, 1);
  assert.equal(readSettings("?speed=1.38", countries, palettes).speed, 1.5);
  assert.equal(readSettings("?grow=1", countries, palettes).count, 1);
});
