export type WorkbenchExecutionPhase = 'planning' | 'assets' | 'authoring' | 'reviewing';
export type WorkbenchExecutionState = 'waiting' | 'active' | 'done' | 'blocked' | 'failed';

export interface WorkbenchJobTelemetryInput {
  status: 'running' | 'review-required' | 'complete' | 'blocked' | 'failed';
  stage: string;
  message: string;
  createdAt: string;
  updatedAt?: string;
  finishedAt?: string | null;
  deadlineAt?: string | null;
  phaseDurationsMs?: Record<WorkbenchExecutionPhase, number> | null;
  history: Array<{ stage: string; at: string; message: string }>;
}

export interface WorkbenchPhaseTiming {
  phase: WorkbenchExecutionPhase;
  label: string;
  durationMs: number;
  state: WorkbenchExecutionState;
}

export interface WorkbenchJobTelemetry {
  elapsedMs: number;
  remainingBudgetMs: number | null;
  activePhase: WorkbenchExecutionPhase;
  bottleneck: WorkbenchPhaseTiming | null;
  phases: WorkbenchPhaseTiming[];
  message: string;
  status: WorkbenchJobTelemetryInput['status'];
}

export interface WorkbenchExperienceQualityInput {
  status: 'pending' | 'pass' | 'revise' | 'blocked';
  score: number | null;
  structureMode: string | null;
  expectedStateCount: number;
  reviewedStateCount: number;
  archiveEligible: boolean;
  summary: string;
  issues: string[];
}

export interface WorkbenchResultStatusInput extends WorkbenchJobTelemetryInput {
  bestPreviewUrl?: string | null;
  sourcePreviewUrl?: string | null;
  finalScore?: number | null;
  error?: string | null;
  deliveryQuality?: {
    finalEligible?: boolean;
    experience?: WorkbenchExperienceQualityInput | null;
  } | null;
}

export interface WorkbenchResultSummary {
  state: 'running' | 'complete' | 'review' | 'blocked' | 'failed';
  verdict: string;
  page: string;
  structure: string;
  coverage: string;
  visual: string;
  refinement: string;
  summary: string;
  stopReason: string;
  issues: string[];
  resultUrl: string | null;
}

const phaseOrder: WorkbenchExecutionPhase[] = ['planning', 'assets', 'authoring', 'reviewing'];
const phaseLabels: Record<WorkbenchExecutionPhase, string> = {
  planning: '目标规划',
  assets: '素材准备',
  authoring: 'Codex 构建',
  reviewing: '浏览器验收'
};

export function summarizeWorkbenchJobTelemetry(
  job: WorkbenchJobTelemetryInput,
  now = Date.now()
): WorkbenchJobTelemetry {
  const createdAt = validTime(job.createdAt, now);
  const terminalAt = job.status === 'running'
    ? now
    : validTime(job.finishedAt || job.updatedAt || job.createdAt, now);
  const history = [...job.history]
    .map((entry) => ({ ...entry, time: validTime(entry.at, createdAt) }))
    .sort((left, right) => left.time - right.time);
  const durations = new Map<WorkbenchExecutionPhase, number>(phaseOrder.map((phase) => [phase, job.phaseDurationsMs?.[phase] || 0]));
  const seen = new Set<WorkbenchExecutionPhase>();

  history.forEach((entry) => seen.add(phaseForStage(entry.stage)));
  if (job.phaseDurationsMs) {
    if (job.status === 'running') {
      const active = phaseForStage(job.stage);
      const lastUpdate = validTime(job.updatedAt || job.createdAt, createdAt);
      durations.set(active, (durations.get(active) || 0) + Math.max(0, now - lastUpdate));
    }
  } else {
    history.forEach((entry, index) => {
      const phase = phaseForStage(entry.stage);
      const nextAt = history[index + 1]?.time ?? terminalAt;
      durations.set(phase, (durations.get(phase) || 0) + Math.max(0, nextAt - entry.time));
    });
  }

  const activePhase = phaseForStage(job.stage);
  const phases = phaseOrder.map((phase): WorkbenchPhaseTiming => {
    let state: WorkbenchExecutionState = seen.has(phase) ? 'done' : 'waiting';
    if (phase === activePhase && job.status === 'running') state = 'active';
    if (phase === activePhase && job.status === 'blocked') state = 'blocked';
    if (phase === activePhase && job.status === 'failed') state = 'failed';
    return { phase, label: phaseLabels[phase], durationMs: Math.round(durations.get(phase) || 0), state };
  });
  const completed = phases.filter((phase) => phase.durationMs > 0 && phase.state !== 'active');
  const bottleneck = completed.sort((left, right) => right.durationMs - left.durationMs)[0] || null;

  return {
    elapsedMs: Math.max(0, Math.round(terminalAt - createdAt)),
    remainingBudgetMs: job.status === 'running' ? remainingBudget(job.deadlineAt, now) : null,
    activePhase,
    bottleneck,
    phases,
    message: job.message,
    status: job.status
  };
}

