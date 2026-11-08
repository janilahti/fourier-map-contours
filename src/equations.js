// Combine selected signed-frequency vectors into equivalent real harmonics.
export function coordinateHarmonics(terms, imaginary = false) {
  const harmonics = new Map();
  for (const term of terms) {
    const k = Math.abs(term.frequency),
      sign = term.frequency < 0 ? -1 : 1;
    const h = harmonics.get(k) || { frequency: k, a: 0, b: 0 };
    h.a += imaginary ? term.im : term.re;
    h.b += (imaginary ? term.re : -term.im) * sign;
    harmonics.set(k, h);
  }
  return [...harmonics.values()]
    .map((h) => ({
      ...h,
      amplitude: Math.hypot(h.a, h.b),
      phase: Math.atan2(-h.b, h.a),
    }))
    .sort((a, b) => b.amplitude - a.amplitude);
}
export function coordinateSeries(series, separate) {
  return {
    x: coordinateHarmonics(separate ? series.x : series.c),
    y: coordinateHarmonics(separate ? series.y : series.c, !separate),
  };
}
export function equationText(notation) {
  return notation === "sine-cosine"
    ? "x(t) = Σ [aₖ cos(2πkt) + bₖ sin(2πkt)]\ny(t) = Σ [cₖ cos(2πkt) + dₖ sin(2πkt)]"
    : "x(t) = Σ Aₓ,ₖ cos(2πkt + φₓ,ₖ)\ny(t) = Σ Aᵧ,ₖ cos(2πkt + φᵧ,ₖ)";
}
