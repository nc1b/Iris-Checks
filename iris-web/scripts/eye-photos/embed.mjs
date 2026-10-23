// Embeds every dataset image with MediaPipe Image Embedder (same version and model as the site),
// using the shared preprocessing: centre square crop → 96 px → 224 px.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const [root, out, mp, model] = process.argv.slice(2);
const files = [];
for (const cls of fs.readdirSync(root).sort()) for (const f of fs.readdirSync(path.join(root, cls)).sort()) files.push({ cls, f, p: path.join(root, cls, f) });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('http://local/**', (r) => {
  const u = new URL(r.request().url());
  if (u.pathname.startsWith('/mp/')) return r.fulfill({ path: path.join(mp, u.pathname.slice(4)) });
  if (u.pathname === '/model.tflite') return r.fulfill({ path: model });
  if (u.pathname.startsWith('/img/')) return r.fulfill({ path: decodeURIComponent(u.pathname.slice(5)) });
  if (u.pathname === '/') return r.fulfill({ body: '<html><body></body></html>', contentType: 'text/html' });
  r.fulfill({ status: 404 });
});
await page.goto('http://local/');
await page.evaluate(async () => {
  const vision = await import('http://local/mp/vision_bundle.mjs');
  const fileset = await vision.FilesetResolver.forVisionTasks('http://local/mp/wasm');
  window.embedder = await vision.ImageEmbedder.createFromOptions(fileset, { baseOptions: { modelAssetPath: 'http://local/model.tflite', delegate: 'CPU' }, l2Normalize: true, quantize: false });
  const small = document.createElement('canvas'); small.width = small.height = 96;
  const big = document.createElement('canvas'); big.width = big.height = 224;
  window.embedOne = async (url) => {
    const img = new Image(); img.src = url; await img.decode();
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const out = [];
    for (const flip of [false, true]) {
      const s = small.getContext('2d');
      s.save(); if (flip) { s.translate(96, 0); s.scale(-1, 1); }
      s.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 96, 96);
      s.restore();
      const b = big.getContext('2d'); b.imageSmoothingQuality = 'high';
      b.drawImage(small, 0, 0, 224, 224);
      out.push(Array.from(window.embedder.embed(big).embeddings[0].floatEmbedding));
    }
    return { width: img.naturalWidth, height: img.naturalHeight, emb: out[0], flip: out[1] };
  };
});
const results = [];
let i = 0;
for (const file of files) {
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(file.p)).digest('hex');
  try {
    const r = await page.evaluate((u) => window.embedOne(u), 'http://local/img/' + encodeURIComponent(file.p));
    results.push({ cls: file.cls, file: file.f, sha256, ...r });
  } catch (e) { console.log('skip', file.p, e.message.slice(0, 80)); }
  if (++i % 250 === 0) console.log(i, '/', files.length);
}
fs.writeFileSync(out, JSON.stringify(results));
console.log('done', results.length, 'dim', results[0].emb.length);
await browser.close();
