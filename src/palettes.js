export const palettes = [
  { id: "botanical", name: "Botanical · sage & parchment" },
  { id: "lagoon", name: "Lagoon · ocean & sea glass" },
  { id: "terracotta", name: "Terracotta · clay & sand" },
  { id: "twilight", name: "Twilight · lilac & ink" },
  { id: "midnight", name: "Midnight · blue & gold" },
];

export function canvasColors(element = document.documentElement) {
  const style = getComputedStyle(element);
  return Object.fromEntries(
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
}
