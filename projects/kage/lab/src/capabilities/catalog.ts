import type { CapabilityCatalog, CapabilityDescriptor } from './schema.ts';

const descriptor = (value: CapabilityDescriptor): CapabilityDescriptor => value;

export const capabilityCatalog: CapabilityCatalog = {
  version: 1,
  capabilities: {
    'scene:signal-world': descriptor({
      id: 'scene:signal-world', kind: 'scene', label: 'Signal World', summary: '具象锥体、环轨、粒子和地面组成的空间信号场。',
      tags: ['spatial', 'technical', 'archive', 'product'], cost: { gpu: 3, cpu: 3, memory: 2, drawCalls: 8 }, requires: ['webgl', 'motion'],
      supports: { qualities: ['high', 'balanced', 'low'], reducedMotion: true, semanticFallback: true }
    }),
    'effect:signal-field': descriptor({
      id: 'effect:signal-field', kind: 'effect', label: 'Signal Field', summary: '实例化信标、粒子、轨道与密度变化。',
      tags: ['particles', 'instancing', 'geometry'], cost: { gpu: 2, cpu: 3, memory: 2, drawCalls: 7 }, requires: ['webgl', 'motion'],
      supports: { qualities: ['high', 'balanced', 'low'], reducedMotion: true, semanticFallback: true }
    }),
    'scene:chromatic-tide': descriptor({
      id: 'scene:chromatic-tide', kind: 'scene', label: 'Chromatic Tide', summary: 'Shader 驱动的柔性光幕、层叠色场与漂浮棱镜。',
      tags: ['shader', 'fluid', 'fashion', 'editorial', 'dream'], cost: { gpu: 4, cpu: 1, memory: 2, drawCalls: 6 }, requires: ['webgl', 'motion'],
      supports: { qualities: ['high', 'balanced', 'low'], reducedMotion: true, semanticFallback: true }
    }),
    'scene:composed-world': descriptor({
      id: 'scene:composed-world', kind: 'scene', label: 'Composed World', summary: '将 EffectSpec 编译成主体、场域、氛围和运动组成的可执行场景语法。',
      tags: ['effect-spec', 'procedural', 'instancing', 'generated'], cost: { gpu: 3, cpu: 2, memory: 2, drawCalls: 7 }, requires: ['webgl', 'motion'],
      supports: { qualities: ['high', 'balanced', 'low'], reducedMotion: true, semanticFallback: true }
    }),
    'scene:resonance-flagship': descriptor({
      id: 'scene:resonance-flagship', kind: 'scene', label: 'Resonance Flagship', summary: '模型生成的彩色与深度资产，经由 shader 位移、空间视差和克制辉光形成旗舰产品现场。',
      tags: ['asset-driven', 'depth-map', 'shader', 'cinematic'], cost: { gpu: 4, cpu: 2, memory: 3, drawCalls: 10 }, requires: ['webgl', 'motion'],
      supports: { qualities: ['high', 'balanced', 'low'], reducedMotion: true, semanticFallback: true }
    }),
    'scene:tidal-archive': descriptor({
      id: 'scene:tidal-archive', kind: 'scene', label: 'Tidal Archive', summary: '模型生成水下记忆环境与深度图，经 shader 位移、玻璃档案片、关系线和水体粒子形成叙事空间。',
      tags: ['asset-driven', 'depth-map', 'archive', 'environment', 'cinematic'], cost: { gpu: 4, cpu: 2, memory: 3, drawCalls: 15 }, requires: ['webgl', 'motion'],
      supports: { qualities: ['high', 'balanced', 'low'], reducedMotion: true, semanticFallback: true }
    }),
    'driver:scroll': descriptor({
      id: 'driver:scroll', kind: 'driver', label: 'Scroll Driver', summary: '将 DOM 锚点转换为节点、局部进度和全局进度。',
      tags: ['scroll', 'dom', 'timeline'], cost: { gpu: 1, cpu: 1, memory: 1, drawCalls: 0 },
      supports: { qualities: ['high', 'balanced', 'low'], reducedMotion: true, semanticFallback: true }
    }),
    'output:semantic-dom': descriptor({
      id: 'output:semantic-dom', kind: 'output', label: 'Semantic DOM', summary: '可阅读、可选择、可索引的正文与无 WebGL 回退。',
      tags: ['accessibility', 'fallback', 'content'], cost: { gpu: 1, cpu: 1, memory: 1, drawCalls: 0 },
      supports: { qualities: ['high', 'balanced', 'low'], reducedMotion: true, semanticFallback: true }
    })
  }
};
