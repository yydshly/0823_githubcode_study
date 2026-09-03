import { z } from 'zod';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const productSemanticFeedbackAuthoringContractSchema = z.object({
  modality: z.literal('audio'),
  required: z.literal(true),
  route: z.enum(['synthesized-web-audio', 'audio-asset-playback', 'hybrid-audio']),
  stateBinding: z.literal('same-causal-state-as-visual-result'),
  activation: z.literal('explicit-user-gesture'),
  controls: z.tuple([
    z.literal('play-or-trigger'),
    z.literal('mute'),
    z.literal('volume')
  ]),
  comparison: z.enum(['a-b-or-before-after', 'single-state-preview']),
  honesty: z.string().min(20),
  fallback: z.string().min(20),
  markers: z.object({
    root: z.literal('data-signal-audio-feedback'),
    control: z.literal('data-signal-audio-control'),
    stateAttribute: z.literal('data-audio-state')
  }).strict()
}).strict();

export type ProductSemanticFeedbackAuthoringContract = z.infer<typeof productSemanticFeedbackAuthoringContractSchema>;

export const productSemanticFeedbackCapabilitySchema = z.object({
  id: safeId,
  evidenceLevel: z.literal('E4'),
  state: z.literal('validated'),
  sourceCaseId: safeId,
  problem: z.string().min(20),
  meaning: z.string().min(20),
  rejectionRules: z.array(z.string().min(12)).min(2).max(4)
}).strict();

export const productSemanticFeedbackDecisionSchema = z.object({
  selected: z.boolean(),
  capabilityId: safeId.nullable(),
  score: z.number().min(0).max(100),
  matchedSignals: z.array(z.string().min(1)),
  reasons: z.array(z.string().min(3)).min(1),
  blockers: z.array(z.string().min(3)),
  authoringContract: productSemanticFeedbackAuthoringContractSchema.nullable(),
  evaluatedCapability: productSemanticFeedbackCapabilitySchema
}).strict();

export type ProductSemanticFeedbackDecision = z.infer<typeof productSemanticFeedbackDecisionSchema>;

export const productSemanticFeedbackCapability = productSemanticFeedbackCapabilitySchema.parse({
  id: 'product-semantic-audio-feedback',
  evidenceLevel: 'E4',
  state: 'validated',
  sourceCaseId: 'dedicated-b4d381a24320',
  problem: '当产品价值依赖听觉判断时，只有图片、波形动画或频率数字的页面无法证明核心能力，也会让用户误以为交互没有生效。',
  meaning: '把声音作为与视觉结果同级的产品反馈：由同一因果状态驱动，用户明确触发，并提供可辨认的对比、静音、音量、真实性说明和无音频降级。',
  rejectionRules: [
    '声音只是文案修饰且不影响产品任务时，不得为了展示能力强行加入音频。',
    '不同状态听感无法辨认，或声音与视觉、参数使用不同状态时拒绝验收。',
    '未提供用户手势激活、静音、音量与失败降级时拒绝验收。'
  ]
});

const domainSignals = [
  '声音', '声学', '音频', '音板', '乐器', '录音', '语音', '音乐', '音色', '音调', '发声', '声场', '和声', '声纹', '声波', '频谱',
  'audio', 'sound', 'acoustic', 'voice', 'music', 'tone', 'timbre', 'harmony', 'instrument'
] as const;

const audibleTaskSignals = [
  '播放', '试听', '聆听', '听感', '敲击', '调音', '音高', '频率', '低频', '中频', '高频', '频段', '衰减', '共振', '录制', '发声',
  '对比声音', '声音对比', '声音反馈', '随音乐响应', 'play', 'listen', 'preview', 'pitch', 'decay',
  'resonance', 'record', 'a/b'
] as const;

const explicitProductSignals = [
  '声音产品', '声学产品', '音频产品', '录音产品', '乐器产品', '调音工具', '声音工具',
  'audio product', 'sound product', 'acoustic product', 'music tool'
] as const;

