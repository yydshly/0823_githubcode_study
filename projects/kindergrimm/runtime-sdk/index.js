export const RUNTIME_SDK_VERSION = '0.1.0';
export const RUNTIME_SDK_SCHEMA = 'kindergrimm-runtime-sdk/0.1';

export { ASSET_CACHE_SCHEMA, assetCacheKey, createAssetCache } from './asset-cache.js';
export { ACTOR_STATE_SCHEMA, ACTOR_STATES, createActorState } from './state-hooks.js';
export { RUNTIME_DIAGNOSTICS_SCHEMA, createRuntimeDiagnostics } from './diagnostics.js';
export { RUNTIME_SOURCE_SCHEMA, loadManifest, loadReleaseCandidate, loadRuntimeSource } from './bundle-loader.js';
export { RUNTIME_SESSION_SCHEMA, createRuntimeSession } from './runtime-session.js';
