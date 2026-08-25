import { SPECIES_IDS } from '../upstream/src/species.js';
import { MEDIA_IDS } from '../upstream/src/media.js';
import { makeRng, hashStr } from '../upstream/src/rng.js';
import { MOSSLIGHT_V06_FEATURES } from './mosslight-kit.js';
import {
  MOSSLIGHT_CORE_RENDERER_ID,
  MOSSLIGHT_CORE_MEDIA_ID,
  MOSSLIGHT_CORE_FEATURES,
  MOSSLIGHT_CORE_COVERAGE
} from './mosslight-core.js';
import {
  MOONHARBOR_INKCUT_RENDERER_ID,
  MOONHARBOR_INKCUT_MEDIA_ID,
  MOONHARBOR_INKCUT_FEATURES,
  MOONHARBOR_INKCUT_COVERAGE
} from './moonharbor-inkcut.js';
import {
  SUNPATCH_FELT_RENDERER_ID,
  SUNPATCH_FELT_MEDIA_ID,
  SUNPATCH_FELT_FEATURES,
  SUNPATCH_FELT_COVERAGE
} from './sunpatch-felt.js';
import {
  MOONHARBOR_CORE_PACK_ID,
  MOONHARBOR_CORE_PROFILE,
  deriveContentPackFamily
} from './content-pack-family.js';
import {
  CONTRACT_SCHEMAS,
  CONTRACT_ERROR_CODES,
  contractIssue,
  formatContractIssue,
  rendererDescriptorFingerprint,
  contentPackFingerprint as contractContentPackFingerprint,
  contentPackSnapshot as contractContentPackSnapshot,
  validateContentPackContract
} from './contracts.js';

export const CONTENT_PACK_SCHEMA = CONTRACT_SCHEMAS.contentPack;
export const ORIGINAL_PACK_ID = 'kindergrimm-original';
export const MOSSLIGHT_CORE_PACK_ID = 'mosslight-core-2d';
export const MOONHARBOR_INKCUT_PACK_ID = 'moonharbor-inkcut-2d';
export const SUNPATCH_FELT_PACK_ID = 'sunpatch-felt-2d';
export { MOONHARBOR_CORE_PACK_ID };
export const PINNED_UPSTREAM_COMMIT = 'de339ad739d8cbd28ff2dd4a940af38c0ede86c8';
export const CONTENT_MEDIA_IDS = Object.freeze([...MEDIA_IDS, MOSSLIGHT_CORE_MEDIA_ID, MOONHARBOR_INKCUT_MEDIA_ID, SUNPATCH_FELT_MEDIA_ID]);

