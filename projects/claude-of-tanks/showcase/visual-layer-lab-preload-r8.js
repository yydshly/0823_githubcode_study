const params = new URLSearchParams(location.search);
const controller = window.__COT_CAPABILITY_SHOWCASE;
const isCanonicalLab = params.get('showcase') === 'capabilities' && params.get('lab') === 'layers';

if (!controller || !isCanonicalLab) {
  throw new Error('R8 visual layer preload requires the canonical capability Lab route');
}

const source = structuredClone(controller.scene);
const readableEffectIds = new Set([
  'fx-exhaust',
  'fx-dust-red',
  'fx-flash',
  'fx-fire',
  'fx-tracer',
  'fx-pen',
  'fx-ricochet',
  'fx-scar',
  'fx-small-boom',
  'fx-medium-boom',
  'fx-barrage',
  'fx-detrack',
  'fx-smoke',
  'fx-burning',
  'fx-firing-still',
  'fx-explosion-still',
]);
const visibleTiming = new Map([
  ['fx-exhaust', 14200],
  ['fx-dust-red', 14400],
  ['fx-flash', 14720],
  ['fx-fire', 14780],
  ['fx-tracer', 14840],
  ['fx-pen', 14880],
  ['fx-ricochet', 14910],
  ['fx-scar', 14930],
  ['fx-explosion-still', 14960],
]);
const requiredEffectTypes = [
  'armor_scar',
  'barrage',
  'burning',
  'detrack',
  'dust',
  'engine_smoke',
  'exhaust',
  'explosion',
  'explosion_moment',
  'fire',
  'firing_moment',
  'impact',
  'muzzle_flash',
  'sparks',
  'tracer',
];
const heroX = 30;
const heroZ = -82;
const offsetX = 15;
const offsetZ = -4;

function offsetPoint(point) {
  if (!Array.isArray(point)) return point;
  const next = [...point];
  next[0] += offsetX;
  if (next.length >= 3) next[2] += offsetZ;
  else next[1] += offsetZ;
  return next;
}

const selectedEffects = source.effects.filter((effect) => readableEffectIds.has(effect.id));
if (selectedEffects.length !== readableEffectIds.size) {
  const found = new Set(selectedEffects.map((effect) => effect.id));
  const missing = [...readableEffectIds].filter((id) => !found.has(id));
  throw new Error(`R8 Lab scene is missing source effects: ${missing.join(', ')}`);
}

const scene = {
  ...source,
  actors: source.actors
    .filter((actor) => actor.name === 'red-lead')
    .map((actor) => ({ ...actor, pos: [heroX, heroZ], facingDeg: 0 })),
  effects: structuredClone(selectedEffects).map((effect) => {
    const next = {
      ...effect,
      ...(effect.actor ? { actor: 'red-lead' } : {}),
      ...(effect.at ? { at: offsetPoint(effect.at) } : {}),
      ...(effect.from ? { from: offsetPoint(effect.from) } : {}),
      ...(effect.to ? { to: offsetPoint(effect.to) } : {}),
    };
    if (visibleTiming.has(next.id)) next.tMs = visibleTiming.get(next.id);
    return next;
  }),
  storyboard: {
    ...source.storyboard,
    actorTracks: source.storyboard.actorTracks
      .filter((track) => track.actor === 'red-lead')
      .map((track) => ({
        ...track,
        keys: track.keys.map((key) => ({ ...key, pos: [heroX, heroZ], facingDeg: 0 })),
      })),
  },
};

const originalPlay = controller.play.bind(controller);
controller.scene = scene;
controller.play = function keepLayerLabPaused() {
  this.studio?.pause();
  return false;
};
controller.reload = async function reloadLayerLabScene() {
  this.status = 'loading';
  try {
    await this.studio.load(scene);
    const board = structuredClone(scene.storyboard);
    const toWorld = (point) => {
      this.studio.setCamera({ pos: point, groundRel: true });
      return this.studio.getCamera().pos;
    };
    for (const shot of board.shots) {
      shot.pos = toWorld(shot.pos);
      shot.lookAt = toWorld(shot.lookAt);
    }
    this.studio.setStoryboard(board);
    this.studio.setRailVisible(false);
    this.studio.seek(0);
    this.status = 'ready';
    this.ui?.ready();
    return this.audit();
  } catch (error) {
    this.status = 'error';
    throw error;
  }
};
controller.labPlayback = { locked: true, originalPlay };
controller.labScene = {
  version: 8,
  mode: 'single-hero-readable-fx',
  actorCount: scene.actors.length,
  effectCount: scene.effects.length,
  effectTypes: [...new Set(scene.effects.map((effect) => effect.type))].sort(),
  requiredEffectTypes,
  heroPosition: [heroX, heroZ],
  sampledTiltDeg: 0.254,
  originalFullCounts: {
    actors: source.actors.length,
    effects: source.effects.length,
    effectTypes: new Set(source.effects.map((effect) => effect.type)).size,
  },
};

export const VISUAL_LAYER_LAB_PRELOAD_VERSION = 8;
