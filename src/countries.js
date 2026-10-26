// Explicit titles for ambiguous names and Natural Earth administrative labels.
const wikipediaTitles = {
  ALD: "Åland",
  BLM: "Saint Barthélemy",
  CPV: "Cape Verde",
  GEO: "Georgia (country)",
  GMB: "The Gambia",
  HKG: "Hong Kong",
  IOA: "Australian Indian Ocean Territories",
  MAC: "Macau",
  MAF: "Collectivity of Saint Martin",
  PSX: "State of Palestine",
  SGS: "South Georgia and the South Sandwich Islands",
  SRB: "Serbia",
  STP: "São Tomé and Príncipe",
  SWZ: "Eswatini",
  TZA: "Tanzania",
  USA: "United States",
  VAT: "Vatican City",
};
export function wikipediaUrl(country) {
  const title = wikipediaTitles[country.id] || country.name;
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(" ", "_"))}`;
}
export function randomCountry(countries, currentId, random = Math.random) {
  const choices = countries.filter(
    (country) => country.properties.id !== currentId,
  );
  return choices.length
    ? choices[Math.floor(random() * choices.length)]
    : countries[0];
}
