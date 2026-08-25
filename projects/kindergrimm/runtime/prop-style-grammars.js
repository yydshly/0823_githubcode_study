import { contractFingerprint } from './contracts.js';

export const PROP_STYLE_GRAMMAR_SCHEMA = 'kindergrimm-prop-style-grammar/0.1';

const DEFINITIONS = [
  {
    id: 'mosslight-prop-gouache',
    label: 'Mosslight Gouache Props',
    family: 'mosslight',
    rendererId: 'mosslight-core-2d',
    materialGrammar: ['paper-wash', 'soft-outline', 'leaf-mark', 'warm-glow'],
    palette: {
      paper: '#f4edda',
      panel: '#dfe8dc',
      body: '#42694f',
      bodyAlt: '#6f8d70',
      dark: '#243b2e',
      light: '#e1d278',
      accent: ['#efaa88', '#8aa3c2', '#b7d6be']
    },
    provenance: {
      kind: 'local-authored-procedural-2d',
      source: 'Kindergrimm research extension / Mosslight prop grammar',
      license: 'workspace-authored'
    }
  },
    {
    id: 'moonharbor-inkcut-props',
    label: 'Moonharbor Inkcut Props',
    family: 'moonharbor-inkcut',
    rendererId: 'moonharbor-inkcut-2d',
    materialGrammar: ['angular-cut', 'hard-ink-edge', 'cross-hatch', 'signal-cyan'],
    palette: {
      paper: '#ece4d1',
      panel: '#d6d2c5',
      body: '#384950',
      bodyAlt: '#667575',
      dark: '#1e2529',
      light: '#e4b95f',
      accent: ['#68b2bd', '#cb6758', '#8fa477']
    },
    provenance: {
      kind: 'local-authored-procedural-2d',
      source: 'Kindergrimm research extension / Moonharbor Inkcut prop grammar',
      license: 'workspace-authored'
    }
  },{
    id: 'sunpatch-felt-props',
    label: 'Sunpatch Felt Props',
    family: 'sunpatch',
    rendererId: 'sunpatch-felt-2d',
    materialGrammar: ['felt-fiber', 'blanket-stitch', 'applique-patch', 'button-detail'],
    palette: {
      paper: '#f1e7cf',
      panel: '#ead8b6',
      body: '#b85742',
      bodyAlt: '#6d8870',
      dark: '#352f2b',
      light: '#e9be62',
      accent: ['#78a1a8', '#d98872', '#d8c98e']
    },
    provenance: {
      kind: 'local-authored-procedural-2d',
      source: 'Kindergrimm research extension / Sunpatch Felt prop grammar',
      license: 'workspace-authored'
    }
  }
];

function snapshot(definition) {
  const payload = {
    schemaVersion: PROP_STYLE_GRAMMAR_SCHEMA,
    id: definition.id,
    label: definition.label,
    family: definition.family,
    rendererId: definition.rendererId,
    materialGrammar: definition.materialGrammar,
    palette: definition.palette,
    provenance: definition.provenance
  };
  return Object.freeze(Object.assign({}, payload, { fingerprint: contractFingerprint(payload) }));
}

export const PROP_STYLE_GRAMMARS = Object.freeze(DEFINITIONS.map(snapshot));
const BY_ID = new Map(PROP_STYLE_GRAMMARS.map(style => [style.id, style]));

export function listPropStyleGrammars() {
  return PROP_STYLE_GRAMMARS.slice();
}

export function getPropStyleGrammar(value) {
  const id = typeof value === 'string' ? value : value && value.id;
  return BY_ID.get(id) || PROP_STYLE_GRAMMARS[0];
}

export function validatePropStyleGrammar(style) {
  const errors = [];
  if (!style || style.schemaVersion !== PROP_STYLE_GRAMMAR_SCHEMA) errors.push('schemaVersion: expected ' + PROP_STYLE_GRAMMAR_SCHEMA);
  if (!style || !Array.isArray(style.materialGrammar) || style.materialGrammar.length < 4) errors.push('materialGrammar: expected at least four grammar tokens');
  if (!style || !style.palette || !Array.isArray(style.palette.accent) || style.palette.accent.length < 3) errors.push('palette: expected three accents');
  if (style) {
    const payload = {
      schemaVersion: style.schemaVersion,
      id: style.id,
      label: style.label,
      family: style.family,
      rendererId: style.rendererId,
      materialGrammar: style.materialGrammar,
      palette: style.palette,
      provenance: style.provenance
    };
    const expected = contractFingerprint(payload);
    if (style.fingerprint !== expected) errors.push('fingerprint: expected ' + expected);
  }
  return { ok: errors.length === 0, errors, style: errors.length ? null : style };
}
