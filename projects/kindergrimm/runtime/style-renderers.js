import {
  MOSSLIGHT_CORE_RENDERER_ID,
  MOSSLIGHT_CORE_MEDIA_ID,
  MOSSLIGHT_CORE_FEATURES,
  MOSSLIGHT_CORE_COVERAGE,
  mosslightCoreVisualRecord,
  buildMosslightCoreCharacter
} from './mosslight-core.js';
import {
  MOONHARBOR_INKCUT_RENDERER_ID,
  MOONHARBOR_INKCUT_MEDIA_ID,
  MOONHARBOR_INKCUT_FEATURES,
  MOONHARBOR_INKCUT_COVERAGE,
  moonharborInkcutVisualRecord,
  buildMoonharborInkcutCharacter
} from './moonharbor-inkcut.js';
import {
  SUNPATCH_FELT_RENDERER_ID,
  SUNPATCH_FELT_MEDIA_ID,
  SUNPATCH_FELT_FEATURES,
  SUNPATCH_FELT_COVERAGE,
  sunpatchFeltVisualRecord,
  buildSunpatchFeltCharacter
} from './sunpatch-felt.js';

export const STYLE_RENDERER_REGISTRY_SCHEMA = 'kindergrimm-style-renderer-registry/0.1';

function definition(value) {
  return Object.freeze({
    id: value.id,
    mediaId: value.mediaId,
    runtimeModule: value.runtimeModule,
    representation: 'local-authored-procedural-2d',
    features: Object.freeze(Array.from(value.features)),
    coverage: Object.freeze(Object.fromEntries(Object.entries(value.coverage).map(function (entry) {
      return [entry[0], Object.freeze(Array.from(entry[1]))];
    }))),
    visualRecord: value.visualRecord,
    buildCharacter: value.buildCharacter
  });
}

const STYLE_RENDERERS = Object.freeze([
  definition({
    id: MOSSLIGHT_CORE_RENDERER_ID,
    mediaId: MOSSLIGHT_CORE_MEDIA_ID,
    runtimeModule: 'runtime/mosslight-core.js',
    features: MOSSLIGHT_CORE_FEATURES,
    coverage: MOSSLIGHT_CORE_COVERAGE,
    visualRecord: mosslightCoreVisualRecord,
    buildCharacter: buildMosslightCoreCharacter
  }),
  definition({
    id: MOONHARBOR_INKCUT_RENDERER_ID,
    mediaId: MOONHARBOR_INKCUT_MEDIA_ID,
    runtimeModule: 'runtime/moonharbor-inkcut.js',
    features: MOONHARBOR_INKCUT_FEATURES,
    coverage: MOONHARBOR_INKCUT_COVERAGE,
    visualRecord: moonharborInkcutVisualRecord,
    buildCharacter: buildMoonharborInkcutCharacter
  }),
  definition({
    id: SUNPATCH_FELT_RENDERER_ID,
    mediaId: SUNPATCH_FELT_MEDIA_ID,
    runtimeModule: 'runtime/sunpatch-felt.js',
    features: SUNPATCH_FELT_FEATURES,
    coverage: SUNPATCH_FELT_COVERAGE,
    visualRecord: sunpatchFeltVisualRecord,
    buildCharacter: buildSunpatchFeltCharacter
  })
]);

const STYLE_RENDERER_BY_ID = new Map(STYLE_RENDERERS.map(function (renderer) {
  return [renderer.id, renderer];
}));

export function listStyleRenderers() {
  return STYLE_RENDERERS.slice();
}

export function getStyleRenderer(value) {
  const id = typeof value === 'string' ? value : value && value.id;
  return STYLE_RENDERER_BY_ID.get(id) || null;
}

export function hasStyleRenderer(value) {
  return Boolean(getStyleRenderer(value));
}

export function styleVisualRecord(recipe, rendererDescriptor) {
  const renderer = getStyleRenderer(rendererDescriptor);
  if (!renderer) return null;
  return renderer.visualRecord(recipe, rendererDescriptor);
}

export function buildStyleCharacter(recipe, rendererDescriptor) {
  const renderer = getStyleRenderer(rendererDescriptor);
  if (!renderer) throw new Error('Unknown Style Renderer: ' + (rendererDescriptor && rendererDescriptor.id || rendererDescriptor || 'missing'));
  return renderer.buildCharacter(recipe, rendererDescriptor);
}

export function styleRendererCapability(value) {
  const renderer = getStyleRenderer(value);
  if (!renderer) return null;
  return Object.freeze({
    schemaVersion: STYLE_RENDERER_REGISTRY_SCHEMA,
    id: renderer.id,
    mediaId: renderer.mediaId,
    runtimeModule: renderer.runtimeModule,
    representation: renderer.representation,
    features: renderer.features,
    coverage: renderer.coverage
  });
}
