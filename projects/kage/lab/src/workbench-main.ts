import './styles-workbench.css';
import './styles-workbench-provider.css';
import './styles-workbench-capabilities.css';
import './styles-r11.css';
import './styles-workbench-v2-contract.css';
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
import type { IntentProvenance } from './generation/intent-provenance.ts';
import { createCodexImageGenerationTasks } from './workbench-asset-recovery.ts';
import type { OutcomeAssetRoute, OutcomeRouteInput } from './workbench-outcome-route';
import { createV2CreativeContract } from './v2/creative-contract.ts';
import { summarizeV2CreativeContract, type V2WorkbenchContractSummary } from './v2/workbench-contract-summary.ts';
import { evaluateV2ContractHandshake } from './v2/build-launch.ts';
import { renderWorkbenchJobTelemetry, renderWorkbenchResultStatus } from './workbench-job-telemetry.ts';

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
const isPublishedWorkbench = import.meta.env.BASE_URL !== '/';
const runtimeBase = isPublishedWorkbench ? './v1/showcase/' : './';

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
  v2Contract: V2WorkbenchContractSummary | null;
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
const directionAnalysis = required<HTMLDetailsElement>('#direction-analysis');
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
const workbenchHomeLink = required<HTMLAnchorElement>('#workbench-home-link');
const workbenchGalleryLink = required<HTMLAnchorElement>('#workbench-gallery-link');
const publicWorkbenchNote = required<HTMLElement>('#public-workbench-note');
const v2ContractRoot = required<HTMLElement>('#v2-contract-summary');
const v2ContractState = required<HTMLElement>('#v2-contract-state');
const v2ContractReferences = required<HTMLElement>('#v2-contract-references');
const v2ContractCapabilities = required<HTMLElement>('#v2-contract-capabilities');
const v2ContractRenderer = required<HTMLElement>('#v2-contract-renderer');
const v2ContractLimits = required<HTMLElement>('#v2-contract-limits');
const v2ContractTitle = required<HTMLElement>('#v2-contract-title');
const v2ContractReferenceReasons = required<HTMLElement>('#v2-contract-reference-reasons');
const v2ContractCapabilityReasons = required<HTMLElement>('#v2-contract-capability-reasons');
const v2ContractReviewModes = required<HTMLElement>('#v2-contract-review-modes');
const v2ContractStyle = required<HTMLElement>('#v2-contract-style');
const v2ContractStyleDifference = required<HTMLElement>('#v2-contract-style-difference');
const intentOrigin = required<HTMLElement>('#intent-origin');
const intentSystemBoundary = required<HTMLElement>('#intent-system-boundary');
const executionTrace = required<HTMLElement>('#execution-trace');
const experienceQuality = required<HTMLElement>('#experience-quality');
const experienceQualityVerdict = required<HTMLElement>('#experience-quality-verdict');
const experienceQualityStructure = required<HTMLElement>('#experience-quality-structure');
const experienceQualityCoverage = required<HTMLElement>('#experience-quality-coverage');
const experienceQualityScore = required<HTMLElement>('#experience-quality-score');
const experienceQualityArchive = required<HTMLElement>('#experience-quality-archive');
const experienceQualitySummary = required<HTMLElement>('#experience-quality-summary');
const experienceQualityIssues = required<HTMLElement>('#experience-quality-issues');
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
let activeV2ContractSummary: V2WorkbenchContractSummary | null = null;
let focusGeneratedResult = false;
const params = new URLSearchParams(location.search);
let expectedV2ContractId: string | null = params.get('contract');
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
renderV2ContractForBrief(briefInput.value);
renderIntentBoundary(null, briefInput.value);
setCreatorStep(1);
if (isPublishedWorkbench) {
  workbenchHomeLink.href = './';
  workbenchGalleryLink.href = './v1/';
  publicWorkbenchNote.hidden = false;
}
window.__creativeLab = { snapshot: createSnapshot, prepareAssets: prepareSelectedAssets };

