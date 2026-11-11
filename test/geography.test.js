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
    const p = prepareGeometry(read("continents/" + f.properties.id + ".json"), {
      continent: true,
    });
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

function contains(ring, [x, y]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i],
      [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

function continentRings(id) {
  const p = prepareGeometry(read(`continents/CONT_${id}.json`), {
    continent: true,
  });
  return [p.reference, ...p.nearby].map((r) =>
    r.map((v) => geographicPoint(v, p.projection)),
  );
}

test("North America includes Central America and visible Caribbean islands, with Greenland omitted", () => {
  const rings = continentRings("NORTH_AMERICA");
  for (const point of [
    [-90.5, 14.6],
    [-84.1, 9.95],
    [-79.52, 8.98],
  ])
    assert.ok(
      contains(rings[0], point),
      `Central America is part of the animated mainland: ${point}`,
    );
  for (const point of [
    [-79, 22],
    [-70.7, 19],
    [-77.2, 18.1],
    [-66.5, 18.2],
  ])
    assert.ok(
      rings.slice(1).some((r) => contains(r, point)),
      `visible Caribbean island: ${point}`,
    );
  for (const point of [
    [-42, 72],
    [-48, 65],
    [-35, 78],
  ])
    assert.ok(
      rings.every((r) => !contains(r, point)),
      "Greenland is not drawn",
    );
});

test("Europe shows Great Britain and a united Ireland, with Iceland omitted", () => {
  const rings = continentRings("EUROPE");
  for (const point of [
    [-1, 52],
    [-8, 53],
    [-6.7, 54.7],
  ])
    assert.ok(
      rings.slice(1).some((r) => contains(r, point)),
      `reference island: ${point}`,
    );
  for (const sea of [
    [-5, 53],
    [-8, 58],
    [-15, 60],
  ])
    assert.ok(
      rings.every((r) => !contains(r, sea)),
      `sea remains sea: ${sea}`,
    );
  assert.ok(
    rings.every((r) => !contains(r, [-19, 65])),
    "Iceland is omitted",
  );
  const ireland = rings.find((r) => contains(r, [-8, 53]));
  assert.ok(
    contains(ireland, [-6.7, 54.7]),
    "Northern Ireland joins the same island outline",
  );
});

test("Africa retains Madagascar as a reference region", () => {
  const rings = continentRings("AFRICA");
  assert.ok(rings.slice(1).some((r) => contains(r, [47, -19])));
});

test("Antarctica uses a polar coastline without world-sheet seam and pole closure edges", () => {
  for (const geometry of [
    read("continents/CONT_ANTARCTICA.json"),
    read("detailed/ATA.json"),
    countries.find((f) => f.properties.id === "ATA").geometry,
  ]) {
    const p = prepareGeometry(geometry);
    assert.equal(p.projection.kind, "south-polar");
    const geographic = p.reference.map((v) => geographicPoint(v, p.projection));
    assert.ok(
      geographic.every((v) => v[1] > -87 && v[1] < -60),
      "all main-ring points are coastline, not pole/seam closure",
    );
    const span = (axis) =>
      Math.max(...p.reference.map((v) => v[axis])) -
      Math.min(...p.reference.map((v) => v[axis]));
    assert.ok(span(0) / span(1) > 0.7 && span(0) / span(1) < 1.5);
    assert.ok(p.points.flat().every(Number.isFinite));
  }
});

test("Crimea is connected to Ukraine's main outline at detailed and fallback scales and excluded from Russia", () => {
  for (const scale of ["detailed", "fallback"]) {
    const get = (id) =>
      scale === "detailed"
        ? read(`detailed/${id}.json`)
        : countries.find((f) => f.properties.id === id).geometry;
    const p = prepareGeometry(get("UKR"));
    const ring = p.reference.map((v) => geographicPoint(v, p.projection));
    for (const city of [
      [34.1, 44.95],
      [33.53, 44.6],
      [36.47, 45.35],
      [30.52, 50.45],
    ])
      assert.ok(contains(ring, city), `${scale}: ${city}`);
    const russian = get("RUS");
    const polygons =
      russian.type === "Polygon" ? [russian.coordinates] : russian.coordinates;
    assert.ok(
      polygons.every((polygon) => !contains(polygon[0], [34.1, 44.95])),
    );
  }
});

test("every country and continent supports finite Equal Earth outlines with invertible source coordinates", () => {
  const inputs = read("detailed/index.json").map((id) => [
    id,
    read(`detailed/${id}.json`),
    false,
  ]);
  for (const feature of read("continents/index.json").features)
    inputs.push([
      feature.properties.id,
      read(`continents/${feature.properties.id}.json`),
      true,
    ]);
  for (const [id, geometry, continent] of inputs) {
    const p = prepareGeometry(geometry, {
      continent,
      projection: "equal-earth",
    });
    assert.equal(p.projection.kind, "equal-earth");
    assert.equal(p.points.length, 1024);
    assert.ok(p.points.flat().every(Number.isFinite), id);
    assert.ok(
      p.reference
        .map((v) => geographicPoint(v, p.projection))
        .flat()
        .every(Number.isFinite),
      id,
    );
    if (id === "RUS") {
      const ring = p.reference.map((v) => geographicPoint(v, p.projection));
      assert.ok(
        Math.max(...ring.map((v) => v[0])) > 190,
        "Chukotka is retained beyond the date line",
      );
      assert.ok(
        Math.max(...ring.map((v) => v[0])) -
          Math.min(...ring.map((v) => v[0])) <
          180,
        "Russia has no projection seam across its main outline",
      );
    }
  }
});
