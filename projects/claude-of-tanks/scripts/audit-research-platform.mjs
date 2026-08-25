import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  auditRegistry,
  budgetStatus,
  demos,
  layers,
  performanceBudgets,
  presentationProfiles,
  risks,
  sceneProfiles,
  subjectProfiles,
} from '../showcase/research-platform-registry.js';

const projectRoot = resolve(import.meta.dirname, '..');
const outDir = resolve(projectRoot, 'evidence/research-platform');
mkdirSync(outDir, { recursive: true });

const registryAudit = auditRegistry();
const evidencePaths = [
  'evidence/capability-showcase/report.json',
  'evidence/visual-layer-lab-final/report.json',
  'evidence/industrial-showroom-final/report.json',
  'evidence/industrial-showroom-final/lifecycle-smoke.json',
  'evidence/industrial-showroom-final/runtime-metrics.json',
  'evidence/product-workbench/browser-report.json',
];
const evidence = evidencePaths.map((path) => ({ path, exists: existsSync(resolve(projectRoot, path)) }));
const budgetRows = performanceBudgets.map((metric) => ({
  ...metric,
  status: budgetStatus(metric),
  ratio: Number((metric.value / metric.target).toFixed(3)),
}));

const checks = {
  registryContract: registryAudit.pass,
  fourArchitectureLayers: layers.length === 4,
  separateProfileKinds: sceneProfiles.every((item) => item.kind === 'scene')
    && subjectProfiles.every((item) => item.kind === 'subject')
    && presentationProfiles.every((item) => item.kind === 'presentation'),
  officialRoutesLaunchable: demos.filter((demo) => demo.status !== 'blocked').every((demo) => Boolean(demo.route)),
  blockedRoutesNotLaunchable: demos.filter((demo) => demo.status === 'blocked').every((demo) => demo.route === null),
  failedExperimentTruthful: demos.some((demo) => demo.id === 'industrial-showroom-experiment'
    && demo.status === 'blocked'
    && demo.expectedScene === 'showroom-world'
    && demo.scene === 'desert-world'),
  worldNoneWorkbenchProven: demos.some((demo) => demo.id === 'programmatic-product-workbench'
    && demo.status === 'stable'
    && demo.scene === 'neutral-inspection'
    && demo.alternateSubjects?.includes('nova-field-node')),
  performanceEvidenceExplicit: performanceBudgets.every((metric) => metric.evidence && metric.target > 0),
  risksHaveMitigations: risks.every((risk) => risk.detail && risk.mitigation),
  evidenceFilesPresent: evidence.every((item) => item.exists),
};

const report = {
  generatedAt: new Date().toISOString(),
  result: Object.values(checks).every(Boolean) ? 'pass' : 'fail',
  checks,
  registry: registryAudit,
  performance: {
    pass: budgetRows.filter((row) => row.status === 'pass').length,
    over: budgetRows.filter((row) => row.status === 'over').length,
    rows: budgetRows,
  },
  reuseDecision: {
    reusableNow: ['render-core', 'neutral-world-none', 'subject-adapter-v1', 'product-stage-v2', 'studio-director', 'visual-layer-inspector'],
    extractionRequired: ['shared-studio-scene-profile', 'external-glb-adapter'],
    claimsBlocked: ['commercial-product-asset', 'generic-showroom', 'arbitrary-glb-import', 'mobile-performance-ready'],
  },
  evidence,
};

writeFileSync(resolve(outDir, 'audit.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (report.result !== 'pass') process.exitCode = 1;

