// Trains and tests the photo-match classifier, and writes:
//   - eye-photo-model.json  (classifier, thresholds, test accuracy) for the website's server
//   - eye-reference-v1.json (one fingerprint per photo, with label and split) for Supabase
import fs from 'node:fs';
import {
  argmax, confusionMatrix, encodeVectors, flagMetrics, l2normalize, nearestNeighbors,
  predictProba, quantile, stratifiedSplit, thresholdForSensitivity, trainSoftmax,
} from './classifier.mjs';

const [input, modelOut, refOut] = process.argv.slice(2);
const raw = JSON.parse(fs.readFileSync(input, 'utf8'));

const LABEL = { Normal: 'normal', Cataract: 'cataract', Conjunctivitis: 'conjunctivitis', Uveitis: 'uveitis', Eyelid: 'eyelid' };
const LABELS = ['normal', 'cataract', 'conjunctivitis', 'uveitis', 'eyelid'];

// Drop exact duplicate files.
const seen = new Set();
const items = raw.filter((r) => !seen.has(r.sha256) && seen.add(r.sha256));
const y = items.map((r) => LABELS.indexOf(LABEL[r.cls]));
const X = items.map((r) => l2normalize(Float32Array.from(r.emb)));
const Xf = items.map((r) => l2normalize(Float32Array.from(r.flip)));
const split = stratifiedSplit(y, { seed: 42 });
const K = LABELS.length;

const rows = (idx, flips) => {
  const A = [], B = [];
  for (const i of idx) { A.push(X[i]); B.push(y[i]); if (flips) { A.push(Xf[i]); B.push(y[i]); } }
  return [A, B];
};

const round = (n, d = 4) => Number(n.toFixed(d));
const [trX, trY] = rows(split.train, true);
const tuning = trainSoftmax(trX, trY, K, { epochs: 250 });

// Thresholds on validation: catch at least 85% of each condition.
const valP = split.val.map((i) => predictProba(tuning, X[i]));
const thresholds = {};
LABELS.forEach((l, k) => {
  if (l === 'normal') return;
  thresholds[l] = round(thresholdForSensitivity(valP.map((p) => p[k]), split.val.map((i) => y[i] === k), 0.85));
});
const trainRefs = split.train.map((i) => X[i]);
const valClosest = split.val.map((i) => nearestNeighbors(X[i], trainRefs, 1)[0].similarity);
const minSimilarity = round(quantile(valClosest, 0.02) - 0.02);

// Honest accuracy on test photos never used for training or tuning.
const testP = split.test.map((i) => predictProba(tuning, X[i]));
const testY = split.test.map((i) => y[i]);
const perClass = {};
LABELS.forEach((l, k) => {
  if (l === 'normal') return;
  const m = flagMetrics(testP.map((p) => p[k]), testY.map((t) => t === k), thresholds[l]);
  perClass[l] = Object.fromEntries(Object.entries(m).map(([a, v]) => [a, v === null || Number.isInteger(v) ? v : round(v)]));
});
// "Anything wrong?" view: does Iris flag any condition when the eye isn't normal?
const anyFlag = testP.map((p) => LABELS.some((l, k) => l !== 'normal' && p[k] >= thresholds[l]));
const anyM = flagMetrics(anyFlag.map(Number), testY.map((t) => t !== 0), 0.5);
const pred = testP.map(argmax);
const accuracy = round(pred.filter((p, i) => p === testY[i]).length / pred.length);

// Final model on train + validation.
const [fX, fY] = rows([...split.train, ...split.val], true);
const final = trainSoftmax(fX, fY, K, { epochs: 250 });

const splitOf = new Array(items.length);
for (const [name, idx] of Object.entries(split)) for (const i of idx) splitOf[i] = name;

const counts = Object.fromEntries(LABELS.map((l, k) => [l, y.filter((v) => v === k).length]));
const model = {
  version: 1,
  createdAt: new Date().toISOString(),
  embedder: { model: 'mobilenet_v3_large', mediapipe: '1.1.1', preprocess: 'centre square crop → 96 px → 224 px', dim: X[0].length },
  dataset: {
    id: 'mendeley-eye-diseases-classification',
    name: 'Eye Diseases Classification (Mendeley Data, 2024)',
    images: items.length,
    counts,
  },
  labels: LABELS,
  thresholds,
  novelty: { minSimilarity },
  metrics: {
    split: { train: split.train.length, validation: split.val.length, test: split.test.length },
    accuracy,
    anyCondition: Object.fromEntries(Object.entries(anyM).map(([a, v]) => [a, v === null || Number.isInteger(v) ? v : round(v)])),
    perClass,
    confusion: confusionMatrix(testY, pred, K),
  },
  classifier: {
    weights: final.weights.map((r) => Array.from(r, (v) => round(v, 5))),
    bias: Array.from(final.bias, (v) => round(v, 5)),
  },
};
fs.writeFileSync(modelOut, JSON.stringify(model));

const refs = {
  version: 1,
  model: model.embedder,
  dataset: model.dataset,
  items: items.map((r, i) => ({
    label: LABELS[y[i]],
    file: `${r.cls}/${r.file}`,
    sha256: r.sha256,
    width: r.width,
    height: r.height,
    split: splitOf[i],
    embedding: encodeVectors([X[i]]),
  })),
};
fs.writeFileSync(refOut, JSON.stringify(refs));

console.log(JSON.stringify({ counts, thresholds, minSimilarity, ...model.metrics }, null, 1));
console.log('model KB', Math.round(fs.statSync(modelOut).size / 1024), 'refs KB', Math.round(fs.statSync(refOut).size / 1024));
