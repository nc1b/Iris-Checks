export type QualityIssue = "too_small" | "too_dark" | "too_bright" | "glare" | "blur" | "low_contrast";

export type QualityReport = {
  ok: boolean;
  issues: QualityIssue[];
  side: number;
  brightness: number;
  sharpness: number;
  clipped: number;
  contrast: number;
};

export const QUALITY_LIMITS = {
  minSide: 320,
  minBrightness: 55,
  maxBrightness: 215,
  maxClipped: 0.06,
  minSharpness: 25,
  minContrast: 22,
};

export const RETAKE: Record<QualityIssue, { title: string; fix: string }> = {
  too_small: {
    title: "The eye is too small in the photo",
    fix: "Move the phone closer (about 10–15 cm / 4–6 in) or use the 2× lens if your phone has one, until the eye fills the guide.",
  },
  too_dark: {
    title: "The photo is too dark",
    fix: "Face a window or a bright lamp so the light falls on the eye. Avoid having the light behind the person.",
  },
  too_bright: {
    title: "The photo is washed out",
    fix: "Move out of direct sunlight or turn the flashlight off, then try again.",
  },
  glare: {
    title: "A bright reflection is covering the eye",
    fix: "Tilt the phone slightly or move the light to the side so the reflection isn't over the dark centre of the eye.",
  },
  blur: {
    title: "The photo is blurry",
    fix: "Hold the phone steady with both hands, tap the eye on screen to focus, and wait a second before taking the photo. Too close also blurs: back off a little if needed.",
  },
  low_contrast: {
    title: "The eye isn't clear enough",
    fix: "Make sure the eye is open and in the guide, the lens is clean, and the light is in front of the person.",
  },
};

export function measureQuality(data: Uint8ClampedArray, width: number, height: number, side = Math.min(width, height)): QualityReport {
  const scale = Math.min(1, 256 / Math.max(width, height));
  const w = Math.max(8, Math.round(width * scale));
  const h = Math.max(8, Math.round(height * scale));
  const grey = new Float32Array(w * h);
  let sum = 0;
  let sumSq = 0;
  let clippedCount = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const v = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sum += v;
      sumSq += v * v;
      if (v >= 253) clippedCount++;
    }
  }
  const n = width * height;
  const brightness = sum / n;
  const contrast = Math.sqrt(Math.max(0, sumSq / n - brightness * brightness));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = Math.min(width - 1, Math.floor(x / scale));
      const sy = Math.min(height - 1, Math.floor(y / scale));
      const i = (sy * width + sx) * 4;
      grey[y * w + x] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
  }
  let lapSum = 0;
  let lapSq = 0;
  let count = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const c = y * w + x;
      const lap = grey[c - 1] + grey[c + 1] + grey[c - w] + grey[c + w] - 4 * grey[c];
      lapSum += lap;
      lapSq += lap * lap;
      count++;
    }
  }
  const lapMean = lapSum / Math.max(1, count);
  const sharpness = lapSq / Math.max(1, count) - lapMean * lapMean;
  const clipped = clippedCount / n;

  const L = QUALITY_LIMITS;
  const issues: QualityIssue[] = [];
  if (side < L.minSide) issues.push("too_small");
  if (brightness < L.minBrightness) issues.push("too_dark");
  else if (brightness > L.maxBrightness) issues.push("too_bright");
  if (clipped > L.maxClipped && brightness <= L.maxBrightness) issues.push("glare");
  if (sharpness < L.minSharpness && brightness >= L.minBrightness) issues.push("blur");
  if (contrast < L.minContrast && !issues.length) issues.push("low_contrast");
  return { ok: issues.length === 0, issues, side, brightness, sharpness, clipped, contrast };
}
