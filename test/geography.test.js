import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { area } from "../src/math.js";
import { prepareGeometry, geographicPoint } from "../src/geography.js";
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

test("startup catalog carries metadata only and covers every detailed-country asset", () => {
  const catalog = read("catalog.json").features,
    ids = read("detailed/index.json");
  assert.equal(catalog.length, 242);
  assert.ok(catalog.every((f) => f.geometry === null));
  assert.deepEqual(catalog.map((f) => f.properties.id).sort(), ids);
});

test("date-line cuts are joined without bridging islands or filling interior holes", () => {
  const geometry = {
    type: "MultiPolygon",
    coordinates: [
      [
        [
          [179, 0],
          [180, 0],
          [180, 2],
          [179, 2],
          [179, 0],
        ],
        [
          [179.2, 0.4],
          [179.4, 0.4],
          [179.4, 0.6],
          [179.2, 0.6],
          [179.2, 0.4],
        ],
      ],
      [
        [
          [-180, 0],
          [-179, 0],
          [-179, 2],
          [-180, 2],
          [-180, 0],
        ],
      ],
      [
        [
          [-179.8, 2.5],
          [-179.3, 2.5],
          [-179.3, 3],
          [-179.8, 3],
          [-179.8, 2.5],
        ],
      ],
    ],
  };
  const prepared = prepareGeometry(geometry);
  const geographic = prepared.reference.map((p) =>
    geographicPoint(p, prepared.projection),
  );
  assert.ok(Math.abs(Math.min(...geographic.map((p) => p[0])) - 179) < 1e-10);
  assert.ok(Math.abs(Math.max(...geographic.map((p) => p[0])) - 181) < 1e-10);
  assert.ok(Math.max(...geographic.map((p) => p[1])) < 2.01);
  assert.equal(prepared.nearby.length, 1);
  assert.equal(prepared.fillPolygons.length, 2);
  assert.equal(
    prepared.fillPolygons[0].length,
    2,
    "mainland fill retains its hole",
  );
  assert.ok(
    Math.abs(
      area(prepared.fillPolygons[0][0]) / area(prepared.fillPolygons[0][1]) -
        100,
    ) < 1e-8,
  );
});

test("Russia's main animated outline includes Chukotka beyond the date line at both data scales", () => {
  for (const geometry of [
    read("detailed/RUS.json"),
    countries.find((f) => f.properties.id === "RUS").geometry,
  ]) {
    const prepared = prepareGeometry(geometry);
    const ring = prepared.reference.map((p) =>
      geographicPoint(p, prepared.projection),
    );
    assert.ok(Math.max(...ring.map((p) => p[0])) > 190);
    assert.ok(Math.min(...ring.map((p) => p[0])) < 28);
    for (let i = 1; i < ring.length; i++) {
      if (
        Math.abs(ring[i][0] - 180) < 1e-7 &&
        Math.abs(ring[i - 1][0] - 180) < 1e-7
      )
        assert.ok(
          Math.abs(ring[i][1] - ring[i - 1][1]) < 0.3,
          "no artificial cut across mainland",
        );
    }
  }
});
