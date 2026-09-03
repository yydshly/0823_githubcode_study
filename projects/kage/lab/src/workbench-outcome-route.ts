export type OutcomePipelineStage = 'idle' | 'interpret' | 'assets' | 'authoring' | 'reviewing' | 'review-required' | 'complete' | 'blocked' | 'failed';
export type OutcomeAssetRoute = 'pending' | 'catalog' | 'generate' | 'procedural' | 'blocked';

export interface OutcomeRouteInput {
  stage: OutcomePipelineStage;
  assetRoute?: OutcomeAssetRoute;
  assetCount?: number;
  model?: string | null;
  message?: string;
  score?: number | null;
}

export interface OutcomeRouteStep {
  label: string;
  detail: string;
  state: 'waiting' | 'active' | 'complete' | 'blocked';
}

export interface OutcomeRouteView {
  tone: 'neutral' | 'working' | 'success' | 'warning';
  title: string;
  note: string;
  steps: [OutcomeRouteStep, OutcomeRouteStep, OutcomeRouteStep];
}

const stageIndex: Record<OutcomePipelineStage, number> = {
  idle: -1,
  interpret: 0,
  assets: 0,
  authoring: 1,
  reviewing: 2,
  'review-required': 2,
  complete: 3,
  blocked: 0,
  failed: 1
};

export function describeOutcomeRoute(input: OutcomeRouteInput): OutcomeRouteView {
  const asset = describeAsset(input.assetRoute || 'pending', input.assetCount || 0);
  const model = input.model ? input.model.toUpperCase() : 'Codex';
  const active = stageIndex[input.stage];
  const blocked = input.stage === 'blocked' || input.stage === 'failed' || input.stage === 'review-required';
  const steps: OutcomeRouteView['steps'] = [
    { label: asset.label, detail: asset.detail, state: stepState(0, active, input.stage, blocked) },
    { label: `${model} 专属构建`, detail: '生成独立页面代码，不套固定模板', state: stepState(1, active, input.stage, blocked) },
    { label: '真实页面验收', detail: '产品关键状态 · 移动端 · 降级', state: stepState(2, active, input.stage, blocked) }
  ];

  if (input.stage === 'idle') return {
    tone: 'neutral',
    title: '一次生成，交付一个最佳网页',
    note: '优选或用户素材优先；MiniMax 仅在适合时备用。',
    steps
  };
  if (input.stage === 'interpret') return {
    tone: 'working',
    title: '正在理解目标与视觉叙事',
    note: input.message || '先判断想法需要怎样的页面，再决定素材与 Three.js 表达。',
    steps
  };
  if (input.stage === 'assets') return {
    tone: 'working',
    title: asset.title,
    note: input.message || asset.detail,
    steps
  };
  if (input.stage === 'authoring') return {
    tone: 'working',
    title: `${model} 正在构建专属网页`,
    note: input.message || `${asset.label}已确定，正在生成并编译页面代码。`,
    steps
  };
  if (input.stage === 'reviewing') return {
    tone: 'working',
    title: '正在用真实页面决定最终版本',
    note: input.message || '自动检查桌面滚动状态与移动端，不为了改动而强行重写。',
    steps
  };
  if (input.stage === 'review-required') return {
    tone: 'warning',
    title: '网页已生成，等待视觉定稿',
    note: input.message || '当前网页可立即打开；自动视觉验收未完成，因此尚未进入精选案例。',
    steps
  };
  if (input.stage === 'complete') return {
    tone: 'success',
    title: '最终最佳网页已交付',
    note: input.message || `${model} 构建完成${input.score == null ? '' : `，视觉验收 ${input.score} 分`}。`,
    steps
  };
  return {
    tone: 'warning',
    title: input.stage === 'blocked' ? '关键素材未就绪，已停止伪生成' : '本次构建未通过，已保留原结果',
    note: input.message || '修正缺失条件后可从当前目标继续。',
    steps
  };
}

function describeAsset(route: OutcomeAssetRoute, count: number): { label: string; title: string; detail: string } {
  if (route === 'catalog') return {
    label: '项目优选素材',
    title: `已匹配 ${Math.max(1, count)} 个高质量素材，跳过 MiniMax`,
    detail: `${Math.max(1, count)} 个有来源素材已进入本次构建`
  };
  if (route === 'generate') return {
    label: 'MiniMax 备用素材',
    title: '缺少合适素材，正在调用 MiniMax 备用能力',
    detail: '仅在素材收益通过门禁时调用，结果仍需视觉验收'
  };
  if (route === 'procedural') return {
    label: '程序化 Three.js',
    title: '当前目标无需外部素材',
    detail: '使用几何、Shader、光照与动效完成表达'
  };
  if (route === 'blocked') return {
    label: '等待关键素材',
    title: '关键主体需要更合适的真实或生成素材',
    detail: '不使用占位几何或低质量图片冒充主体'
  };
  return {
    label: '素材智能选择',
    title: '正在判断最合适的素材路线',
    detail: '项目优选 / 用户素材优先，MiniMax 仅作备用'
  };
}

function stepState(index: number, active: number, stage: OutcomePipelineStage, blocked: boolean): OutcomeRouteStep['state'] {
  if (stage === 'complete') return 'complete';
  if (blocked && index === Math.max(0, active)) return 'blocked';
  if (index < active) return 'complete';
  if (index === active) return 'active';
  return 'waiting';
}
