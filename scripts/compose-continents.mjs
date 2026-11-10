// Compose requested continent regions using geographic boundaries and actual
// island coastlines. Some named geography regions are envelopes over water.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import clipping from "polygon-clipping";
const root = new URL("../public/data/", import.meta.url);
const read = (path) => JSON.parse(readFileSync(path));
const save = (path, value) => writeFileSync(path, JSON.stringify(value));
const [regionPath, countryPath] = process.argv.slice(2);
if (!regionPath || !countryPath)
  throw new Error(
    "Supply 110M geographic regions and 110M countries GeoJSON paths.",
  );
const regions = read(regionPath).features,
  countries = read(countryPath).features;
const region = (name) => {
  const feature = regions.find((f) => f.properties.NAME_EN === name);
  if (!feature) throw new Error(`Missing geographic region: ${name}`);
  return feature.geometry.coordinates;
};
const country = (code) => {
  const feature = countries.find((f) => f.properties.ADM0_A3 === code);
  if (!feature) throw new Error(`Missing country: ${code}`);
  return feature.geometry.coordinates;
};
const write = (name, coordinates) =>
  save(new URL(`continents/CONT_${name}.json`, root), {
    type: "MultiPolygon",
    coordinates,
  });
const caribbean = ["CUB", "HTI", "DOM", "JAM", "PRI", "BHS", "TTO"];
const northAmerica = clipping.difference(
  clipping.union(
    region("North America"),
    region("Central America"),
    ...caribbean.map(country),
  ),
  region("Greenland"),
);
write("NORTH_AMERICA", northAmerica);
write(
  "EUROPE",
  clipping.union(
    region("Europe"),
    country("GBR"),
    country("IRL"),
  ),
);
write("AFRICA", clipping.union(region("Africa"), country("MDG")));
const sources = read(new URL("sources.json", root));
const source = {
  url: "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson",
  sha256: createHash("sha256").update(readFileSync(countryPath)).digest("hex"),
};
sources.sources = sources.sources.filter((s) => s.url !== source.url);
sources.sources.push(source);
sources.continent_composition = {
  "North America": {
    add: [
      "Central America",
      "Cuba",
      "Hispaniola",
      "Jamaica",
      "Puerto Rico",
      "Bahamas",
      "Trinidad and Tobago",
    ],
    omit: ["Greenland"],
  },
  Europe: { add: ["Great Britain", "Ireland"], omit: ["Iceland"] },
  Africa: { add: ["Madagascar"] },
};
save(new URL("sources.json", root), sources);
