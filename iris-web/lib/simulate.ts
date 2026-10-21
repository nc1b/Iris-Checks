import { CROP_SIZE, CROP_SPAN } from "./pupil";
import { idealCurve, REFERENCE_SHAPES, type Protocol, type Sample } from "./analysis";

/**
 * Demo data: fake camera samples (with noise, jitter and a blink) that go through
 * the exact same analysis as a real scan. Clearly labelled as simulated in the UI.
 */
export function simulateSamples(protocol: Protocol, profile: "typical" | "diabetesLike", seed = 7): Sample[] {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(2 * Math.PI * rand());

  const params = REFERENCE_SHAPES[profile];
  const irisPx = CROP_SIZE / 2 / CROP_SPAN;
  const samples: Sample[] = [];
  let t = 0;
  const blinkAt = protocol.duration * 0.8;
  while (t <= protocol.duration) {
    const r = idealCurve(t, params, protocol.stimuli);
    const open = Math.abs(t - blinkAt) > 0.12;
    const eye = () => ({
      pupilPx: (r + gauss() * 0.008) * irisPx,
      irisPx: irisPx * (1 + gauss() * 0.01),
      contrast: 45 + gauss() * 5,
    });
    samples.push({ t, open, left: eye(), right: eye() });
    t += 1 / 28 + gauss() * 0.003;
  }
  return samples;
}
