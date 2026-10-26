// Rebuild the vector source for the social card using the app's actual Fourier math.
import { readFileSync, writeFileSync } from "node:fs";
import { mainRing, resample, transform, evaluate, TAU } from "../src/math.js";
const countries = JSON.parse(
  readFileSync(new URL("../public/data/countries.geojson", import.meta.url)),
);
const points = resample(
  mainRing(countries.features.find((f) => f.properties.id === "FIN").geometry),
);
const terms = transform(points).slice(0, 64),
  phase = 0.79;
const origin = [930, 320],
  scale = 175;
const screen = (p) => [origin[0] + p[0] * scale, origin[1] + p[1] * scale];
const path = (p) =>
  p
    .map((v, i) => `${i ? "L" : "M"}${v[0].toFixed(2)},${v[1].toFixed(2)}`)
    .join(" ");
const outline = [...points, points[0]].map(screen);
const trace = Array.from({ length: 810 }, (_, i) =>
  screen(evaluate(terms, (phase * i) / 809)),
);
let pen = origin.slice(),
  circles = "",
  vectors = "";
for (const c of terms) {
  const angle = TAU * c.frequency * phase;
  const next = [
    pen[0] + (c.re * Math.cos(angle) - c.im * Math.sin(angle)) * scale,
    pen[1] + (c.re * Math.sin(angle) + c.im * Math.cos(angle)) * scale,
  ];
  circles += `<circle cx="${pen[0]}" cy="${pen[1]}" r="${c.amplitude * scale}"/>`;
  vectors += `<path d="M${pen[0]},${pen[1]}L${next[0]},${next[1]}"/>`;
  pen = next;
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><pattern id="dots" width="25" height="25" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#a4c5b5" opacity=".15"/></pattern><clipPath id="panel"><rect x="610" y="30" width="560" height="570" rx="10"/></clipPath></defs>
<rect width="1200" height="630" fill="#f5f3eb"/>
<g fill="none" stroke="#375740" stroke-width="2"><circle cx="70" cy="67" r="20"/><circle cx="70" cy="67" r="9"/></g>
<text x="107" y="74" fill="#213b32" font-family="Arial,sans-serif" font-size="20" font-weight="bold" letter-spacing="3">BORDER / ORBIT</text>
<text x="50" y="155" fill="#667a6e" font-family="Arial,sans-serif" font-size="13" letter-spacing="2">AN INTERACTIVE FOURIER ATLAS</text>
<g fill="#213b32" font-family="Georgia,serif" font-size="82"><text x="47" y="260">A world drawn</text><text x="47" y="347">by <tspan fill="#53745d" font-style="italic">circles.</tspan></text></g>
<g fill="#667a6e" font-family="Arial,sans-serif" font-size="23"><text x="50" y="414">Country contours, reconstructed</text><text x="50" y="448">one rotating vector at a time.</text></g>
<rect x="50" y="510" width="238" height="48" rx="24" fill="#375740"/>
<text x="169" y="540" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" fill="#f5f3eb">Explore the Fourier atlas</text>
<g clip-path="url(#panel)"><rect x="610" y="30" width="560" height="570" fill="#101c1b"/><rect x="610" y="30" width="560" height="570" fill="url(#dots)"/>
<path d="${path(outline)}" fill="none" stroke="#90ad9f" stroke-opacity=".25" stroke-width="1.7"/>
<g fill="none" stroke="#aac5b8" stroke-opacity=".32" stroke-width="1.1">${circles}</g><g fill="none" stroke="#bbd2c7" stroke-opacity=".55" stroke-width="1.2">${vectors}</g>
<path d="${path(trace)}" fill="none" stroke="#84b8a4" stroke-width="3" stroke-linecap="round"/>
<path d="${path(trace.slice(-50))}" fill="none" stroke="#f2cc8b" stroke-width="3.4" stroke-linecap="round"/>
<circle cx="${pen[0]}" cy="${pen[1]}" r="5" fill="#f2cc8b"/>
<circle cx="640" cy="63" r="3" fill="#84b8a4"/><text x="654" y="68" fill="#a5b5a6" font-family="Arial,sans-serif" font-size="11" letter-spacing="2">GEOGRAPHY IN FREQUENCY SPACE</text>
<text x="640" y="567" fill="#d9dfcc" font-family="Georgia,serif" font-size="26">Finland</text><text x="1140" y="565" text-anchor="end" fill="#a5b5a6" font-family="Arial,sans-serif" font-size="13">64 epicycles</text></g>
</svg>`;
writeFileSync(new URL("../public/social-preview.svg", import.meta.url), svg);
console.log(
  "Wrote public/social-preview.svg (1200 × 630). Render it to social-preview.png after editing.",
);
