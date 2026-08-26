import './styles-workbench.css';
import './styles-workbench-provider.css';
import './styles-workbench-capabilities.css';
import './styles-r11.css';
import type { CapabilityProposal } from './capabilities/proposal';
import { compileRevisionPlan, evaluateCandidate, type EvaluationReport, type RevisionPlan } from './evaluation/evaluation';
import { compileLocalRevision, type LocalRevisionResult } from './evaluation/local-revision';
import { collectRuntimeEvidence, isAbortError, runtimeEvidenceForEvaluation, type RuntimeEvidenceBundle } from './evaluation/runtime-evidence';
import { synthesizeProposal, type SynthesisWorkspace } from './capabilities/synthesis';
import type { EffectiveQuality } from './runtime/quality';
import { BaselineBriefInterpreter } from './generation/baseline-interpreter';
import { attachGeneratedAssets } from './generation/asset-integration';
import { planAssets } from './generation/asset-plan';
import { producibleImageRequirements, type AssetProductionReport } from './generation/asset-production';
import { decideImageAssetUse } from './generation/asset-use-policy';
import { planAssetResolution } from './generation/asset-resolution';
import { selectProjectCreativeAssets } from './generation/creative-asset-catalog';
import { fetchProviderStatus, RemoteBriefInterpreter } from './generation/remote-interpreter';
import { requestAssetProduction } from './generation/remote-asset-generator';
import { persistGeneratedExperience } from './generation/generated-store';
import { generateCreativeRun } from './generation/orchestrator';
import { createProductionCapabilityProfile, type ProductionCapabilityAdapters } from './generation/production-capabilities';
import { planCreativeProduction } from './generation/production-plan';
import { selectPresentationStrategy } from './generation/presentation-strategy';
import type { BriefInterpreter, CreativeCandidate, CreativeProviderId, CreativeRun, ProviderStatusResponse } from './generation/schema';
import { readProviderId as readProvider, renderProviderAvailability, renderProviderProvenance, syncProviderHelp } from './generation/provider-ui';
import { decideWorkbenchBootstrap } from './generation/workbench-bootstrap';
import type { OutcomeAssetRoute, OutcomeRouteInput } from './workbench-outcome-route';

const defaultBrief = '为一款面向独立创作者的智能声音产品，设计清冷、克制但有未来感的发布网页；先建立情绪，再解释核心能力，最后留下明确行动。';
const examples: Readonly<Record<string, string>> = {
  product: defaultBrief,
  fashion: '为一个先锋时装品牌设计梦幻流体光幕、柔和但有张力的编辑感沉浸式网页，面向年轻创意人群。',
  museum: '为海洋记忆数字展陈设计网页，面向学生和普通访客；需要档案证据、空间关系和可以选择的探索路径。',
  capability: '为一款新型声学设备设计发布网页：需要真实 GLB 产品拆解、随音乐响应，并能导出 MP4 自动成片。'
};
const showcaseExperiences = {
  'resonance-flagship': {
    title: '声之形', description: '模型彩色/深度资产、产品电影构图、滚动镜头与克制辉光。',
    url: './?experience=resonance-flagship&quality=high&motion=full'
  },
  'tidal-archive': {
    title: '潮汐记忆档案', description: '原创水下环境、对齐深度图、玻璃档案片、关系线与微粒水流。',
    url: './?experience=tidal-archive&quality=high&motion=full'
  },
  'chromatic-tide': {
    title: '流体色场', description: '无需主视觉图片的纯 Shader 光幕、色彩折射与编辑化节奏。',
    url: './?experience=chromatic-tide&quality=high&motion=full'
  }
} as const;
type ShowcaseId = keyof typeof showcaseExperiences;

type CreatorStep = 1 | 2 | 3 | 4 | 5;

interface WorkbenchSnapshot {
  state: 'idle' | 'generating' | 'ready' | 'error';
  creatorStep: CreatorStep;
  jobId: string | null;
  provider: string;
  requestedProvider: CreativeProviderId;
  model: string | null;
  fallbackReason: string | null;
  cacheStatus: 'hit' | 'miss' | 'bypass' | null;
  seed: number;
  runId: string | null;
  selectedId: string | null;
  candidates: Array<{ id: string; structure: string; scenePlugin: string; nodeCount: number; planStatus: string; effectSource: string; productionStatus: string; productionMissing: string[]; productionAdaptations: number }>;
  error: string | null;
  capabilityProposals: Array<{ id: string; kind: string; targetCapabilityId: string; status: string }>;
  synthesisWorkspaces: Array<{ id: string; status: string; targetCapabilityId: string; fileCount: number; blockingChecks: number }>;
  assetProduction: { state: 'idle' | 'generating' | 'ready' | 'error'; reportId: string | null; assets: number; error: string | null };
  evaluation: { state: 'idle' | 'ready'; reportId: string | null; status: string | null; revisionPlanId: string | null; manualChecks: number; blockingChecks: number };
  runtimeEvidence: { state: 'idle' | 'collecting' | 'ready' | 'error' | 'stale'; bundleId: string | null; samples: string[]; error: string | null };
  localRevision: { state: 'idle' | 'applied' | 'unsupported' | 'invalid'; resultId: string | null; revisedCandidateId: string | null; changedPaths: string[] };
}

export interface AssetPreparationOutcome {
  status: 'ready' | 'not-needed' | 'blocked';
  route: OutcomeAssetRoute;
  assets: number;
  message: string;
}

declare global {
  interface Window {
    __creativeLab?: {
      snapshot: () => WorkbenchSnapshot;
      prepareAssets: (externalModalities?: readonly string[]) => Promise<AssetPreparationOutcome>;
    };
  }
}

