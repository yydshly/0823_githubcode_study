import type { CapabilityCatalog, CapabilityKind } from './schema.ts';

export type CapabilityGapKind = CapabilityKind | 'asset';
export type CapabilityGapPriority = 'explore' | 'important' | 'essential';

export interface CapabilityGap {
  id: string;
  kind: CapabilityGapKind;
  title: string;
  need: string;
  evidence: readonly string[];
  tags: readonly string[];
  priority: CapabilityGapPriority;
  suggestedId: string;
}

export interface CapabilityProposal {
  id: string;
  status: 'review-required';
  targetCapabilityId: string;
  kind: CapabilityGapKind;
  title: string;
  summary: string;
  evidence: readonly string[];
  priority: CapabilityGapPriority;
  risk: 'medium' | 'high';
  contract: readonly string[];
  qualityGates: readonly string[];
  recommendedFiles: readonly string[];
  fallback: string;
}

interface GapSignal extends Omit<CapabilityGap, 'id' | 'evidence'> {
  terms: readonly string[];
}

const baselineSignals: readonly GapSignal[] = [
  {
    kind: 'asset', title: '真实产品三维资产', suggestedId: 'product-model', priority: 'essential',
    need: '需要可检查比例、材质和内部结构的真实 GLB/glTF 产品资产。', tags: ['gltf', 'product', 'asset'],
    terms: ['glb', 'gltf', '真实3d模型', '真实 3d 模型', '产品拆解', '内部结构']
  },
  {
    kind: 'driver', title: '音频响应驱动', suggestedId: 'audio-reactive', priority: 'important',
    need: '需要把音量、频段或节拍转换为稳定的体验进度和场景参数。', tags: ['audio', 'frequency', 'timeline'],
    terms: ['音频驱动', '随音乐', '声控', '声音可视化', 'audio reactive']
  },
  {
    kind: 'driver', title: '物理交互驱动', suggestedId: 'physics-interaction', priority: 'important',
    need: '需要碰撞、重力或刚体状态成为可重放的交互信号。', tags: ['physics', 'collision', 'interaction'],
    terms: ['物理碰撞', '重力交互', '可推动', '刚体', 'physics']
  },
  {
    kind: 'asset', title: '角色与表演资产', suggestedId: 'character-avatar', priority: 'essential',
    need: '需要角色模型、表情、注视或口型同步资产管线。', tags: ['avatar', 'character', 'animation'],
    terms: ['数字人', '虚拟人', '角色表情', '口型同步', 'avatar']
  },
  {
    kind: 'scene', title: '体积介质世界', suggestedId: 'volumetric-world', priority: 'important',
    need: '需要真实体积感的光、云或烟雾，而不是普通平面透明层。', tags: ['volumetric', 'fog', 'light'],
    terms: ['体积光', '体积云', '烟雾模拟', 'volumetric']
  },
  {
    kind: 'output', title: '自动成片输出', suggestedId: 'film-export', priority: 'explore',
    need: '需要把体验轨道转成可录制时间线，并组合字幕、音频和 MP4 输出。', tags: ['recording', 'captions', 'mp4'],
    terms: ['录制视频', '导出mp4', '自动成片', '配音', '字幕']
  }
];

export function detectBaselineCapabilityGaps(text: string): CapabilityGap[] {
  const normalized = text.toLowerCase();
  return baselineSignals.flatMap((signal) => {
    const evidence = signal.terms.filter((term) => normalized.includes(term.toLowerCase()));
    if (!evidence.length) return [];
    const { terms: _terms, ...gap } = signal;
    return [{ ...gap, id: `gap-${gap.suggestedId}`, evidence }];
  }).slice(0, 3);
}

export function planCapabilityProposals(gaps: readonly CapabilityGap[], catalog: CapabilityCatalog): CapabilityProposal[] {
  return gaps.flatMap((gap) => {
    const targetCapabilityId = `${gap.kind}:${gap.suggestedId}`;
    if (catalog.capabilities[targetCapabilityId]) return [];
    const implementationKind = gap.kind === 'asset' ? 'asset-pipeline' : `${gap.kind}-plugin`;
    return [{
      id: `proposal-${gap.suggestedId}`,
      status: 'review-required' as const,
      targetCapabilityId,
      kind: gap.kind,
      title: gap.title,
      summary: `${gap.need} 先形成 ${implementationKind} 证据，再允许模型在后续方向中选择。`,
      evidence: gap.evidence,
      priority: gap.priority,
      risk: gap.kind === 'asset' || gap.kind === 'driver' || gap.kind === 'output' ? 'high' as const : 'medium' as const,
      contract: contractFor(gap.kind, gap.suggestedId),
      qualityGates: gatesFor(gap.kind),
      recommendedFiles: filesFor(gap.kind, gap.suggestedId),
      fallback: '提案未通过前继续使用最接近的已注册能力，并在界面中明确标记差距。'
    }];
  });
}

function contractFor(kind: CapabilityGapKind, id: string): string[] {
  if (kind === 'asset') return ['声明来源、许可、比例与单位', '提供加载失败和低带宽替代资产', '不改变 ScenePlugin 生命周期契约'];
  if (kind === 'driver') return ['只输出节点 ID、局部进度与全局进度', '输入可取消、可重置、可确定性测试', '不直接操作相机或场景对象'];
  if (kind === 'output') return ['消费已存在的导演时间线', '导出过程可取消并报告进度', '交互页面和发布文件彼此独立'];
  return [`注册为 ${kind}:${id}`, '实现 initialize / update / setQuality / snapshot / dispose', '只通过 RuntimeFrame 与主题 token 接收状态'];
}

function gatesFor(kind: CapabilityGapKind): string[] {
  const common = ['契约与单元测试', '语义 DOM 回退', 'reduced-motion 行为', '真实浏览器视觉评审'];
  if (kind === 'asset') return [...common, '许可与来源审计', '比例/材质/压缩质量门禁', '资产体积预算'];
  if (kind === 'output') return [...common, '外部播放器兼容性', '字幕与音频同步', 'H.264/AAC MP4 验证'];
  return [...common, 'high/balanced/low 画质档', 'draw call 与帧时间预算', 'WebGL context 恢复与资源释放'];
}

function filesFor(kind: CapabilityGapKind, id: string): string[] {
  if (kind === 'asset') return [`assets/${id}/`, `docs/assets/${id}-brief.md`, `tests/${id}-asset.test.ts`];
  if (kind === 'output') return [`src/outputs/${id}.ts`, `tests/${id}.test.ts`, `docs/${id}.md`];
  return [`src/plugins/${id}-${kind}.ts`, `tests/${id}.test.ts`, `docs/${id}.md`];
}

