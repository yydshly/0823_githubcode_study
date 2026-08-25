import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = JSON.parse(await fs.readFile(path.join(project, 'analysis/story-demo-browser-review.json'), 'utf8'));
const checks = [];
const check = (id, ok, evidence = {}) => checks.push({ id, ok: Boolean(ok), evidence });

check('story.browser.community-ending',
  report.community.snapshot.story.ending === 'community'
  && report.community.snapshot.story.trust === 5
  && report.community.snapshot.story.inventory.length === 5
  && report.community.inventoryItems === 5
  && report.community.chapterComplete === 3
  && report.community.actionLabel === '重新选择这条路', report.community);

check('story.browser.council-ending',
  report.council.story.ending === 'council'
  && report.council.story.trust === 1
  && report.council.story.storm === 1, report.council);

check('story.browser.style-preserves-state',
  report.stateAfterStyle.styleId === 'moonharbor-inkcut-props'
  && report.stateAfterStyle.story.step === 'family-guided'
  && report.stateAfterStyle.story.trust === 3
  && report.stateAfterStyle.story.inventory.length === 5, report.stateAfterStyle);

check('story.browser.desktop',
  report.community.width === 1440
  && report.community.scrollWidth === 1440
  && report.community.canvasVisible, report.community);

check('story.browser.mobile',
  report.mobile.viewport === 390
  && report.mobile.scrollWidth === 390
  && report.mobile.actionReachable
  && report.mobile.canvasRect.width <= 390, report.mobile);

check('story.browser.keyboard',
  report.keyboard.snapshot.story.ending === 'council'
  && report.keyboard.focusVisibleRule, report.keyboard);

check('story.browser.reduced-motion',
  report.reducedMotion.matched
  && Number.parseFloat(report.reducedMotion.rainDuration) <= .001, report.reducedMotion);

check('story.browser.canvas-off',
  report.canvasOff.snapshot.canvasAvailable === false
  && report.canvasOff.snapshot.story.ending === 'council'
  && report.canvasOff.fallbackVisible
  && report.canvasOff.canvasHidden
  && report.canvasOff.actionStillAvailable, report.canvasOff);

check('story.browser.console', report.consoleErrors.length === 0, report.consoleErrors);

const evidence = await Promise.all(report.evidence.map(async relative => {
  try { const stat = await fs.stat(path.join(project, relative)); return { relative, bytes: stat.size, ok: stat.size > 0 }; }
  catch (error) { return { relative, ok: false, error: error.message }; }
}));
check('story.browser.evidence', evidence.every(item => item.ok), evidence);

for (const result of checks) console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.id}`);
const failures = checks.filter(result => !result.ok);
console.log(`STORY BROWSER ${checks.length - failures.length}/${checks.length}`);
if (failures.length) {
  console.log(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
}
