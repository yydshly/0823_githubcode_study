import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = JSON.parse(await fs.readFile(path.join(project, 'analysis', 'source-capability-matrix-v0.2-browser-review.json'), 'utf8'));
const [html, app, matrix, renderers] = await Promise.all([
  fs.readFile(path.join(project, 'asset-lab', 'index.html'), 'utf8'),
  fs.readFile(path.join(project, 'asset-lab', 'lab.js'), 'utf8'),
  fs.readFile(path.join(project, 'asset-lab', 'capability-matrix.js'), 'utf8'),
  fs.readFile(path.join(project, 'asset-lab', 'source-renderers.js'), 'utf8'),
]);
const checks = [];
const check = (id, ok, evidence = {}) => checks.push({ id, ok: Boolean(ok), evidence });

check('matrix.preserve.character', report.preserved.cards === 3 && report.preserved.packageButton && report.preserved.snapshot.characterCanvases === 3, report.preserved);
check('matrix.modes.four', (html.match(/data-mode=/g) || []).length >= 4 && report.preserved.snapshot.capabilitySummary.modes >= 4, report.preserved.snapshot.capabilitySummary);
check('matrix.style.registry', report.style.registry === 15 && report.style.snapshot.capabilitySummary.media === 6 && report.style.snapshot.capabilitySummary.historyStyles === 9 && report.style.selected === 1, report.style);
check('matrix.style.live-source', report.style.frameSrc.includes('../upstream/styles.html') && report.style.frameSrc.includes('style=cubism') && report.style.frameSrc.includes('seed=515151'), report.style);
check('matrix.item.registry', report.item.familyOptions === 13 && report.item.rankOptions === 4, report.item);
check('matrix.item.source-api', app.includes("from '../upstream/src/items/index.js'") && app.includes('rollItem(') && app.includes('thumbFor('), {});
check('matrix.item.deterministic', report.item.deterministic && report.item.snapshot.itemFingerprint, report.item);
check('matrix.item.export', report.itemExport.bytes > 5000 && report.itemExport.width === 512 && report.itemExport.height === 512 && report.itemExport.shaLength === 64 && report.itemExport.representation === 'procedural-2d-transparent-png', report.itemExport);
check('matrix.item.truth-boundary', report.itemExport.hosts === 3 && html.includes('不会伪装成 3D 模型'), report.itemExport);
check('matrix.environment.registry', report.environment.speciesOptions === 5 && report.environment.paletteOptions === 6 && report.environment.finishOptions === 3, report.environment);
check('matrix.environment.source-api', renderers.includes("from '../upstream/src/obj/orig.js'") && renderers.includes('buildPlant(recipe') && matrix.includes('procedural-threejs-geometry'), {});
check('matrix.environment.geometry', report.environment.canvases === 1 && report.environmentExport.verts > 0 && report.environmentExport.meshes > 0 && report.environmentExport.representation === 'procedural-threejs-geometry', report.environmentExport);
check('matrix.environment.proxy-export', report.environmentExport.bytes > 5000 && report.environmentExport.width === 768 && report.environmentExport.height === 768 && report.environmentExport.shaLength === 64 && report.environmentExport.proxy === 'transparent-png-proxy', report.environmentExport);
check('matrix.keyboard', report.keyboard.activeMode === 'item' && report.keyboard.focusMode === 'item', report.keyboard);
check('matrix.responsive', report.style.scrollWidth === report.style.viewport && report.environment.scrollWidth === report.environment.viewport && report.mobile.scrollWidth === report.mobile.viewport && report.mobile.activeMode === 'item', report.mobile);
check('matrix.fallback', report.fallback.snapshot.renderOff && report.fallback.environmentCanvas === 0 && report.fallback.environmentExportDisabled && report.fallback.recipeVisible && !report.fallback.itemExportDisabled, report.fallback);
check('matrix.console', report.consoleErrors.length === 0, report.consoleErrors);
const evidence = await Promise.all(report.evidence.map(async relative => { try { const stat = await fs.stat(path.join(project, relative)); return { relative, bytes: stat.size, ok: stat.size > 5000 }; } catch (error) { return { relative, ok: false, error: error.message }; } }));
check('matrix.evidence', evidence.every(item => item.ok), evidence);

for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.id}`);
const failures = checks.filter(item => !item.ok);
console.log(`SOURCE CAPABILITY MATRIX V0.2 ${checks.length - failures.length}/${checks.length}`);
if (failures.length) { console.log(JSON.stringify(failures, null, 2)); process.exitCode = 1; }

