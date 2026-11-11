// Equal Earth projection: Šavrič, Patterson & Jenny (2018).
// https://doi.org/10.1080/13658816.2018.1504949
// Input/output angles are degrees; projected coordinates are dimensionless.
const A = 1.340264,
  B = -0.081106,
  C = 0.000893,
  D = 0.003796;
const M = Math.sqrt(3) / 2,
  RAD = Math.PI / 180;
function polynomial(theta) {
  const t2 = theta * theta,
    t6 = t2 * t2 * t2;
  return theta * (A + B * t2 + t6 * (C + D * t2));
}
function derivative(theta) {
  const t2 = theta * theta,
    t6 = t2 * t2 * t2;
  return A + 3 * B * t2 + t6 * (7 * C + 9 * D * t2);
}
const MAX_Y = polynomial(Math.PI / 3);
export function equalEarth([longitude, latitude]) {
  const theta = Math.asin(M * Math.sin(latitude * RAD));
  return [
    (longitude * RAD * Math.cos(theta)) / (M * derivative(theta)),
    polynomial(theta),
  ];
}
export function invertEqualEarth([x, y]) {
  // A low-order Fourier curve can overshoot the geographic map boundary.
  // Keep its inverse finite by clamping to the projection's latitude range.
  y = Math.max(-MAX_Y, Math.min(MAX_Y, y));
  let theta = y / A;
  for (let i = 0; i < 12; i++) {
    const delta = (polynomial(theta) - y) / derivative(theta);
    theta -= delta;
    if (Math.abs(delta) < 1e-12) break;
  }
  return [
    (x * M * derivative(theta)) / Math.cos(theta) / RAD,
    Math.asin(Math.max(-1, Math.min(1, Math.sin(theta) / M))) / RAD,
  ];
}