const briefInput = required<HTMLTextAreaElement>('#brief');
const briefCount = required<HTMLElement>('#brief-count');
const briefHelp = required<HTMLElement>('#brief-help');
const qualitySelect = required<HTMLSelectElement>('#quality');
const providerSelect = required<HTMLSelectElement>('#provider');
const generateButton = required<HTMLButtonElement>('#generate');
const variationButton = required<HTMLButtonElement>('#variation');
const resetButton = required<HTMLButtonElement>('#reset');
const status = required<HTMLElement>('#workbench-status');
const errorPanel = required<HTMLElement>('#workbench-error');
const evidenceList = required<HTMLElement>('#evidence-list');
const candidateGrid = required<HTMLElement>('#candidate-grid');
const proposalList = required<HTMLElement>('#proposal-list');
const runIdLabel = required<HTMLElement>('#run-id');
const selectionDetail = required<HTMLElement>('#selection-detail');
const selectionSummary = required<HTMLElement>('#selection-summary');
const previewLink = required<HTMLAnchorElement>('#preview-link');
const produceAssetsButton = required<HTMLButtonElement>('#produce-assets-button');
const assetProductionButton = required<HTMLButtonElement>('#asset-production-button');
const evaluateButton = required<HTMLButtonElement>('#evaluate-button');
const evaluationReportButton = required<HTMLButtonElement>('#evaluation-report-button');
const revisionPlanButton = required<HTMLButtonElement>('#revision-plan-button');
const manifestButton = required<HTMLButtonElement>('#manifest-button');
const collectEvidenceButton = required<HTMLButtonElement>('#collect-evidence-button');
const blueprintButton = required<HTMLButtonElement>('#blueprint-button');
const runtimeEvidenceButton = required<HTMLButtonElement>('#runtime-evidence-button');
const revisionInstruction = required<HTMLInputElement>('#revision-instruction');
const applyRevisionButton = required<HTMLButtonElement>('#apply-revision-button');
const revisionResultButton = required<HTMLButtonElement>('#revision-result-button');
const effectSpecButton = required<HTMLButtonElement>('#effect-spec-button');
const stageFrame = required<HTMLIFrameElement>('#creative-stage-frame');
const stageTitle = required<HTMLElement>('#creative-stage-title');
const stageDescription = required<HTMLElement>('#creative-stage-description');
const stageOpen = required<HTMLAnchorElement>('#creative-stage-open');
const stageStatus = required<HTMLElement>('#creative-stage-status');
const showcaseButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-showcase]')];
const creatorSteps = [...document.querySelectorAll<HTMLElement>('[data-creator-step]')];
const assetPlanButton = required<HTMLButtonElement>('#asset-plan-button');
const productionPlanButton = required<HTMLButtonElement>('#production-plan-button');
const assetPolicyButton = required<HTMLButtonElement>('#asset-policy-button');
const manifestDialog = required<HTMLDialogElement>('#manifest-dialog');
const manifestClose = required<HTMLButtonElement>('#manifest-close');
const manifestJson = required<HTMLElement>('#manifest-json');
const providerBadge = required<HTMLElement>('#provider-badge');
const artifactTitle = required<HTMLElement>('#manifest-title');
const providerLabel = required<HTMLElement>('#provider-label');
let activeInterpreter: BriefInterpreter = new BaselineBriefInterpreter();
let state: WorkbenchSnapshot['state'] = 'idle';
let run: CreativeRun | null = null;
let selected: CreativeCandidate | null = null;
let lastError: string | null = null;
let generationSeed = 17;
let creatorStep: CreatorStep = 1;
let providerAvailability: ProviderStatusResponse | null = null;
let assetProductionState: WorkbenchSnapshot['assetProduction']['state'] = 'idle';
let assetProductionReport: AssetProductionReport | null = null;
let assetProductionError: string | null = null;
let evaluationReport: EvaluationReport | null = null;
let revisionPlan: RevisionPlan | null = null;
const synthesisWorkspaces = new Map<string, SynthesisWorkspace>();

let runtimeEvidenceState: WorkbenchSnapshot['runtimeEvidence']['state'] = 'idle';
let runtimeEvidenceBundle: RuntimeEvidenceBundle | null = null;
let runtimeEvidenceError: string | null = null;
let localRevisionResult: LocalRevisionResult | null = null;
let runtimeEvidenceAbort: AbortController | null = null;
let localRevisionState: WorkbenchSnapshot['localRevision']['state'] = 'idle';
const params = new URLSearchParams(location.search);
let generationJobId: string | null = /^job-[a-f0-9]{16}$/.test(params.get('job') || '') ? params.get('job') : null;
let stageProgress = .04;
generationSeed = readSeed(params.get('seed'));
let lastStageScrollY = scrollY;
let stageSyncRaf = 0;
briefInput.value = params.get('brief')?.slice(0, 600) || defaultBrief;
qualitySelect.value = readQuality(params.get('quality'));
providerSelect.value = readProvider(params.get('provider'));
updateCount();
updateProviderHelp();
setCreatorStep(1);
window.__creativeLab = { snapshot: createSnapshot, prepareAssets: prepareSelectedAssets };

