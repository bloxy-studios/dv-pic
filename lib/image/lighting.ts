export type LumaPlan = {
  mean: number;
  shadowClip: number;
  highlightClip: number;
  recommendation: "none" | "gentle" | "retake";
  allowCorrection: boolean;
  detail: string;
};

const MAX_GAIN = 1.2;
const MAX_SHADOW_LIFT = 12;

export function analyzeLuminance(rgba: Uint8ClampedArray): LumaPlan {
  const pixels = Math.floor(rgba.length / 4);
  if (pixels === 0) {
    return {
      mean: 0,
      shadowClip: 0,
      highlightClip: 0,
      recommendation: "retake",
      allowCorrection: false,
      detail: "The image has no pixels to assess.",
    };
  }
  let sum = 0;
  let shadows = 0;
  let highlights = 0;
  const step = Math.max(1, Math.floor(pixels / 40_000));
  let sampled = 0;
  for (let index = 0; index < pixels; index += step) {
    const offset = index * 4;
    const luma =
      0.2126 * (rgba[offset] ?? 0) +
      0.7152 * (rgba[offset + 1] ?? 0) +
      0.0722 * (rgba[offset + 2] ?? 0);
    sum += luma;
    sampled += 1;
    if (luma <= 8) shadows += 1;
    if (luma >= 247) highlights += 1;
  }
  const mean = sum / sampled;
  const shadowClip = shadows / sampled;
  const highlightClip = highlights / sampled;

  if (mean < 40 || highlightClip > 0.12 || shadowClip > 0.35) {
    return {
      mean,
      shadowClip,
      highlightClip,
      recommendation: "retake",
      allowCorrection: false,
      detail:
        "The lighting is severely underexposed, overexposed, or heavily clipped. A gentle adjustment would not recover a natural photograph. Take another photo with even light.",
    };
  }
  if (mean < 90) {
    return {
      mean,
      shadowClip,
      highlightClip,
      recommendation: "gentle",
      allowCorrection: true,
      detail:
        "The photograph looks somewhat dark. Gentle lighting correction can lift it slightly. It stays off until you turn it on, and it is not a substitute for a well-lit photo.",
    };
  }
  return {
    mean,
    shadowClip,
    highlightClip,
    recommendation: "none",
    allowCorrection: true,
    detail: "No strong exposure problem was measured. Leave lighting correction off unless you want a very small adjustment.",
  };
}

/** Returns a new buffer. Intensity is 0–1. Severe images should not be exported with this enabled. */
export function applyGentleLighting(rgba: Uint8ClampedArray, intensity: number): Uint8ClampedArray {
  const output = new Uint8ClampedArray(rgba);
  const amount = clamp(intensity, 0, 1);
  if (amount === 0) return output;
  const gain = 1 + (MAX_GAIN - 1) * amount;
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  for (let offset = 0; offset < rgba.length; offset += 16) {
    red += rgba[offset] ?? 0;
    green += rgba[offset + 1] ?? 0;
    blue += rgba[offset + 2] ?? 0;
    count += 1;
  }
  const average = (red + green + blue) / (3 * Math.max(1, count));
  const castLimit = 4 * amount;
  const redShift = clamp((average - red / Math.max(1, count)) * 0.15, -castLimit, castLimit);
  const greenShift = clamp((average - green / Math.max(1, count)) * 0.15, -castLimit, castLimit);
  const blueShift = clamp((average - blue / Math.max(1, count)) * 0.15, -castLimit, castLimit);

  for (let offset = 0; offset < output.length; offset += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      const value = output[offset + channel] ?? 0;
      const shift = channel === 0 ? redShift : channel === 1 ? greenShift : blueShift;
      const lifted = value < 80 ? value + MAX_SHADOW_LIFT * amount * (1 - value / 80) : value;
      output[offset + channel] = clamp(Math.round(lifted * gain + shift), 0, 255);
    }
  }
  return output;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
