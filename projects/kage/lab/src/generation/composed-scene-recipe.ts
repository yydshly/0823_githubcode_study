import type { ComposedSceneRecipe } from '../experience/schema';
import type { EffectSpec } from './effect-spec';

const includesAny = (value: string, terms: readonly string[]): boolean => terms.some((term) => value.includes(term));

export function compileComposedSceneRecipe(effectSpec: EffectSpec): ComposedSceneRecipe {
  const vocabulary = [
    effectSpec.title,
    effectSpec.direction.spatialMetaphor,
    ...effectSpec.direction.visualGrammar,
    ...effectSpec.composition.layers.flatMap((layer) => [layer.purpose, layer.visibleOutcome, ...layer.techniques])
  ].join(' ').toLowerCase();
  const paceScale = effectSpec.motion.pace === 'dynamic' ? 1 : effectSpec.motion.pace === 'measured' ? .72 : .46;
  const spatialScale = effectSpec.composition.mode === 'spatial-3d' ? 1 : effectSpec.composition.mode === 'hybrid-2.5d' ? .82 : .68;

  return {
    version: 1,
    sourceEffectSpecId: effectSpec.id,
    hero: {
      form: heroForm(vocabulary),
      material: heroMaterial(vocabulary),
      scale: round(1.05 + spatialScale * .75 + Math.min(4, effectSpec.composition.layers.length) * .08)
    },
    field: {
      form: fieldForm(vocabulary),
      count: Math.round((42 + effectSpec.composition.layers.length * 9) * (.82 + paceScale * .32)),
      radius: round(4.8 + spatialScale * 2.8)
    },
    atmosphere: {
      floor: effectSpec.composition.mode === 'spatial-3d' && !includesAny(vocabulary, ['漂浮', '失重', 'cloud', 'floating']),
      halo: includesAny(vocabulary, ['光', '能量', '信号', '波', 'halo', 'light', 'signal', 'energy', 'audio']),
      fogScale: round(includesAny(vocabulary, ['雾', '梦', '深海', 'fog', 'dream', 'ocean']) ? 1.18 : .72)
    },
    motion: {
      rotation: round(.12 + paceScale * .34),
      pulse: round(.18 + paceScale * .5),
      drift: round(.1 + paceScale * .42),
      pointer: effectSpec.motion.drivers.includes('pointer') ? .72 : .2
    },
    omittedAssetRequirements: effectSpec.assetRequirements.length
  };
}

function heroForm(vocabulary: string): ComposedSceneRecipe['hero']['form'] {
  if (includesAny(vocabulary, ['晶', '冰', '棱镜', 'crystal', 'prism', 'ice'])) return 'crystal';
  if (includesAny(vocabulary, ['编织', '流体', '网络', '声', 'knot', 'fluid', 'network', 'audio'])) return 'knot';
  if (includesAny(vocabulary, ['碑', '塔', '档案', '产品', 'monolith', 'archive', 'product'])) return 'monolith';
  return 'orb';
}

function heroMaterial(vocabulary: string): ComposedSceneRecipe['hero']['material'] {
  if (includesAny(vocabulary, ['玻璃', '折射', '透明', '冰', 'glass', 'refract', 'transparent', 'ice'])) return 'glass';
  if (includesAny(vocabulary, ['金属', '工业', '机械', 'metal', 'industrial', 'machine'])) return 'metal';
  if (includesAny(vocabulary, ['发光', '能量', '信号', '霓虹', 'emissive', 'energy', 'signal', 'neon'])) return 'emissive';
  return 'matte';
}

function fieldForm(vocabulary: string): ComposedSceneRecipe['field']['form'] {
  if (includesAny(vocabulary, ['流', '波', '声音', '丝绸', 'stream', 'wave', 'audio', 'silk'])) return 'stream';
  if (includesAny(vocabulary, ['网格', '系统', '数据', '档案', 'grid', 'system', 'data', 'archive'])) return 'grid';
  if (includesAny(vocabulary, ['星', '粒子', '宇宙', '节点', 'star', 'particle', 'cosmos', 'node'])) return 'constellation';
  return 'rings';
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
