import { z } from 'zod';
import { researchEvidenceSchema } from './motionsites-research.ts';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const researchTrackStatusSchema = z.enum(['active', 'completed', 'queued', 'blocked']);
export type ResearchTrackStatus = z.infer<typeof researchTrackStatusSchema>;

export const researchSourceFamilySchema = z.enum([
  'motionsites',
  'local-html',
  'public-web',
  'github-source',
  'kage-runtime'
]);
export type ResearchSourceFamily = z.infer<typeof researchSourceFamilySchema>;

export const researchProgramSourceSchema = z.object({
  id: safeId,
  family: researchSourceFamilySchema,
  label: z.string().min(3),
  evidenceLevel: researchEvidenceSchema,
  role: z.string().min(8)
}).strict();

export const researchTrackSchema = z.object({
  id: safeId,
  order: z.number().int().min(1),
  status: researchTrackStatusSchema,
  title: z.string().min(3),
  thesis: z.string().min(12),
  modelDecisionGap: z.string().min(12),
  generationValue: z.string().min(12),
  targetCapabilityId: safeId,
  currentEvidence: researchEvidenceSchema,
  targetEvidence: z.literal('E4'),
  sources: z.array(researchProgramSourceSchema).min(2).max(5),
  nextEvidence: z.array(z.string().min(8)).min(2).max(5),
  promotionGates: z.array(z.string().min(8)).min(4).max(7),
  stopConditions: z.array(z.string().min(8)).min(2).max(5),
  timeboxDays: z.number().int().min(1).max(10)
}).strict();

export type ResearchTrack = z.infer<typeof researchTrackSchema>;

export const researchProgramSchema = z.object({
  id: safeId,
  northStar: z.string().min(20),
  stageGoal: z.string().min(20),
  operatingRule: z.string().min(20),
  tracks: z.array(researchTrackSchema).min(1)
}).strict().superRefine((program, context) => {
  const activeCount = program.tracks.filter((track) => track.status === 'active').length;
  if (activeCount > 1) {
    context.addIssue({
      code: 'custom',
      path: ['tracks'],
      message: `研究计划最多只能有一个 active 方向，当前为 ${activeCount} 个。`
    });
  }

  const orders = program.tracks.map((track) => track.order);
  if (new Set(orders).size !== orders.length) {
    context.addIssue({ code: 'custom', path: ['tracks'], message: '研究方向的 order 不能重复。' });
  }
});

export type ResearchProgram = z.infer<typeof researchProgramSchema>;