export function renderWorkbenchJobTelemetry(
  root: HTMLElement,
  job: WorkbenchJobTelemetryInput,
  now = Date.now()
): WorkbenchJobTelemetry {
  const telemetry = summarizeWorkbenchJobTelemetry(job, now);
  root.hidden = false;
  root.dataset.state = telemetry.status;
  const state = root.querySelector<HTMLElement>('[data-execution-state]');
  const note = root.querySelector<HTMLElement>('[data-execution-note]');
  if (state) {
    state.textContent = telemetry.status === 'running'
      ? `${phaseLabels[telemetry.activePhase]} · 已用时 ${formatWorkbenchDuration(telemetry.elapsedMs)}${telemetry.remainingBudgetMs === null ? '' : ` · 最多再等 ${formatWorkbenchDuration(telemetry.remainingBudgetMs)}`}`
      : telemetry.status === 'complete'
        ? `已完成 · 总耗时 ${formatWorkbenchDuration(telemetry.elapsedMs)}`
        : telemetry.status === 'review-required'
          ? `网页已生成 · 待视觉定稿 · ${formatWorkbenchDuration(telemetry.elapsedMs)}`
          : `${telemetry.status === 'blocked' ? '等待输入' : '阶段失败'} · ${formatWorkbenchDuration(telemetry.elapsedMs)}`;
  }
  telemetry.phases.forEach((phase) => {
    const item = root.querySelector<HTMLElement>(`[data-execution-phase="${phase.phase}"]`);
    if (!item) return;
    item.dataset.state = phase.state;
    const duration = item.querySelector<HTMLElement>('[data-execution-duration]');
    const phaseState = item.querySelector<HTMLElement>('[data-execution-phase-state]');
    if (duration) duration.textContent = phase.state === 'waiting' ? '—' : formatWorkbenchDuration(phase.durationMs);
    if (phaseState) phaseState.textContent = stateLabel(phase.state);
  });
  if (note) {
    const bottleneck = telemetry.bottleneck
      ? `当前耗时最多：${telemetry.bottleneck.label} ${formatWorkbenchDuration(telemetry.bottleneck.durationMs)}。`
      : '';
    note.textContent = `${telemetry.message}${bottleneck ? ` ${bottleneck}` : ''}`;
  }
  return telemetry;
}