briefInput.addEventListener('input', () => { releaseV2LaunchBinding(); generationSeed = 17; updateCount(); renderV2ContractForBrief(briefInput.value); renderIntentBoundary(null, briefInput.value); setCreatorStep(1); });
generateButton.addEventListener('click', () => { focusGeneratedResult = true; void generate(); });
produceAssetsButton.addEventListener('click', () => void produceSelectedAssets());
assetProductionButton.addEventListener('click', () => { if (assetProductionReport) openArtifact('AssetProductionReport v1', assetProductionReport); });
evaluateButton.addEventListener('click', runOfflineEvaluation);
evaluationReportButton.addEventListener('click', () => { if (evaluationReport) openArtifact('EvaluationReport v1', evaluationReport); });
revisionPlanButton.addEventListener('click', () => { if (revisionPlan) openArtifact('RevisionPlan v1', revisionPlan); });
variationButton.addEventListener('click', () => {
  focusGeneratedResult = true;
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
  if (providerSelect.value !== 'local') renderPendingProviderSelection();
});
resetButton.addEventListener('click', () => {
  releaseV2LaunchBinding();
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
window.addEventListener('creative-lab:generation-job-updated', (event) => {
  if (!(event instanceof CustomEvent) || !event.detail?.job) return;
  renderPersistentGenerationProgress(event.detail.job as PersistentGenerationJobView);
});
void initialize();

async function initialize(): Promise<void> {
  const availability = isPublishedWorkbench ? null : await fetchProviderStatus();
  providerAvailability = availability;
  renderAvailability(availability);
  updateProviderHelp();
  const recovered = generationJobId ? await readGenerationJob(generationJobId) : null;
  if (recovered) {
    const recoveredBrief = recovered.intentProvenance?.rawUserBrief || recovered.brief;
    briefInput.value = recoveredBrief;
    updateCount();
    renderV2ContractForBrief(recoveredBrief);
    renderIntentBoundary(recovered.intentProvenance, recoveredBrief);
    updateUrl();
  }
  const contractHandshake = activeV2ContractSummary
    ? evaluateV2ContractHandshake(expectedV2ContractId, activeV2ContractSummary.contractId)
    : null;
  if (expectedV2ContractId && (!contractHandshake || !contractHandshake.allowed)) {
    state = 'error';
    lastError = contractHandshake?.state === 'invalid'
      ? 'V2 构建链接中的合同 ID 不合法，已停止自动生成。'
      : `V2 合同不一致，已停止自动生成：链接要求 ${expectedV2ContractId}，当前想法得到 ${activeV2ContractSummary?.contractId || '无有效合同'}。`;
    setV2ContractState('failed', 'V2 合同不一致 · 已停止');
    errorPanel.textContent = lastError;
    errorPanel.hidden = false;
    status.textContent = '没有创建生成任务。修改想法后可解除旧合同绑定，再重新生成。';
    generateButton.disabled = true;
    variationButton.disabled = true;
    return;
  }
  if (contractHandshake?.state === 'matched') setV2ContractState('ready', 'V2 合同已锁定 · 即将构建');
  if (recovered?.status === 'blocked' && recovered.assetGate?.decision === 'needs-codex-assets') {
    state = 'ready';
    renderPersistentGenerationProgress(recovered);
    setV2ContractState('ready', '关键素材请求已形成');
    setCreatorStep(2);
    generateButton.disabled = false;
    variationButton.disabled = false;
    updateGenerateLabel();
    return;
  }
  const bootstrap = decideWorkbenchBootstrap({
    autorun: params.get('autorun') === '1',
    provider: providerSelect.value,
    jobId: generationJobId,
    recovered
  });
  await generate(!bootstrap.runModel, bootstrap.resumeJobId);
  if (!bootstrap.runModel && providerSelect.value !== 'local') {
    renderPendingProviderSelection();
    status.textContent = recovered?.status === 'complete' ? '已恢复上次任务的最终最佳网页。' : '当前显示本地初稿；点击生成后才会调用所选模型 provider。';
    if (!recovered) setV2ContractState('ready', '约束预览 · 尚未启动生成');
  }
}

async function generate(forceLocal = false, resumeJobId: string | null = null): Promise<void> {
  state = 'generating'; lastError = null; selected = null; synthesisWorkspaces.clear(); selectionDetail.hidden = true; errorPanel.hidden = true;
  renderV2ContractForBrief(briefInput.value, 'generating');
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
    setV2ContractState('ready', '本地约束已用于快速草案');
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
    setV2ContractState('failed', '生成失败，约束仍保留');
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
  brief: string;
  intentProvenance: IntentProvenance | null;
  status: 'running' | 'review-required' | 'complete' | 'blocked' | 'failed';
  provider: Exclude<CreativeProviderId, 'local'>;
  selectedProvider: Exclude<CreativeProviderId, 'auto'> | null;
  stage: string;
  message: string;
  model: string | null;
  assetRoute: 'catalog' | 'generate' | 'procedural' | 'blocked' | null;
  assetCount: number;
  assetGate: {
    decision: 'ready' | 'needs-codex-assets';
    risk: 'low' | 'medium' | 'high';
    summary: string;
    acceptedAssetIds: string[];
    requests: Array<{
      requirementId: string;
      role: 'subject' | 'environment' | 'atmosphere' | 'information';
      modality: 'transparent-image' | 'image-sequence' | 'model-3d' | 'texture' | 'procedural';
      minimumQuality: 'L2-inspectable' | 'L3-presentable' | 'L4-cinematic';
      recommendedSource: 'chatgpt-imagegen' | 'user-or-licensed';
      reason: string;
      responsibility: string;
      continuity: string;
      integration: string;
      proof: string;
    }>;
  } | null;
  assetCompletion: {
    completionId: string;
    requirementIds: string[];
    status: 'requested' | 'resumed' | 'exhausted';
    submissionId: string | null;
    attempts: number;
  } | null;
  deliveryQuality: {
    renderQuality: 'high' | 'balanced' | 'low';
    targetAssetQuality: 'not-applicable' | 'L2-inspectable' | 'L3-presentable' | 'L4-cinematic';
    achievedAssetQuality: 'not-applicable' | 'L0-missing' | 'L1-placeholder' | 'L2-inspectable' | 'L3-presentable' | 'L4-cinematic';
    status: 'provisional' | 'prototype-only' | 'final-eligible';
    finalEligible: boolean;
    experience: {
      status: 'pending' | 'pass' | 'revise' | 'blocked';
      score: number | null;
      structureMode: V2WorkbenchContractSummary['structureMode'] | null;
      expectedStateCount: number;
      reviewedStateCount: number;
      stateCoverage: number;
      modelJudgment: 'pending' | 'pass' | 'revise';
      archiveEligible: boolean;
      summary: string;
      issues: string[];
    };
    summary: string;
  } | null;
  sourceReceipt: { id: string; previewUrl: string; model: string } | null;
  bestPreviewUrl: string | null;
  finalScore: number | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
  deadlineAt: string | null;
  phaseDurationsMs: { planning: number; assets: number; authoring: number; reviewing: number } | null;
  history: Array<{ stage: string; at: string; message: string }>;
  v2ContractSummary: V2WorkbenchContractSummary | null;
}

async function generatePersistentExperience(requested: Exclude<CreativeProviderId, 'local'>, resumeJobId: string | null): Promise<void> {
  run = null;
  selected = null;
  generateButton.disabled = true;
  generateButton.textContent = resumeJobId ? '服务端正在构建…' : '正在建立生成任务…';
  variationButton.disabled = true;
  candidateGrid.setAttribute('aria-busy', 'true');
  experienceQuality.hidden = true;
  candidateGrid.innerHTML = `<div class="wb-empty"><p>${resumeJobId ? '正在恢复已有任务。' : '正在建立服务端任务。'}</p></div>`;
  reportOutcomeRoute({ stage: 'interpret', message: '服务端正在理解目标；工作台只负责显示状态和最终网页。' });
  try {
    generationJobId = resumeJobId || await createGenerationJob(requested);
    updateUrl();
    generateButton.textContent = '服务端正在构建…';
    candidateGrid.innerHTML = '<div class="wb-empty"><p>服务端任务已建立；关闭或刷新页面不会中断。</p></div>';
    const job = await waitForPersistentGeneration(generationJobId);
    if (job.status === 'blocked' && job.assetGate?.decision === 'needs-codex-assets') {
      state = 'ready';
      setV2ContractState('ready', '关键素材请求已形成');
      setCreatorStep(2);
      errorPanel.hidden = true;
      status.textContent = job.message;
      reportOutcomeRoute({
        stage: 'blocked', assetRoute: 'blocked', assetCount: job.assetCount,
        model: job.model, score: null, message: job.message
      });
      return;
    }
    if (job.status === 'blocked') throw new Error(job.error || job.message);
    if (job.status === 'failed' && !job.bestPreviewUrl) throw new Error(job.error || job.message);
    state = 'ready';
    const visuallyAccepted = job.status === 'complete' && job.deliveryQuality?.finalEligible !== false;
    setV2ContractState(visuallyAccepted ? 'complete' : 'review', visuallyAccepted ? '最终结果已通过验收' : '网页已生成 · 待视觉定稿');
    setCreatorStep(visuallyAccepted ? 5 : 4);
    runIdLabel.textContent = `${job.id} · ${visuallyAccepted ? 'SERVER COMPLETE' : 'PAGE READY'} · ${job.model || 'Codex'}`;
    status.textContent = job.message;
    reportOutcomeRoute({
      stage: visuallyAccepted ? 'complete' : 'review-required',
      assetRoute: job.assetRoute || 'pending',
      assetCount: job.assetCount,
      model: job.model,
      score: job.finalScore,
      message: job.message,
    });
  } catch (error) {
    state = 'error';
    setV2ContractState('failed', '远程生成失败，约束仍保留');
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
  renderIntentBoundary(job.intentProvenance, job.brief);
  renderWorkbenchJobTelemetry(executionTrace, job);
  renderWorkbenchResultStatus(experienceQuality, {
    ...job,
    sourcePreviewUrl: job.sourceReceipt?.previewUrl || null,
  });
  if (job.v2ContractSummary) renderV2ContractSummary(
    job.v2ContractSummary,
    job.status === 'complete' ? 'complete' : job.status === 'running' ? 'generating' : job.status === 'review-required' || Boolean(job.bestPreviewUrl) ? 'review' : 'failed'
  );
  if (job.model) {
    const selected = job.selectedProvider || (job.provider === 'auto' ? 'codex' : job.provider);
    renderProvider({ requested: job.provider, selected, model: job.model, mode: selected === 'local' ? 'local' : 'remote', latencyMs: 0, fallbackReason: null, cacheStatus: 'bypass' });
  }
  const elapsedSeconds = Math.max(0, Math.round((Date.now() - Date.parse(job.createdAt)) / 1000));
  runIdLabel.textContent = `${job.id} · ${job.stage} · ${elapsedSeconds}s`;
  const deliveryStatus = job.deliveryQuality
    ? ` 素材交付：${job.deliveryQuality.achievedAssetQuality} / 目标 ${job.deliveryQuality.targetAssetQuality}。`
    : '';
  status.textContent = `${job.message}${deliveryStatus} 已用时 ${elapsedSeconds} 秒。`;
  if (job.assetGate?.decision === 'needs-codex-assets') {
    directionAnalysis.open = true;
    directionAnalysis.dataset.state = 'asset-blocked';
    candidateGrid.replaceChildren(renderAssetQualityGate(job.id, job.assetCompletion?.completionId || '', job.assetGate));
  } else if (candidateGrid.querySelector('.wb-asset-gate')) {
    directionAnalysis.open = false;
    delete directionAnalysis.dataset.state;
    candidateGrid.innerHTML = '<div class="wb-empty"><p>素材已绑定到原任务；Codex 正在继续构建专属网页。</p></div>';
  }
  const stage = job.stage === 'planning'
    ? 'interpret'
    : job.stage === 'assets'
      ? 'assets'
      : job.stage === 'authoring' || job.stage === 'compiling'
        ? 'authoring'
        : job.stage === 'reviewing' || job.stage === 'refining'
          ? 'reviewing'
          : job.stage === 'review-required' || Boolean(job.bestPreviewUrl)
            ? 'review-required'
          : job.status === 'complete' ? 'complete' : job.status === 'blocked' ? 'blocked' : 'failed';
  setCreatorStep(stage === 'interpret' || stage === 'assets' ? 2 : stage === 'authoring' ? 3 : stage === 'reviewing' || stage === 'review-required' ? 4 : stage === 'complete' ? 5 : 1);
  reportOutcomeRoute({
    stage,
    assetRoute: job.assetRoute || 'pending',
    assetCount: job.assetCount,
    model: job.model,
    score: job.finalScore,
    message: job.message,
  });
}

function renderProductExperienceQuality(value: PersistentGenerationJobView['deliveryQuality'] extends infer T
  ? T extends { experience: infer E } ? E | null : null
  : null): void {
  if (!value) {
    experienceQuality.hidden = true;
    return;
  }
  experienceQuality.hidden = false;
  experienceQuality.dataset.state = value.status === 'blocked' ? 'blocked' : value.status === 'pass' ? 'complete' : 'running';
  experienceQualityVerdict.textContent = value.status === 'pending'
    ? '方向已确定 · 等待生成'
    : value.status === 'pass'
      ? '检查通过'
      : value.status === 'revise'
        ? '需要调整'
        : '检查受阻';
  const page = experienceQuality.querySelector<HTMLElement>('[data-result-page]');
  const stopReason = experienceQuality.querySelector<HTMLElement>('[data-result-stop-reason]');
  const link = experienceQuality.querySelector<HTMLAnchorElement>('[data-result-link]');
  const issueDetails = experienceQuality.querySelector<HTMLDetailsElement>('[data-result-issue-details]');
  if (page) page.textContent = '尚未开始';
  experienceQualityStructure.textContent = value.structureMode ? structureModeLabel(value.structureMode) : '未形成 V2 结构';
  experienceQualityCoverage.textContent = value.expectedStateCount > 0
    ? `${value.reviewedStateCount} 个检查点 / ${value.expectedStateCount} 个产品状态`
    : '尚未开始';
  experienceQualityScore.textContent = value.score === null ? '等待网页生成' : `${value.score} / 100`;
  experienceQualityArchive.textContent = value.archiveEligible ? '已定稿 · 可入精选' : '尚未开始';
  experienceQualitySummary.textContent = value.summary;
  experienceQualityIssues.replaceChildren(...value.issues.map((issue) => element('li', '', issue)));
  if (stopReason) stopReason.textContent = '任务尚未开始；点击“生成并构建最佳网页”后执行。';
  if (link) {
    link.href = './';
    link.setAttribute('aria-disabled', 'true');
    link.tabIndex = -1;
  }
  if (issueDetails) issueDetails.hidden = value.issues.length === 0;
}

function renderAssetQualityGate(
  jobId: string,
  completionId: string,
  gate: NonNullable<PersistentGenerationJobView['assetGate']>
): HTMLElement {
  const tasks = completionId
    ? createCodexImageGenerationTasks(jobId, completionId, briefInput.value, gate.requests)
    : [];
  const panel = element('article', 'wb-asset-gate');
  const heading = element('div', 'wb-asset-gate__heading');
  heading.append(
    element('span', 'wb-asset-gate__eyebrow', 'ASSET QUALITY GATE'),
    element('h3', '', completionId
      ? `素材早检已停止 · 本次最多处理四项图片职责 · 当前 ${tasks.length} 项`
      : '素材早检已停止 · 正在恢复旧任务的素材完成合同')
  );
  panel.append(
    heading,
    element('p', 'wb-asset-gate__summary', `已接受 ${gate.acceptedAssetIds.length} 项 / 未通过 ${gate.requests.length} 项 / 不会自动重试。${gate.summary}`)
  );
  const list = element('ol', 'wb-asset-gate__list');
  tasks.forEach((task) => {
    const request = task.request;
    const item = element('li', 'wb-asset-gate__item');
    const title = element('strong', '', `${request.role} · ${request.modality} · ${request.minimumQuality}`);
    const source = request.recommendedSource === 'chatgpt-imagegen' ? '建议由 ChatGPT / Codex 生图' : '需要用户或授权素材';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'wb-asset-gate__copy';
    copy.textContent = '复制给 Codex';
    copy.addEventListener('click', () => void copyAssetRequestToClipboard(task.prompt, request.role, copy));
    item.append(
      title,
      element('span', 'wb-asset-gate__source', source),
      element('p', '', request.responsibility),
      element('small', '', `连续性：${request.continuity}`),
      element('small', '', `验收证据：${request.proof}`),
      element('small', 'wb-asset-gate__reason', request.reason),
      copy
    );
    list.append(item);
  });
  const remaining = Math.max(0, gate.requests.length - tasks.length);
  panel.append(list, element('p', 'wb-asset-gate__footer', completionId
    ? `Codex 编码尚未开始。当前只给出最多四项图片任务${remaining ? `；其余 ${remaining} 项职责不纳入本轮 Codex 生成` : ''}。复制任务或在下方登记候选素材后，只恢复并复检同一 Job 一次。普通 L2 上传不会被直接认定为 L3/L4。`
    : '旧任务正在补写一次性素材完成合同；不会新建 Job 或重跑创意理解。刷新一次即可取得可回传任务。'));
  return panel;
}

async function copyAssetRequestToClipboard(
  value: string,
  role: string,
  button: HTMLButtonElement
): Promise<void> {
  const original = button.textContent;
  button.disabled = true;
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
    else {
      const area = document.createElement('textarea');
      area.value = value;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.append(area);
      area.select();
      const copied = document.execCommand('copy');
      area.remove();
      if (!copied) throw new Error('浏览器未允许复制。');
    }
    button.textContent = '已复制';
    status.textContent = `已复制 ${role} 图片任务；文本包含 Job、完成批次和职责身份。带素材与审阅回执返回后，只恢复当前 Job。`;
  } catch (error) {
    button.textContent = '复制失败';
    status.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    window.setTimeout(() => {
      button.disabled = false;
      button.textContent = original;
    }, 1600);
  }
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
  const url = new URL(runtimeBase, location.href); url.searchParams.set('generated', savedId);
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
function renderV2ContractForBrief(brief: string, state: 'ready' | 'generating' = 'ready'): void {
  const started = performance.now();
  try {
    const contract = createV2CreativeContract(brief);
    const summary = summarizeV2CreativeContract(contract, performance.now() - started);
    renderV2ContractSummary(summary, state);
    renderProductExperienceQuality({
      status: 'pending',
      score: null,
      structureMode: summary.structureMode,
      expectedStateCount: summary.storyBeatCount,
      reviewedStateCount: 0,
      stateCoverage: 0,
      modelJudgment: 'pending',
      archiveEligible: false,
      summary: `${structureModeLabel(summary.structureMode)}已按产品目标规划；生成后将检查 ${summary.storyBeatCount} 个语义状态，而不是固定页面数量。`,
      issues: []
    });
  } catch {
    activeV2ContractSummary = null;
    experienceQuality.hidden = true;
    v2ContractRoot.dataset.state = 'idle';
    v2ContractState.textContent = '等待有效想法';
    v2ContractReferences.textContent = '补充主体与期望变化';
    v2ContractCapabilities.textContent = '尚未选择';
    v2ContractRenderer.textContent = '尚未选择';
    v2ContractLimits.textContent = '单候选 · 有限精修';
    v2ContractReferenceReasons.textContent = '等待目标后解释';
    v2ContractCapabilityReasons.textContent = '等待目标后解释';
    v2ContractReviewModes.textContent = '叙事状态 · 移动端减弱动效';
    v2ContractStyle.textContent = '等待目标';
    v2ContractStyleDifference.textContent = '等待目标后比较历史案例';
    v2ContractTitle.textContent = '描述至少包含主体、感受或希望发生的变化。';
  }
}
function renderV2ContractSummary(summary: V2WorkbenchContractSummary, state: 'ready' | 'generating' | 'review' | 'complete' | 'failed'): void {
  activeV2ContractSummary = summary;
  v2ContractRoot.dataset.state = state;
  v2ContractState.textContent = state === 'generating' ? '约束已锁定 · 正在构建' : state === 'review' ? '网页已生成 · 待视觉定稿' : state === 'complete' ? '最终结果已交付' : state === 'failed' ? '约束保留 · 可重试' : `本地决策 ${summary.preparedMs.toFixed(1)}ms`;
  v2ContractReferences.textContent = summary.referenceTitles.join(' · ');
  v2ContractCapabilities.textContent = summary.capabilityLabels.length ? summary.capabilityLabels.join(' · ') : '按目标定制，不强套原型';
  v2ContractRenderer.textContent = `${rendererRouteLabel(summary.rendererRoute)} · ${sceneCompositionRouteLabel(summary.sceneCompositionRoute)} · ${stateAssetRouteLabel(summary.stateAssetRoute)}`;
  v2ContractRenderer.title = summary.sceneCompositionReason;
  v2ContractLimits.textContent = `${structureModeLabel(summary.structureMode)} · ${summary.storyBeatCount} 个产品状态 / ${summary.reviewCheckpointCount} 个自适应检查点 · 最多 ${Math.min(1, summary.refinementPasses)} 次自动精修`;
  v2ContractLimits.title = summary.layoutRule;
  v2ContractReferenceReasons.textContent = summary.referenceReasons.slice(0, 2).join('；') || '依据目标语义选择已验证案例';
  v2ContractReferenceReasons.title = summary.referenceReasons.join('\n');
  v2ContractCapabilityReasons.textContent = summary.capabilityReasons.slice(0, 2).join('；') || '按目标职责组合能力';
  v2ContractCapabilityReasons.title = summary.capabilityReasons.join('\n');
  v2ContractReviewModes.textContent = summary.reviewModes.map(reviewModeLabel).join(' · ');
  v2ContractStyle.textContent = summary.styleSignature;
  v2ContractStyleDifference.textContent = summary.styleDifference;
  v2ContractTitle.textContent = summary.decisionSummary;
}
function reviewModeLabel(mode: V2WorkbenchContractSummary['reviewModes'][number]): string {
  return ({
    'story-beats': '叙事节拍',
    'mobile-reduced-motion': '移动端 / 减弱动效',
    'primary-causality': '真实输入 / 主体 / 结果 / 行动',
    'semantic-interaction': '语义交互',
    'shared-state-driver': '播放 / 滚轮 / 人工接管',
    'webgl-fallback': '无 WebGL 回退'
  } as const)[mode];
}
function structureModeLabel(mode: V2WorkbenchContractSummary['structureMode']): string {
  return ({
    'single-scene': '单一持续场景',
    'continuous-canvas': '连续画布',
    'guided-sequence': '引导序列',
    'interactive-field': '交互工作区',
    'horizontal-panorama': '横向连续图卷',
    'task-flow': '任务流程',
    'editorial-flow': '编辑流',
    'catalog': '目录',
    'branching-confluence': '分支汇合',
    'spatial-inspection': '空间动作检查场'
  } as const)[mode];
}
function setV2ContractState(state: 'ready' | 'generating' | 'review' | 'complete' | 'failed', label: string): void {
  if (!activeV2ContractSummary) return;
  v2ContractRoot.dataset.state = state;
  v2ContractState.textContent = label;
}
function rendererRouteLabel(route: V2WorkbenchContractSummary['rendererRoute']): string {
  return ({
    'dom-only': '语义 DOM',
    'dom-media-hybrid': 'DOM + 连续媒体',
    'dom-canvas-hybrid': 'DOM + Canvas / Shader',
    'dom-three-hybrid': 'DOM + Three.js 空间'
  } as const)[route];
}

function stateAssetRouteLabel(route: V2WorkbenchContractSummary['stateAssetRoute']): string {
  return ({
    'static-sufficient': '静态素材足够',
    'continuous-media-or-layered-subject': '连续/分层状态素材',
    'inspectable-model': '可检查真实模型',
    'procedural-state': '程序化状态主体'
  } as const)[route];
}
function sceneCompositionRouteLabel(route: V2WorkbenchContractSummary['sceneCompositionRoute']): string {
  return ({
    'single-image-hybrid': '单图/单平面增强',
    'layered-2d': '2.5D 独立分层',
    'spatial-3d': '真实空间模型'
  } as const)[route];
}
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
    body: JSON.stringify({
      brief: briefInput.value.trim(), provider, quality: readQuality(qualitySelect.value), seed: generationSeed,
      intentSource: 'workbench-user', experimentConstraints: [],
      expectedContractId: expectedV2ContractId || undefined
    })
  });
  const body = await response.json() as { job?: { id: string }; error?: string };
  if (!response.ok || !body.job) throw new Error(body.error || `任务接口返回 ${response.status}`);
  localStorage.setItem('signal-lab:active-generation-job:v1', body.job.id);
  generationJobId = body.job.id;
  updateUrl();
  return body.job.id;
}

