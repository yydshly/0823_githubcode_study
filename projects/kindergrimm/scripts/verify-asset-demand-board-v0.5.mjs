import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMAND_STATUSES, USAGE_ASSET_DEMANDS, demandCoverage } from '../asset-lab/asset-demands.js';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = JSON.parse(fs.readFileSync(path.join(project, 'analysis', 'asset-demand-board-v0.5-browser-review.json'), 'utf8'));
const html = fs.readFileSync(path.join(project, 'asset-lab', 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(project, 'asset-lab', 'lab.js'), 'utf8');
const css = fs.readFileSync(path.join(project, 'asset-lab', 'lab.css'), 'utf8');
const failures = [];

function check(name, condition, detail = '') {
  if (condition) console.log(`PASS ${name}`);
  else { console.error(`FAIL ${name}${detail ? ` · ${detail}` : ''}`); failures.push(name); }
}

const groups = Object.values(USAGE_ASSET_DEMANDS);
const allRows = groups.flat();
check('demand.registry-three-consumers', groups.length === 3 && groups.every(rows => rows.length >= 5));
check('demand.registry-complete', allRows.every(row => row.id && row.asset && row.consumer && row.representation && row.source && DEMAND_STATUSES[row.status] && row.gap && row.next));
check('demand.truthful-representation-boundary', allRows.some(row => row.representation === '2D PNG proxy' && row.status === 'source-ready') && allRows.some(row => row.representation.includes('3D') && row.status === 'extension-needed'));
check('demand.ui-semantic-surface', html.includes('id="demand-table-body"') && html.includes('data-demand-filter="gap"') && html.includes('<table class="demand-table">'));
check('demand.runtime-wiring', js.includes("from './asset-demands.js'") && js.includes('function renderDemandBoard') && js.includes('setDemandFilter') && js.includes('renderDemandBoard();'));
check('demand.responsive-and-motion-css', css.includes('@media (max-width:600px)') && css.includes('.demand-filters') && css.includes('@media (prefers-reduced-motion:reduce)'));
check('demand.narrative-coverage', report.narrative.rows === 5 && report.narrative.coverage.ready === 3 && report.narrative.coverage.gaps === 2 && report.narrative.percent === '60%');
check('demand.gap-filter', report.narrativeGaps.rows === 2 && report.narrativeGaps.statuses.every(status => status === 'extension-needed') && report.narrativeGaps.pressedFilters === 1);
check('demand.collection-sync', report.collectionGaps.proof === 'collection' && report.collectionGaps.nextTitle === '稀有度与系列框体' && report.collectionReady.statuses.every(status => status !== 'extension-needed'));
check('demand.world-coverage', report.worldReady.coverage.percent === demandCoverage('world').percent && report.worldReady.rows === 4 && report.worldGaps.rows === 2 && report.worldGaps.nextTitle === '可拾取道具模型');
check('demand.preset-sync', report.presetSync.fingerprintChanged && report.sourceSync.changed && report.presetSync.demand.sources.some(source => source.includes('dog/field')));
check('demand.proof-sync', report.proofSync.proof === 'narrative' && report.proofSync.rows === 5 && report.proofSync.sources.some(source => source.includes('dog/field')));
check('demand.keyboard-focus', Number.parseFloat(report.focusOutline) >= 2);
check('demand.responsive', report.tablet.viewport === report.tablet.scrollWidth && report.mobile.viewport === report.mobile.scrollWidth && report.mobile.demand.rows === 2);
check('demand.reduced-motion', report.reduced.matched && Number.parseFloat(report.reduced.meterTransition) <= 0.001);
check('demand.webgl-fallback', report.fallback.worldCanvas === 0 && report.fallback.fallbackVisible && report.fallback.demand.rows === 6 && report.fallback.demand.coverage.percent === 67);
check('demand.console-clean', report.consoleErrors.length === 0, JSON.stringify(report.consoleErrors));
check('demand.performance', report.loadMs < 5000, `${report.loadMs}ms`);
check('demand.evidence', report.evidence.length === 2 && report.evidence.every(relative => fs.statSync(path.join(project, relative)).size > 5000));

if (failures.length) {
  console.error(`ASSET DEMAND BOARD V0.5 ${19 - failures.length}/19`);
  process.exitCode = 1;
} else console.log('ASSET DEMAND BOARD V0.5 19/19');