export const v2ResearchProgram: ResearchProgram = researchProgramSchema.parse({
  id: 'goal-driven-v2',
  northStar: '用户只需描述想法，系统就能生成具有明确叙事、合适素材与高质量交互的专属网页。',
  stageGoal: '先用优秀真实产品与开源实现校准“什么是好”，再让通过证据门的原理进入效果优先创作。',
  operatingRule: '同一时间只推进一个研究方向；首轮固定六类产品研究和六个源码样本，完成证据卡后停止扩张。',
  tracks: [
    {
      id: 'interaction-as-information',
      order: 1,
      status: 'completed',
      title: '交互即信息',
      thesis: '鼠标、触摸和滚动不只制造动效，而要揭示层级、因果、比较或探索路径。',
      modelDecisionGap: '模型目前会添加大量装饰性跟随动画，却不能稳定判断交互为何存在、何时出现以及如何跨输入方式降级。',
      generationValue: '让生成器按内容关系选择交互机制，并自动带上触摸、键盘、减少动态效果和性能边界。',
      targetCapabilityId: 'semantic-responsive-interaction',
      currentEvidence: 'E4',
      targetEvidence: 'E4',
      sources: [
        {
          id: 'motionsites-interactive-discovery',
          family: 'motionsites',
          label: 'MotionSites · Interactive Discovery',
          evidenceLevel: 'E2',
          role: '提供交互式发现与指针反馈的公开案例线索。'
        },
        {
          id: 'local-nike-spotlight',
          family: 'local-html',
          label: '本地研究 · Nike Spotlight',
          evidenceLevel: 'E3',
          role: '提供聚光揭示、遮罩与内容状态联动的可读实现。'
        },
        {
          id: 'kage-scroll-scrub',
          family: 'kage-runtime',
          label: 'Kage · Scroll Scrub Media',
          evidenceLevel: 'E4',
          role: '提供滚动时间映射、移动端和减少动态效果的已验证基线。'
        },
        {
          id: 'kage-semantic-interaction',
          family: 'kage-runtime',
          label: 'Kage · Tideline Testimony',
          evidenceLevel: 'E4',
          role: '提供指针、触摸、键盘、滚动与无 WebGL 回退的语义交互运行证据。'
        }
      ],
      nextEvidence: [
        '能力选择、拒绝条件、输入语义和降级要求已经进入 V2 构建契约。',
        '后续仅在真实 brief 命中时按需复用，不再为证明能力单独执行自由生成对照。'
      ],
      promotionGates: [
        '交互必须改变信息理解，而不只是改变光影或位置。',
        '指针、触摸和键盘都能完成同一个核心动作。',
        '减少动态效果时保留内容顺序与操作结果。',
        '桌面和移动端均无横向溢出或输入死区。',
        '原型通过类型检查、单元测试和浏览器验收。'
      ],
      stopConditions: [
        '如果移除交互后信息理解不变，则该机制不进入能力库。',
        '如果核心体验只能依赖 hover 或高性能设备，则停止晋级并记录失败原因。'
      ],
      timeboxDays: 2
    },
    {
      id: 'real-spatial-object',
      order: 2,
      status: 'queued',
      title: '真实空间对象',
      thesis: '只有当产品形体、材质和空间关系是叙事核心时，才使用真实 3D 对象与镜头路线。',
      modelDecisionGap: '模型容易用基础几何体假装产品，或在没有可靠资产时承诺复杂拆解，导致最终效果与描述不一致。',
      generationValue: '让生成器先判断资产可信度，再选择 GLB、分层图像、视频或程序化替代路线。',
      targetCapabilityId: 'asset-aware-spatial-reveal',
      currentEvidence: 'E2',
      targetEvidence: 'E4',
      sources: [
        {
          id: 'threejs-iris-articulated-reveal',
          family: 'github-source',
          label: 'GitHub · IRIS 程序化关节主体',
          evidenceLevel: 'E4',
          role: '提供无外部模型时，以程序化部件、滚动错峰和统一视觉时间线完成抽象结构揭示的运行证据。'
        },
        {
          id: 'motionsites-pulse-3d',
          family: 'motionsites',
          label: 'MotionSites · Pulse 3D',
          evidenceLevel: 'E2',
          role: '提供空间产品叙事的外观与页面结构线索。'
        },
        {
          id: 'local-aero-x',
          family: 'local-html',
          label: '本地研究 · Aero X Premium 3D',
          evidenceLevel: 'E3',
          role: '提供产品镜头、编辑排版与滚动章节的本地实现证据。'
        },
        {
          id: 'kage-r36-asset',
          family: 'kage-runtime',
          label: 'Kage V1 · R36 资产融合案例',
          evidenceLevel: 'E4',
          role: '提供生成素材与网页场景融合的成功和失败记录。'
        }
      ],
      nextEvidence: [
        '将“真实资产路线”和“程序化抽象主体路线”作为互斥选择写入生成器，而不是互相冒充。',
        '取得许可明确且结构可用的 L3 级 GLB 产品资产，补足真实商品路线。',
        '验证三个滚动状态、移动回退和资产加载失败路径。'
      ],
      promotionGates: [
        '真实商品存在许可、来源和结构均明确的 L3 级或更高资产；抽象主体则必须能由部件关系直接解释主题。',
        '镜头和对象变化直接解释产品能力或内部关系。',
        '移动端具有不依赖 WebGL 高负载的有效回退。',
        '资产加载失败不会破坏正文与主要行动入口。',
        '原型通过类型检查、性能预算和浏览器验收。'
      ],
      stopConditions: [
        '没有可信产品资产时禁止用基础几何体伪装最终产品。',
        '如果 2D 分层或视频能以更低成本表达同一关系，则停止强制 3D 路线。',
        '如果程序化形态只是装饰且不能解释主题，则不选择关节主体能力。'
      ],
      timeboxDays: 3
    },
    {
      id: 'identity-and-proof',
      order: 3,
      status: 'completed',
      title: '身份与证据',
      thesis: '页面气质必须来自品牌语义、排版、素材和证明结构，而不是套用常见科技风。',
      modelDecisionGap: '模型容易把不同主题收敛为相同暗色、紫色光效和大标题，且缺少让主张可信的内容证据。',
      generationValue: '让生成器根据对象、受众和可信度需求选择视觉语言、证明模块与行动节奏。',
      targetCapabilityId: 'identity-through-evidence',
      currentEvidence: 'E4',
      targetEvidence: 'E4',
      sources: [
        {
          id: 'local-harvest-stats',
          family: 'local-html',
          label: '本地研究 · Harvest Stats',
          evidenceLevel: 'E3',
          role: '提供数据证明、品牌语气和编辑节奏的本地实现。'
        },
        {
          id: 'local-sports-ai',
          family: 'local-html',
          label: '本地研究 · Sports AI',
          evidenceLevel: 'E3',
          role: '提供产品主张、演示内容与行动入口的结构样本。'
        },
        {
          id: 'motionsites-immersive-studio',
          family: 'motionsites',
          label: 'MotionSites · Immersive Studio',
          evidenceLevel: 'E2',
          role: '提供高识别度品牌首屏与作品证明的案例线索。'
        },
        {
          id: 'kage-identity-evidence',
          family: 'kage-runtime',
          label: 'Kage · Identity Through Evidence',
          evidenceLevel: 'E4',
          role: '提供来源、过程、表现三态，以及桌面、移动、键盘、减少动态效果和图片降级的运行证据。'
        }
      ],
      nextEvidence: [
        '能力选择、拒绝条件、输入输出和图片降级要求已经进入 V2 构建契约。',
        '后续只在真实 brief 同时命中身份与证据需求时复用，不再扩张当前研究单元。'
      ],
      promotionGates: [
        '视觉语言能从用户描述中的对象、受众和情绪得到解释。',
        '每项核心主张至少具有一个可见证据或体验支撑。',
        '排版、素材和动效属于同一语义方向。',
        '去除品牌名称后仍能区分于另外两个测试方向。',
        '原型通过内容、可读性和浏览器验收。'
      ],
      stopConditions: [
        '如果结果再次退化为通用暗色科技风，则停止晋级并回查选择依据。',
        '如果视觉身份依赖未经授权的品牌资产，则只保留原理记录。'
      ],
      timeboxDays: 2
    },
    {
      id: 'external-excellence-canon',
      order: 4,
      status: 'active',
      title: '外部优秀认知基线',
      thesis: '先研究主题命题、感知转变、互动因果和媒介职责，再决定页面结构与技术路线。',
      modelDecisionGap: '当前生成器主要依赖内部案例与关键词子串，无法稳定区分优秀成品、窄视觉实验和通用机制库。',
      generationValue: '让模型在首稿前获得有来源的正向原则，同时阻止它把视觉皮肤、机制库或技术标签误当成优秀答案。',
      targetCapabilityId: 'effect-first-reference-synthesis',
      currentEvidence: 'E3',
      targetEvidence: 'E4',
      sources: [
        {
          id: 'external-live-products',
          family: 'public-web',
          label: '六类真实产品体验',
          evidenceLevel: 'E3',
          role: '提供首帧记忆、体验转变、互动因果和媒介职责的官方来源证据。'
        },
        {
          id: 'external-github-implementations',
          family: 'github-source',
          label: '六个固定版本开源实现',
          evidenceLevel: 'E3',
          role: '提供空间、滚动、材质、声音、视频和排版机制的源码证据。'
        },
        {
          id: 'existing-motionsites-inventory',
          family: 'motionsites',
          label: 'MotionSites 历史结构样本',
          evidenceLevel: 'E2',
          role: '只作为候选外观与结构线索，不再从目录截图推断实现能力。'
        },
        {
          id: 'existing-local-exemplars',
          family: 'local-html',
          label: '本地历史优秀作品研究',
          evidenceLevel: 'E3',
          role: '补充遮罩、媒体故事板、滚动堆叠与产品微电影的历史总结。'
        },
        {
          id: 'existing-kage-runtime',
          family: 'kage-runtime',
          label: 'Kage 最终运行证据',
          evidenceLevel: 'E4',
          role: '验证外部原理在当前运行时、移动端、降级和真实性边界内是否成立。'
        }
      ],
      nextEvidence: [
        '为六类产品保存开场、核心变化和移动端状态，并绑定来源与观察时间。',
        '为六个开源实现固定 revision、许可、关键源码位置和不得复制的视觉身份。',
        '只把通过本地运行与适用性检查的原则晋级为 ReferenceEvidencePack。'
      ],
      promotionGates: [
        '完整体验、窄视觉实验和机制基础设施必须分层，不能共用优秀视觉标签。',
        '每张证据卡必须说明体验承诺、感知转变、互动动词和媒介职责。',
        '确认事实与实现推测必须分别保存，推测不得进入作者事实输入。',
        '源码必须记录固定 revision、许可和资产权利风险。',
        '晋级原则必须脱离原作品的颜色、构图、模型和品牌身份仍然成立。',
        '本地浏览器验证必须覆盖核心效果、390px 状态和适用降级。'
      ],
      stopConditions: [
        '六类产品与六个源码样本完成证据卡后停止扩张，不以案例数量作为进度。',
        '无法获得官方来源、源码事实或可复核运行状态的案例保持 research-only。',
        '研究不能直接改善生成前决策时，不继续为其制作展示页面。'
      ],
      timeboxDays: 2
    }
  ]
});

export function getActiveResearchTrack(program: ResearchProgram = v2ResearchProgram): ResearchTrack | null {
  return program.tracks.find((track) => track.status === 'active') ?? null;
}

export function getResearchProgramSummary(program: ResearchProgram = v2ResearchProgram) {
  const active = getActiveResearchTrack(program);
  return {
    totalTracks: program.tracks.length,
    activeTrackId: active?.id ?? null,
    activeTargetCapabilityId: active?.targetCapabilityId ?? null,
    completedTrackIds: program.tracks.filter((track) => track.status === 'completed').map((track) => track.id),
    sourceFamilies: new Set(program.tracks.flatMap((track) => track.sources.map((source) => source.family))).size,
    maxRepresentativeSources: Math.max(...program.tracks.map((track) => track.sources.length))
  } as const;
}
