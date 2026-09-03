import { z } from 'zod';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const sharedStateDriveModeSchema = z.enum(['manual', 'scroll', 'demo']);

export const sharedStateDriverAuthoringContractSchema = z.object({
  stateModel: z.literal('single-canonical-state'),
  modes: z.array(sharedStateDriveModeSchema).min(2).max(3),
  demoControl: z.enum(['bounded-play-pause-reset', 'not-requested']),
  scrollMapping: z.enum(['real-scroll-range-to-shared-state', 'not-requested']),
  manualOverride: z.enum(['first-user-input-stops-demo', 'not-applicable']),
  visualMapping: z.literal('subject-scene-and-semantic-results'),
  reducedMotion: z.literal('discrete-semantic-states'),
  mobileFallback: z.literal('direct-controls-remain-complete'),
  markers: z.object({
    root: z.literal('data-signal-shared-driver'),
    demoControl: z.literal('data-signal-demo-control'),
    progress: z.literal('data-signal-driver-progress'),
    modeAttribute: z.literal('data-drive-mode')
  }).strict()
}).strict();

export type SharedStateDriverAuthoringContract = z.infer<typeof sharedStateDriverAuthoringContractSchema>;

export const sharedStateDriverCapabilitySchema = z.object({
  id: safeId,
  evidenceLevel: z.literal('E4'),
  state: z.literal('validated'),
  sourceCaseId: safeId,
  problem: z.string().min(20),
  meaning: z.string().min(20),
  rejectionRules: z.array(z.string().min(12)).min(2).max(4)
}).strict();

export const sharedStateDriverDecisionSchema = z.object({
  selected: z.boolean(),
  capabilityId: safeId.nullable(),
  score: z.number().min(0).max(100),
  requestedModes: z.array(sharedStateDriveModeSchema).max(3),
  matchedSignals: z.array(z.string().min(1)),
  reasons: z.array(z.string().min(3)).min(1),
  blockers: z.array(z.string().min(3)),
  authoringContract: sharedStateDriverAuthoringContractSchema.nullable(),
  evaluatedCapability: sharedStateDriverCapabilitySchema
}).strict();

export type SharedStateDriverDecision = z.infer<typeof sharedStateDriverDecisionSchema>;

export interface SharedStateDriverDecisionInput {
  brief: string;
  primaryInput: 'scroll' | 'pointer' | 'direct-navigation';
  semanticInteractionSelected: boolean;
}

export const sharedStateDriverCapability = sharedStateDriverCapabilitySchema.parse({
  id: 'shared-state-interaction-driver',
  evidenceLevel: 'E4',
  state: 'validated',
  sourceCaseId: 'wind-tunnel-r78',
  problem: '自动演示、滚轮进度和直接控件各自维护状态时，画面、数值和操作会互相打架，用户也无法判断当前由谁控制。',
  meaning: '多个明确请求的输入源只写入一个规范化状态；主体、场景、语义结果和进度显示从同一状态派生，第一次人工输入立即接管自动演示。',
  rejectionRules: [
    'brief 只要求一种输入方式时不得加入额外演示或滚轮接管。',
    '自动演示无法播放、暂停、重置或在人工输入后停止时拒绝使用。',
    '状态只改变数字或说明文字而没有改变主体和场景时拒绝晋级。'
  ]
});

const demoPattern = /自动演示|播放演示|演示模式|一键演示|自动播放|play\s*demo|auto(?:matic)?\s*demo/i;
const scrollPattern = /鼠标滚轮|滚轮|滚动.{0,24}(?:驱动|控制|联动|同步|变化)|(?:scroll|wheel).{0,24}(?:drive|control|sync|change)/i;
const manualPattern = /滑块|拖动|拖到|调节|调整|参数控件|直接控制|手动操作|(?:控件|控制器).{0,12}(?:接管|控制|调节|调整)|选择.{0,12}(?:参数|状态|模式)|(?:slider|drag|manual\s*control)/i;
const sharedPattern = /同一.{0,16}(?:状态|进度|时间线)|共享.{0,12}(?:状态|进度)|共同驱动|同步驱动|联动|手动.{0,12}(?:接管|停止演示)/i;
const blockerSignals = ['纯静态', '静态单页', '无需交互', '不需要交互', '只展示'] as const;

export function selectSharedStateDriverCapability(
  input: SharedStateDriverDecisionInput
): SharedStateDriverDecision {
  const normalized = input.brief.toLowerCase();
  const demoRequested = demoPattern.test(normalized);
  const scrollRequested = scrollPattern.test(normalized) || input.primaryInput === 'scroll';
  const manualRequested = manualPattern.test(normalized);
  const requestedModes = [
    manualRequested ? 'manual' as const : null,
    scrollRequested ? 'scroll' as const : null,
    demoRequested ? 'demo' as const : null
  ].filter((mode): mode is z.infer<typeof sharedStateDriveModeSchema> => mode !== null);
  const matchedBlockers = blockerSignals.filter((signal) => normalized.includes(signal));
  const explicitlyShared = sharedPattern.test(normalized);
  const multipleDriversRequested = requestedModes.length >= 2;
  const score = Math.min(100, Math.max(0,
    requestedModes.length * 24
      + (demoRequested ? 18 : 0)
      + (explicitlyShared ? 20 : 0)
      + (input.semanticInteractionSelected ? 8 : 0)
      - (matchedBlockers.length ? 100 : 0)
  ));
  const blockers = matchedBlockers.map((signal) => `目标明确包含“${signal}”，不得加入多源状态驱动。`);
  const selected = multipleDriversRequested && demoRequested && blockers.length === 0 && score >= 66;
  const matchedSignals = [
    demoRequested ? 'demo' : null,
    scrollRequested ? 'scroll' : null,
    manualRequested ? 'manual' : null,
    explicitlyShared ? 'shared-state' : null
  ].filter((signal): signal is string => signal !== null);
  const authoringContract: SharedStateDriverAuthoringContract | null = selected ? {
    stateModel: 'single-canonical-state',
    modes: requestedModes,
    demoControl: 'bounded-play-pause-reset',
    scrollMapping: scrollRequested ? 'real-scroll-range-to-shared-state' : 'not-requested',
    manualOverride: 'first-user-input-stops-demo',
    visualMapping: 'subject-scene-and-semantic-results',
    reducedMotion: 'discrete-semantic-states',
    mobileFallback: 'direct-controls-remain-complete',
    markers: {
      root: 'data-signal-shared-driver',
      demoControl: 'data-signal-demo-control',
      progress: 'data-signal-driver-progress',
      modeAttribute: 'data-drive-mode'
    }
  } : null;

  return sharedStateDriverDecisionSchema.parse({
    selected,
    capabilityId: selected ? sharedStateDriverCapability.id : null,
    score,
    requestedModes,
    matchedSignals,
    reasons: [
      multipleDriversRequested
        ? `目标同时请求 ${requestedModes.join('、')} 驱动。`
        : '目标没有同时请求两种以上驱动方式，不建立共享状态导演。',
      demoRequested
        ? '自动演示是明确需求，必须具有播放、暂停、重置和人工接管边界。'
        : '目标没有明确请求自动演示，禁止为了展示能力而自行加入。',
      input.semanticInteractionSelected
        ? '现有语义交互已要求可见主体与结果同步，适合从同一状态派生。'
        : '没有语义交互职责时，多源输入仍不得退化为无意义镜头运动。'
    ],
    blockers,
    authoringContract,
    evaluatedCapability: sharedStateDriverCapability
  });
}
