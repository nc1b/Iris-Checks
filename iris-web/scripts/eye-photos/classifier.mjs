// The math behind Iris's comparison: a small softmax classifier trained on image
// embeddings, nearest-neighbour search over reference photos, data splitting and
// accuracy metrics. Pure JavaScript, so it runs the same in the browser and in tests.

// Small seeded random generator (mulberry32), so builds are repeatable.
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, random) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function dot(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

export function l2normalize(v) {
  const norm = Math.sqrt(dot(v, v)) || 1;
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / norm;
  return out;
}

// Splits indices into train/validation/test, keeping each label's share the same in every part.
export function stratifiedSplit(labels, { fractions = [0.7, 0.15, 0.15], seed = 42 } = {}) {
  const random = seededRandom(seed);
  const byLabel = new Map();
  labels.forEach((label, i) => {
    if (!byLabel.has(label)) byLabel.set(label, []);
    byLabel.get(label).push(i);
  });
  const split = { train: [], val: [], test: [] };
  for (const indices of byLabel.values()) {
    const shuffled = shuffle(indices, random);
    const n = shuffled.length;
    // Every label gets at least one validation and one test example when it has 3+.
    const nTest = n >= 3 ? Math.max(1, Math.round(n * fractions[2])) : 0;
    const nVal = n >= 3 ? Math.max(1, Math.round(n * fractions[1])) : 0;
    split.test.push(...shuffled.slice(0, nTest));
    split.val.push(...shuffled.slice(nTest, nTest + nVal));
    split.train.push(...shuffled.slice(nTest + nVal));
  }
  return split;
}

function softmaxInPlace(z) {
  let max = -Infinity;
  for (const v of z) if (v > max) max = v;
  let sum = 0;
  for (let k = 0; k < z.length; k++) {
    z[k] = Math.exp(z[k] - max);
    sum += z[k];
  }
  for (let k = 0; k < z.length; k++) z[k] /= sum;
  return z;
}

export function predictProba(model, x) {
  const { weights, bias } = model;
  const z = new Float64Array(bias.length);
  for (let k = 0; k < bias.length; k++) z[k] = bias[k] + dot(weights[k], x);
  return softmaxInPlace(z);
}

// Multinomial logistic regression with L2 regularisation, trained full-batch with Adam.
// balance: weight each class equally so rare conditions aren't drowned out by common ones.
export function trainSoftmax(X, y, numClasses, {
  epochs = 300,
  learningRate = 0.05,
  l2 = 1e-3,
  balance = true,
  onProgress = null,
} = {}) {
  const n = X.length;
  const d = X[0].length;
  const K = numClasses;
  const weights = Array.from({ length: K }, () => new Float32Array(d));
  const bias = new Float32Array(K);

  const counts = new Array(K).fill(0);
  for (const label of y) counts[label]++;
  const present = counts.filter(Boolean).length;
  const sampleWeight = y.map((label) => (balance ? n / (present * counts[label]) : 1));
  const totalWeight = sampleWeight.reduce((a, b) => a + b, 0);

  const mW = Array.from({ length: K }, () => new Float32Array(d));
  const vW = Array.from({ length: K }, () => new Float32Array(d));
  const mB = new Float64Array(K);
  const vB = new Float64Array(K);
  const gW = Array.from({ length: K }, () => new Float64Array(d));
  const gB = new Float64Array(K);
  const [beta1, beta2, eps] = [0.9, 0.999, 1e-8];

  for (let epoch = 1; epoch <= epochs; epoch++) {
    for (let k = 0; k < K; k++) gW[k].fill(0);
    gB.fill(0);
    let loss = 0;

    for (let i = 0; i < n; i++) {
      const p = predictProba({ weights, bias }, X[i]);
      const w = sampleWeight[i] / totalWeight;
      loss -= w * Math.log(Math.max(p[y[i]], 1e-12));
      for (let k = 0; k < K; k++) {
        const err = w * (p[k] - (k === y[i] ? 1 : 0));
        if (err === 0) continue;
        gB[k] += err;
        const row = gW[k];
        const xi = X[i];
        for (let j = 0; j < d; j++) row[j] += err * xi[j];
      }
    }

    const c1 = 1 - beta1 ** epoch;
    const c2 = 1 - beta2 ** epoch;
    for (let k = 0; k < K; k++) {
      const W = weights[k], m = mW[k], v = vW[k], g = gW[k];
      for (let j = 0; j < d; j++) {
        const grad = g[j] + l2 * W[j];
        m[j] = beta1 * m[j] + (1 - beta1) * grad;
        v[j] = beta2 * v[j] + (1 - beta2) * grad * grad;
        W[j] -= (learningRate * (m[j] / c1)) / (Math.sqrt(v[j] / c2) + eps);
      }
      mB[k] = beta1 * mB[k] + (1 - beta1) * gB[k];
      vB[k] = beta2 * vB[k] + (1 - beta2) * gB[k] * gB[k];
      bias[k] -= (learningRate * (mB[k] / c1)) / (Math.sqrt(vB[k] / c2) + eps);
    }
    onProgress?.(epoch / epochs, loss);
  }
  return { weights, bias };
}

// refs: array of L2-normalised vectors. Returns the k most similar by cosine similarity.
export function nearestNeighbors(query, refs, k = 7) {
  const best = [];
  for (let i = 0; i < refs.length; i++) {
    const similarity = dot(query, refs[i]);
    if (best.length < k || similarity > best[best.length - 1].similarity) {
      best.push({ index: i, similarity });
      best.sort((a, b) => b.similarity - a.similarity);
      if (best.length > k) best.pop();
    }
  }
  return best;
}

export function quantile(values, q) {
  if (!values.length) return NaN;
  const sorted = Float64Array.from(values).sort();
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

// A score threshold that still flags at least `target` of the true cases. It sits halfway
// between that true case and the next-highest other photo, so it isn't tuned right up
// against one example and generalises better to new photos.
export function thresholdForSensitivity(scores, isPositive, target = 0.85, { min = 0.05, max = 0.9 } = {}) {
  const positives = scores.filter((_, i) => isPositive[i]).sort((a, b) => b - a);
  if (!positives.length) return 0.5;
  const index = Math.min(positives.length - 1, Math.max(0, Math.ceil(target * positives.length) - 1));
  const cut = positives[index];
  const below = scores.filter((s, i) => !isPositive[i] && s < cut);
  const nextNegative = below.length ? Math.max(...below) : 0;
  return Math.min(max, Math.max(min, (cut + nextNegative) / 2));
}

// Sensitivity, specificity and precision for flagging one condition at a threshold.
export function flagMetrics(scores, isPositive, threshold) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  scores.forEach((score, i) => {
    const flagged = score >= threshold;
    if (isPositive[i]) flagged ? tp++ : fn++;
    else flagged ? fp++ : tn++;
  });
  const ratio = (a, b) => (a + b ? a / (a + b) : null);
  return {
    sensitivity: ratio(tp, fn),
    specificity: ratio(tn, fp),
    precision: ratio(tp, fp),
    positives: tp + fn,
    negatives: tn + fp,
  };
}

export function confusionMatrix(yTrue, yPred, numClasses) {
  const m = Array.from({ length: numClasses }, () => new Array(numClasses).fill(0));
  yTrue.forEach((t, i) => m[t][yPred[i]]++);
  return m;
}

export function argmax(values) {
  let best = 0;
  for (let i = 1; i < values.length; i++) if (values[i] > values[best]) best = i;
  return best;
}

// Embeddings are stored as signed bytes (values × 127) to keep the database small.
export function encodeVectors(vectors) {
  const dim = vectors[0]?.length ?? 0;
  const bytes = new Uint8Array(vectors.length * dim);
  vectors.forEach((v, i) => {
    for (let j = 0; j < dim; j++) {
      const q = Math.max(-127, Math.min(127, Math.round(v[j] * 127)));
      bytes[i * dim + j] = q & 0xff;
    }
  });
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function decodeVectors(base64, dim) {
  const binary = atob(base64);
  const count = binary.length / dim;
  const vectors = [];
  for (let i = 0; i < count; i++) {
    const v = new Float32Array(dim);
    for (let j = 0; j < dim; j++) {
      const byte = binary.charCodeAt(i * dim + j);
      v[j] = (byte > 127 ? byte - 256 : byte) / 127;
    }
    vectors.push(l2normalize(v));
  }
  return vectors;
}
