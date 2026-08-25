import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const playwrightPath = path.resolve(project, '..', 'kage', 'lab', 'node_modules', 'playwright', 'index.mjs');
const { chromium } = await import(pathToFileURL(playwrightPath));
const url = 'http://127.0.0.1:8882/projects/kindergrimm/asset-lab/';
const outputDir = path.join(project, 'asset-lab', 'samples', 'harbour-courier-240824');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForFunction(() => Boolean(window.__assetLab?.current) && !window.__assetLab.snapshot().busy, null, { timeout: 30000 });
const result = await page.evaluate(async () => {
  const toDataUrl = blob => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  const cornerAlpha = async blob => {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    return context.getImageData(0, 0, 1, 1).data[3];
  };
  const bundle = await window.__assetLab.exportBundle({ download: false });
  return {
    files: await Promise.all(bundle.files.map(async file => ({
      filename: file.record.filename,
      dataUrl: await toDataUrl(file.blob),
      record: { ...file.record, cornerAlpha: await cornerAlpha(file.blob) },
    }))),
    manifest: bundle.manifest,
  };
});
await browser.close();

await fs.mkdir(outputDir, { recursive: true });
for (const file of result.files) {
  const bytes = Buffer.from(file.dataUrl.split(',')[1], 'base64');
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  if (digest !== file.record.sha256) throw new Error(`SHA mismatch: ${file.filename}`);
  if (file.record.cornerAlpha !== 0) throw new Error(`Expected transparent corner: ${file.filename}`);
  await fs.writeFile(path.join(outputDir, file.filename), bytes);
}
result.manifest.outputs = result.files.map(file => file.record);
result.manifest.samplePath = 'asset-lab/samples/harbour-courier-240824';
await fs.writeFile(path.join(outputDir, 'harbour-courier-240824--manifest.json'), `${JSON.stringify(result.manifest, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  outputDir,
  files: result.files.map(file => ({ filename: file.filename, bytes: file.record.bytes, sha256: file.record.sha256, cornerAlpha: file.record.cornerAlpha })),
  manifest: 'harbour-courier-240824--manifest.json',
}, null, 2));
