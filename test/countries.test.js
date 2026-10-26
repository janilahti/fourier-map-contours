import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { wikipediaUrl, randomCountry } from "../src/countries.js";
const countries = JSON.parse(
  readFileSync(new URL("../public/data/countries.geojson", import.meta.url)),
).features;
test("every country has an English Wikipedia article link", () => {
  for (const country of countries) {
    const url = new URL(wikipediaUrl(country.properties));
    assert.equal(url.origin, "https://en.wikipedia.org");
    assert.ok(
      url.pathname.startsWith("/wiki/") && url.pathname.length > 6,
      country.properties.name,
    );
  }
  const title = (id) =>
    decodeURIComponent(
      new URL(
        wikipediaUrl(countries.find((c) => c.properties.id === id).properties),
      ).pathname.slice(6),
    );
  assert.equal(title("GEO"), "Georgia_(country)");
  assert.equal(title("ALD"), "Åland");
  assert.equal(title("HKG"), "Hong_Kong");
  assert.equal(title("SGS"), "South_Georgia_and_the_South_Sandwich_Islands");
});
test("random selection excludes the current country and covers the choices", () => {
  const current = countries[1].properties.id;
  const selected = new Set();
  for (let i = 0; i < countries.length - 1; i++)
    selected.add(
      randomCountry(
        countries,
        current,
        () => (i + 0.5) / (countries.length - 1),
      ).properties.id,
    );
  assert.equal(selected.size, countries.length - 1);
  assert.equal(selected.has(current), false);
  assert.equal(randomCountry([], current), undefined);
  assert.equal(
    randomCountry([countries[0]], countries[0].properties.id),
    countries[0],
  );
});
