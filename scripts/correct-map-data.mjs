// Keep Crimea within Ukraine using the source's own matching-scale boundary.
// Run after prepare-map-data.py, or directly with the two disputed-area files.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import polygonClipping from "polygon-clipping";
const root = new URL("../public/data/", import.meta.url);
const read = (path) => JSON.parse(readFileSync(path));
const save = (path, value) => writeFileSync(path, JSON.stringify(value));
const geometry = (coordinates) => ({ type: "MultiPolygon", coordinates });
const sources = read(new URL("sources.json", root));
const paths = process.argv.slice(2);
if (paths.length !== 2)
  throw new Error(
    "Supply 10M disputed areas and 50M breakaway disputed areas GeoJSON paths.",
  );
for (const [index, scale] of ["10m", "50m"].entries()) {
  const path = paths[index],
    data = read(path);
  const crimea = data.features.find((f) => f.properties.BRK_A3 === "B89");
  if (!crimea) throw new Error(`Crimea B89 missing from ${path}`);
  const atlas =
    scale === "50m" ? read(new URL("countries.geojson", root)) : null;
  const get = (id) =>
    atlas
      ? atlas.features.find((f) => f.properties.id === id).geometry
      : read(new URL(`detailed/${id}.json`, root));
  const set = (id, value) =>
    atlas
      ? (atlas.features.find((f) => f.properties.id === id).geometry = value)
      : save(new URL(`detailed/${id}.json`, root), value);
  set(
    "UKR",
    geometry(
      polygonClipping.union(
        get("UKR").coordinates,
        crimea.geometry.coordinates,
      ),
    ),
  );
  set(
    "RUS",
    geometry(
      polygonClipping.difference(
        get("RUS").coordinates,
        crimea.geometry.coordinates,
      ),
    ),
  );
  if (atlas) save(new URL("countries.geojson", root), atlas);
  const filename =
    scale === "10m"
      ? "ne_10m_admin_0_disputed_areas.geojson"
      : "ne_50m_admin_0_breakaway_disputed_areas.geojson";
  const source = {
    url: `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/${filename}`,
    sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
  };
  sources.sources = sources.sources.filter((s) => s.url !== source.url);
  sources.sources.push(source);
}
sources.corrections = {
  Crimea:
    "Union B89 into Ukraine and subtract from Russia at matching 10M and 50M resolutions.",
};
save(new URL("sources.json", root), sources);
