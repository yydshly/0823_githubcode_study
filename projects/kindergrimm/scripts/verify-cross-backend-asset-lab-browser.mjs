import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = JSON.parse(await fs.readFile(path.join(project, 'analysis', 'cross-backend-asset-lab-browser-review.json'), 'utf8'));
const checks = [];
const check = (id, ok, evidence = {}) => checks.push({ id, ok: Boolean(ok), evidence });

check('lab.browser.desktop', report.desktop.viewport === 1440 && report.desktop.scrollWidth === 1440 && report.desktop.cards === 3 && report.desktop.snapshot.canRender && report.desktop.snapshot.canvases === 3, report.desktop);
check('lab.browser.source-boundary', report.desktop.sourceBoundary && report.desktop.snapshot.nativeSeeds.join(',') === '240824,240824,240824', report.desktop);
check('lab.browser.regenerate', report.interaction.snapshot.seed === 418203 && report.interaction.snapshot.species === 'cat' && report.interaction.snapshot.nativeSeeds.every(seed => seed === 418203) && report.interaction.statLabels.every(label => !label.includes('等待')), report.interaction);
check('lab.browser.export', report.exportResult.fileCount === 4 && report.exportResult.pngs.every(file => file.bytes > 5000 && file.width === 768 && file.height === 768 && file.shaLength === 64), report.exportResult);
check('lab.browser.manifest', report.exportResult.manifest.outputCount === 3 && report.exportResult.manifest.commit === '5857b1e1cae2713d6714ad7dd7f89626bb242f0f' && report.exportResult.manifest.runtimeModel === 'none', report.exportResult.manifest);
check('lab.browser.invalid', report.invalid.message.includes('Seed') && report.invalid.currentSeed === 418203, report.invalid);
check('lab.browser.keyboard', report.keyboard.seed === 418204 && report.keyboard.outline === '3px', report.keyboard);
check('lab.browser.tablet', report.tablet.viewport === 1024 && report.tablet.scrollWidth === 1024 && report.tablet.columns.split(' ').length === 2, report.tablet);
check('lab.browser.mobile', report.mobile.viewport === 390 && report.mobile.scrollWidth === 390 && report.mobile.columns.split(' ').length === 1 && report.mobile.canvasWidth <= 390 && report.mobile.exportVisible, report.mobile);
check('lab.browser.reduced-motion', report.reduced.matched && report.reduced.scrollBehavior === 'auto', report.reduced);
check('lab.browser.fallback', report.fallback.snapshot.renderOff && !report.fallback.snapshot.canRender && report.fallback.snapshot.fallbackVisible && report.fallback.snapshot.canvases === 0 && report.fallback.recipes === 3 && report.fallback.sourceLinks === 3 && report.fallback.exportDisabled, report.fallback);
check('lab.browser.overview-entry', report.overview.links.length >= 4 && report.overview.links.some(label => label.includes('Drawn / Voxel / Gloss')) && report.overview.scrollWidth === report.overview.viewport, report.overview);
check('lab.browser.console', report.consoleErrors.length === 0, report.consoleErrors);
const evidence = await Promise.all(report.evidence.map(async relative => {
  try { const stat = await fs.stat(path.join(project, relative)); return { relative, bytes: stat.size, ok: stat.size > 0 }; }
  catch (error) { return { relative, ok: false, error: error.message }; }
}));
check('lab.browser.evidence', evidence.every(item => item.ok), evidence);

for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.id}`);
const failures = checks.filter(item => !item.ok);
console.log(`CROSS-BACKEND ASSET LAB BROWSER ${checks.length - failures.length}/${checks.length}`);
if (failures.length) {
  console.log(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
}