export function summarizeWorkbenchResult(job: WorkbenchResultStatusInput): WorkbenchResultSummary {
  const experience = job.deliveryQuality?.experience || null;
  const resultUrl = job.bestPreviewUrl || job.sourcePreviewUrl || null;
  const hasPage = Boolean(resultUrl);
  const state = job.status === 'complete'
    ? 'complete'
    : job.status === 'review-required' || (job.status === 'failed' && hasPage)
      ? 'review'
      : job.status;
  const coverage = experience && experience.expectedStateCount > 0
    ? `${experience.reviewedStateCount} 个检查点 / ${experience.expectedStateCount} 个产品状态`
    : '尚未开始';

  if (state === 'running') {
    const activePhase = phaseForStage(job.stage);
    const page = hasPage
      ? '已生成，可预览'
      : activePhase === 'authoring' || activePhase === 'reviewing'
        ? '正在构建'
        : '等待构建';
    return {
      state,
      verdict: `${phaseLabels[activePhase]}中`,
      page,
      structure: experienceStatusLabel(experience?.status || 'pending'),
      coverage,
      visual: activePhase === 'reviewing' ? '正在检查' : '等待检查',
      refinement: job.stage === 'refining' ? '正在判断是否值得精修' : '尚未开始',
      summary: runningSummary(activePhase, hasPage),
      stopReason: '任务仍在执行，尚未停止。',
      issues: experience?.issues || [],
      resultUrl
    };
  }

  if (state === 'complete') {
    const score = job.finalScore ?? experience?.score ?? null;
    return {
      state,
      verdict: '最终网页已完成',
      page: hasPage ? '已生成，可查看' : '已完成',
      structure: experience?.status === 'pass' ? '已通过' : experienceStatusLabel(experience?.status || 'pending'),
      coverage,
      visual: score === null ? '已通过' : `${score} / 100`,
      refinement: job.deliveryQuality?.finalEligible === false ? '已完成 · 未入精选' : '已定稿 · 可入精选',
      summary: '网页、结构与视觉检查已经结束；当前链接就是本次交付结果。',
      stopReason: '正常完成，没有继续消耗生成或精修次数。',
      issues: experience?.issues || [],
      resultUrl
    };
  }

  if (state === 'review') {
    const score = job.finalScore ?? experience?.score ?? null;
    return {
      state,
      verdict: '网页已生成 · 待视觉定稿',
      page: '已生成，可查看',
      structure: experienceStatusLabel(experience?.status || 'pending'),
      coverage,
      visual: score === null ? '未得出最终结论' : `${score} / 100 · 待确认`,
      refinement: isTimeLimit(job) ? '达到上限，已停止' : '需要确认后再继续',
      summary: '当前网页已经可以查看；自动视觉判断没有完成，因此保留结果，但不会自动进入精选案例。',
      stopReason: userFacingStopReason(job, '视觉判断尚未形成最终结论，系统已停止继续消耗。'),
      issues: experience?.issues || [],
      resultUrl
    };
  }

  if (state === 'blocked') {
    return {
      state,
      verdict: '等待必要输入',
      page: hasPage ? '已有可查看版本' : '尚未生成',
      structure: experienceStatusLabel(experience?.status || 'blocked'),
      coverage,
      visual: '未开始',
      refinement: '不会自动继续',
      summary: '当前缺少继续生成所需的明确输入或关键素材；补齐后才会继续。',
      stopReason: userFacingStopReason(job, '缺少必要输入或关键素材，任务已暂停。'),
      issues: experience?.issues || [],
      resultUrl
    };
  }

  return {
    state: 'failed',
    verdict: hasPage ? '网页已保留 · 后续阶段失败' : '本次没有形成网页',
    page: hasPage ? '已有可查看版本' : '生成失败',
    structure: experienceStatusLabel(experience?.status || 'blocked'),
    coverage,
    visual: '未完成',
    refinement: '已停止',
    summary: hasPage
      ? '可运行网页已经保留；失败发生在后续检查阶段，不会删除现有结果。'
      : '本次未形成可运行网页，系统已经停止，不会无限重试。',
    stopReason: userFacingStopReason(job, '执行遇到错误，系统已停止并保留已完成阶段。'),
    issues: experience?.issues || [],
    resultUrl
  };
}

