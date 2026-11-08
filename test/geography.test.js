import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { prepareGeometry } from "../src/geography.js";
const read = (path) =>
  JSON.parse(readFileSync(new URL("../public/data/" + path, import.meta.url)));
const countries = read("countries.geojson").features;
test("nearby region selection retains Sicily and Sardinia but suppresses tiny Finnish islands and remote French territories", () => {
  const get = (id) =>
    prepareGeometry(countries.find((f) => f.properties.id === id).geometry);
  assert.equal(get("ITA").nearby.length, 2);
  assert.equal(get("FIN").nearby.length, 0);
  assert.equal(get("FRA").nearby.length, 1);
});
test("every detailed country and continent produces finite continuous drawing samples", () => {
  const ids = read("detailed/index.json");
  assert.equal(ids.length, 242);
  for (const id of ids) {
    const p = prepareGeometry(read("detailed/" + id + ".json"));
    assert.equal(p.points.length, 1024);
    assert.ok(p.points.flat().every(Number.isFinite), id);
  }
  const continents = read("continents/index.json").features;
  assert.equal(continents.length, 7);
  for (const f of continents) {
    const p = prepareGeometry(read("continents/" + f.properties.id + ".json"));
    assert.ok(p.points.flat().every(Number.isFinite), f.properties.name);
  }
});

test("adding nearby reference regions keeps the main outline centered and all retained regions in view", async () => {
  const { fitDrawing } = await import("../src/math.js");
  const p = prepareGeometry(
      countries.find((f) => f.properties.id === "ITA").geometry,
    ),
    context = p.reference.concat(p.nearby.flat());
  for (const [w, h] of [
    [350, 310],
    [900, 650],
  ]) {
    const fit = fitDrawing(p.points, w, h, false, context);
    const center = (axis) =>
      (Math.min(...p.points.map((p) => p[axis])) +
        Math.max(...p.points.map((p) => p[axis]))) /
      2;
    assert.ok(Math.abs(fit.origin[0] + center(0) * fit.scale - w / 2) < 1e-8);
    assert.ok(Math.abs(fit.origin[1] + center(1) * fit.scale - h / 2) < 1e-8);
    assert.ok(
      context.every((p) => {
        const x = fit.origin[0] + p[0] * fit.scale,
          y = fit.origin[1] + p[1] * fit.scale;
        return x >= 0 && x <= w && y >= 0 && y <= h;
      }),
    );
  }
});