briefInput.addEventListener('input', () => { generationSeed = 17; updateCount(); setCreatorStep(1); });
generateButton.addEventListener('click', () => void generate());
produceAssetsButton.addEventListener('click', () => void produceSelectedAssets());
assetProductionButton.addEventListener('click', () => { if (assetProductionReport) openArtifact('AssetProductionReport v1', assetProductionReport); });
evaluateButton.addEventListener('click', runOfflineEvaluation);
evaluationReportButton.addEventListener('click', () => { if (evaluationReport) openArtifact('EvaluationReport v1', evaluationReport); });
revisionPlanButton.addEventListener('click', () => { if (revisionPlan) openArtifact('RevisionPlan v1', revisionPlan); });
variationButton.addEventListener('click', () => {
  generationSeed += 1;
  status.textContent = `正在用种子 ${generationSeed} 探索新的创意变体。`;
  void generate();
});
collectEvidenceButton.addEventListener('click', () => {
  if (runtimeEvidenceState === 'collecting') runtimeEvidenceAbort?.abort();
  else void collectSelectedRuntimeEvidence();
});
runtimeEvidenceButton.addEventListener('click', () => { if (runtimeEvidenceBundle) openArtifact('RuntimeEvidenceBundle v1', runtimeEvidenceBundle); });
applyRevisionButton.addEventListener('click', applySelectedRevision);
previewLink.addEventListener('click', () => setCreatorStep(5));
revisionResultButton.addEventListener('click', () => { if (localRevisionResult) openArtifact('LocalRevisionResult v1', localRevisionResult); });
qualitySelect.addEventListener('change', () => { updateUrl(); status.textContent = '预算已更新；下次生成会按新预算重新检查候选。'; });
providerSelect.addEventListener('change', () => {
  updateUrl(); updateProviderHelp(); updateGenerateLabel();
  status.textContent = providerSelect.value === 'local' ? '已选择离线基线；点击生成不会产生远程调用。' : '已选择模型 provider；点击生成后才会发起远程调用。';
});
resetButton.addEventListener('click', () => {
  generationSeed = 17;
  briefInput.value = defaultBrief; qualitySelect.value = 'balanced'; updateCount(); updateUrl(); briefInput.focus();
  status.textContent = '已恢复示例；点击生成以应用当前 provider。';
});
showcaseButtons.forEach((button) => button.addEventListener('click', () => {
  const id = button.dataset.showcase as ShowcaseId;
  if (showcaseExperiences[id]) showShowcase(id);
}));
stageFrame.addEventListener('load', () => {
  stageStatus.textContent = 'LIVE / POINTER + SCROLL / THREE.JS';
  postStageProgress();
});
addEventListener('scroll', requestStageProgress, { passive: true });
addEventListener('resize', requestStageProgress, { passive: true });
addEventListener('message', (event) => {
  if (event.origin !== location.origin || event.source !== stageFrame.contentWindow || event.data?.type !== 'signal-lab:preview-wheel') return;
  const deltaY = Number(event.data.deltaY);
  if (Number.isFinite(deltaY)) scrollBy({ top: Math.max(-240, Math.min(240, deltaY)), behavior: 'auto' });
});
document.querySelectorAll<HTMLButtonElement>('[data-example]').forEach((button) => button.addEventListener('click', () => {
  generationSeed = 17;
  briefInput.value = examples[button.dataset.example || 'product'] || defaultBrief; updateCount(); updateUrl(); briefInput.focus();
  status.textContent = '示例已载入；点击生成以应用当前 provider。';
}));
manifestButton.addEventListener('click', () => {
  if (!selected) return;
  openArtifact('ExperienceManifest v2', selected.manifest);
});
effectSpecButton.addEventListener('click', () => {
  if (!selected) return;
  openArtifact('EffectSpec v1', selected.effectSpec);
});
blueprintButton.addEventListener('click', () => {
  if (!selected?.experienceBlueprint) return;
  openArtifact('ExperienceBlueprint v1', selected.experienceBlueprint);
});
assetPlanButton.addEventListener('click', () => {
  if (!selected) return;
  openArtifact('AssetPlan v1', selected.assetPlan);
});
assetPolicyButton.addEventListener('click', () => {
  if (!selected) return;
  openArtifact('AssetUsePolicy v1', decideImageAssetUse(selected.effectSpec));
});
productionPlanButton.addEventListener('click', () => {
  if (!selected) return;
  openArtifact('ProductionPlan v1', selected.productionPlan);
});
manifestClose.addEventListener('click', () => manifestDialog.close());
manifestDialog.addEventListener('click', (event) => { if (event.target === manifestDialog) manifestDialog.close(); });

candidateGrid.innerHTML = '<div class="wb-empty"><p>正在建立第一个候选空间…</p></div>';
void initialize();

async function initialize(): Promise<void> {
  const availability = await fetchProviderStatus();
  providerAvailability = availability;
  renderAvailability(availability);
  const recovered = generationJobId ? await readGenerationJob(generationJobId) : null;
  const bootstrap = decideWorkbenchBootstrap({
    autorun: params.get('autorun') === '1',
    provider: providerSelect.value,
    jobId: generationJobId,
    recovered
  });
  await generate(!bootstrap.runModel, bootstrap.resumeJobId);
  if (!bootstrap.runModel && providerSelect.value !== 'local') status.textContent = recovered?.status === 'complete' ? '已恢复上次任务的最终最佳网页。' : '当前显示本地初稿；点击生成后才会调用所选模型 provider。';
}

async function generate(forceLocal = false, resumeJobId: string | null = null): Promise<void> {
  state = 'generating'; lastError = null; selected = null; synthesisWorkspaces.clear(); selectionDetail.hidden = true; errorPanel.hidden = true;
  setCreatorStep(2);
  resetAssetProduction();
  resetReviewState();
  const requested = forceLocal ? 'local' : readProvider(providerSelect.value);
  if (requested !== 'local') {
    await generatePersistentExperience(requested, resumeJobId);
    return;
  }
  reportOutcomeRoute({
    stage: 'interpret',
    message: requested === 'local' ? '正在生成可快速检查的本地草案。' : '正在调用模型理解目标、叙事和需要发生的视觉变化。'
  });
  if (requested !== 'local') generationJobId = resumeJobId || await createGenerationJob(requested);
  activeInterpreter = requested === 'local' ? new BaselineBriefInterpreter() : new RemoteBriefInterpreter(requested, generationJobId);
  generateButton.disabled = true; generateButton.textContent = '正在理解并构建…';
  variationButton.disabled = true;
  status.textContent = requested === 'local' ? '本地解释意图、编译 manifest 并检查能力预算。' : '正在调用模型；返回后仍需通过 manifest 与能力预算检查。';
  candidateGrid.setAttribute('aria-busy', 'true');
  try {
    const quality = readQuality(qualitySelect.value);
    run = await generateCreativeRun({ text: briefInput.value, seed: generationSeed }, activeInterpreter, { quality, renderer: 'webgl', motion: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'full' }, connectedMediaAdapters());
    state = 'ready';
    updateUrl(); renderRun(run); selectCandidate(run.candidates[0], true, false);
    setCreatorStep(3);
    const fallback = run.interpretation.provenance.fallbackReason ? ` 回退原因：${run.interpretation.provenance.fallbackReason}` : '';
    const cache = run.interpretation.provenance.cacheStatus === 'hit' ? ' 已复用相同想法的模型分析缓存。' : run.interpretation.provenance.cacheStatus === 'miss' ? ' 模型分析已写入缓存；相同想法可直接复用。' : '';
    status.textContent = `已生成 ${run.candidates.length} 个方向；发现 ${run.capabilityProposals.length} 个待审核能力提案。${cache}${fallback}`;
    if (requested !== 'local') reportOutcomeRoute({ stage: 'assets' });
    if (generationJobId && requested !== 'local') await updateGenerationJob(generationJobId, {
      stage: 'assets',
      message: '最佳方向已经确定，正在检查素材来源与生成条件。',
      model: run.interpretation.provenance.model,
      runId: run.id,
      selectedId: run.candidates[0].id
    });
    window.dispatchEvent(new CustomEvent('creative-lab:selection-ready', {
      detail: { runId: run.id, selectedId: run.candidates[0].id, autoBuild: requested !== 'local' }
    }));
  } catch (error) {
    state = 'error'; run = null; lastError = error instanceof Error ? error.message : String(error);
    errorPanel.textContent = lastError; errorPanel.hidden = false; runIdLabel.textContent = '生成失败'; evidenceList.replaceChildren(); proposalList.replaceChildren();
    candidateGrid.innerHTML = '<div class="wb-empty"><p>补充描述后重新生成。</p></div>';
    status.textContent = '没有产生候选。';
    reportOutcomeRoute({ stage: 'failed', message: lastError || '没有产生可执行结果。' });
    setCreatorStep(1);
  } finally {
    generateButton.disabled = false; variationButton.disabled = false; updateGenerateLabel(); candidateGrid.removeAttribute('aria-busy');
  }
}

