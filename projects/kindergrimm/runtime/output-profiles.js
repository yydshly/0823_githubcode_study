import { contractFingerprint } from './contracts.js';

export const OUTPUT_PROFILE_SCHEMA = 'kindergrimm-output-profile/0.1';
export const OUTPUT_RECORD_SCHEMA = 'kindergrimm-output-record/0.1';

const PROFILES = Object.freeze([
  Object.freeze({
    id: 'transparent-character',
    label: 'Transparent Character',
    role: 'full-body-runtime-art',
    mime: 'image/png',
    width: 1024,
    height: 1024,
    background: 'transparent',
    camera: Object.freeze({ half: 1.34, centerY: -.28 }),
    batch: false
  }),
  Object.freeze({
    id: 'portrait-avatar',
    label: 'Portrait / Avatar',
    role: 'dialogue-and-profile-art',
    mime: 'image/png',
    width: 512,
    height: 512,
    background: 'transparent',
    camera: Object.freeze({ half: .78, centerY: .27 }),
    batch: false
  }),
  Object.freeze({
    id: 'card-catalog',
    label: 'Card / Catalog',
    role: 'review-and-card-art',
    mime: 'image/png',
    width: 768,
    height: 1024,
    background: '#f1e7cf',
    camera: Object.freeze({ half: 1.34, centerY: -.28 }),
    batch: false
  }),
  Object.freeze({
    id: 'sprite-sheet',
    label: 'Sprite Sheet',
    role: 'row-major-batch-atlas',
    mime: 'image/png',
    tileSize: 256,
    background: 'transparent',
    camera: Object.freeze({ half: 1.34, centerY: -.28 }),
    batch: true
  })
]);

const PROFILE_BY_ID = new Map(PROFILES.map(function (profile) { return [profile.id, profile]; }));

export function listOutputProfiles() {
  return PROFILES.slice();
}

export function getOutputProfile(value) {
  const id = typeof value === 'string' ? value : value && value.id;
  return PROFILE_BY_ID.get(id) || PROFILE_BY_ID.get('transparent-character');
}

export function outputProfileRecord(input) {
  const profile = getOutputProfile(input.profileId);
  const payload = {
    schemaVersion: OUTPUT_RECORD_SCHEMA,
    profile: {
      id: profile.id,
      role: profile.role,
      mime: profile.mime,
      width: input.width || profile.width || null,
      height: input.height || profile.height || null,
      tileSize: profile.tileSize || null,
      background: profile.background,
      batch: profile.batch
    },
    identity: {
      assetFingerprint: input.assetFingerprint || null,
      visualFingerprint: input.visualFingerprint || null,
      packFingerprint: input.packFingerprint,
      rendererFingerprint: input.rendererFingerprint || null
    },
    derivation: {
      source: 'deterministic-recipe-render',
      recipeChanged: false,
      runtimeLlmCalls: 0,
      cloudApiCalls: 0
    }
  };
  return Object.freeze(Object.assign({}, payload, { fingerprint: contractFingerprint(payload) }));
}

export function validateOutputProfileRecord(record) {
  const errors = [];
  if (!record || record.schemaVersion !== OUTPUT_RECORD_SCHEMA) errors.push('schemaVersion: expected ' + OUTPUT_RECORD_SCHEMA);
  if (!record || !PROFILE_BY_ID.has(record.profile && record.profile.id)) errors.push('profile.id: unsupported output profile');
  if (!record || !record.identity || typeof record.identity.packFingerprint !== 'string') errors.push('identity.packFingerprint: required');
  if (record && record.derivation && (record.derivation.runtimeLlmCalls !== 0 || record.derivation.cloudApiCalls !== 0)) errors.push('derivation: expected local deterministic render');
  if (record) {
    const payload = {
      schemaVersion: record.schemaVersion,
      profile: record.profile,
      identity: record.identity,
      derivation: record.derivation
    };
    const expected = contractFingerprint(payload);
    if (record.fingerprint !== expected) errors.push('fingerprint: expected ' + expected);
  }
  return { ok: errors.length === 0, errors: errors, record: errors.length ? null : record };
}
