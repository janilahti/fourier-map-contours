export const palettes = [
  { id: "botanical", name: "Botanical · sage & parchment" },
  { id: "lagoon", name: "Lagoon · ocean & sea glass" },
  { id: "terracotta", name: "Terracotta · clay & sand" },
  { id: "twilight", name: "Twilight · lilac & ink" },
  { id: "midnight", name: "Midnight · blue & gold" },
  { id: "high-visibility", name: "High visibility · black, white & yellow" },
];

export function canvasColors(element = document.documentElement) {
  const style = getComputedStyle(element);
  const colors = Object.fromEntries(
    [
      "canvas",
      "grid",
      "circle",
      "vector",
      "guide",
      "trace",
      "tip",
      "highlight",
      "crosshair",
    ].map((name) => [name, style.getPropertyValue(`--${name}`).trim()]),
  );
  colors.circleWidth = Number(style.getPropertyValue("--circle-width")) || 0.8;
  colors.traceWidth = Number(style.getPropertyValue("--trace-width")) || 2;
  return colors;
}