const PACK_DEFINITIONS = {
  [ORIGINAL_PACK_ID]: {
    schemaVersion: CONTENT_PACK_SCHEMA,
    id: ORIGINAL_PACK_ID,
    version: '1.0.0',
    status: 'upstream-content',
    provenance: {
      kind: 'upstream-content',
      source: 'albertobeiz/kindergrimm',
      upstreamCommit: PINNED_UPSTREAM_COMMIT,
      license: 'Unlicense / public domain dedication'
    },
    constraints: {
      mode: 'input-driven',
      species: [...SPECIES_IDS],
      media: [...MEDIA_IDS],
      colors: ['auto', 'plain', 'color']
    },
    identity: {
      names: ['Ash', 'Bramble', 'Clover', 'Dusk', 'Elm', 'Fable', 'Glim', 'Hush', 'Ivy', 'Juniper', 'Kite', 'Moss'],
      roles: ['keeper', 'scout', 'guard', 'maker', 'healer', 'messenger', 'witness', 'trader']
    },
    presentation: {
      name: 'KinderGrimm Original',
      shortName: 'ORIGINAL',
      label: '上游完整内容',
      summary: '保留上游全部物种、媒介和用户输入控制；作为向后兼容基线。',
      accent: '#efaa88',
      tags: ['upstream', 'full-range', 'input-driven']
    }
  },
  'mosslight-waystation': {
    schemaVersion: CONTENT_PACK_SCHEMA,
    id: 'mosslight-waystation',
    version: '0.3.0',
    status: 'authored-content',
    provenance: {
      kind: 'hybrid-authored-content',
      source: 'KinderGrimm research extension / Mosslight twelve-part visual kit v0.6',
      upstreamCommit: PINNED_UPSTREAM_COMMIT,
      license: 'Local authored decorator under workspace terms; upstream base renderer remains Unlicense'
    },
    constraints: {
      mode: 'locked',
      species: ['human', 'cat', 'dog'],
      media: ['watercolor', 'ink'],
      color: 'color'
    },
    visual: {
      schemaVersion: 'kindergrimm-visual-renderer/0.1',
      id: 'mosslight-canvas-decorator',
      version: '0.2.0',
      kind: 'procedural-2d-decorator',
      baseRenderer: 'kindergrimm-drawn-2d',
      runtimeModule: 'runtime/visual-pipeline.js',
      seedContract: 'recipe.seed + renderer fingerprint + visual part id',
      features: [...MOSSLIGHT_V06_FEATURES],
      coverage: {
        ambient: ['mosslight-halo', 'mosslight-fireflies', 'mosslight-route-ribbons', 'mosslight-paper-flecks'],
        head: ['mosslight-leaf-crown'],
        face: ['mosslight-cheek-sprigs', 'mosslight-eye-glints'],
        body: ['mosslight-waymark', 'mosslight-mantle', 'mosslight-seed-charm'],
        ground: ['mosslight-ground-bloom', 'mosslight-moss-footing']
      },
      palette: {
        foliage: '#42694f',
        glow: '#e1d278',
        paper: '#f6f1e5',
        shadow: '#223a2d',
        bark: '#6a4b3b',
        mist: '#c8d8ce',
        accents: ['#b7d6be', '#efaa88', '#8aa3c2']
      }
    },
    identity: {
      names: ['Alder', 'Briar', 'Cress', 'Fern', 'Lumen', 'Mallow', 'Nettle', 'Reed', 'Sorrel', 'Tansy', 'Vale', 'Wren'],
      roles: ['lamp-keeper', 'route-scout', 'gate-warden', 'patch-maker', 'moss-healer', 'parcel-runner', 'night-witness', 'tea-trader']
    },
    presentation: {
      name: 'Mosslight Waystation',
      shortName: 'MOSS-LIGHT',
      label: '苔光旅站',
      summary: '在上游纸片 rig 上追加覆盖 ambient/head/face/body/ground 的十二个确定性 Canvas 部件；是本地 authored visual kit，不是完整主体 renderer。',
      accent: '#b7d6be',
      tags: ['authored-content', 'twelve-part-kit', 'waystation', 'procedural-canvas-decorator']
    }
  },
  [MOSSLIGHT_CORE_PACK_ID]: {
    schemaVersion: CONTENT_PACK_SCHEMA,
    id: MOSSLIGHT_CORE_PACK_ID,
    version: '0.1.0',
    status: 'authored-content',
    provenance: {
      kind: 'local-authored-procedural-2d',
      source: 'Kindergrimm research extension / Mosslight Core independent renderer',
      upstreamCommit: PINNED_UPSTREAM_COMMIT,
      supportedBases: ['biped'],
      license: 'Local authored renderer under workspace terms; low-level upstream Canvas plane and animation protocol remain Unlicense'
    },
    constraints: {
      mode: 'locked',
      species: ['human', 'cat', 'dog'],
      media: [MOSSLIGHT_CORE_MEDIA_ID],
      color: 'color'
    },
    visual: {
      schemaVersion: 'kindergrimm-visual-renderer/0.1',
      id: MOSSLIGHT_CORE_RENDERER_ID,
      version: '0.1.0',
      kind: 'procedural-2d-core',
      baseRenderer: 'none',
      runtimeModule: 'runtime/mosslight-core.js',
      seedContract: 'recipe.seed + renderer fingerprint + authored core part id + side',
      features: [...MOSSLIGHT_CORE_FEATURES],
      coverage: Object.fromEntries(Object.entries(MOSSLIGHT_CORE_COVERAGE).map(([group, ids]) => [group, [...ids]])),
      palette: {
        foliage: '#42694f',
        glow: '#e1d278',
        paper: '#f6f1e5',
        shadow: '#223a2d',
        bark: '#6a4b3b',
        mist: '#c8d8ce',
        accentRose: '#efaa88',
        accents: ['#b7d6be', '#efaa88', '#8aa3c2']
      }
    },
    identity: {
      names: ['Aster', 'Bramble', 'Cairn', 'Dew', 'Ember', 'Fern', 'Gale', 'Hearth', 'Ilex', 'Lark', 'Morrow', 'Nim'],
      roles: ['path-keeper', 'lantern-scout', 'gate-tender', 'moss-mender', 'route-singer', 'parcel-guide', 'night-reader', 'waystation-host']
    },
    presentation: {
      name: 'Mosslight Core 2D',
      shortName: 'CORE 2D',
      label: '苔光核心',
      summary: '不调用上游角色构建器，由自有 gouache 语法、独立布局和 17 类核心部件完整生成可动画 2D 角色。',
      accent: '#e1d278',
      tags: ['authored-content', 'independent-renderer', 'procedural-2d-core', 'mosslight-gouache']
    }
  },
  [MOONHARBOR_INKCUT_PACK_ID]: {
    schemaVersion: CONTENT_PACK_SCHEMA,
    id: MOONHARBOR_INKCUT_PACK_ID,
    version: '0.1.0',
    status: 'authored-content',
    provenance: {
      kind: 'local-authored-procedural-2d',
      source: 'Kindergrimm v2 / Moonharbor Inkcut independent renderer',
      upstreamCommit: PINNED_UPSTREAM_COMMIT,
      supportedBases: ['biped'],
      license: 'Local authored renderer under workspace terms; low-level upstream Canvas plane and animation protocol remain Unlicense'
    },
    constraints: {
      mode: 'locked',
      species: ['human', 'cat', 'dog'],
      media: [MOONHARBOR_INKCUT_MEDIA_ID],
      color: 'color'
    },
    visual: {
      schemaVersion: 'kindergrimm-visual-renderer/0.1',
      id: MOONHARBOR_INKCUT_RENDERER_ID,
      version: '0.1.0',
      kind: 'procedural-2d-core',
      baseRenderer: 'none',
      runtimeModule: 'runtime/moonharbor-inkcut.js',
      seedContract: 'recipe.seed + renderer fingerprint + authored inkcut part id + side',
      features: [...MOONHARBOR_INKCUT_FEATURES],
      coverage: Object.fromEntries(Object.entries(MOONHARBOR_INKCUT_COVERAGE).map(([group, ids]) => [group, [...ids]])),
      palette: {
        ink: '#132238',
        navy: '#263d5b',
        tide: '#4c9ba5',
        coral: '#df7c7a',
        gold: '#e8c56a',
        paper: '#f2eee4',
        fog: '#aab9c7',
        accents: ['#4c9ba5', '#df7c7a', '#9a8bc1']
      }
    },
    identity: {
      names: ['Aven', 'Brine', 'Cobalt', 'Doria', 'Ebb', 'Faro', 'Gull', 'Harbor', 'Ione', 'Jetty', 'Kestrel', 'Lune'],
      roles: ['tide-archivist', 'harbor-lighter', 'chart-keeper', 'moon-courier', 'signal-reader', 'quay-mender', 'weather-scribe', 'night-pilot']
    },
    presentation: {
      name: 'Moonharbor Inkcut 2D',
      shortName: 'INKCUT 2D',
      label: '月港墨刻',
      summary: '由独立 angular mask、窄身 coat、ink hatch、signal props 与 19 类自有部件构成；不调用 Mosslight 的布局、可见 parts 或绘制函数。',
      accent: '#4c9ba5',
      tags: ['authored-content', 'independent-renderer', 'procedural-2d-core', 'moonharbor-inkcut']
    }
  },
  [SUNPATCH_FELT_PACK_ID]: {
    schemaVersion: CONTENT_PACK_SCHEMA,
    id: SUNPATCH_FELT_PACK_ID,
    version: '0.1.0',
    status: 'authored-content',
    provenance: {
      kind: 'local-authored-procedural-2d',
      source: 'Kindergrimm v2 / Sunpatch Felt independent renderer',
      upstreamCommit: PINNED_UPSTREAM_COMMIT,
      supportedBases: ['biped'],
      license: 'Local authored renderer under workspace terms; low-level upstream Canvas plane and animation protocol remain Unlicense'
    },
    constraints: {
      mode: 'locked',
      species: ['human', 'cat', 'dog'],
      media: [SUNPATCH_FELT_MEDIA_ID],
      color: 'color'
    },
    visual: {
      schemaVersion: 'kindergrimm-visual-renderer/0.1',
      id: SUNPATCH_FELT_RENDERER_ID,
      version: '0.1.0',
      kind: 'procedural-2d-core',
      baseRenderer: 'none',
      runtimeModule: 'runtime/sunpatch-felt.js',
      seedContract: 'recipe.seed + renderer fingerprint + authored felt part id + side',
      features: [...SUNPATCH_FELT_FEATURES],
      coverage: Object.fromEntries(Object.entries(SUNPATCH_FELT_COVERAGE).map(([group, ids]) => [group, [...ids]])),
      palette: {
        oat: '#efe0bd',
        tomato: '#d96b5f',
        sunflower: '#e4b84f',
        sage: '#7fa58a',
        denim: '#54738d',
        plum: '#69516f',
        thread: '#433d3c',
        accents: ['#d96b5f', '#e4b84f', '#7fa58a', '#69516f']
      }
    },
    identity: {
      names: ['Button', 'Dandy', 'Fennel', 'Ginger', 'Honey', 'Mitts', 'Patch', 'Pip', 'Posy', 'Spool', 'Twill', 'Woolsey'],
      roles: ['patch-maker', 'button-keeper', 'sun-courier', 'thread-mender', 'pocket-guide', 'quilt-reader', 'toy-cataloger', 'warmth-tender']
    },
    presentation: {
      name: 'Sunpatch Felt 2D',
      shortName: 'FELT 2D',
      label: '阳斑毛毡',
      summary: '由宽短软体比例、层叠布片、纽扣五官、blanket stitch 与 20 类自有部件构成；所有可见素材均为本地确定性 Canvas 2D。',
      accent: '#e4b84f',
      tags: ['authored-content', 'independent-renderer', 'procedural-2d-core', 'sunpatch-felt', 'textile-applique']
    }
  }
};

