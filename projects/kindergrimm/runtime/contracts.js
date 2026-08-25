export const CONTRACT_SCHEMAS = Object.freeze({
  recipe: 'kindergrimm-recipe/0.1',
  renderer: 'kindergrimm-visual-renderer/0.1',
  contentPack: 'kindergrimm-content-pack/0.1',
  visualRecord: 'kindergrimm-visual-record/0.1',
  batchManifest: 'kindergrimm-research/0.2',
  releaseCandidate: 'kindergrimm-release-candidate/0.1',
  platformRelease: 'kindergrimm-platform-release/1.0'
});

export const CONTRACT_ERROR_CODES = Object.freeze({
  expectedObject: 'contract.type.object',
  expectedArray: 'contract.type.array',
  required: 'contract.required',
  unsupportedSchema: 'contract.schema.unsupported',
  invalidId: 'contract.id.invalid',
  invalidVersion: 'contract.version.invalid',
  invalidValue: 'contract.value.invalid',
  unsupportedValue: 'contract.value.unsupported',
  duplicateValue: 'contract.value.duplicate',
  countMismatch: 'contract.count.mismatch',
  fingerprintMismatch: 'contract.fingerprint.mismatch',
  constraintMismatch: 'contract.constraint.mismatch',
  gridMismatch: 'contract.grid.mismatch'
});

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;
const FINGERPRINT_PATTERN = /^[0-9a-f]{8}$/i;
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const DEFAULT_COLORS = Object.freeze(['auto', 'plain', 'color']);

export const isPlainObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
export const cloneContract = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

