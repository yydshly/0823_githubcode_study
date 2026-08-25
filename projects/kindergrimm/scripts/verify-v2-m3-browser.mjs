import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const review = JSON.parse(await fs.readFile(path.join(project, 'analysis/v2-m3-browser-review.json'), 'utf8'));
const showcase = JSON.parse(await fs.readFile(path.join(project, 'analysis/v2-m3-output-showcase-review.json'), 'utf8'));
const checks = [];
const check = (id, ok, evidence = {}) => checks.push({ id, ok: Boolean(ok), ...evidence });
const desktop = review.desktop;

check('v2m3.browser.desktop', showcase.desktop.recipes === 12
  && showcase.desktop.recipeUnique === 12
  && showcase.desktop.propVisuals === 36
  && showcase.desktop.propVisualUnique === 36
  && showcase.desktop.styles.length === 3
  && showcase.consoleErrors.length === 0, {
  recipes: showcase.desktop.recipes,
  visuals: showcase.desktop.propVisuals,
  styles: showcase.desktop.styles
});

check('v2m3.browser.output-showcase', showcase.desktop.stageBottom <= 900
  && showcase.desktop.imagesReady
  && showcase.desktop.fallbackHidden
  && showcase.desktop.showcase.length === 3
  && showcase.desktop.showcase.every(item => item.rendered && item.embeddedProps === 3)
  && new Set(showcase.desktop.showcase.map(item => item.recipeFingerprint)).size === 1
  && new Set(showcase.desktop.showcase.map(item => item.visualFingerprint)).size === 3
  && showcase.desktop.mouseResult.selectedStyle === 'moonharbor-inkcut-props'
  && showcase.desktop.mouseResult.pressed.join(',') === 'false,true,false'
  && showcase.desktop.mouseResult.manifestStyles.join(',') === 'mosslight-prop-gouache,moonharbor-inkcut-props,sunpatch-felt-props'
  && showcase.desktop.currentBundle.files.length === 8
  && showcase.desktop.currentBundle.allCrcValid
  && JSON.stringify(showcase.desktop.outputFingerprints) !== JSON.stringify(showcase.desktop.mouseResult.outputFingerprints)
  && showcase.desktop.keyboardResult.selectedStyle === 'mosslight-prop-gouache'
  && showcase.desktop.keyboardResult.activeStyle === 'mosslight-prop-gouache'
  && showcase.desktop.keyboardResult.outlineWidth === '3px'
  && showcase.mobile.viewport === 390
  && showcase.mobile.scrollWidth === 390
  && showcase.mobile.imagesReady
  && showcase.reducedMotion.matched
  && showcase.reducedMotion.showcaseRendered
  && showcase.canvasOff.canvas === false
  && showcase.canvasOff.showcase.every(item => !item.rendered)
  && showcase.canvasOff.imageSources.every(value => !value)
  && showcase.canvasOff.fallbacksVisible
  && showcase.canvasOff.manifestEnabled
  && showcase.canvasOff.bundleDisabled
  && showcase.consoleErrors.length === 0, {
  desktop: showcase.desktop,
  mobile: showcase.mobile,
  reducedMotion: showcase.reducedMotion,
  canvasOff: showcase.canvasOff,
  consoleErrors: showcase.consoleErrors
});
check('v2m3.browser.outputs', Object.keys(desktop.outputs).length === 4
  && desktop.outputs['transparent-prop'].cornerAlpha === 0
  && desktop.outputs['inventory-icon'].cornerAlpha === 255
  && desktop.outputs['catalog-card'].cornerAlpha === 255
  && desktop.outputs['prop-sheet'].cornerAlpha === 0, {
  outputs: desktop.outputs
});

check('v2m3.browser.scene-components', showcase.desktop.sceneRecipes === 12
  && showcase.desktop.sceneRecipeUnique === 12
  && showcase.desktop.sceneVisuals === 36
  && showcase.desktop.sceneVisualUnique === 36
  && desktop.scene.rendered
  && desktop.scene.authoredParts === 5
  && desktop.scene.upstreamVisibleParts === 0
  && desktop.scene.embeddedProps === 3, {
  scene: desktop.scene
});

check('v2m3.browser.sample-matrix', review.sampleMatrix.propRecipes === 12
  && review.sampleMatrix.propVisuals === 12
  && review.sampleMatrix.icons === 12
  && review.sampleMatrix.sceneRecipes === 12
  && review.sampleMatrix.sceneVisuals === 12
  && review.sampleMatrix.allUnique
  && review.sampleMatrix.allRendered
  && review.sampleMatrix.allNamedParts, review.sampleMatrix);

check('v2m3.browser.bundle', review.bundle.entries.length === 8
  && review.bundle.allCrcValid
  && ['manifest.json', 'style-grammars.json', 'scene-components.json', 'selected/prop.png', 'selected/icon.png', 'selected/card.png', 'batch/prop-sheet.png', 'scene/scene-component.png'].every(name => review.bundle.entries.includes(name)), {
  entries: review.bundle.entries,
  size: review.bundle.size
});

const matrix = review.environmentMatrix;
check('v2m3.browser.environment-matrix', matrix.mobile.ok
  && matrix.mobile.viewport === 390
  && matrix.mobile.scrollWidth === 390
  && matrix.reducedMotion.ok
  && matrix.reducedMotion.matched
  && matrix.canvasOff.ok
  && matrix.canvasOff.canvas === false
  && matrix.canvasOff.manifestEnabled
  && matrix.canvasOff.bundleDisabled
  && matrix.canvasOff.verified
  && matrix.keyboard.ok
  && matrix.keyboard.visibleOutlineStops === matrix.keyboard.focusStopsChecked, {
  mobile: matrix.mobile,
  reducedMotion: matrix.reducedMotion,
  canvasOff: matrix.canvasOff,
  keyboard: matrix.keyboard
});

const evidencePaths = [...review.evidence, ...showcase.evidence];
const evidence = await Promise.all(evidencePaths.map(async relative => {
  try {
    const stat = await fs.stat(path.join(project, relative));
    return { path: relative, bytes: stat.size, ok: stat.size > 0 };
  } catch (error) {
    return { path: relative, ok: false, error: error.message };
  }
}));
check('v2m3.browser.evidence', evidence.every(item => item.ok), { files: evidence });

const failures = checks.filter(item => !item.ok);
for (const result of checks) console.log((result.ok ? 'PASS' : 'FAIL') + ' ' + result.id);
console.log('V2-M3 BROWSER ' + (checks.length - failures.length) + '/' + checks.length);
if (failures.length) {
  console.log(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
}
