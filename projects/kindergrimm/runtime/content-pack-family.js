export const CONTENT_PACK_FAMILY_SCHEMA = 'kindergrimm-content-pack-family/0.1';
export const MOONHARBOR_CORE_PACK_ID = 'moonharbor-core-2d';

const clone = value => JSON.parse(JSON.stringify(value));

export const MOONHARBOR_CORE_PROFILE = Object.freeze({
  schemaVersion: CONTENT_PACK_FAMILY_SCHEMA,
  id: MOONHARBOR_CORE_PACK_ID,
  version: '0.1.0',
  basePackId: 'mosslight-core-2d',
  relation: 'palette-identity-variant',
  status: 'authored-content',
  provenance: Object.freeze({
    kind: 'local-authored-procedural-2d-family-variant',
    source: 'Kindergrimm v2 / Moonharbor palette and identity family',
    license: 'Local authored Content Pack profile under workspace terms'
  }),
  palette: Object.freeze({
    foliage: '#35506f',
    glow: '#f4d58d',
    paper: '#eef3f8',
    shadow: '#18253a',
    bark: '#5b405f',
    mist: '#a9bfd6',
    accentRose: '#e890a6',
    accents: Object.freeze(['#81c7c5', '#e890a6', '#9ba8d8'])
  }),
  identity: Object.freeze({
    names: Object.freeze(['Aven', 'Brine', 'Cobalt', 'Doria', 'Ebb', 'Faro', 'Gull', 'Harbor', 'Ione', 'Jetty', 'Kestrel', 'Lune']),
    roles: Object.freeze(['tide-archivist', 'harbor-lighter', 'chart-keeper', 'moon-courier', 'signal-reader', 'quay-mender', 'weather-scribe', 'night-pilot'])
  }),
  presentation: Object.freeze({
    name: 'Moonharbor Core 2D',
    shortName: 'MOONHARBOR',
    label: '月港档案',
    summary: '复用已发布的 17 类独立 Core 部件与动画协议，替换为月港 palette、命名和职业语义；这是可验证的风格族变体，不是第二套 Renderer。',
    accent: '#81c7c5',
    tags: Object.freeze(['authored-content', 'pack-family-variant', 'procedural-2d-core', 'moonharbor'])
  })
});

export function deriveContentPackFamily(basePack, profile = MOONHARBOR_CORE_PROFILE) {
  if (!basePack || typeof basePack !== 'object') throw new TypeError('basePack is required');
  if (!basePack.visual || basePack.visual.kind !== 'procedural-2d-core') throw new TypeError('basePack must provide a procedural-2d-core renderer');
  if (profile.basePackId !== basePack.id) throw new TypeError(`profile expects ${profile.basePackId}`);

  const pack = {
    schemaVersion: basePack.schemaVersion,
    id: profile.id,
    version: profile.version,
    status: profile.status,
    provenance: {
      ...clone(profile.provenance),
      upstreamCommit: basePack.provenance.upstreamCommit,
      supportedBases: clone(basePack.provenance.supportedBases ?? [])
    },
    constraints: clone(basePack.constraints),
    visual: {
      ...clone(basePack.visual),
      palette: clone(profile.palette)
    },
    identity: clone(profile.identity),
    presentation: clone(profile.presentation)
  };

  delete pack.fingerprint;
  delete pack.visual.fingerprint;
  return pack;
}

export function describeContentPackFamily(basePack, derivedPack, profile = MOONHARBOR_CORE_PROFILE) {
  return {
    schemaVersion: profile.schemaVersion,
    id: profile.id,
    version: profile.version,
    relation: profile.relation,
    base: { id: basePack.id, version: basePack.version, fingerprint: basePack.fingerprint ?? null },
    derived: { id: derivedPack.id, version: derivedPack.version, fingerprint: derivedPack.fingerprint ?? null },
    renderer: {
      sharedId: basePack.visual.id,
      baseFingerprint: basePack.visual.fingerprint ?? null,
      derivedFingerprint: derivedPack.visual.fingerprint ?? null
    },
    changes: ['palette', 'identity.names', 'identity.roles', 'presentation', 'provenance'],
    preserved: ['constraints', 'renderer structure', 'features', 'coverage', 'animation protocol', 'runtime adapter']
  };
}
