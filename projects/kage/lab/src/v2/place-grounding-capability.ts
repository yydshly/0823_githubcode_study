import { z } from 'zod';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const placeGroundingStrategySchema = z.enum([
  'none',
  'real-geography-evidence',
  'place-narrative',
  'place-atmosphere'
]);

export const placeGroundingDecisionSchema = z.object({
  selected: z.boolean(),
  capabilityId: safeId.nullable(),
  strategy: placeGroundingStrategySchema,
  score: z.number().min(0).max(100),
  matchedSignals: z.array(z.string().min(1)),
  reasons: z.array(z.string().min(4)).min(2).max(3),
  requirements: z.object({
    geography: z.enum(['not-applicable', 'real-grounded', 'real-reinterpreted', 'inspired-only']),
    map: z.enum(['required', 'optional', 'avoid']),
    dataTruth: z.string().min(12),
    creativeFreedom: z.string().min(12)
  }).strict()
}).strict();

export type PlaceGroundingDecision = z.infer<typeof placeGroundingDecisionSchema>;
export type PlaceGroundingStrategy = z.infer<typeof placeGroundingStrategySchema>;

export const placeGroundingCapability = {
  id: 'place-grounded-experience',
  problem: '模型容易把地域词汇误读成随机伪地图，或在不需要地图时强行套用地点模板。',
  goal: '先判断地域承担事实证据、空间叙事还是氛围来源，再决定真实数据、地图和创意重构的边界。'
} as const;

const evidenceSignals = [
  '公共服务', '公共设施', '饮水点', '补水点', '门店', '站点', '地址', '地图', '路线',
  '导航', '最近', '步行距离', '开放状态', '水质', '选址', '配送', '到达'
] as const;

const standaloneEvidenceSignals = [
  '地图', '地址', '导航', '最近', '步行距离', '开放状态', '水质', '经纬度', '坐标'
] as const;

const serviceEvidenceSignals = [
  '公共服务', '公共设施', '饮水点', '补水点', '门店', '站点', '选址'
] as const;

const routeEvidenceSignals = ['路线', '配送', '到达'] as const;

const concretePlaceSignals = [
  '地点', '站点', '地址', '地图', '道路', '街区', '经纬度', '坐标', '距离', '步行', '导航'
] as const;

const narrativeSignals = [
  '城市记忆', '地方记忆', '历史', '档案', '消失', '年代', '旧址', '变迁', '遗址',
  '文化展览', '数字展陈', '沿街', '街区漫游', '空间关系'
] as const;

const atmosphereSignals = [
  '地域气质', '地方气质', '产地', '故乡', '山谷', '海岸', '岛屿', '沙漠', '森林',
  '港口', '河谷', '高原', '江南', '西北', '南方', '北方'
] as const;

const mapAvoidSignals = ['不要地图', '不使用地图', '无需地图', '不是导览', '不做导航'] as const;