const blockerSignals = [
  '不要声音', '不要音频', '无需声音', '不需要声音', '静音页面', 'silent page', 'no audio'
] as const;

const simulationPattern = /教学模拟|模拟结果|参数|调整|调节|厚度|音板|调音|频率|音高|共振|衰减|和声|simulation|parameter|pitch|resonance|decay/i;
const recordedMediaPattern = /录音|语音|歌曲|音乐作品|播客|采访|现场声音|自然声音|自然声|环境声音|声源|recording|voice|song|podcast|field audio|field recording/i;

export function selectProductSemanticFeedback(brief: string): ProductSemanticFeedbackDecision {
  const normalized = brief.toLowerCase();
  const matchedDomain = domainSignals.filter((signal) => normalized.includes(signal));
  const matchedTasks = audibleTaskSignals.filter((signal) => normalized.includes(signal));
  const matchedProducts = explicitProductSignals.filter((signal) => normalized.includes(signal));
  const matchedBlockers = blockerSignals.filter((signal) => normalized.includes(signal));
  const explicitAudibleExperience = matchedDomain.length > 0 && matchedTasks.length >= 2;
  const score = Math.min(100, Math.max(0,
    Math.min(40, matchedDomain.length * 20)
      + Math.min(45, matchedTasks.length * 15)
      + (explicitAudibleExperience ? 10 : 0)
      + (matchedProducts.length ? 30 : 0)
      - (matchedBlockers.length ? 100 : 0)
  ));
  const blockers = matchedBlockers.map((signal) => `目标明确包含“${signal}”，不得加入声音反馈。`);
  const selected = score >= 55 && blockers.length === 0;
  const route: ProductSemanticFeedbackAuthoringContract['route'] = recordedMediaPattern.test(normalized)
    ? simulationPattern.test(normalized) ? 'hybrid-audio' : 'audio-asset-playback'
    : 'synthesized-web-audio';
  const comparison = matchedTasks.some((signal) => ['对比声音', '声音对比', 'a/b', '调音', '频率', '音高', '共振', '衰减', '和声'].includes(signal))
    || simulationPattern.test(normalized)
    ? 'a-b-or-before-after' as const
    : 'single-state-preview' as const;
  const authoringContract: ProductSemanticFeedbackAuthoringContract | null = selected ? {
    modality: 'audio',
    required: true,
    route,
    stateBinding: 'same-causal-state-as-visual-result',
    activation: 'explicit-user-gesture',
    controls: ['play-or-trigger', 'mute', 'volume'],
    comparison,
    honesty: route === 'audio-asset-playback'
      ? '明确说明音频来源与播放内容，不把示例录音冒充实时测量或真实产品输出。'
      : '明确标注声音为交互模拟或合成预览，不把 Web Audio 合成结果冒充真实测量或真实录音。',
    fallback: 'AudioContext、解码或素材请求失败时保留完整视觉任务、状态说明与行动，并清楚显示声音暂不可用。',
    markers: {
      root: 'data-signal-audio-feedback',
      control: 'data-signal-audio-control',
      stateAttribute: 'data-audio-state'
    }
  } : null;

  return productSemanticFeedbackDecisionSchema.parse({
    selected,
    capabilityId: selected ? productSemanticFeedbackCapability.id : null,
    score,
    matchedSignals: [...matchedDomain, ...matchedTasks, ...matchedProducts],
    reasons: [
      selected
        ? '核心产品价值或主要操作需要用户实际听见结果，视觉表现不能替代声音反馈。'
        : '目标没有充分证明听觉是核心产品任务，不强行加入音频能力。',
      matchedTasks.length
        ? `目标命中“${matchedTasks.join('、')}”等听觉操作或结果信号。`
        : '目标未明确要求播放、试听、调音、录制或声音对比。'
    ],
    blockers,
    authoringContract,
    evaluatedCapability: productSemanticFeedbackCapability
  });
}
