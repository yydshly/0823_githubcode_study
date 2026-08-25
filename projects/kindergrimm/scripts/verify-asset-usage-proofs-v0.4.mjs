import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = JSON.parse(await fs.readFile(path.join(project, 'analysis', 'asset-usage-proofs-v0.4-browser-review.json'), 'utf8'));
const { USAGE_PROOFS } = await import(pathToFileURL(path.join(project, 'asset-lab', 'usage-proofs.js')));
const [html, app, renderers] = await Promise.all([
  fs.readFile(path.join(project, 'asset-lab', 'index.html'), 'utf8'),
  fs.readFile(path.join(project, 'asset-lab', 'lab.js'), 'utf8'),
  fs.readFile(path.join(project, 'asset-lab', 'source-renderers.js'), 'utf8'),
]);
const checks = [];
const check = (id, ok, evidence = {}) => checks.push({ id, ok: Boolean(ok), evidence });

check('usage.mode-six', report.narrative.snapshot.capabilitySummary.modes === 6 && (html.match(/data-mode=/g) || []).length === 6, report.narrative.snapshot.capabilitySummary);
check('usage.registry-three', USAGE_PROOFS.length === 3 && new Set(USAGE_PROOFS.map(item => item.id)).size === 3 && USAGE_PROOFS.every(item => item.consumer && item.assets && item.value && item.next && item.boundary), USAGE_PROOFS);
check('usage.narrative-real-media', report.narrative.characterSource && report.narrative.itemSource && report.narrative.title === '暴雨后的港口回信' && report.narrative.copy.length > 10, report.narrative);
check('usage.narrative-context', report.narrative.contextTitle === '叙事对话' && report.narrative.contextFields === 4 && report.narrative.selectedTabs === 1, report.narrative);
check('usage.collection-real-media', report.collection.characterSource && report.collection.itemSource && report.collection.ledgerRows === 4, report.collection);
check('usage.collection-provenance', app.includes('renderCollectionLedger') && report.collection.title.includes('暴雨后的港口回信'), report.collection);
check('usage.world-real-builders', renderers.includes('class UsageWorldRenderer') && renderers.includes('buildVoxelCharacter(characterRecipe)') && renderers.includes('buildPlant(environmentRecipe'), {});
check('usage.world-live-geometry', report.world.snapshot.usageWorldCanvas === 1 && report.world.stats.representation === 'live procedural Three.js placement' && report.world.stats.voxel.voxels > 0 && report.world.stats.plant.verts > 0, report.world.stats.renderer);
check('usage.world-render-budget', report.world.stats.renderer.calls > 0 && report.world.stats.renderer.calls < 100 && report.world.stats.renderer.triangles > 0 && report.world.stats.renderer.triangles < 100000 && report.world.stats.buildMs < 500, { buildMs: report.world.stats.buildMs, renderer: report.world.stats.renderer });
check('usage.world-camera-surface', report.world.canvas.cssWidth > 700 && report.world.canvas.cssHeight >= 500 && report.world.fallbackHidden, report.world.canvas);
check('usage.world-item-is-hud', report.world.itemHud && html.includes('QUEST ITEM · 2D HUD') && html.includes('不会变成伪 3D 碰撞物'), {});
check('usage.scene-refresh', report.alternative.sceneTitle === '冬日温室的临时庇护' && report.alternative.storyTitle === report.alternative.sceneTitle && report.alternative.collectionTitle.includes(report.alternative.sceneTitle) && report.alternative.worldTitle === report.alternative.sceneTitle, report.alternative);
check('usage.refresh-deterministic', report.deterministic.samePlan && report.deterministic.worldTriangles === report.alternative.worldTriangles, report.deterministic);
check('usage.keyboard', report.keyboard.activeUsageProof === 'collection' && report.keyboard.focusProof === 'collection' && report.keyboard.outline === '3px', report.keyboard);
check('usage.responsive', report.narrative.scrollWidth === report.narrative.viewport && report.tablet.scrollWidth === report.tablet.viewport && report.mobile.scrollWidth === report.mobile.viewport && report.mobile.worldCanvas === 1, { tablet: report.tablet, mobile: report.mobile });
check('usage.reduced-motion', report.reduced.matched && Number.parseFloat(report.reduced.transition) < 0.01 && report.reduced.proofCount === 3, report.reduced);
check('usage.fallback', report.fallback.snapshot.renderOff && report.fallback.worldCanvas === 0 && report.fallback.fallbackVisible && report.fallback.itemHud && report.fallback.storyItem && report.fallback.collectionItem && report.fallback.unavailableMedia === 2, report.fallback);
check('usage.performance-observation', report.loadMs < 5000 && report.narrative.stats.generatedMs < 5000 && report.deterministic.generatedMs < 1000, { loadMs: report.loadMs, initialMs: report.narrative.stats.generatedMs, repeatMs: report.deterministic.generatedMs });
check('usage.console', report.consoleErrors.length === 0, report.consoleErrors);
const evidence = await Promise.all(report.evidence.map(async relative => { try { const stat = await fs.stat(path.join(project, relative)); return { relative, bytes: stat.size, ok: stat.size > 5000 }; } catch (error) { return { relative, ok: false, error: error.message }; } }));
check('usage.evidence', evidence.every(item => item.ok), evidence);

for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.id}`);
const failures = checks.filter(item => !item.ok);
console.log(`ASSET USAGE PROOFS V0.4 ${checks.length - failures.length}/${checks.length}`);
if (failures.length) { console.log(JSON.stringify(failures, null, 2)); process.exitCode = 1; }