function releaseV2LaunchBinding(): void {
  if (!expectedV2ContractId) return;
  expectedV2ContractId = null;
  const url = new URL(location.href);
  url.searchParams.delete('contract');
  url.searchParams.delete('source');
  url.searchParams.delete('autorun');
  history.replaceState(null, '', url);
  generateButton.disabled = false;
  variationButton.disabled = false;
  errorPanel.hidden = true;
}

function renderIntentBoundary(provenance: IntentProvenance | null, currentBrief: string): void {
  if (!provenance) {
    intentOrigin.textContent = generationJobId
      ? '历史任务 · 原始目标来源未记录；其中的实现限制不视为已确认用户要求'
      : `当前文本框输入 · ${currentBrief.length} 字 · 不允许系统静默改写`;
    intentSystemBoundary.textContent = '质量优先 · 素材、DOM、Canvas 与 Three.js 按目标选择；系统建议不能新增硬限制';
    return;
  }
  const source = provenance.submissionSource === 'workbench-user'
    ? '工作台用户输入'
    : provenance.submissionSource === 'system-validation'
      ? '系统验证任务'
      : 'API 提交';
  const constraints = provenance.userConstraints.length
    ? `；明确限制：${provenance.userConstraints.join(' / ')}`
    : '；没有提取到额外硬限制';
  intentOrigin.textContent = `${source} · 原文已锁定${constraints}`;
  intentSystemBoundary.textContent = provenance.experimentConstraints.length
    ? `质量优先；实验条件单独记录且不进入创意 brief：${provenance.experimentConstraints.join(' / ')}`
    : provenance.systemPreferences.join(' / ');
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
function renderPendingProviderSelection(): void {
  const selectedProvider = readProvider(providerSelect.value);
  if (selectedProvider === 'local') return;
  providerBadge.dataset.mode = 'remote';
  providerLabel.textContent = `${selectedProvider.toUpperCase()} SELECTED · LOCAL PREVIEW`;
  providerBadge.title = '当前画面是本地约束预览；点击生成后才会调用所选模型构建专属网页。';
}
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
    v2Contract: activeV2ContractSummary,
    error: lastError
  };
}
function showShowcase(id: ShowcaseId): void {
  const showcase = showcaseExperiences[id];
  const fullUrl = new URL(showcase.url, new URL(runtimeBase, location.href));
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
  if (focusGeneratedResult) {
    focusGeneratedResult = false;
    document.querySelector('.wb-creative-stage')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }
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