interface PersistentGenerationJobView {
  id: string;
  status: 'running' | 'complete' | 'blocked' | 'failed';
  provider: Exclude<CreativeProviderId, 'local'>;
  selectedProvider: Exclude<CreativeProviderId, 'auto'> | null;
  stage: string;
  message: string;
  model: string | null;
  assetRoute: 'catalog' | 'generate' | 'procedural' | 'blocked' | null;
  assetCount: number;
  bestPreviewUrl: string | null;
  finalScore: number | null;
  error: string | null;
  createdAt: string;
}

async function generatePersistentExperience(requested: Exclude<CreativeProviderId, 'local'>, resumeJobId: string | null): Promise<void> {
  run = null;
  selected = null;
  generationJobId = resumeJobId || await createGenerationJob(requested);
  updateUrl();
  generateButton.disabled = true;
  generateButton.textContent = '服务端正在构建…';
  variationButton.disabled = true;
  candidateGrid.setAttribute('aria-busy', 'true');
  candidateGrid.innerHTML = '<div class="wb-empty"><p>服务端任务已建立；关闭或刷新页面不会中断。</p></div>';
  reportOutcomeRoute({ stage: 'interpret', message: '服务端正在理解目标；工作台只负责显示状态和最终网页。' });
  try {
    const job = await waitForPersistentGeneration(generationJobId);
    if (job.status === 'blocked') throw new Error(job.error || job.message);
    if (job.status === 'failed') throw new Error(job.error || job.message);
    state = 'ready';
    const visuallyAccepted = job.finalScore !== null;
    setCreatorStep(visuallyAccepted ? 5 : 4);
    runIdLabel.textContent = `${job.id} · ${visuallyAccepted ? 'SERVER COMPLETE' : 'PAGE READY'} · ${job.model || 'Codex'}`;
    status.textContent = job.message;
    reportOutcomeRoute({
      stage: visuallyAccepted ? 'complete' : 'reviewing',
      assetRoute: job.assetRoute || 'pending',
      assetCount: job.assetCount,
      model: job.model,
      score: job.finalScore,
      message: job.message,
    });
  } catch (error) {
    state = 'error';
    lastError = error instanceof Error ? error.message : String(error);
    errorPanel.textContent = lastError;
    errorPanel.hidden = false;
    status.textContent = '服务端任务没有形成最终网页；任务记录和已完成阶段仍然保留。';
    reportOutcomeRoute({ stage: 'failed', message: lastError });
    setCreatorStep(1);
  } finally {
    generateButton.disabled = false;
    variationButton.disabled = false;
    updateGenerateLabel();
    candidateGrid.removeAttribute('aria-busy');
  }
}

async function waitForPersistentGeneration(id: string): Promise<PersistentGenerationJobView> {
  while (true) {
    const job = await readGenerationJob(id);
    if (!job) throw new Error('无法读取服务端生成任务。');
    renderPersistentGenerationProgress(job);
    if (job.status !== 'running') return job;
    await new Promise((resolve) => window.setTimeout(resolve, 1000));
  }
}

function renderPersistentGenerationProgress(job: PersistentGenerationJobView): void {
  if (job.model) {
    const selected = job.selectedProvider || (job.provider === 'auto' ? 'codex' : job.provider);
    renderProvider({ requested: job.provider, selected, model: job.model, mode: selected === 'local' ? 'local' : 'remote', latencyMs: 0, fallbackReason: null, cacheStatus: 'bypass' });
  }
  const elapsedSeconds = Math.max(0, Math.round((Date.now() - Date.parse(job.createdAt)) / 1000));
  runIdLabel.textContent = `${job.id} · ${job.stage} · ${elapsedSeconds}s`;
  status.textContent = `${job.message} 已用时 ${elapsedSeconds} 秒。`;
  const stage = job.stage === 'planning'
    ? 'interpret'
    : job.stage === 'assets'
      ? 'assets'
      : job.stage === 'authoring' || job.stage === 'compiling'
        ? 'authoring'
        : job.stage === 'reviewing' || job.stage === 'refining'
          ? 'reviewing'
          : job.status === 'complete' ? 'complete' : job.status === 'blocked' ? 'blocked' : 'failed';
  setCreatorStep(stage === 'interpret' || stage === 'assets' ? 2 : stage === 'authoring' ? 3 : stage === 'reviewing' ? 4 : stage === 'complete' ? 5 : 1);
  reportOutcomeRoute({
    stage,
    assetRoute: job.assetRoute || 'pending',
    assetCount: job.assetCount,
    model: job.model,
    score: job.finalScore,
    message: job.message,
  });
}

function renderRun(next: CreativeRun): void {
  runIdLabel.textContent = `${next.id} · seed ${generationSeed} · ${next.interpretation.providerId} · cache ${next.interpretation.provenance.cacheStatus} · ${next.interpretation.provenance.latencyMs}ms`;
  renderProvider(next.interpretation.provenance);
  evidenceList.replaceChildren(...next.interpretation.evidence.map((item) => {
    const row = element('div', 'wb-evidence-item');
    row.append(element('span', 'wb-evidence-field', item.field), element('span', 'wb-evidence-decision', item.decision), element('span', 'wb-confidence', `${Math.round(item.confidence * 100)}%`));
    row.title = item.excerpts.length ? `原文信号：${item.excerpts.join('、')}` : `来源：${item.source}`;
    return row;
  }));
  renderCapabilityProposals(next.capabilityProposals);
  candidateGrid.replaceChildren(...next.candidates.map((candidate, index) => renderCandidate(candidate, index)));
}

