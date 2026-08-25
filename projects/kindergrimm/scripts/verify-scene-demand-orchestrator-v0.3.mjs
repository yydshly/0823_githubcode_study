import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = JSON.parse(await fs.readFile(path.join(project, 'analysis', 'scene-demand-orchestrator-v0.3-browser-review.json'), 'utf8'));
const modulePath = pathToFileURL(path.join(project, 'asset-lab', 'scene-orchestrator.js'));
const { SCENE_PRESETS, matchSceneDemand } = await import(modulePath);
const [html, app, orchestrator] = await Promise.all([
  fs.readFile(path.join(project, 'asset-lab', 'index.html'), 'utf8'),
  fs.readFile(path.join(project, 'asset-lab', 'lab.js'), 'utf8'),
  fs.readFile(path.join(project, 'asset-lab', 'scene-orchestrator.js'), 'utf8'),
]);
const checks = [];
const check = (id, ok, evidence = {}) => checks.push({ id, ok: Boolean(ok), evidence });
const presetPlans = SCENE_PRESETS.map(matchSceneDemand);

check('scene.source-lock', report.baseline.plan.source.commit === '5857b1e1cae2713d6714ad7dd7f89626bb242f0f' && report.baseline.plan.source.runtimeModel === 'none', report.baseline.plan.source);
check('scene.presets', SCENE_PRESETS.length === 3 && new Set(SCENE_PRESETS.map(item => item.id)).size === 3 && new Set(presetPlans.map(plan => plan.fingerprint)).size === 3, presetPlans.map(plan => plan.fingerprint));
check('scene.mode-preserves-v02', report.baseline.tabCount >= 5 && report.baseline.snapshot.capabilitySummary.modes >= 5 && (html.match(/data-mode=/g) || []).length >= 5, report.baseline.snapshot.capabilitySummary);
check('scene.default-context', report.baseline.plan.intent.title === '暴雨后的港口回信' && report.baseline.plan.intent.purpose.length > 0, report.baseline.plan.intent);
check('scene.deterministic', report.deterministic.samePlan && report.deterministic.fingerprint === report.baseline.snapshot.sceneFingerprint, report.deterministic);
check('scene.rule-engine', orchestrator.includes('MOOD_STYLE') && orchestrator.includes('BIOME_OBJECT') && orchestrator.includes('INTERACTION_ITEM') && !orchestrator.includes('fetch('), {});
check('scene.custom-affects-match', report.custom.plan.selections.character.species === 'nightmare' && report.custom.plan.selections.style.id === 'surrealism' && report.custom.plan.selections.item.family === 'lantern' && report.custom.plan.selections.environment.species === 'wildcard', report.custom.plan.selections);
check('scene.explainability', report.custom.explanationRows === 4 && report.custom.plan.explanations.every(item => item.signal && item.source && item.representation && item.gap), report.custom.plan.explanations);
check('scene.real-previews', report.baseline.snapshot.scenePreviewCount === 5 && report.baseline.previewSources.every(item => item.hasSource && item.sourceLength > 5000), report.baseline.previewSources);
check('scene.live-style-proof', report.custom.styleSrc.includes('/upstream/styles.html') && report.custom.styleSrc.includes('style=surrealism'), report.custom.styleSrc);
check('scene.reuses-source-builders', app.includes('generateAssets(character)') && app.includes('generateItem()') && app.includes('generateEnvironment()') && app.includes('updateStyleProof()'), {});
check('scene.package-six-files', report.exportResult.fileCount === 6 && report.exportResult.files.filter(file => file.type === 'image/png').length === 5 && report.exportResult.files.some(file => file.type === 'application/json'), report.exportResult.files);
check('scene.package-assets', report.exportResult.manifest.assetCount === 5 && report.exportResult.assets.length === 5 && report.exportResult.assets.every(asset => asset.bytes > 5000), report.exportResult.assets);
check('scene.package-dimensions', report.exportResult.assets.filter(asset => asset.id.startsWith('character-')).every(asset => asset.width === 768 && asset.height === 768) && report.exportResult.assets.find(asset => asset.id === 'item').width === 512 && report.exportResult.assets.find(asset => asset.id === 'environment').width === 768, report.exportResult.assets);
check('scene.package-hashes', report.exportResult.assets.every(asset => asset.shaLength === 64) && report.exportResult.totalBytes > 100000, report.exportResult);
check('scene.package-boundary', report.exportResult.manifest.runtimeModel === 'none' && report.exportResult.manifest.assemblyBoundary.includes('not a composed game level'), report.exportResult.manifest);
check('scene.invalid-recovery', report.invalid.message.includes('Scene Seed') && report.invalid.preserved && !report.invalid.exportDisabled, report.invalid);
check('scene.keyboard', report.keyboard.activeMode === 'environment' && report.keyboard.focusMode === 'environment' && report.keyboard.outline === '3px', report.keyboard);
check('scene.responsive', report.baseline.scrollWidth === report.baseline.viewport && report.tablet.scrollWidth === report.tablet.viewport && report.mobile.scrollWidth === report.mobile.viewport && report.mobile.previewCount === 5, { desktop: report.baseline.viewport, tablet: report.tablet, mobile: report.mobile });
check('scene.fallback', report.fallback.snapshot.renderOff && report.fallback.snapshot.sceneExplanationCount === 4 && report.fallback.unavailableFrames === 4 && report.fallback.itemPreview && report.fallback.styleFrame && report.fallback.recipeManifest && report.fallback.exportDisabled, report.fallback);
check('scene.console', report.consoleErrors.length === 0, report.consoleErrors);
const evidence = await Promise.all(report.evidence.map(async relative => { try { const stat = await fs.stat(path.join(project, relative)); return { relative, bytes: stat.size, ok: stat.size > 5000 }; } catch (error) { return { relative, ok: false, error: error.message }; } }));
check('scene.evidence', evidence.every(item => item.ok), evidence);

for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.id}`);
const failures = checks.filter(item => !item.ok);
console.log(`SCENE DEMAND ORCHESTRATOR V0.3 ${checks.length - failures.length}/${checks.length}`);
if (failures.length) { console.log(JSON.stringify(failures, null, 2)); process.exitCode = 1; }