PACK_DEFINITIONS[MOONHARBOR_CORE_PACK_ID] = deriveContentPackFamily(
  PACK_DEFINITIONS[MOSSLIGHT_CORE_PACK_ID],
  MOONHARBOR_CORE_PROFILE
);

export function visualRendererFingerprint(value) {
  return rendererDescriptorFingerprint(value);
}

export function contentPackFingerprint(pack) {
  return contractContentPackFingerprint(pack);
}

export function contentPackSnapshot(pack) {
  return contractContentPackSnapshot(pack);
}
export function listContentPacks() {
  return Object.values(PACK_DEFINITIONS).map(contentPackSnapshot);
}

export function getContentPack(value = ORIGINAL_PACK_ID) {
  if (value && typeof value === 'object') return contentPackSnapshot(value);
  return contentPackSnapshot(PACK_DEFINITIONS[value] || PACK_DEFINITIONS[ORIGINAL_PACK_ID]);
}

export function isOriginalContentPack(pack) {
  return !pack || pack.id === ORIGINAL_PACK_ID;
}

export function validateContentPack(pack) {
  const contract = validateContentPackContract(pack, {
    expectedUpstreamCommit: PINNED_UPSTREAM_COMMIT,
    speciesIds: SPECIES_IDS,
    mediaIds: CONTENT_MEDIA_IDS
  });
  const issues = [...contract.issues];
  const add = (code, path, message) => issues.push(contractIssue(code, path, message));
  const visual = pack?.visual;
  if (visual?.id === 'mosslight-canvas-decorator') {
    if (!['0.1.0', '0.2.0'].includes(visual.version)) add(CONTRACT_ERROR_CODES.unsupportedValue, 'contentPack.visual.version', 'supported versions are 0.1.0 and 0.2.0');
    if (visual.kind !== 'procedural-2d-decorator') add(CONTRACT_ERROR_CODES.constraintMismatch, 'contentPack.visual.kind', 'expected procedural-2d-decorator');
    if (visual.baseRenderer !== 'kindergrimm-drawn-2d') add(CONTRACT_ERROR_CODES.unsupportedValue, 'contentPack.visual.baseRenderer', 'unsupported base renderer');
    if (visual.runtimeModule !== 'runtime/visual-pipeline.js') add(CONTRACT_ERROR_CODES.unsupportedValue, 'contentPack.visual.runtimeModule', 'unsupported module');
    const features = Array.isArray(visual.features) ? visual.features : [];
    if (features.some(value => !MOSSLIGHT_V06_FEATURES.includes(value))) add(CONTRACT_ERROR_CODES.unsupportedValue, 'contentPack.visual.features', 'contains unsupported ids');
    if (visual.version === '0.1.0' && JSON.stringify(features) !== JSON.stringify(MOSSLIGHT_V06_FEATURES.slice(0, 3))) add(CONTRACT_ERROR_CODES.constraintMismatch, 'contentPack.visual.features', 'v0.1.0 expects the original three ids');
    if (visual.version === '0.2.0' && JSON.stringify(features) !== JSON.stringify(MOSSLIGHT_V06_FEATURES)) add(CONTRACT_ERROR_CODES.constraintMismatch, 'contentPack.visual.features', 'v0.2.0 expects all twelve ids');
    if (visual.version === '0.2.0') {
      const coverage = visual.coverage && typeof visual.coverage === 'object' ? visual.coverage : {};
      const groups = ['ambient', 'head', 'face', 'body', 'ground'];
      if (groups.some(group => !Array.isArray(coverage[group]) || !coverage[group].length)) add(CONTRACT_ERROR_CODES.constraintMismatch, 'contentPack.visual.coverage', 'expected five non-empty groups');
    }
  } else if (visual?.id === MOSSLIGHT_CORE_RENDERER_ID) {
    if (visual.version !== '0.1.0') add(CONTRACT_ERROR_CODES.unsupportedValue, 'contentPack.visual.version', 'supported Core version is 0.1.0');
    if (visual.kind !== 'procedural-2d-core') add(CONTRACT_ERROR_CODES.constraintMismatch, 'contentPack.visual.kind', 'expected procedural-2d-core');
    if (visual.baseRenderer !== 'none') add(CONTRACT_ERROR_CODES.constraintMismatch, 'contentPack.visual.baseRenderer', 'independent Core renderer expects none');
    if (visual.runtimeModule !== 'runtime/mosslight-core.js') add(CONTRACT_ERROR_CODES.unsupportedValue, 'contentPack.visual.runtimeModule', 'unsupported Core module');
    if (JSON.stringify(visual.features) !== JSON.stringify(MOSSLIGHT_CORE_FEATURES)) add(CONTRACT_ERROR_CODES.constraintMismatch, 'contentPack.visual.features', 'Core expects the complete authored feature manifest');
    if (JSON.stringify(visual.coverage) !== JSON.stringify(MOSSLIGHT_CORE_COVERAGE)) add(CONTRACT_ERROR_CODES.constraintMismatch, 'contentPack.visual.coverage', 'Core expects six exact coverage groups');
    if (pack.constraints.media.length !== 1 || pack.constraints.media[0] !== MOSSLIGHT_CORE_MEDIA_ID) add(CONTRACT_ERROR_CODES.constraintMismatch, 'contentPack.constraints.media', `Core expects ${MOSSLIGHT_CORE_MEDIA_ID}`);
  } else if (visual?.id === MOONHARBOR_INKCUT_RENDERER_ID) {
    if (visual.version !== '0.1.0') add(CONTRACT_ERROR_CODES.unsupportedValue, 'contentPack.visual.version', 'supported Inkcut version is 0.1.0');
    if (visual.kind !== 'procedural-2d-core') add(CONTRACT_ERROR_CODES.constraintMismatch, 'contentPack.visual.kind', 'expected procedural-2d-core');
    if (visual.baseRenderer !== 'none') add(CONTRACT_ERROR_CODES.constraintMismatch, 'contentPack.visual.baseRenderer', 'independent Inkcut renderer expects none');
    if (visual.runtimeModule !== 'runtime/moonharbor-inkcut.js') add(CONTRACT_ERROR_CODES.unsupportedValue, 'contentPack.visual.runtimeModule', 'unsupported Inkcut module');
    if (JSON.stringify(visual.features) !== JSON.stringify(MOONHARBOR_INKCUT_FEATURES)) add(CONTRACT_ERROR_CODES.constraintMismatch, 'contentPack.visual.features', 'Inkcut expects the complete authored feature manifest');
    if (JSON.stringify(visual.coverage) !== JSON.stringify(MOONHARBOR_INKCUT_COVERAGE)) add(CONTRACT_ERROR_CODES.constraintMismatch, 'contentPack.visual.coverage', 'Inkcut expects six exact coverage groups');
    if (pack.constraints.media.length !== 1 || pack.constraints.media[0] !== MOONHARBOR_INKCUT_MEDIA_ID) add(CONTRACT_ERROR_CODES.constraintMismatch, 'contentPack.constraints.media', `Inkcut expects ${MOONHARBOR_INKCUT_MEDIA_ID}`);
  } else if (visual?.id === SUNPATCH_FELT_RENDERER_ID) {
    if (visual.version !== '0.1.0') add(CONTRACT_ERROR_CODES.unsupportedValue, 'contentPack.visual.version', 'supported Felt version is 0.1.0');
    if (visual.kind !== 'procedural-2d-core') add(CONTRACT_ERROR_CODES.constraintMismatch, 'contentPack.visual.kind', 'expected procedural-2d-core');
    if (visual.baseRenderer !== 'none') add(CONTRACT_ERROR_CODES.constraintMismatch, 'contentPack.visual.baseRenderer', 'independent Felt renderer expects none');
    if (visual.runtimeModule !== 'runtime/sunpatch-felt.js') add(CONTRACT_ERROR_CODES.unsupportedValue, 'contentPack.visual.runtimeModule', 'unsupported Felt module');
    if (JSON.stringify(visual.features) !== JSON.stringify(SUNPATCH_FELT_FEATURES)) add(CONTRACT_ERROR_CODES.constraintMismatch, 'contentPack.visual.features', 'Felt expects the complete authored feature manifest');
    if (JSON.stringify(visual.coverage) !== JSON.stringify(SUNPATCH_FELT_COVERAGE)) add(CONTRACT_ERROR_CODES.constraintMismatch, 'contentPack.visual.coverage', 'Felt expects six exact coverage groups');
    if (pack.constraints.media.length !== 1 || pack.constraints.media[0] !== SUNPATCH_FELT_MEDIA_ID) add(CONTRACT_ERROR_CODES.constraintMismatch, 'contentPack.constraints.media', 'Felt expects ' + SUNPATCH_FELT_MEDIA_ID);
  } else if (visual) {
    add(CONTRACT_ERROR_CODES.unsupportedValue, 'contentPack.visual.id', 'unsupported renderer');
  }
  const errors = issues.map(formatContractIssue);
  return { ok: issues.length === 0, issues, errors, pack: issues.length ? null : contract.pack };
}
export function resolvePackFields(input, index, rawPack = ORIGINAL_PACK_ID) {
  const pack = getContentPack(rawPack);
  if (pack.constraints.mode === 'input-driven') return null;
  return {
    species: makeRng(hashStr(`${input.seed}:content-pack:${pack.id}:species:${index}`)).pick(pack.constraints.species),
    media: makeRng(hashStr(`${input.seed}:content-pack:${pack.id}:media:${index}`)).pick(pack.constraints.media),
    color: pack.constraints.color
  };
}

export function recipeMatchesContentPack(recipe, rawPack = ORIGINAL_PACK_ID) {
  const pack = getContentPack(rawPack);
  const constraints = pack.constraints;
  if (!constraints.species.includes(recipe.species) || !constraints.media.includes(recipe.media)) return false;
  if (constraints.mode === 'locked') return recipe.color === constraints.color;
  return constraints.colors.includes(recipe.color);
}