function renderCapabilityProposals(proposals: readonly CapabilityProposal[]): void {
  if (!proposals.length) {
    proposalList.replaceChildren(element('div', 'wb-proposal-empty', '当前描述可由已注册能力表达，没有发现需要伪装的功能。'));
    return;
  }
  proposalList.replaceChildren(...proposals.map((proposal) => {
    const card = element('article', 'wb-proposal');
    const head = element('div', 'wb-proposal-head');
    head.append(element('h3', '', proposal.title), element('span', 'wb-proposal-id', proposal.targetCapabilityId));
    const summary = element('p', '', proposal.summary);
    const meta = element('div', 'wb-proposal-meta');
    meta.append(element('span', '', proposal.kind), element('span', '', proposal.priority), element('span', '', `risk / ${proposal.risk}`));
    const actions = element('div', 'wb-proposal-actions');
    const inspectButton = element('button', '', '检查能力提案'); inspectButton.type = 'button';
    inspectButton.addEventListener('click', () => openArtifact('CapabilityProposal v1', proposal));
    const synthesizeButton = element('button', 'wb-proposal-synthesize', '生成隔离草案'); synthesizeButton.type = 'button';
    synthesizeButton.addEventListener('click', () => createSynthesisDraft(proposal));
    actions.append(inspectButton, synthesizeButton);
    card.append(head, summary, meta, actions);
    return card;
  }));
}

function createSynthesisDraft(proposal: CapabilityProposal): void {
  const workspace = synthesizeProposal(proposal);
  synthesisWorkspaces.set(proposal.id, workspace);
  openArtifact('SynthesisWorkspace v1', workspace);
  status.textContent = workspace.status === 'draft' ? `已生成 ${workspace.metrics.fileCount} 个虚拟文件；静态审计通过，但未执行、未注册。` : `隔离草案包含 ${workspace.metrics.blockingChecks} 个阻断项。`;
}

function renderCandidate(candidate: CreativeCandidate, index: number): HTMLElement {
  const card = element('article', 'wb-candidate'); card.dataset.candidateId = candidate.id;
  const visual = element('div', 'wb-candidate-visual'); visual.dataset.scene = candidate.direction.scenePlugin;
  visual.append(element('span', 'wb-card-index', `0${index + 1} / EFFECT DIRECTION`));
  const body = element('div', 'wb-card-body');
  const meta = element('div', 'wb-card-meta'); meta.append(element('span', '', candidate.effectSpec.route), element('span', '', `render / ${candidate.presentationStrategy.active}`));
  const title = element('h3', '', candidate.direction.title);
  const thesis = element('p', 'wb-card-thesis', candidate.direction.thesis);
  const metrics = element('div', 'wb-card-metrics');
  metrics.append(metric('页面章', candidate.experienceBlueprint?.chapters.length ?? Object.keys(candidate.manifest.nodes).length), metric('素材', candidate.effectSpec.assetRequirements.length), metric('Draw', candidate.capabilityPlan.estimated.drawCalls));
  const plan = element('span', 'wb-plan-status', `${candidate.experienceBlueprint ? 'model-authored page blueprint' : 'compatibility template'} · preferred ${candidate.presentationStrategy.preferred} · ${candidate.productionPlan.metrics.blocked} blocked`);
  const button = element('button', 'wb-select-candidate', '选择这个方向'); button.type = 'button';
  button.setAttribute('aria-pressed', 'false'); button.addEventListener('click', () => selectCandidate(candidate));
  body.append(meta, title, thesis, metrics, plan, button); card.append(visual, body); return card;
}

