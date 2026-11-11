import { coordinateHarmonics } from "./equations.js";
const TAU = Math.PI * 2;
export const SOUND_HARMONICS = 16;
function wrap(angle) {
  const value = ((angle % TAU) + TAU) % TAU;
  return value < 1e-12 || TAU - value < 1e-12 ? 0 : value;
}

// Sine convention: A_k sin(2πkt + phase_k). Each axis has its own time origin.
export function soundHarmonics(terms) {
  const byFrequency = new Map(
    coordinateHarmonics(terms).map((h) => [h.frequency, h]),
  );
  const raw = Array.from({ length: SOUND_HARMONICS }, (_, i) => {
    const h = byFrequency.get(i + 1);
    return {
      harmonic: i + 1,
      amplitude: h?.amplitude ?? 0,
      phase: h ? Math.atan2(h.a, h.b) : 0,
    };
  });
  const strongest = raw.reduce((a, b) => (a.amplitude >= b.amplitude ? a : b));
  const threshold = Math.max(1e-12, strongest.amplitude * 1e-9);
  for (const h of raw) if (h.amplitude < threshold) h.amplitude = 0;
  const total = raw.reduce((sum, h) => sum + h.amplitude, 0);
  const reference = total ? (raw[0].amplitude > 0 ? raw[0] : strongest) : null;
  const shift = reference ? reference.phase / reference.harmonic : 0;
  return {
    silent: total === 0,
    referenceHarmonic: reference?.harmonic ?? null,
    harmonics: raw.map((h) => {
      const amplitude = total ? h.amplitude / total : 0;
      const phase = amplitude ? wrap(h.phase - h.harmonic * shift) : 0;
      return {
        harmonic: h.harmonic,
        amplitude,
        levelDb: amplitude
          ? 20 * Math.log10(h.amplitude / strongest.amplitude)
          : null,
        phaseDegrees: amplitude ? (phase * 180) / Math.PI : null,
        cosine: amplitude * Math.sin(phase),
        sine: amplitude * Math.cos(phase),
      };
    }),
  };
}
export function periodicWaveCoefficients(signal) {
  const real = new Float32Array(SOUND_HARMONICS + 1);
  const imag = new Float32Array(SOUND_HARMONICS + 1);
  for (const h of signal.harmonics) {
    real[h.harmonic] = h.cosine;
    imag[h.harmonic] = h.sine;
  }
  return { real, imag };
}
function csvCell(value) {
  if (value === null || value === undefined) return "";
  const text =
    typeof value === "number"
      ? Number(value.toPrecision(12)).toString()
      : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
export function harmonicsCsv(signals, metadata, pitch) {
  const rows = [
    [
      "axis",
      "harmonic",
      "frequency_hz",
      "amplitude",
      "relative_db",
      "phase_degrees",
      "cosine_coefficient",
      "sine_coefficient",
      "reference_harmonic",
      "region",
      "region_id",
      "projection",
      "source_scale",
      "samples",
      "normalization",
      "phase_convention",
    ],
  ];
  for (const axis of ["x", "y"])
    for (const h of signals[axis].harmonics)
      rows.push([
        axis,
        h.harmonic,
        h.harmonic * pitch,
        h.amplitude,
        h.levelDb,
        h.phaseDegrees,
        h.cosine,
        h.sine,
        signals[axis].referenceHarmonic,
        metadata.name,
        metadata.id,
        metadata.projection,
        metadata.scale,
        metadata.samples,
        "sum of amplitudes = 1 per axis; DC removed",
        "sin(2*pi*k*t+phase); independent rising-zero reference per axis",
      ]);
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
