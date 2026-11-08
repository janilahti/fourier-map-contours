export const DEFAULT_SETTINGS = Object.freeze({
  country: "FIN",
  notation: "hidden",
  mode: "complex",
  count: 1,
  speed: 1,
  reverse: false,
  palette: "botanical",
  grow: true,
  circles: true,
  outline: true,
  fill: false,
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
  "fill",
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
  if (["hidden", "phase", "sine-cosine"].includes(params.get("notation")))
    state.notation = params.get("notation");
  state.count = number(params, "count", 1, 256, 1);
  state.speed = number(params, "speed", 0.25, 3, 0.25);
  for (const key of flags) {
    const value = params.get(key);
    if (value === "1" || value === "0") state[key] = value === "1";
  }
  if (!params.has("count")) state.count = state.grow ? 1 : 64;
  if (params.has("notation"))
    state.equations =
      state.notation !== "hidden" && params.get("equations") !== "0";
  else if (state.equations) state.notation = "phase";
  if (!state.equations) state.notation = "hidden";
  return state;
}
export function shareUrl(href, state) {
  const url = new URL(href);
  url.search = "";
  url.hash = "";
  for (const key of Object.keys(DEFAULT_SETTINGS))
    url.searchParams.set(
      key,
      flags.includes(key)
        ? (state[key] ?? DEFAULT_SETTINGS[key])
          ? "1"
          : "0"
        : String(state[key] ?? DEFAULT_SETTINGS[key]),
    );
  return url.href;
}