function selectCandidate(candidate: CreativeCandidate, showInStage = true, advanceWorkflow = true): void {
  selected = candidate;
  resetAssetProduction();
  resetReviewState();
  document.querySelectorAll<HTMLElement>('.wb-candidate').forEach((card) => {
    const active = card.dataset.candidateId === candidate.id; card.classList.toggle('is-selected', active);
    const button = card.querySelector<HTMLButtonElement>('button'); button?.setAttribute('aria-pressed', String(active));
    if (button) button.textContent = active ? '已选择' : '选择这个方向';
  });
  const savedId = persistGeneratedExperience(candidate.manifest);
  const url = new URL('./', location.href); url.searchParams.set('generated', savedId);
  if (candidate.direction.structure === 'branching') url.searchParams.set('choice', 'evidence');
  previewLink.href = url.href;
  const assetUsePolicy = decideImageAssetUse(candidate.effectSpec);
  const narrativeAssets = candidate.effectSpec.assetRequirements
    .filter((requirement) => requirement.experience)
    .sort((left, right) => left.experience!.anchor - right.experience!.anchor);
  const narrativeSummary = narrativeAssets.length
    ? narrativeAssets.map((requirement) => `${Math.round(requirement.experience!.anchor * 100)}% · ${requirement.experience!.function} · ${requirement.experience!.visualState}`).join(' → ')
    : '当前方案未声明外部素材关键时刻；由程序化场景或现有资产完成。';
  selectionSummary.innerHTML = `<strong>${escapeHtml(candidate.effectSpec.title)}</strong><p>${escapeHtml(candidate.effectSpec.thesis)}</p><p><b>网页来源：</b>${candidate.experienceBlueprint ? `模型直接编排 ${candidate.experienceBlueprint.chapters.length} 章、镜头与场景状态` : '本地兼容模板'} · ${escapeHtml(candidate.effectSpec.provenance.model)}</p><p><b>核心记忆点：</b>${escapeHtml(candidate.effectSpec.direction.signatureMoment)}</p><p><b>关键画面素材：</b>${escapeHtml(narrativeSummary)}</p><p><b>表现策略：</b>${escapeHtml(candidate.presentationStrategy.preferred)} → 当前 ${escapeHtml(candidate.presentationStrategy.active)} · ${escapeHtml(candidate.presentationStrategy.status)}</p><p><b>策略依据：</b>${escapeHtml(candidate.presentationStrategy.evidence.join(' '))}</p><p><b>模型/素材使用门禁：</b>${escapeHtml(assetUsePolicy.summary)}</p><p><b>生产策略：</b>${escapeHtml(candidate.productionPlan.strategy)} · ${escapeHtml(candidate.productionPlan.status)} · ${candidate.productionPlan.metrics.adapted} 项适配 · ${candidate.productionPlan.metrics.blocked} 项阻断</p><p><b>素材状态：</b>${escapeHtml(candidate.assetPlan.status)} · ${candidate.assetPlan.metrics.planned} 项待生成 · ${candidate.assetPlan.metrics.blocked} 项阻断</p><ul>${candidate.effectSpec.reasoning.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  selectionDetail.hidden = false;
  if (showInStage) showGeneratedPreview(candidate, url);
  syncAssetProductionAction();
  if (advanceWorkflow) setCreatorStep(4);
}

async function produceSelectedAssets(): Promise<AssetPreparationOutcome> {
  if (!selected || !run) return { status: 'blocked', route: 'blocked', assets: 0, message: '当前没有可生成素材的已选方向。' };
  const assetUsePolicy = decideImageAssetUse(selected.effectSpec);
  if (assetUsePolicy.decision !== 'approved') {
    status.textContent = assetUsePolicy.summary;
    return {
      status: assetUsePolicy.decision === 'not-needed' ? 'not-needed' : 'blocked',
      route: assetUsePolicy.decision === 'not-needed' ? 'procedural' : 'blocked',
      assets: 0,
      message: assetUsePolicy.summary
    };
  }
  assetProductionState = 'generating'; assetProductionError = null;
  produceAssetsButton.disabled = true; produceAssetsButton.textContent = 'MiniMax 正在生成并物化…';
  status.textContent = '正在调用 MiniMax image-01；结果会写入本地素材缓存，仍需真实页面视觉评审。';
  reportOutcomeRoute({ stage: 'assets', assetRoute: 'generate', message: 'MiniMax 仅作为当前素材缺口的备用；生成结果仍需进入 Codex 构建和浏览器验收。' });
  try {
    const report = await requestAssetProduction({ schemaVersion: 1, provider: 'minimax', brief: briefInput.value, effectSpec: selected.effectSpec, seed: generationSeed });
    const assetPlan = planAssets(selected.effectSpec, report.assets);
    const manifest = attachGeneratedAssets(selected.manifest, selected.effectSpec, report.assets);
    const profile = createProductionCapabilityProfile(run.interpretation.provenance.selected, run.interpretation.provenance.model, connectedMediaAdapters());
    const productionPlan = planCreativeProduction(selected.effectSpec, assetPlan, profile);
    const presentationStrategy = selectPresentationStrategy(selected.effectSpec, assetPlan, {
      quality: readQuality(qualitySelect.value),
      renderer: 'webgl',
      motion: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'full'
    });
    const produced: CreativeCandidate = { ...selected, assetPlan, manifest, productionPlan, presentationStrategy };
    run = { ...run, productionProfile: profile, candidates: run.candidates.map((candidate) => candidate.id === produced.id ? produced : candidate) };
    renderRun(run); selectCandidate(produced);
    assetProductionReport = report; assetProductionState = 'ready'; assetProductionButton.hidden = false;
    persistGeneratedExperience(produced.manifest);
    status.textContent = `${report.messages.join(' ')} 已切换为模型素材驱动的 Three.js 预览。`;
    return { status: 'ready', route: 'generate', assets: report.assets.length, message: report.messages.join(' ') };
  } catch (error) {
    assetProductionState = 'error'; assetProductionError = error instanceof Error ? error.message : String(error);
    errorPanel.textContent = assetProductionError; errorPanel.hidden = false;
    status.textContent = '素材没有被物化，原候选和预览保持不变。';
    reportOutcomeRoute({ stage: 'blocked', assetRoute: 'blocked', message: assetProductionError });
    return { status: 'blocked', route: 'blocked', assets: 0, message: assetProductionError };
  } finally {
    syncAssetProductionAction();
  }
}

async function prepareSelectedAssets(externalModalities: readonly string[] = []): Promise<AssetPreparationOutcome> {
  if (!selected || !run) return { status: 'blocked', route: 'blocked', assets: 0, message: '当前没有可执行素材判断的已选方向。' };
  const catalogAssets = selectProjectCreativeAssets(briefInput.value);
  const availableModalities = [...new Set([
    ...externalModalities,
    ...catalogAssets.map((asset) => asset.kind),
    ...(assetProductionReport?.assets.map((asset) => asset.modality) || [])
  ])];
  const minimax = providerAvailability?.providers.find((provider) => provider.id === 'minimax');
  const available = Boolean(minimax?.available && minimax.capabilities.includes('image-generation'));
  const matchedAssetCount = Math.max(catalogAssets.length, externalModalities.length, assetProductionReport?.assets.length || 0);
  const plan = planAssetResolution(selected.effectSpec, availableModalities, available, briefInput.value, matchedAssetCount);
  reportOutcomeRoute({ stage: plan.route === 'blocked' ? 'blocked' : 'assets', assetRoute: plan.route, assetCount: matchedAssetCount, message: plan.message });
  if (plan.route === 'catalog') return { status: 'ready', route: 'catalog', assets: matchedAssetCount, message: plan.message };
  if (plan.route === 'procedural') return { status: 'not-needed', route: 'procedural', assets: 0, message: plan.message };
  if (plan.route === 'blocked') return { status: 'blocked', route: 'blocked', assets: 0, message: plan.message };
  return produceSelectedAssets();
}

function runOfflineEvaluation(): void {
  if (!selected) return;
  const runtime = runtimeEvidenceBundle ? runtimeEvidenceForEvaluation(runtimeEvidenceBundle) : undefined;
  evaluationReport = evaluateCandidate(selected, runtime ? { runtime } : {});
  revisionPlan = compileRevisionPlan(evaluationReport, selected);
  evaluationReportButton.hidden = false;
  revisionPlanButton.hidden = false;
  evaluateButton.textContent = '重新运行离线评审';
  const passed = evaluationReport.checks.filter((check) => check.status === 'pass').length;
  const warned = evaluationReport.checks.filter((check) => check.status === 'warn').length;
  const failed = evaluationReport.checks.filter((check) => check.status === 'fail').length;
  status.textContent = `离线评审：${passed} 项通过，${warned} 项需关注，${failed} 项失败，${evaluationReport.manualCheckIds.length} 项需要打开真实预览判断。${runtime ? '已附加真实运行证据；' : ''}未调用视觉模型。`;
}

async function collectSelectedRuntimeEvidence(): Promise<void> {
  if (!selected || runtimeEvidenceState === 'collecting') return;
  const source = selected;
  runtimeEvidenceAbort = new AbortController();
  runtimeEvidenceState = 'collecting'; runtimeEvidenceBundle = null; runtimeEvidenceError = null;
  syncRuntimeEvidenceAction();
  status.textContent = '正在顺序采集桌面 WebGL、手机低画质 WebGL 和手机语义回退；这不是视觉审美评分。';
  try {
    const bundle = await collectRuntimeEvidence(previewLink.href, source.id, source.manifest.id, (completed, total, mode) => {
      status.textContent = `运行证据 ${completed}/${total}：${mode} 已完成。`;
    }, runtimeEvidenceAbort.signal);
    if (selected?.id !== source.id) {
      runtimeEvidenceState = 'stale'; runtimeEvidenceError = '采集期间候选发生变化，旧证据没有附加。';
      status.textContent = runtimeEvidenceError;
      return;
    }
    runtimeEvidenceBundle = bundle;
    runtimeEvidenceState = bundle.status === 'ready' ? 'ready' : 'error';
    runtimeEvidenceError = bundle.failures.join(' ') || null;
    runtimeEvidenceButton.hidden = false;
    runOfflineEvaluation();
  } catch (error) {
    runtimeEvidenceState = 'error'; runtimeEvidenceError = error instanceof Error ? error.message : String(error);
    if (isAbortError(error)) {
      runtimeEvidenceState = 'idle'; runtimeEvidenceError = null;
      status.textContent = '运行证据采集已取消；当前候选、评审和预览保持不变。';
      return;
    }
    errorPanel.textContent = runtimeEvidenceError; errorPanel.hidden = false;
    status.textContent = '运行证据采集失败；当前候选和原预览没有变化。';
  } finally {
    runtimeEvidenceAbort = null;
    syncRuntimeEvidenceAction();
  }
}

function applySelectedRevision(): void {
  if (!selected || !run) return;
  const source = selected;
  const compiled = compileLocalRevision(revisionInstruction.value, source);
  localRevisionResult = compiled.result;
  localRevisionState = compiled.result.status;
  revisionResultButton.hidden = false;
  if (!compiled.candidate) {
    status.textContent = `${compiled.result.summary} 原候选、证据和预览均未修改。`;
    return;
  }
  const revised = compiled.candidate;
  run = { ...run, candidates: run.candidates.map((candidate) => candidate.id === source.id ? revised : candidate) };
  renderRun(run);
  selectCandidate(revised);
  localRevisionResult = compiled.result;
  localRevisionState = 'applied';
  revisionResultButton.hidden = false;
  persistGeneratedExperience(revised.manifest);
  status.textContent = `${compiled.result.summary} 旧运行证据已失效；请为新候选重新采集。`;
  setCreatorStep(4);
}

function syncRuntimeEvidenceAction(): void {
  collectEvidenceButton.disabled = !selected;
  collectEvidenceButton.textContent = runtimeEvidenceState === 'collecting'
    ? '取消运行证据采集'
    : runtimeEvidenceState === 'ready' ? '重新采集运行证据' : '采集真实运行证据';
  collectEvidenceButton.title = '顺序启动同源受控预览；不会调用模型，也不会把运行快照当作审美判断。';
}

function resetReviewState(): void {
  resetEvaluation();
  runtimeEvidenceAbort?.abort(); runtimeEvidenceAbort = null; runtimeEvidenceState = 'idle'; runtimeEvidenceBundle = null; runtimeEvidenceError = null; runtimeEvidenceButton.hidden = true;
  localRevisionState = 'idle'; localRevisionResult = null; revisionResultButton.hidden = true;
  syncRuntimeEvidenceAction();
}

function resetEvaluation(): void {
  evaluationReport = null;
  revisionPlan = null;
  evaluationReportButton.hidden = true;
  revisionPlanButton.hidden = true;
  evaluateButton.textContent = '生成离线评审';
}

function resetAssetProduction(): void {
  assetProductionState = 'idle'; assetProductionReport = null; assetProductionError = null; assetProductionButton.hidden = true;
}

function syncAssetProductionAction(): void {
  const policy = selected ? decideImageAssetUse(selected.effectSpec) : null;
  const requirements = selected ? producibleImageRequirements(selected.effectSpec) : [];
  const minimax = providerAvailability?.providers.find((provider) => provider.id === 'minimax');
  const available = Boolean(minimax?.available && minimax.capabilities.includes('image-generation'));
  produceAssetsButton.disabled = assetProductionState === 'generating' || !selected || !requirements.length || !available;
  produceAssetsButton.textContent = assetProductionState === 'generating'
    ? 'MiniMax 正在生成并物化…'
    : policy?.decision === 'approved' ? available ? '生成已论证的高收益素材' : '高收益素材：等待 API' : policy?.decision === 'source-required' ? '需要真实来源素材' : '素材生成：无需调用';
  produceAssetsButton.title = !requirements.length
    ? policy?.summary || '当前 EffectSpec 没有通过素材收益门禁的需求。'
    : !available ? minimax?.reason || 'MiniMax 图片适配器不可用。' : `将执行 ${requirements.length} 个图片类素材需求。`;
}

function connectedMediaAdapters(): ProductionCapabilityAdapters {
  const minimax = providerAvailability?.providers.find((provider) => provider.id === 'minimax');
  if (!minimax?.available) return {};
  const adapters: ProductionCapabilityAdapters = {};
  if (minimax.capabilities.includes('image-generation')) adapters['image-generation'] = 'minimax-image-01';
  if (minimax.capabilities.includes('texture-generation')) adapters['texture-generation'] = 'minimax-image-01';
  return adapters;
}

function updateCount(): void { briefCount.textContent = `${briefInput.value.length} / 600`; }
function setCreatorStep(step: CreatorStep): void {
  creatorStep = step;
  document.body.dataset.creatorStep = String(step);
  creatorSteps.forEach((item) => {
    const itemStep = Number(item.dataset.creatorStep);
    item.classList.toggle('is-current', itemStep === step);
    item.classList.toggle('is-complete', itemStep < step);
    if (itemStep === step) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  });
}
function updateUrl(): void { const url = new URL(location.href); url.searchParams.set('brief', briefInput.value); url.searchParams.set('quality', qualitySelect.value); url.searchParams.set('provider', providerSelect.value); url.searchParams.set('seed', String(generationSeed)); if (generationJobId) { url.searchParams.set('job', generationJobId); url.searchParams.delete('autorun'); } history.replaceState(null, '', url); }

async function createGenerationJob(provider: Exclude<CreativeProviderId, 'local'>): Promise<string> {
  const response = await fetch('/api/creative/jobs', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ brief: briefInput.value.trim(), provider, quality: readQuality(qualitySelect.value), seed: generationSeed })
  });
  const body = await response.json() as { job?: { id: string }; error?: string };
  if (!response.ok || !body.job) throw new Error(body.error || `任务接口返回 ${response.status}`);
  localStorage.setItem('signal-lab:active-generation-job:v1', body.job.id);
  generationJobId = body.job.id;
  updateUrl();
  return body.job.id;
}

async function readGenerationJob(id: string): Promise<PersistentGenerationJobView | null> {
  try {
    const response = await fetch(`/api/creative/jobs/${id}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const body = await response.json() as { job?: PersistentGenerationJobView };
    return body.job || null;
  } catch { return null; }
}

