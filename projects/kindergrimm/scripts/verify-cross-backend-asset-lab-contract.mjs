import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MANIFEST_SCHEMA,
  PRESETS,
  SOURCE_COMMIT,
  compileIntent,
  createManifest,
  sceneReadiness,
} from '../asset-lab/compiler.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rendererSource = await fs.readFile(path.join(root, 'asset-lab', 'source-renderers.js'), 'utf8');
const labSource = await fs.readFile(path.join(root, 'asset-lab', 'lab.js'), 'utf8');
const checks = [];
const check = (id, ok, evidence = {}) => checks.push({ id, ok: Boolean(ok), evidence });

const compiled = compileIntent({ assetId: 'harbour-courier', seed: 240824, species: 'human', look: 'harbour', sceneRole: 'quest-giver' });
const repeat = compileIntent({ assetId: 'harbour-courier', seed: 240824, species: 'human', look: 'harbour', sceneRole: 'quest-giver' });
const dog = compileIntent({ assetId: 'watch-dog', seed: 731906, species: 'dog', look: 'paper', sceneRole: 'guardian' });
const outputs = ['drawn', 'voxel', 'gloss'].map(backend => ({ backend, filename: `x--${backend}.png`, bytes: 9000, width: 768, height: 768, sha256: 'a'.repeat(64) }));
const manifest = createManifest(compiled, outputs);

check('lab.source-builders-direct',
  rendererSource.includes("from '../upstream/src/rig.js'")
  && rendererSource.includes("from '../upstream/src/voxel/vrig.js'")
  && rendererSource.includes("from '../upstream/src/gloss/grig.js'")
  && rendererSource.includes('buildCharacter(recipe)')
  && rendererSource.includes('buildVoxelCharacter(recipe)')
  && rendererSource.includes('buildGloss(recipe'),
  { imports: 3 });
check('lab.compiler-deterministic', compiled.fingerprint === repeat.fingerprint, { fingerprint: compiled.fingerprint });
check('lab.shared-seed', Object.values(compiled.nativeRecipes).every(recipe => recipe.seed === 240824), Object.values(compiled.nativeRecipes).map(recipe => recipe.seed));
check('lab.truthful-adaptation', dog.nativeRecipes.gloss.species === 'bear' && dog.mapping.some(item => item.field === 'species' && item.level === 'adapted'), dog.mapping);
check('lab.backend-local-parts', compiled.mapping.some(item => item.field === 'parts' && item.level === 'local') && compiled.mapping.some(item => item.level === 'unsupported'), compiled.mapping);
check('lab.presets-valid', PRESETS.every(preset => Boolean(compileIntent(preset).fingerprint)), { presets: PRESETS.length });
check('lab.scene-readiness', sceneReadiness(compiled).length === 3 && sceneReadiness(compiled).every(item => item.filename.endsWith('.png')), sceneReadiness(compiled));
check('lab.manifest-provenance', manifest.schemaVersion === MANIFEST_SCHEMA && manifest.source.commit === SOURCE_COMMIT && manifest.runtimeModel === 'none' && manifest.outputs.length === 3, { schema: manifest.schemaVersion, commit: manifest.source.commit });
check('lab.standardized-export', rendererSource.includes('const EXPORT_SIZE = 768') && labSource.includes("crypto.subtle.digest('SHA-256'") && labSource.includes('exportBundle'), { size: 768, hash: 'SHA-256' });
check('lab.webgl-fallback', labSource.includes("get('render') === 'off'") && labSource.includes('fallbackVisible'), { route: '?render=off' });

for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.id}`);
const failures = checks.filter(item => !item.ok);
console.log(`CROSS-BACKEND ASSET LAB CONTRACT ${checks.length - failures.length}/${checks.length}`);
if (failures.length) {
  console.log(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
}