export function hashContractString(value) {
  const text = String(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function contractFingerprint(value) {
  return hashContractString(JSON.stringify(value)).toString(16).padStart(8, '0');
}

export function contractIssue(code, path, message, details = {}) {
  return Object.freeze({ code, path, message, ...details });
}

export function formatContractIssue(issue) {
  return `${issue.path}: ${issue.message}`;
}

function contractResult(value, issues, extra = {}) {
  return {
    ok: issues.length === 0,
    issues,
    errors: issues.map(formatContractIssue),
    value: issues.length ? null : value,
    ...extra
  };
}

function addIssue(issues, code, path, message, details) {
  issues.push(contractIssue(code, path, message, details));
}

function requireObject(value, path, issues) {
  if (isPlainObject(value)) return true;
  addIssue(issues, CONTRACT_ERROR_CODES.expectedObject, path, 'expected an object');
  return false;
}

function requireString(value, path, issues) {
  if (typeof value === 'string' && value.length > 0) return true;
  addIssue(issues, CONTRACT_ERROR_CODES.required, path, 'expected a non-empty string');
  return false;
}

function validateStableId(value, path, issues) {
  if (typeof value === 'string' && ID_PATTERN.test(value)) return true;
  addIssue(issues, CONTRACT_ERROR_CODES.invalidId, path, 'expected a lowercase kebab-case id');
  return false;
}

function validateSemver(value, path, issues) {
  if (typeof value === 'string' && SEMVER_PATTERN.test(value)) return true;
  addIssue(issues, CONTRACT_ERROR_CODES.invalidVersion, path, 'expected semantic version x.y.z');
  return false;
}

function validateFingerprint(value, path, issues) {
  if (typeof value === 'string' && FINGERPRINT_PATTERN.test(value)) return true;
  addIssue(issues, CONTRACT_ERROR_CODES.invalidValue, path, 'expected an eight-character hexadecimal fingerprint');
  return false;
}

function validateStringList(value, path, issues, { min = 1, allowed, stableIds = false } = {}) {
  if (!Array.isArray(value)) {
    addIssue(issues, CONTRACT_ERROR_CODES.expectedArray, path, 'expected an array');
    return [];
  }
  if (value.length < min) addIssue(issues, CONTRACT_ERROR_CODES.required, path, `expected at least ${min} entry`);
  const seen = new Set();
  value.forEach((entry, index) => {
    const entryPath = `${path}[${index}]`;
    if (typeof entry !== 'string' || !entry.length) addIssue(issues, CONTRACT_ERROR_CODES.required, entryPath, 'expected a non-empty string');
    else if (stableIds && !ID_PATTERN.test(entry)) addIssue(issues, CONTRACT_ERROR_CODES.invalidId, entryPath, 'expected a lowercase kebab-case id');
    if (allowed && !allowed.includes(entry)) addIssue(issues, CONTRACT_ERROR_CODES.unsupportedValue, entryPath, `unsupported value ${entry}`);
    if (seen.has(entry)) addIssue(issues, CONTRACT_ERROR_CODES.duplicateValue, entryPath, `duplicate value ${entry}`);
    seen.add(entry);
  });
  return value;
}

function collectPaletteColors(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectPaletteColors);
  if (isPlainObject(value)) return Object.values(value).flatMap(collectPaletteColors);
  return [];
}

export function rendererDescriptorPayload(renderer) {
  return {
    schemaVersion: renderer.schemaVersion,
    id: renderer.id,
    version: renderer.version,
    kind: renderer.kind,
    baseRenderer: renderer.baseRenderer,
    runtimeModule: renderer.runtimeModule,
    seedContract: renderer.seedContract,
    features: renderer.features,
    coverage: renderer.coverage,
    palette: renderer.palette
  };
}

export function rendererDescriptorFingerprint(value) {
  const renderer = value?.visual ?? value;
  return renderer ? contractFingerprint(rendererDescriptorPayload(renderer)) : null;
}

export function rendererDescriptorSnapshot(renderer) {
  if (!renderer) return undefined;
  const snapshot = cloneContract(rendererDescriptorPayload(renderer));
  snapshot.fingerprint = rendererDescriptorFingerprint(snapshot);
  return snapshot;
}

export function contentPackPayload(pack) {
  const payload = {
    schemaVersion: pack.schemaVersion,
    id: pack.id,
    version: pack.version,
    status: pack.status,
    provenance: pack.provenance,
    constraints: pack.constraints,
    identity: pack.identity,
    presentation: pack.presentation
  };
  if (pack.visual) payload.visual = rendererDescriptorSnapshot(pack.visual);
  return payload;
}

export function contentPackFingerprint(pack) {
  return contractFingerprint(contentPackPayload(pack));
}

export function contentPackSnapshot(pack) {
  const snapshot = cloneContract(contentPackPayload(pack));
  snapshot.fingerprint = contentPackFingerprint(snapshot);
  return snapshot;
}

export const RELEASE_GATE_IDS = Object.freeze([
  'g1-contract',
  'g2-asset',
  'g3-visual',
  'g4-portability',
  'g5-runtime',
  'g6-budget'
]);

export const PLATFORM_RELEASE_GATE_IDS = Object.freeze([
  'g0-goal',
  'g1-contract',
  'g2-asset',
  'g3-visual',
  'g4-portability',
  'g5-runtime',
  'g6-budget',
  'g7-release'
]);

export function releaseCandidatePayload(record) {
  return {
    schemaVersion: record.schemaVersion,
    id: record.id,
    version: record.version,
    createdAt: record.createdAt,
    studio: record.studio,
    candidate: record.candidate,
    review: record.review,
    gates: record.gates,
    bundle: record.bundle,
    provenance: record.provenance
  };
}

export function releaseCandidateFingerprint(record) {
  return contractFingerprint(releaseCandidatePayload(record));
}

export function releaseCandidateSnapshot(record) {
  const snapshot = cloneContract(releaseCandidatePayload(record));
  snapshot.fingerprint = releaseCandidateFingerprint(snapshot);
  return snapshot;
}

export function visualRecordPayload(record) {
  return {
    rendererId: record.rendererId,
    rendererVersion: record.rendererVersion,
    rendererFingerprint: record.rendererFingerprint,
    baseRenderer: record.baseRenderer,
    addedParts: record.addedParts,
    variant: record.variant
  };
}

export function visualRecordFingerprint(recipe, record) {
  return contractFingerprint({ recipe, ...visualRecordPayload(record) });
}

export function validateRecipeContract(recipe, options = {}) {
  const issues = [];
  if (!requireObject(recipe, options.path || 'recipe', issues)) return contractResult(null, issues);
  const path = options.path || 'recipe';
  if (!Number.isInteger(recipe.seed) || recipe.seed < 0) addIssue(issues, CONTRACT_ERROR_CODES.invalidValue, `${path}.seed`, 'expected a non-negative integer');
  requireString(recipe.species, `${path}.species`, issues);
  requireString(recipe.media, `${path}.media`, issues);
  requireString(recipe.color, `${path}.color`, issues);
  if (!(recipe.base === null || typeof recipe.base === 'string')) addIssue(issues, CONTRACT_ERROR_CODES.invalidValue, `${path}.base`, 'expected null or a string');
  requireObject(recipe.parts, `${path}.parts`, issues);
  if (options.speciesIds && !options.speciesIds.includes(recipe.species)) addIssue(issues, CONTRACT_ERROR_CODES.unsupportedValue, `${path}.species`, `unsupported value ${recipe.species}`);
  if (options.mediaIds && !options.mediaIds.includes(recipe.media)) addIssue(issues, CONTRACT_ERROR_CODES.unsupportedValue, `${path}.media`, `unsupported value ${recipe.media}`);
  if (options.colorIds && !options.colorIds.includes(recipe.color)) addIssue(issues, CONTRACT_ERROR_CODES.unsupportedValue, `${path}.color`, `unsupported value ${recipe.color}`);
  return contractResult(recipe, issues, { fingerprint: issues.length ? null : contractFingerprint(recipe) });
}

export function validateRendererDescriptorContract(renderer, options = {}) {
  const issues = [];
  const path = options.path || 'renderer';
  if (!requireObject(renderer, path, issues)) return contractResult(null, issues);
  const expectedSchema = options.expectedSchema || CONTRACT_SCHEMAS.renderer;
  if (renderer.schemaVersion !== expectedSchema) addIssue(issues, CONTRACT_ERROR_CODES.unsupportedSchema, `${path}.schemaVersion`, `expected ${expectedSchema}`, { expected: expectedSchema, actual: renderer.schemaVersion });
  validateStableId(renderer.id, `${path}.id`, issues);
  validateSemver(renderer.version, `${path}.version`, issues);
  validateStableId(renderer.kind, `${path}.kind`, issues);
  validateStableId(renderer.baseRenderer, `${path}.baseRenderer`, issues);
  requireString(renderer.runtimeModule, `${path}.runtimeModule`, issues);
  requireString(renderer.seedContract, `${path}.seedContract`, issues);
  const features = validateStringList(renderer.features, `${path}.features`, issues, { stableIds: true });
  if (renderer.coverage !== undefined) {
    if (requireObject(renderer.coverage, `${path}.coverage`, issues)) {
      const covered = [];
      Object.entries(renderer.coverage).forEach(([group, ids]) => {
        validateStableId(group, `${path}.coverage.${group}`, issues);
        covered.push(...validateStringList(ids, `${path}.coverage.${group}`, issues, { stableIds: true }));
      });
      const coveredSet = new Set(covered);
      if (covered.length !== features.length || coveredSet.size !== features.length || features.some(id => !coveredSet.has(id))) {
        addIssue(issues, CONTRACT_ERROR_CODES.countMismatch, `${path}.coverage`, 'must cover every renderer feature exactly once');
      }
    }
  }
  if (requireObject(renderer.palette, `${path}.palette`, issues)) {
    const colors = collectPaletteColors(renderer.palette);
    if (!colors.length || colors.some(color => !HEX_COLOR_PATTERN.test(color))) addIssue(issues, CONTRACT_ERROR_CODES.invalidValue, `${path}.palette`, 'expected six-digit hexadecimal colors');
  }
  if (validateFingerprint(renderer.fingerprint, `${path}.fingerprint`, issues)) {
    const expected = rendererDescriptorFingerprint(renderer);
    if (renderer.fingerprint !== expected) addIssue(issues, CONTRACT_ERROR_CODES.fingerprintMismatch, `${path}.fingerprint`, `expected ${expected}`, { expected, actual: renderer.fingerprint });
  }
  return contractResult(renderer, issues, { fingerprint: rendererDescriptorFingerprint(renderer) });
}

export function validateContentPackContract(pack, options = {}) {
  const issues = [];
  const path = options.path || 'contentPack';
  if (!requireObject(pack, path, issues)) return contractResult(null, issues, { pack: null });
  const expectedSchema = options.expectedSchema || CONTRACT_SCHEMAS.contentPack;
  if (pack.schemaVersion !== expectedSchema) addIssue(issues, CONTRACT_ERROR_CODES.unsupportedSchema, `${path}.schemaVersion`, `expected ${expectedSchema}`, { expected: expectedSchema, actual: pack.schemaVersion });
  validateStableId(pack.id, `${path}.id`, issues);
  validateSemver(pack.version, `${path}.version`, issues);
  if (!['upstream-content', 'research-prototype', 'authored-content'].includes(pack.status)) addIssue(issues, CONTRACT_ERROR_CODES.unsupportedValue, `${path}.status`, `unsupported value ${pack.status}`);
  if (requireObject(pack.provenance, `${path}.provenance`, issues)) {
    requireString(pack.provenance.kind, `${path}.provenance.kind`, issues);
    requireString(pack.provenance.source, `${path}.provenance.source`, issues);
    requireString(pack.provenance.upstreamCommit, `${path}.provenance.upstreamCommit`, issues);
    requireString(pack.provenance.license, `${path}.provenance.license`, issues);
    if (options.expectedUpstreamCommit && pack.provenance.upstreamCommit !== options.expectedUpstreamCommit) addIssue(issues, CONTRACT_ERROR_CODES.constraintMismatch, `${path}.provenance.upstreamCommit`, `expected ${options.expectedUpstreamCommit}`, { expected: options.expectedUpstreamCommit, actual: pack.provenance.upstreamCommit });
  }
  if (requireObject(pack.constraints, `${path}.constraints`, issues)) {
    if (!['input-driven', 'locked'].includes(pack.constraints.mode)) addIssue(issues, CONTRACT_ERROR_CODES.unsupportedValue, `${path}.constraints.mode`, 'expected input-driven or locked');
    validateStringList(pack.constraints.species, `${path}.constraints.species`, issues, { allowed: options.speciesIds });
    validateStringList(pack.constraints.media, `${path}.constraints.media`, issues, { allowed: options.mediaIds });
    if (pack.constraints.mode === 'locked') {
      if (!DEFAULT_COLORS.includes(pack.constraints.color)) addIssue(issues, CONTRACT_ERROR_CODES.unsupportedValue, `${path}.constraints.color`, `unsupported value ${pack.constraints.color}`);
    } else if (pack.constraints.mode === 'input-driven') {
      validateStringList(pack.constraints.colors, `${path}.constraints.colors`, issues, { allowed: DEFAULT_COLORS });
    }
  }
  if (requireObject(pack.identity, `${path}.identity`, issues)) {
    validateStringList(pack.identity.names, `${path}.identity.names`, issues);
    validateStringList(pack.identity.roles, `${path}.identity.roles`, issues);
  }
  if (requireObject(pack.presentation, `${path}.presentation`, issues)) {
    requireString(pack.presentation.name, `${path}.presentation.name`, issues);
    requireString(pack.presentation.shortName, `${path}.presentation.shortName`, issues);
    requireString(pack.presentation.label, `${path}.presentation.label`, issues);
    requireString(pack.presentation.summary, `${path}.presentation.summary`, issues);
    if (pack.presentation.accent !== undefined && !HEX_COLOR_PATTERN.test(pack.presentation.accent)) addIssue(issues, CONTRACT_ERROR_CODES.invalidValue, `${path}.presentation.accent`, 'expected a six-digit hexadecimal color');
    if (pack.presentation.tags !== undefined) validateStringList(pack.presentation.tags, `${path}.presentation.tags`, issues, { min: 0, stableIds: true });
  }
  if (pack.visual) {
    const rendererResult = validateRendererDescriptorContract(pack.visual, { path: `${path}.visual` });
    issues.push(...rendererResult.issues);
  }
  if (validateFingerprint(pack.fingerprint, `${path}.fingerprint`, issues)) {
    const expected = contentPackFingerprint(pack);
    if (pack.fingerprint !== expected) addIssue(issues, CONTRACT_ERROR_CODES.fingerprintMismatch, `${path}.fingerprint`, `expected ${expected}`, { expected, actual: pack.fingerprint });
  }
  const snapshot = issues.length ? null : contentPackSnapshot(pack);
  return contractResult(snapshot, issues, { pack: snapshot, fingerprint: contentPackFingerprint(pack) });
}

export function validateVisualRecordContract(record, options = {}) {
  const issues = [];
  const path = options.path || 'visual';
  if (!requireObject(record, path, issues)) return contractResult(null, issues);
  validateStableId(record.rendererId, `${path}.rendererId`, issues);
  validateSemver(record.rendererVersion, `${path}.rendererVersion`, issues);
  validateFingerprint(record.rendererFingerprint, `${path}.rendererFingerprint`, issues);
  validateStableId(record.baseRenderer, `${path}.baseRenderer`, issues);
  const parts = validateStringList(record.addedParts, `${path}.addedParts`, issues, { stableIds: true });
  requireObject(record.variant, `${path}.variant`, issues);
  if (options.renderer) {
    if (record.rendererId !== options.renderer.id) addIssue(issues, CONTRACT_ERROR_CODES.constraintMismatch, `${path}.rendererId`, `expected ${options.renderer.id}`);
    if (record.rendererVersion !== options.renderer.version) addIssue(issues, CONTRACT_ERROR_CODES.constraintMismatch, `${path}.rendererVersion`, `expected ${options.renderer.version}`);
    if (record.rendererFingerprint !== options.renderer.fingerprint) addIssue(issues, CONTRACT_ERROR_CODES.constraintMismatch, `${path}.rendererFingerprint`, `expected ${options.renderer.fingerprint}`);
    if (parts.some(id => !options.renderer.features.includes(id)) || parts.length !== options.renderer.features.length) addIssue(issues, CONTRACT_ERROR_CODES.constraintMismatch, `${path}.addedParts`, 'must match renderer features');
  }
  if (validateFingerprint(record.fingerprint, `${path}.fingerprint`, issues) && options.recipe) {
    const expected = visualRecordFingerprint(options.recipe, record);
    if (record.fingerprint !== expected) addIssue(issues, CONTRACT_ERROR_CODES.fingerprintMismatch, `${path}.fingerprint`, `expected ${expected}`, { expected, actual: record.fingerprint });
  }
  return contractResult(record, issues, { fingerprint: options.recipe ? visualRecordFingerprint(options.recipe, record) : record.fingerprint });
}

export function validateReleaseCandidateContract(record, options = {}) {
  const issues = [];
  const path = options.path || 'releaseCandidate';
  if (!requireObject(record, path, issues)) return contractResult(null, issues);
  if (record.schemaVersion !== CONTRACT_SCHEMAS.releaseCandidate) addIssue(issues, CONTRACT_ERROR_CODES.unsupportedSchema, `${path}.schemaVersion`, `expected ${CONTRACT_SCHEMAS.releaseCandidate}`);
  validateStableId(record.id, `${path}.id`, issues);
  validateSemver(record.version, `${path}.version`, issues);
  if (typeof record.createdAt !== 'string' || !Number.isFinite(Date.parse(record.createdAt))) addIssue(issues, CONTRACT_ERROR_CODES.invalidValue, `${path}.createdAt`, 'expected an ISO date-time');

  if (requireObject(record.studio, `${path}.studio`, issues)) {
    requireString(record.studio.name, `${path}.studio.name`, issues);
    validateSemver(record.studio.version, `${path}.studio.version`, issues);
  }

  if (requireObject(record.candidate, `${path}.candidate`, issues)) {
    for (const key of ['contentPack', 'renderer']) {
      const ref = record.candidate[key];
      if (requireObject(ref, `${path}.candidate.${key}`, issues)) {
        validateStableId(ref.id, `${path}.candidate.${key}.id`, issues);
        validateSemver(ref.version, `${path}.candidate.${key}.version`, issues);
        validateFingerprint(ref.fingerprint, `${path}.candidate.${key}.fingerprint`, issues);
      }
    }
    if (requireObject(record.candidate.input, `${path}.candidate.input`, issues)) {
      if (!Number.isInteger(record.candidate.input.seed) || record.candidate.input.seed < 0) addIssue(issues, CONTRACT_ERROR_CODES.invalidValue, `${path}.candidate.input.seed`, 'expected a non-negative integer');
      if (!Number.isInteger(record.candidate.input.count) || record.candidate.input.count < 1 || record.candidate.input.count > 24) addIssue(issues, CONTRACT_ERROR_CODES.invalidValue, `${path}.candidate.input.count`, 'expected 1–24');
    }
    if (!Number.isInteger(record.candidate.slot) || record.candidate.slot < 0) addIssue(issues, CONTRACT_ERROR_CODES.invalidValue, `${path}.candidate.slot`, 'expected a non-negative integer');
    const assets = validateStringList(record.candidate.assetFingerprints, `${path}.candidate.assetFingerprints`, issues);
    const visuals = validateStringList(record.candidate.visualFingerprints, `${path}.candidate.visualFingerprints`, issues);
    assets.forEach((value, index) => validateFingerprint(value, `${path}.candidate.assetFingerprints[${index}]`, issues));
    visuals.forEach((value, index) => validateFingerprint(value, `${path}.candidate.visualFingerprints[${index}]`, issues));
    if (record.candidate.input?.count !== assets.length || assets.length !== visuals.length) addIssue(issues, CONTRACT_ERROR_CODES.countMismatch, `${path}.candidate`, 'input.count, assetFingerprints and visualFingerprints must match');
    if (options.pack) {
      if (record.candidate.contentPack?.id !== options.pack.id || record.candidate.contentPack?.version !== options.pack.version || record.candidate.contentPack?.fingerprint !== options.pack.fingerprint) addIssue(issues, CONTRACT_ERROR_CODES.constraintMismatch, `${path}.candidate.contentPack`, 'does not match expected Content Pack');
      if (record.candidate.renderer?.id !== options.pack.visual?.id || record.candidate.renderer?.version !== options.pack.visual?.version || record.candidate.renderer?.fingerprint !== options.pack.visual?.fingerprint) addIssue(issues, CONTRACT_ERROR_CODES.constraintMismatch, `${path}.candidate.renderer`, 'does not match expected Renderer');
    }
  }

  if (requireObject(record.review, `${path}.review`, issues)) {
    if (record.review.decision !== 'approved') addIssue(issues, CONTRACT_ERROR_CODES.constraintMismatch, `${path}.review.decision`, 'release candidate requires approved review');
    if (typeof record.review.notes !== 'string') addIssue(issues, CONTRACT_ERROR_CODES.invalidValue, `${path}.review.notes`, 'expected a string');
    if (typeof record.review.reviewedAt !== 'string' || !Number.isFinite(Date.parse(record.review.reviewedAt))) addIssue(issues, CONTRACT_ERROR_CODES.invalidValue, `${path}.review.reviewedAt`, 'expected an ISO date-time');
  }

  const gateIds = new Set();
  if (!Array.isArray(record.gates)) addIssue(issues, CONTRACT_ERROR_CODES.expectedArray, `${path}.gates`, 'expected an array');
  else {
    record.gates.forEach((gate, index) => {
      const gatePath = `${path}.gates[${index}]`;
      if (!requireObject(gate, gatePath, issues)) return;
      if (!RELEASE_GATE_IDS.includes(gate.id)) addIssue(issues, CONTRACT_ERROR_CODES.unsupportedValue, `${gatePath}.id`, `unsupported gate ${gate.id}`);
      if (gateIds.has(gate.id)) addIssue(issues, CONTRACT_ERROR_CODES.duplicateValue, `${gatePath}.id`, `duplicate gate ${gate.id}`);
      gateIds.add(gate.id);
      if (gate.status !== 'pass') addIssue(issues, CONTRACT_ERROR_CODES.constraintMismatch, `${gatePath}.status`, 'release candidate gates must pass');
      requireString(gate.evidence, `${gatePath}.evidence`, issues);
    });
    if (RELEASE_GATE_IDS.some(id => !gateIds.has(id)) || gateIds.size !== RELEASE_GATE_IDS.length) addIssue(issues, CONTRACT_ERROR_CODES.countMismatch, `${path}.gates`, 'must include G1–G6 exactly once');
  }

  if (requireObject(record.bundle, `${path}.bundle`, issues)) {
    if (record.bundle.representation !== 'stored-zip') addIssue(issues, CONTRACT_ERROR_CODES.unsupportedValue, `${path}.bundle.representation`, 'expected stored-zip');
    if (!Array.isArray(record.bundle.files) || record.bundle.files.length < 3) addIssue(issues, CONTRACT_ERROR_CODES.required, `${path}.bundle.files`, 'expected at least three files');
    else record.bundle.files.forEach((file, index) => {
      const filePath = `${path}.bundle.files[${index}]`;
      if (!requireObject(file, filePath, issues)) return;
      requireString(file.path, `${filePath}.path`, issues);
      requireString(file.role, `${filePath}.role`, issues);
      if (!Number.isInteger(file.bytes) || file.bytes < 0) addIssue(issues, CONTRACT_ERROR_CODES.invalidValue, `${filePath}.bytes`, 'expected a non-negative integer');
      validateFingerprint(file.crc32, `${filePath}.crc32`, issues);
    });
    validateFingerprint(record.bundle.fingerprint, `${path}.bundle.fingerprint`, issues);
  }

  if (requireObject(record.provenance, `${path}.provenance`, issues)) {
    requireString(record.provenance.source, `${path}.provenance.source`, issues);
    requireString(record.provenance.upstreamCommit, `${path}.provenance.upstreamCommit`, issues);
    requireString(record.provenance.license, `${path}.provenance.license`, issues);
    for (const key of ['runtimeLlmCalls', 'cloudApiCalls']) if (!Number.isInteger(record.provenance[key]) || record.provenance[key] < 0) addIssue(issues, CONTRACT_ERROR_CODES.invalidValue, `${path}.provenance.${key}`, 'expected a non-negative integer');
  }

  if (validateFingerprint(record.fingerprint, `${path}.fingerprint`, issues)) {
    const expected = releaseCandidateFingerprint(record);
    if (record.fingerprint !== expected) addIssue(issues, CONTRACT_ERROR_CODES.fingerprintMismatch, `${path}.fingerprint`, `expected ${expected}`, { expected, actual: record.fingerprint });
  }
  return contractResult(issues.length ? null : releaseCandidateSnapshot(record), issues, { fingerprint: releaseCandidateFingerprint(record) });
}

export function validateAssetContract(asset, options = {}) {
  const issues = [];
  const path = options.path || 'asset';
  if (!requireObject(asset, path, issues)) return contractResult(null, issues);
  validateStableId(asset.id, `${path}.id`, issues);
  validateFingerprint(asset.fingerprint, `${path}.fingerprint`, issues);
  if (!Number.isInteger(asset.batchIndex) || asset.batchIndex < 0) addIssue(issues, CONTRACT_ERROR_CODES.invalidValue, `${path}.batchIndex`, 'expected a non-negative integer');
  requireString(asset.representation, `${path}.representation`, issues);
  const recipeResult = validateRecipeContract(asset.recipe, { ...options.recipeOptions, path: `${path}.recipe` });
  issues.push(...recipeResult.issues);
  if (recipeResult.ok) {
    if (asset.fingerprint !== recipeResult.fingerprint) addIssue(issues, CONTRACT_ERROR_CODES.fingerprintMismatch, `${path}.fingerprint`, `expected ${recipeResult.fingerprint}`, { expected: recipeResult.fingerprint, actual: asset.fingerprint });
    if (asset.id !== `npc-${recipeResult.fingerprint}`) addIssue(issues, CONTRACT_ERROR_CODES.constraintMismatch, `${path}.id`, `expected npc-${recipeResult.fingerprint}`);
  }
  if (asset.visual) {
    const visualResult = validateVisualRecordContract(asset.visual, { path: `${path}.visual`, recipe: asset.recipe, renderer: options.renderer });
    issues.push(...visualResult.issues);
  } else if (options.renderer) {
    addIssue(issues, CONTRACT_ERROR_CODES.required, `${path}.visual`, 'required by the content-pack renderer');
  }
  return contractResult(asset, issues);
}

export function validateBatchManifestContract(manifest, options = {}) {
  const issues = [];
  const warnings = [];
  const path = options.path || 'root';
  if (!requireObject(manifest, path, issues)) return contractResult(null, issues, { warnings, assets: [], pack: null });
  const expectedSchema = options.expectedSchema || CONTRACT_SCHEMAS.batchManifest;
  if (manifest.schemaVersion !== expectedSchema) addIssue(issues, CONTRACT_ERROR_CODES.unsupportedSchema, 'schemaVersion', `expected ${expectedSchema}`, { expected: expectedSchema, actual: manifest.schemaVersion });
  if (requireObject(manifest.generator, 'generator', issues)) {
    requireString(manifest.generator.name, 'generator.name', issues);
    requireString(manifest.generator.source, 'generator.source', issues);
    requireString(manifest.generator.upstreamCommit, 'generator.upstreamCommit', issues);
    requireString(manifest.generator.license, 'generator.license', issues);
    requireString(manifest.generator.representation, 'generator.representation', issues);
    requireString(manifest.generator.runtime, 'generator.runtime', issues);
    if (options.expectedUpstreamCommit && manifest.generator.upstreamCommit !== options.expectedUpstreamCommit) addIssue(issues, CONTRACT_ERROR_CODES.constraintMismatch, 'generator.upstreamCommit', `expected ${options.expectedUpstreamCommit}`);
  }

  let pack = null;
  let renderer = null;
  if (manifest.contentPack) {
    const packResult = validateContentPackContract(manifest.contentPack, options.contentPackOptions || {});
    issues.push(...packResult.issues);
    pack = packResult.pack;
    renderer = pack?.visual || null;
  }

  const minAssets = options.minAssets ?? 1;
  const maxAssets = options.maxAssets ?? 24;
  const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
  if (!Array.isArray(manifest.assets)) addIssue(issues, CONTRACT_ERROR_CODES.expectedArray, 'assets', 'expected an array');
  if (assets.length < minAssets || assets.length > maxAssets) addIssue(issues, CONTRACT_ERROR_CODES.countMismatch, 'assets', `expected ${minAssets}–${maxAssets} entries`);
  if (requireObject(manifest.batch, 'batch', issues)) {
    validateStableId(manifest.batch.id, 'batch.id', issues);
    requireObject(manifest.batch.input, 'batch.input', issues);
    if (manifest.batch.count !== assets.length) addIssue(issues, CONTRACT_ERROR_CODES.countMismatch, 'batch.count', `expected ${assets.length}`, { expected: assets.length, actual: manifest.batch.count });
    if (manifest.batch.deterministicOrder !== true) addIssue(issues, CONTRACT_ERROR_CODES.invalidValue, 'batch.deterministicOrder', 'expected true');
  }

  const seen = new Set();
  assets.forEach((asset, index) => {
    const assetResult = validateAssetContract(asset, { path: `assets[${index}]`, renderer, recipeOptions: options.recipeOptions });
    issues.push(...assetResult.issues);
    if (seen.has(asset?.fingerprint)) addIssue(issues, CONTRACT_ERROR_CODES.duplicateValue, `assets[${index}].fingerprint`, `duplicate ${asset.fingerprint}`);
    seen.add(asset?.fingerprint);
  });
  if (manifest.batch?.unique !== seen.size) addIssue(issues, CONTRACT_ERROR_CODES.countMismatch, 'batch.unique', `expected ${seen.size}`, { expected: seen.size, actual: manifest.batch?.unique });

  if (manifest.spritesheet !== undefined) {
    const sheet = manifest.spritesheet;
    if (requireObject(sheet, 'spritesheet', issues)) {
      for (const key of ['tileSize', 'columns', 'rows', 'width', 'height']) {
        if (!Number.isInteger(sheet[key]) || sheet[key] < 1) addIssue(issues, CONTRACT_ERROR_CODES.invalidValue, `spritesheet.${key}`, 'expected a positive integer');
      }
      if (sheet.columns * sheet.rows < assets.length) addIssue(issues, CONTRACT_ERROR_CODES.gridMismatch, 'spritesheet', 'grid cannot contain all assets');
      if (sheet.width !== sheet.columns * sheet.tileSize) addIssue(issues, CONTRACT_ERROR_CODES.gridMismatch, 'spritesheet.width', 'does not match columns × tileSize');
      if (sheet.height !== sheet.rows * sheet.tileSize) addIssue(issues, CONTRACT_ERROR_CODES.gridMismatch, 'spritesheet.height', 'does not match rows × tileSize');
      if (sheet.background !== 'transparent') warnings.push(contractIssue(CONTRACT_ERROR_CODES.invalidValue, 'spritesheet.background', 'expected transparent'));
    }
  }

  return contractResult(manifest, issues, { warnings, assets, pack, renderer });
}

export function platformReleasePayload(release) {
  return {
    schemaVersion: release.schemaVersion,
    id: release.id,
    version: release.version,
    releasedAt: release.releasedAt,
    status: release.status,
    scope: release.scope,
    identity: release.identity,
    gates: release.gates,
    artifacts: release.artifacts,
    browserEvidence: release.browserEvidence,
    provenance: release.provenance,
    verification: release.verification
  };
}

export function platformReleaseFingerprint(release) {
  return contractFingerprint(platformReleasePayload(release));
}

export function platformReleaseSnapshot(release) {
  const snapshot = cloneContract(platformReleasePayload(release));
  snapshot.fingerprint = platformReleaseFingerprint(snapshot);
  return snapshot;
}

export function validatePlatformReleaseContract(release, options = {}) {
  const issues = [];
  const path = options.path || 'platformRelease';
  if (!requireObject(release, path, issues)) return contractResult(null, issues);
  if (release.schemaVersion !== CONTRACT_SCHEMAS.platformRelease) addIssue(issues, CONTRACT_ERROR_CODES.unsupportedSchema, `${path}.schemaVersion`, `expected ${CONTRACT_SCHEMAS.platformRelease}`);
  validateStableId(release.id, `${path}.id`, issues);
  validateSemver(release.version, `${path}.version`, issues);
  if (typeof release.releasedAt !== 'string' || !Number.isFinite(Date.parse(release.releasedAt))) addIssue(issues, CONTRACT_ERROR_CODES.invalidValue, `${path}.releasedAt`, 'expected an ISO date-time');
  if (release.status !== 'research-release') addIssue(issues, CONTRACT_ERROR_CODES.unsupportedValue, `${path}.status`, 'expected research-release');

  if (requireObject(release.scope, `${path}.scope`, issues)) {
    requireString(release.scope.northStar, `${path}.scope.northStar`, issues);
    validateStringList(release.scope.included, `${path}.scope.included`, issues);
    validateStringList(release.scope.excluded, `${path}.scope.excluded`, issues);
  }

  if (requireObject(release.identity, `${path}.identity`, issues)) {
    for (const key of ['contentPack', 'renderer', 'runtimeSdk']) {
      const value = release.identity[key];
      const itemPath = `${path}.identity.${key}`;
      if (!requireObject(value, itemPath, issues)) continue;
      requireString(value.id, `${itemPath}.id`, issues);
      validateSemver(value.version, `${itemPath}.version`, issues);
      if (key !== 'runtimeSdk') validateFingerprint(value.fingerprint, `${itemPath}.fingerprint`, issues);
      else requireString(value.schemaVersion, `${itemPath}.schemaVersion`, issues);
    }
    if (requireObject(release.identity.upstream, `${path}.identity.upstream`, issues)) {
      requireString(release.identity.upstream.repository, `${path}.identity.upstream.repository`, issues);
      requireString(release.identity.upstream.commit, `${path}.identity.upstream.commit`, issues);
      requireString(release.identity.upstream.license, `${path}.identity.upstream.license`, issues);
    }
  }

  if (!Array.isArray(release.gates)) addIssue(issues, CONTRACT_ERROR_CODES.expectedArray, `${path}.gates`, 'expected an array');
  else {
    const ids = new Set();
    release.gates.forEach((gate, index) => {
      const gatePath = `${path}.gates[${index}]`;
      if (!requireObject(gate, gatePath, issues)) return;
      if (!PLATFORM_RELEASE_GATE_IDS.includes(gate.id)) addIssue(issues, CONTRACT_ERROR_CODES.unsupportedValue, `${gatePath}.id`, `unsupported gate ${gate.id}`);
      if (ids.has(gate.id)) addIssue(issues, CONTRACT_ERROR_CODES.duplicateValue, `${gatePath}.id`, `duplicate gate ${gate.id}`);
      ids.add(gate.id);
      if (gate.status !== 'pass') addIssue(issues, CONTRACT_ERROR_CODES.constraintMismatch, `${gatePath}.status`, 'platform release gates must pass');
      validateStringList(gate.evidence, `${gatePath}.evidence`, issues);
    });
    if (PLATFORM_RELEASE_GATE_IDS.some(id => !ids.has(id)) || ids.size !== PLATFORM_RELEASE_GATE_IDS.length) addIssue(issues, CONTRACT_ERROR_CODES.countMismatch, `${path}.gates`, 'must include G0–G7 exactly once');
  }

  if (!Array.isArray(release.artifacts) || release.artifacts.length < 4) addIssue(issues, CONTRACT_ERROR_CODES.required, `${path}.artifacts`, 'expected at least four artifacts');
  else {
    const paths = new Set();
    release.artifacts.forEach((artifact, index) => {
      const artifactPath = `${path}.artifacts[${index}]`;
      if (!requireObject(artifact, artifactPath, issues)) return;
      requireString(artifact.path, `${artifactPath}.path`, issues);
      requireString(artifact.role, `${artifactPath}.role`, issues);
      if (!Number.isInteger(artifact.bytes) || artifact.bytes < 1) addIssue(issues, CONTRACT_ERROR_CODES.invalidValue, `${artifactPath}.bytes`, 'expected a positive integer');
      validateFingerprint(artifact.fingerprint, `${artifactPath}.fingerprint`, issues);
      if (paths.has(artifact.path)) addIssue(issues, CONTRACT_ERROR_CODES.duplicateValue, `${artifactPath}.path`, `duplicate ${artifact.path}`);
      paths.add(artifact.path);
    });
  }

  if (!Array.isArray(release.browserEvidence) || release.browserEvidence.length < 2) addIssue(issues, CONTRACT_ERROR_CODES.required, `${path}.browserEvidence`, 'expected Studio and Runtime evidence');
  else release.browserEvidence.forEach((entry, index) => {
    const entryPath = `${path}.browserEvidence[${index}]`;
    if (!requireObject(entry, entryPath, issues)) return;
    requireString(entry.id, `${entryPath}.id`, issues);
    validateStringList(entry.paths, `${entryPath}.paths`, issues);
    validateStringList(entry.assertions, `${entryPath}.assertions`, issues);
  });

  if (requireObject(release.provenance, `${path}.provenance`, issues)) {
    if (release.provenance.runtimeLlmCalls !== 0) addIssue(issues, CONTRACT_ERROR_CODES.constraintMismatch, `${path}.provenance.runtimeLlmCalls`, 'expected 0');
    if (release.provenance.cloudApiCalls !== 0) addIssue(issues, CONTRACT_ERROR_CODES.constraintMismatch, `${path}.provenance.cloudApiCalls`, 'expected 0');
    validateStringList(release.provenance.authoredPaths, `${path}.provenance.authoredPaths`, issues);
    validateStringList(release.provenance.upstreamPaths, `${path}.provenance.upstreamPaths`, issues);
  }

  if (requireObject(release.verification, `${path}.verification`, issues)) {
    requireString(release.verification.command, `${path}.verification.command`, issues);
    if (!Array.isArray(release.verification.suites) || release.verification.suites.length < 3) addIssue(issues, CONTRACT_ERROR_CODES.required, `${path}.verification.suites`, 'expected M2, M3 and M5 suites');
    else release.verification.suites.forEach((suite, index) => {
      const suitePath = `${path}.verification.suites[${index}]`;
      if (!requireObject(suite, suitePath, issues)) return;
      requireString(suite.id, `${suitePath}.id`, issues);
      if (suite.status !== 'pass') addIssue(issues, CONTRACT_ERROR_CODES.constraintMismatch, `${suitePath}.status`, 'expected pass');
      requireString(suite.summary, `${suitePath}.summary`, issues);
    });
  }

  const expectedFingerprint = platformReleaseFingerprint(release);
  if (release.fingerprint !== expectedFingerprint) addIssue(issues, CONTRACT_ERROR_CODES.fingerprintMismatch, `${path}.fingerprint`, `expected ${expectedFingerprint}`, { expected: expectedFingerprint, actual: release.fingerprint });
  return contractResult(release, issues, { fingerprint: expectedFingerprint });
}
export function assertContract(result) {
  if (!result?.ok) {
    const error = new Error((result?.errors || ['contract validation failed']).join('\n'));
    error.name = 'ContractValidationError';
    error.issues = result?.issues || [];
    throw error;
  }
  return result;
}

