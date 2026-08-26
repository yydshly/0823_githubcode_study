import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const sharpPath = process.env.SHARP_MODULE_PATH ||
  'C:\\Users\\yun68\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\sharp';
const sharp = require(sharpPath);
const kind = process.argv[2] === 'upstream' ? 'upstream' : 'lab';
const sourceDir = path.join(projectRoot, 'evidence', kind === 'lab' ? 'lab-screenshots' : 'screenshots');
const output = path.join(projectRoot, 'evidence', `${kind}-contact-sheet.webp`);
const files = (await fs.readdir(sourceDir)).filter((name) => /\.(png|jpe?g|webp)$/i.test(name)).sort().slice(0, 6);
if (files.length === 0) throw new Error(`No screenshots found in ${sourceDir}`);

const cellWidth = 400;
const cellHeight = 250;
const labelHeight = 32;
const columns = 2;
const rows = Math.ceil(files.length / columns);
const composites = [];

for (const [index, name] of files.entries()) {
  const x = (index % columns) * cellWidth;
  const y = Math.floor(index / columns) * (cellHeight + labelHeight);
  const image = await sharp(path.join(sourceDir, name))
    .resize(cellWidth, cellHeight, { fit: 'cover', position: 'center' })
    .webp({ quality: 62 })
    .toBuffer();
  const escaped = name.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const label = Buffer.from(`<svg width="${cellWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#071018"/><text x="12" y="21" fill="#d7eee7" font-family="Arial, sans-serif" font-size="13">${escaped}</text></svg>`);
  composites.push({ input: image, left: x, top: y }, { input: label, left: x, top: y + cellHeight });
}

await sharp({
  create: {
    width: columns * cellWidth,
    height: rows * (cellHeight + labelHeight),
    channels: 3,
    background: '#071018'
  }
}).composite(composites).webp({ quality: 68 }).toFile(output);

console.log(output);