export function renderWorkbenchResultStatus(root: HTMLElement, job: WorkbenchResultStatusInput): WorkbenchResultSummary {
  const result = summarizeWorkbenchResult(job);
  root.hidden = false;
  root.dataset.state = result.state;
  setText(root, '[data-result-verdict]', result.verdict);
  setText(root, '[data-result-page]', result.page);
  setText(root, '[data-result-structure]', result.structure);
  setText(root, '[data-result-coverage]', result.coverage);
  setText(root, '[data-result-visual]', result.visual);
  setText(root, '[data-result-refinement]', result.refinement);
  setText(root, '[data-result-summary]', result.summary);
  setText(root, '[data-result-stop-reason]', result.stopReason);
  const issues = root.querySelector<HTMLElement>('[data-result-issues]');
  const issueDetails = root.querySelector<HTMLDetailsElement>('[data-result-issue-details]');
  if (issues) issues.replaceChildren(...result.issues.slice(0, 4).map((issue) => {
    const item = document.createElement('li');
    item.textContent = issue;
    return item;
  }));
  if (issueDetails) issueDetails.hidden = result.issues.length === 0;
  const link = root.querySelector<HTMLAnchorElement>('[data-result-link]');
  if (link) {
    if (result.resultUrl) {
      link.href = result.resultUrl;
      link.removeAttribute('aria-disabled');
      link.tabIndex = 0;
    } else {
      link.href = './';
      link.setAttribute('aria-disabled', 'true');
      link.tabIndex = -1;
    }
  }
  return result;
}

export function formatWorkbenchDuration(value: number): string {
  const bounded = Math.max(0, Math.round(value));
  if (bounded < 1000) return `${bounded}ms`;
  if (bounded < 60_000) return `${(bounded / 1000).toFixed(bounded < 10_000 ? 1 : 0)}s`;
  const minutes = Math.floor(bounded / 60_000);
  const seconds = Math.round((bounded % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function phaseForStage(stage: string): WorkbenchExecutionPhase {
  if (stage === 'assets') return 'assets';
  if (stage === 'authoring' || stage === 'compiling') return 'authoring';
  if (stage === 'reviewing' || stage === 'refining' || stage === 'review-required' || stage === 'complete') return 'reviewing';
  return 'planning';
}

function stateLabel(state: WorkbenchExecutionState): string {
  return ({ waiting: '等待', active: '进行中', done: '完成', blocked: '等待素材', failed: '失败' } as const)[state];
}

function experienceStatusLabel(status: WorkbenchExperienceQualityInput['status']): string {
  return ({ pending: '等待检查', pass: '已通过', revise: '需要调整', blocked: '检查受阻' } as const)[status];
}

function runningSummary(phase: WorkbenchExecutionPhase, hasPage: boolean): string {
  if (phase === 'planning') return '正在把想法收敛为一个可执行方向；尚未调用网页构建。';
  if (phase === 'assets') return '正在确定素材与表现方式；只在确有收益时调用素材模型。';
  if (phase === 'authoring') return '方向已经确定，Codex 正在构建一个独立网页。';
  return hasPage
    ? '网页已经生成，正在用真实浏览器检查结构、交互和视觉质量。'
    : '正在进入真实浏览器检查，完成后会给出明确结论。';
}

function isTimeLimit(job: WorkbenchResultStatusInput): boolean {
  return /超过\s*\d+\s*秒|时间上限|timeout|timed out/i.test(`${job.error || ''} ${job.message || ''}`);
}

function userFacingStopReason(job: WorkbenchResultStatusInput, fallback: string): string {
  const raw = `${job.error || ''} ${job.message || ''}`.trim();
  if (!raw) return fallback;
  if (isTimeLimit(job)) {
    return phaseForStage(job.stage) === 'reviewing'
      ? '视觉判断达到时间上限，系统已按约束停止；当前网页仍可查看。'
      : '当前阶段达到时间上限，系统已停止，不会无限重试。';
  }
  if (/素材|asset/i.test(raw) && job.status === 'blocked') return '缺少必要素材或素材授权，确认后才能继续。';
  return fallback;
}

function setText(root: HTMLElement, selector: string, value: string): void {
  const target = root.querySelector<HTMLElement>(selector);
  if (target) target.textContent = value;
}

function validTime(value: string, fallback: number): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function remainingBudget(deadlineAt: string | null | undefined, now: number): number | null {
  const parsed = Date.parse(deadlineAt || '');
  return Number.isFinite(parsed) ? Math.max(0, parsed - now) : null;
}