export function selectPlaceGroundingCapability(brief: string): PlaceGroundingDecision {
  const clauses = brief.split(/[。；;\n]/).map((item) => item.trim()).filter(Boolean);
  const positiveBrief = clauses
    .filter((clause) => !/^(?:不要|避免|拒绝|禁止|不使用|无需|不需要)/.test(clause))
    .join('。');
  const normalized = (positiveBrief || brief).toLowerCase();
  const raw = brief.toLowerCase();
  const evidence = evidenceSignals.filter((signal) => normalized.includes(signal.toLowerCase()));
  const narrative = narrativeSignals.filter((signal) => normalized.includes(signal.toLowerCase()));
  const atmosphere = atmosphereSignals.filter((signal) => normalized.includes(signal.toLowerCase()));
  const hasPlaceOrigin = /(?:来自|位于|生于|产自).{0,16}(?:城市|街区|山谷|海岸|岛|河|地区|地域|省|市|县)/i.test(normalized);
  const hasStandaloneEvidence = standaloneEvidenceSignals.some((signal) => normalized.includes(signal));
  const hasServiceEvidence = serviceEvidenceSignals.some((signal) => normalized.includes(signal));
  const hasRouteEvidence = routeEvidenceSignals.some((signal) => normalized.includes(signal));
  const hasConcretePlace = concretePlaceSignals.some((signal) => normalized.includes(signal));
  // “路线”也可以是叙事分支、学习路径或运动轨迹。只有它与可核验地点
  // 或公共服务语义共同出现时，才把它升级为真实地理证据。
  const hasGroundedEvidence = hasStandaloneEvidence
    || (hasServiceEvidence && (hasRouteEvidence || hasConcretePlace))
    || (hasRouteEvidence && hasConcretePlace);
  const avoidMap = mapAvoidSignals.some((signal) => raw.includes(signal))
    || /(?:不要|避免|拒绝|禁止|不使用|无需|不需要)[^。；;\n]{0,12}地图/i.test(raw);
  const matchedSignals = [...new Set([
    ...evidence,
    ...narrative,
    ...atmosphere,
    ...(hasPlaceOrigin ? ['地域来源'] : [])
  ])];

  let strategy: PlaceGroundingStrategy = 'none';
  if (hasGroundedEvidence) strategy = 'real-geography-evidence';
  else if (narrative.length > 0) strategy = 'place-narrative';
  else if (atmosphere.length > 0 || hasPlaceOrigin) strategy = 'place-atmosphere';

  if (avoidMap && strategy === 'real-geography-evidence' && narrative.length > 0) {
    strategy = 'place-narrative';
  } else if (avoidMap && strategy === 'real-geography-evidence') {
    strategy = 'place-atmosphere';
  }

  const selected = strategy !== 'none';
  const score = Math.min(100,
    (hasGroundedEvidence ? Math.max(1, evidence.length) * 12 : 0)
      + narrative.length * 10
      + atmosphere.length * 8
      + (hasPlaceOrigin ? 20 : 0)
      + (selected ? 24 : 0)
  );
  const requirements = requirementsFor(strategy, avoidMap);
  const reasons = [
    selected
      ? `目标命中“${matchedSignals.slice(0, 5).join('、')}”等地域语义，地域应成为表达决策而不是装饰词。`
      : '目标没有要求地点事实、空间关系或地域来源，不应为了视觉效果强行加入地图。',
    strategy === 'real-geography-evidence'
      ? '地点会影响查询、比较或行动，必须以真实地理关系为事实底座。'
      : strategy === 'place-narrative'
      ? '地点承担历史与叙事连续性，可在真实关系上进行编辑式重构。'
      : strategy === 'place-atmosphere'
      ? '地点只提供材料、色彩和情绪来源，不需要地图界面。'
      : '继续由主题、素材和交互目标选择最小充分技术路线。'
  ];

  return placeGroundingDecisionSchema.parse({
    selected,
    capabilityId: selected ? placeGroundingCapability.id : null,
    strategy,
    score,
    matchedSignals,
    reasons,
    requirements
  });
}

function requirementsFor(strategy: PlaceGroundingStrategy, avoidMap: boolean) {
  if (strategy === 'real-geography-evidence') {
    return {
      geography: 'real-grounded' as const,
      map: avoidMap ? 'avoid' as const : 'required' as const,
      dataTruth: '地理底图、地点和路线必须可追溯；模拟业务点与数值必须显式标注，模型不得虚构为事实。',
      creativeFreedom: '可以重构排版、材质和交互节奏，但不得改变地点坐标、道路关系和证据含义。'
    };
  }
  if (strategy === 'place-narrative') {
    return {
      geography: 'real-reinterpreted' as const,
      map: avoidMap ? 'avoid' as const : 'optional' as const,
      dataTruth: '真实地点、年代和档案事实必须可追溯；缺失部分只能作为明确标注的艺术化推演。',
      creativeFreedom: '允许把真实空间转化为档案层、时间切片或探索路径，不必复制标准地图界面。'
    };
  }
  if (strategy === 'place-atmosphere') {
    return {
      geography: 'inspired-only' as const,
      map: 'avoid' as const,
      dataTruth: '不得用未经验证的地点事实支撑产品承诺；地域只作为已经说明的创意来源。',
      creativeFreedom: '可以自由提取地域材料、光线、声音和色彩，但避免地标拼贴与伪地图。'
    };
  }
  return {
    geography: 'not-applicable' as const,
    map: 'avoid' as const,
    dataTruth: '不引入与目标无关的地点、地图或路线事实。',
    creativeFreedom: '围绕主体、受众、情绪变化和最终行动选择表达，不增加地域模板。'
  };
}
