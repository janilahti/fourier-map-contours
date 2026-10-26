export const DEFAULT_SETTINGS = Object.freeze({
  country: "FIN",
  mode: "complex",
  count: 64,
  speed: 1,
  reverse: false,
  palette: "botanical",
  grow: false,
  circles: true,
  outline: true,
  highlight: true,
  equations: false,
  coefficients: false,
  paused: false,
});
const flags = [
  "reverse",
  "grow",
  "circles",
  "outline",
  "highlight",
  "equations",
  "coefficients",
  "paused",
];
function number(params, key, min, max, step) {
  const raw = params.get(key);
  if (raw === null || raw.trim() === "") return DEFAULT_SETTINGS[key];
  const value = Number(raw);
  return Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value / step) * step))
    : DEFAULT_SETTINGS[key];
}
export function readSettings(search, countryIds, paletteIds) {
  const params = new URLSearchParams(search),
    state = { ...DEFAULT_SETTINGS };
  const country = params.get("country")?.toUpperCase();
  if (countryIds.includes(country)) state.country = country;
  if (["complex", "separate"].includes(params.get("mode")))
    state.mode = params.get("mode");
  if (paletteIds.includes(params.get("palette")))
    state.palette = params.get("palette");
  state.count = number(params, "count", 1, 256, 1);
  state.speed = number(params, "speed", 0.25, 3, 0.25);
  for (const key of flags) {
    const value = params.get(key);
    if (value === "1" || value === "0") state[key] = value === "1";
  }
  if (state.grow && !params.has("count")) state.count = 1;
  return state;
}
export function shareUrl(href, state) {
  const url = new URL(href);
  url.search = "";
  url.hash = "";
  for (const key of Object.keys(DEFAULT_SETTINGS))
    url.searchParams.set(
      key,
      flags.includes(key) ? (state[key] ? "1" : "0") : String(state[key]),
    );
  return url.href;
}