async function updateGenerationJob(id: string, patch: Record<string, unknown>): Promise<void> {
  const response = await fetch(`/api/creative/jobs/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(patch)
  });
  if (!response.ok) throw new Error(`任务状态更新失败：${response.status}`);
}
function readQuality(value: string | null): EffectiveQuality { return value === 'high' || value === 'low' ? value : 'balanced'; }
function readSeed(value: string | null): number { if (value === null) return 17; const parsed = Number(value); return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 1_000_000 ? parsed : 17; }
function openArtifact(title: string, value: unknown): void {
  artifactTitle.textContent = title;
  manifestJson.textContent = JSON.stringify(value, null, 2);
  manifestDialog.showModal();
}

function updateProviderHelp(): void { syncProviderHelp(providerSelect, briefHelp); }
function updateGenerateLabel(): void { generateButton.textContent = '生成并构建最佳网页'; }
function reportOutcomeRoute(detail: OutcomeRouteInput): void { window.dispatchEvent(new CustomEvent('creative-lab:pipeline-stage', { detail })); }
function renderProvider(value: Parameters<typeof renderProviderProvenance>[2]): void { renderProviderProvenance(providerBadge, providerLabel, value); }
function renderAvailability(value: Parameters<typeof renderProviderAvailability>[3]): void { renderProviderAvailability(providerSelect, providerBadge, providerLabel, value); }
function metric(label: string, value: string | number): HTMLElement { const node = element('span'); node.append(element('b', '', String(value)), document.createTextNode(label)); return node; }
function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] { const node = document.createElement(tag); if (className) node.className = className; if (text) node.textContent = text; return node; }
function required<T extends Element>(selector: string): T { const node = document.querySelector<T>(selector); if (!node) throw new Error(`Workbench mount missing: ${selector}`); return node; }
function escapeHtml(value: string): string { const node = document.createElement('span'); node.textContent = value; return node.innerHTML; }
function createSnapshot(): WorkbenchSnapshot {
  const provenance = run?.interpretation.provenance;
  return {
    state,
    creatorStep,
    jobId: generationJobId,
    provider: run?.interpretation.providerId || activeInterpreter.id,
    requestedProvider: readProvider(providerSelect.value),
    model: provenance?.model || null,
    fallbackReason: provenance?.fallbackReason || null,
    cacheStatus: provenance?.cacheStatus || null,
    seed: generationSeed,
    runId: run?.id || null,
    selectedId: selected?.id || null,
    candidates: run?.candidates.map((candidate) => ({ id: candidate.id, structure: candidate.direction.structure, scenePlugin: candidate.direction.scenePlugin, nodeCount: Object.keys(candidate.manifest.nodes).length, planStatus: candidate.capabilityPlan.status, effectSource: candidate.effectSpec.provenance.source, productionStatus: candidate.productionPlan.status, productionMissing: candidate.productionPlan.missingCapabilities, productionAdaptations: candidate.productionPlan.metrics.adapted })) || [],
    capabilityProposals: run?.capabilityProposals.map(({ id, kind, targetCapabilityId, status }) => ({ id, kind, targetCapabilityId, status })) || [],
    synthesisWorkspaces: [...synthesisWorkspaces.values()].map((workspace) => ({ id: workspace.id, status: workspace.status, targetCapabilityId: workspace.targetCapabilityId, fileCount: workspace.metrics.fileCount, blockingChecks: workspace.metrics.blockingChecks })),
    assetProduction: { state: assetProductionState, reportId: assetProductionReport?.id || null, assets: assetProductionReport?.assets.length || 0, error: assetProductionError },
    evaluation: { state: evaluationReport ? 'ready' : 'idle', reportId: evaluationReport?.id || null, status: evaluationReport?.status || null, revisionPlanId: revisionPlan?.id || null, manualChecks: evaluationReport?.manualCheckIds.length || 0, blockingChecks: evaluationReport?.blockingCheckIds.length || 0 },
    runtimeEvidence: { state: runtimeEvidenceState, bundleId: runtimeEvidenceBundle?.id || null, samples: runtimeEvidenceBundle?.samples.map((sample) => sample.mode) || [], error: runtimeEvidenceError },
    localRevision: { state: localRevisionState, resultId: localRevisionResult?.id || null, revisedCandidateId: localRevisionResult?.revisedCandidateId || null, changedPaths: localRevisionResult?.changedPaths || [] },
    error: lastError
  };
}
function showShowcase(id: ShowcaseId): void {
  const showcase = showcaseExperiences[id];
  const fullUrl = new URL(showcase.url, location.href);
  const embedUrl = new URL(fullUrl);
  embedUrl.searchParams.set('embed', '1');
  stageStatus.textContent = 'LOADING LIVE EXPERIENCE…';
  stageTitle.textContent = showcase.title;
  stageDescription.textContent = showcase.description;
  stageOpen.href = fullUrl.href;
  stageProgress = .04;
  stageFrame.src = embedUrl.href;
  showcaseButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.showcase === id)));
}

function showGeneratedPreview(candidate: CreativeCandidate, fullUrl: URL): void {
  const embedUrl = new URL(fullUrl);
  embedUrl.searchParams.set('embed', '1');
  embedUrl.searchParams.set('quality', readQuality(qualitySelect.value));
  embedUrl.searchParams.set('motion', matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'full');
  stageStatus.textContent = 'LOADING GENERATED EXPERIENCE…';
  stageTitle.textContent = candidate.effectSpec.title;
  stageDescription.textContent = `${candidate.effectSpec.thesis} · 当前候选的真实 Three.js 预览。`;
  stageOpen.href = fullUrl.href;
  stageProgress = .04;
  stageFrame.src = embedUrl.href;
  showcaseButtons.forEach((button) => button.setAttribute('aria-pressed', 'false'));
  document.querySelector('.wb-creative-stage')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

function requestStageProgress(): void {
  if (stageSyncRaf) return;
  stageSyncRaf = requestAnimationFrame(() => {
    stageSyncRaf = 0;
    const delta = scrollY - lastStageScrollY;
    lastStageScrollY = scrollY;
    const rect = stageFrame.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < innerHeight) {
      stageProgress = Math.min(1, Math.max(0, stageProgress + delta / Math.max(innerHeight * 1.65, 1)));
      postStageProgress();
    }
  });
}

function postStageProgress(): void {
  stageFrame.contentWindow?.postMessage({ type: 'signal-lab:preview-progress', progress: stageProgress }, location.origin);
  const chapter = Math.min(4, Math.floor(stageProgress * 4) + 1);
  stageStatus.textContent = `LIVE / SHOT ${String(chapter).padStart(2, '0')} / POINTER + SCROLL`;
}
