import './styles-workbench-direct-code-r18.css';
import type { ExperienceManifest } from './experience/schema';
import { selectProjectCreativeAssets, type ProjectCreativeAsset } from './generation/creative-asset-catalog';
import { importedUserAssetSchema, type ImportedUserAsset } from './generation/asset-intake';
import { loadGeneratedExperience } from './generation/generated-store';
import type { AssetPreparationOutcome } from './workbench-main';
import type { OutcomeAssetRoute, OutcomeRouteInput } from './workbench-outcome-route';

interface DirectSnapshot {
  state: 'idle' | 'generating' | 'ready' | 'error';
  jobId: string | null;
  provider: string;
  seed: number;
  runId: string | null;
  selectedId: string | null;
  candidates: Array<{ id: string; scenePlugin: string; productionStatus: string }>;
}

interface DirectReceipt {
  id: string;
  provider: 'codex';
  model: string;
  status: 'compiled';
  previewUrl: string;
  files: number;
  assets: number;
  sourceBytes: number;
  hasShaders: boolean;
  compileMs: number;
  attempts: number;
}

interface DirectAssessment {
  verdict: 'pass' | 'revise' | 'blocked';
  score: number;
  findings: Array<{ severity: 'blocking' | 'major' | 'minor'; message: string }>;
}

interface DirectVisualAcceptance {
  verdict: 'pass' | 'revise';
  score: number;
  assetRole: 'dominant' | 'integrated' | 'supporting' | 'not-applicable';
  findings: Array<{ severity: 'major' | 'minor'; message: string }>;
}

interface DirectRefinementResult {
  status: 'kept' | 'refined' | 'rejected';
  parentId: string;
  receipt: DirectReceipt;
  sourceAssessment: DirectAssessment;
  finalAssessment: DirectAssessment;
  visualAcceptance: DirectVisualAcceptance;
  summary: string;
  resolved: string[];
  remaining: string[];
}

interface GenerationJobView {
  id: string;
  status: 'running' | 'complete' | 'blocked' | 'failed';
  executionOwner?: 'client' | 'server';
  stage: string;
  message: string;
  brief: string;
  sourceReceipt: DirectReceipt | null;
  bestReceipt: DirectReceipt | null;
  bestRunId: string | null;
  sourceScore: number | null;
  finalScore: number | null;
  error: string | null;
  retryableStage: string | null;
}

interface DirectRevisionResult {
  parentId: string;
  receipt: DirectReceipt;
  summary: string;
  changedFiles: string[];
}

type DirectAssetContext = Omit<ProjectCreativeAsset, 'tags'>;
type DirectWindow = Window & {
  __creativeLab?: {
    snapshot: () => DirectSnapshot;
    prepareAssets: (externalModalities?: readonly string[]) => Promise<AssetPreparationOutcome>;
  };
};

const briefInput = required<HTMLTextAreaElement>('#brief');
const qualitySelect = required<HTMLSelectElement>('#quality');
const previewLink = required<HTMLAnchorElement>('#preview-link');
const stageFrame = required<HTMLIFrameElement>('#creative-stage-frame');
const stageShell = required<HTMLElement>('.wb-stage-shell');
const stageTitle = required<HTMLElement>('#creative-stage-title');
const stageDescription = required<HTMLElement>('#creative-stage-description');
const stageStatus = required<HTMLElement>('#creative-stage-status');
const stageOpen = required<HTMLAnchorElement>('#creative-stage-open');
const status = required<HTMLElement>('#workbench-status');
const revisionInput = required<HTMLInputElement>('#revision-instruction');
const revisionButton = required<HTMLButtonElement>('#apply-revision-button');

const buildButton = document.createElement('button');
buildButton.id = 'build-dedicated-experience';
buildButton.className = 'wb-direct-build';
buildButton.type = 'button';
buildButton.textContent = '用 Codex 构建专属网页';
buildButton.disabled = true;
buildButton.hidden = true;

const refineButton = document.createElement('button');
refineButton.id = 'refine-dedicated-experience';
refineButton.className = 'wb-direct-refine';
refineButton.type = 'button';
refineButton.textContent = '自动视觉精修';
refineButton.disabled = true;
refineButton.hidden = true;
previewLink.after(buildButton);
buildButton.after(refineButton);


const receipt = createReceipt();
stageShell.before(receipt.root);
const assetIntake = createAssetIntake();
receipt.root.after(assetIntake.root);

let codexAvailable = false;
let buildState: 'idle' | 'generating' | 'compiled' | 'failed' = 'idle';
let sourceManifest: ExperienceManifest | null = null;
let sourceRunId: string | null = null;
let sourceSelectedId: string | null = null;
let activeReceipt: DirectReceipt | null = null;
let refinementState: 'idle' | 'reviewing' | 'ready' | 'failed' = 'idle';
let phaseTimer = 0;

let revisionState: 'idle' | 'revising' | 'ready' | 'failed' = 'idle';
let activeAssetRoute: OutcomeAssetRoute = 'pending';
let autoBuildRequested = false;
let autoBuildSawGeneration = false;
let activeJobId: string | null = /^job-[a-f0-9]{16}$/.test(new URLSearchParams(location.search).get('job') || '') ? new URLSearchParams(location.search).get('job') : null;
let jobPollInFlight = false;
let resumedRefinementJobId: string | null = null;
buildButton.addEventListener('click', () => void buildDedicatedExperience());
refineButton.addEventListener('click', () => void refineDedicatedPreview());
assetIntake.button.addEventListener('click', () => void importSelectedAsset());
window.addEventListener('creative-lab:selection-ready', (event) => {
  if (!(event instanceof CustomEvent) || event.detail?.autoBuild !== true) return;
  autoBuildRequested = true;
  autoBuildSawGeneration = true;
  buildButton.hidden = true;
  syncState();
});
stageFrame.addEventListener('load', () => {
  if (!activeReceipt || !stageFrame.src.includes(`/generated-runs/${activeReceipt.id}/`)) return;
  stageStatus.textContent = 'DEDICATED CODE / SANDBOXED / POINTER + SCROLL';
});
revisionButton.addEventListener('click', (event) => {
  if (!activeReceipt) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void reviseDedicatedPreview();
}, { capture: true });

const statePoll = window.setInterval(syncState, 180);
const jobPoll = window.setInterval(() => void recoverGenerationJob(), 1000);
addEventListener('pagehide', () => { clearInterval(statePoll); clearInterval(jobPoll); clearPhaseTimer(); }, { once: true });
void detectCodex().then(() => recoverGenerationJob());
syncState();

async function detectCodex(): Promise<void> {
  try {
    const response = await fetch('/api/creative/providers', { headers: { Accept: 'application/json' } });
    const body = await response.json() as { providers?: Array<{ id: string; available: boolean; reason: string | null }> };
    const codex = body.providers?.find((provider) => provider.id === 'codex');
    codexAvailable = Boolean(codex?.available);
    buildButton.title = codexAvailable ? '让 Codex 使用已匹配素材生成并编译本次作品专属的 Three.js 页面代码' : codex?.reason || 'Codex CLI 不可用';
    refineButton.title = codexAvailable ? '截图检查当前专属网页，再由 Codex 只针对真实视觉问题生成独立修订版' : codex?.reason || 'Codex CLI 不可用';
  } catch {
    codexAvailable = false;
    buildButton.title = '无法确认 Codex CLI 状态';
    refineButton.title = '无法确认 Codex CLI 状态';
  }
  syncState();
}

function syncState(): void {
  const snapshot = (window as DirectWindow).__creativeLab?.snapshot();
  if (snapshot?.jobId) activeJobId = snapshot.jobId;
  if (autoBuildRequested && snapshot?.state === 'generating') autoBuildSawGeneration = true;
  const selectionChanged = Boolean(
    snapshot?.runId
    && snapshot.selectedId
    && (sourceRunId !== snapshot.runId || sourceSelectedId !== snapshot.selectedId)
  );
  if (selectionChanged && snapshot?.runId && snapshot.selectedId) {
    const nextManifest = manifestFromPreview();
    if (nextManifest) {
      sourceRunId = snapshot.runId;
      sourceSelectedId = snapshot.selectedId;
      sourceManifest = nextManifest;
    }
    if (activeReceipt && !stageFrame.src.includes(`/generated-runs/${activeReceipt.id}/`)) resetDirectPreviewSecurity();
  }
  if (!sourceManifest && snapshot?.state === 'ready' && snapshot.selectedId) sourceManifest = manifestFromPreview();
  const busy = buildState === 'generating' || refinementState === 'reviewing' || revisionState === 'revising';
  buildButton.disabled = !codexAvailable || busy || snapshot?.state !== 'ready' || !snapshot.runId || !snapshot.selectedId || !sourceManifest;
  refineButton.hidden = !activeReceipt;
  refineButton.disabled = !codexAvailable || busy || !activeReceipt;
  if (autoBuildRequested && autoBuildSawGeneration && snapshot?.state === 'ready' && snapshot.runId && snapshot.selectedId && !busy && codexAvailable && sourceManifest) {
    autoBuildRequested = false;
    autoBuildSawGeneration = false;
    queueMicrotask(() => void buildDedicatedExperience());
  }
}

async function buildDedicatedExperience(): Promise<void> {
  const snapshot = (window as DirectWindow).__creativeLab?.snapshot();
  const candidate = snapshot?.candidates.find((item) => item.id === snapshot.selectedId);
  const manifest = sourceManifest || manifestFromPreview();
  if (!snapshot?.runId || !snapshot.selectedId || !candidate || !manifest) {
    status.textContent = '当前结果缺少可供专属代码生成使用的运行上下文。';
    return;
  }

  let activeManifest = manifest;
  let assets = collectAssetContext(activeManifest, briefInput.value);
  status.textContent = '正在判断当前目标是否需要外部素材，并检查可用素材来源。';
  reportPipeline({ stage: 'assets', assetRoute: 'pending', assetCount: assets.length });
  await updateActiveJob({ stage: 'assets', message: '正在判断当前目标是否需要外部素材，并检查可用素材来源。' });
  const preparation = await (window as DirectWindow).__creativeLab?.prepareAssets(assets.map((asset) => asset.kind));
  if (!preparation) {
    renderAssetBlocked('工作台素材准备能力尚未就绪。');
    status.textContent = '素材判断未完成，尚未调用 Codex 构建。';
    await updateActiveJob({ stage: 'blocked', message: '工作台素材准备能力尚未就绪。', error: '工作台素材准备能力尚未就绪。' });
    return;
  }
  if (preparation.status === 'blocked') {
    activeAssetRoute = 'blocked';
    reportPipeline({ stage: 'blocked', assetRoute: 'blocked', message: preparation.message });
    renderAssetBlocked(preparation.message);
    status.textContent = `已停在素材阶段：${preparation.message}`;
    buildButton.textContent = '素材就绪后重新构建';
    await updateActiveJob({ stage: 'blocked', message: preparation.message, error: preparation.message });
    return;
  }
  activeAssetRoute = preparation.route;
  sourceManifest = manifestFromPreview() || sourceManifest;
  activeManifest = sourceManifest || manifest;
  hideAssetIntake();
  assets = collectAssetContext(activeManifest, briefInput.value);
  status.textContent = preparation.status === 'ready'
    ? `素材已就绪：${preparation.message}`
    : `已确认无需外部素材：${preparation.message}`;

  const startedAt = performance.now();
  buildState = 'generating';
  stageShell.dataset.pipelineState = 'authoring';
  buildButton.hidden = true;
  buildButton.disabled = true;
  buildButton.textContent = 'Codex 正在编写专属代码…';
  renderGeneratingReceipt(assets.length, startedAt);
  status.textContent = assets.length
    ? `已匹配 ${assets.length} 个有来源素材；Codex 正在把素材、Three.js 场景与页面叙事编译成独立作品。`
    : '素材门禁确认当前目标适合程序化表达；Codex 正在生成独立 Three.js 页面文件。';
  reportPipeline({
    stage: 'authoring',
    assetRoute: activeAssetRoute,
    assetCount: Math.max(preparation.assets, assets.length),
    message: assets.length ? `已确认 ${assets.length} 个有来源素材，正在编译独立 Three.js 作品。` : '素材门禁确认适合程序化表达，正在编译独立 Three.js 作品。'
  });
  try {
    const response = await fetch('/api/creative/code/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        ...(snapshot.jobId ? { jobId: snapshot.jobId } : {}),
        brief: briefInput.value,
        seed: snapshot.seed,
        quality: readQuality(qualitySelect.value),
        runId: snapshot.runId,
        selectedId: snapshot.selectedId,
        reference: {
          title: activeManifest.title,
          summary: activeManifest.summary,
          scenePlugin: candidate.scenePlugin,
          productionStatus: candidate.productionStatus,
          theme: activeManifest.theme,
          assets
        }
      })
    });
    const body = await response.json() as { receipt?: DirectReceipt; error?: string };
    if (!response.ok || !body.receipt) throw new Error(body.error || `专属代码接口返回 ${response.status}`);
    const totalMs = Math.max(0, Math.round(performance.now() - startedAt));
    activeReceipt = body.receipt;
    buildState = 'compiled';
    refinementState = 'idle';
    refineButton.textContent = '自动视觉精修';
    revisionState = 'idle';
    clearPhaseTimer();
    renderCompiledReceipt(body.receipt, totalMs);
    showDedicatedPreview(body.receipt, activeManifest);
    buildButton.hidden = true;
    buildButton.textContent = '重新生成专属网页';
    status.textContent = `专属网页已由 ${body.receipt.model} 生成并通过 TypeScript 编译；总耗时 ${formatDuration(totalMs)}，其中编译 ${body.receipt.compileMs}ms。`;
    reportPipeline({ stage: 'reviewing', assetRoute: activeAssetRoute, assetCount: body.receipt.assets, model: body.receipt.model });
    await refineDedicatedPreview(true);
  } catch (error) {
    buildState = 'failed';
    clearPhaseTimer();
    const message = error instanceof Error ? error.message : String(error);
    renderFailedReceipt(message);
    buildButton.hidden = false;
    buildButton.textContent = '重试专属代码生成';
    status.textContent = `专属代码没有通过构建，原预览保持不变：${message}`;
    reportPipeline({ stage: 'failed', assetRoute: activeAssetRoute, message });
  } finally {
    syncState();
  }
}

async function refineDedicatedPreview(automatic = false): Promise<void> {
  const current = activeReceipt;
  const manifest = sourceManifest || manifestFromPreview();
  if (!current) {
    status.textContent = '请先构建一个专属网页，再启动自动视觉精修。';
    return;
  }
  refinementState = 'reviewing';
  stageShell.dataset.pipelineState = 'reviewing';
  refineButton.textContent = '正在截图并视觉精修…';
  renderReviewingReceipt(current);
  status.textContent = automatic
    ? '专属代码已编译；正在自动采集四个真实页面状态并选择最佳版本。'
    : '正在采集首屏、中段、末段与移动端四个真实状态；Codex 将基于截图决定保留或生成独立修订版。';
  reportPipeline({
    stage: 'reviewing',
    assetRoute: activeAssetRoute,
    assetCount: current.assets,
    model: current.model,
    message: '正在检查首屏、中段、末段与移动端，并在原版和独立修订版之间选择更好的一个。'
  });
  syncState();
  if (automatic) refineButton.hidden = true;
  try {
    const response = await fetch('/api/creative/code/refine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: current.id, ...(activeJobId ? { jobId: activeJobId } : {}) })
    });
    const body = await response.json() as { result?: DirectRefinementResult; error?: string };
    if (!response.ok || !body.result) throw new Error(body.error || `视觉精修接口返回 ${response.status}`);
    const result = body.result;
    activeReceipt = result.receipt;
    buildState = 'compiled';
    refinementState = 'ready';
    stageShell.dataset.pipelineState = 'complete';
    persistPipelineSelection(result);
    renderRefinementReceipt(result);
    if (result.status === 'refined') {
      if (manifest) showDedicatedPreview(result.receipt, manifest); else showRecoveredPreview(result.receipt, briefInput.value, true);
      refineButton.textContent = '再次视觉评审';
      status.textContent = `视觉精修完成：机械质量 ${result.sourceAssessment.score} → ${result.finalAssessment.score}，独立视觉验收 ${result.visualAcceptance.score} 分；右侧展示通过双门禁的新版本。`;
    } else if (result.status === 'kept') {
      refineButton.textContent = '重新视觉评审';
      status.textContent = `当前版本通过机械评审 ${result.finalAssessment.score} 分与独立视觉验收 ${result.visualAcceptance.score} 分；没有为了“改动”而强行重写。`;
    } else {
      refineButton.textContent = '重试视觉精修';
      status.textContent = `候选修订版未通过浏览器门禁，已自动回退并保留原版本：${result.summary}`;
    }
    reportPipeline({
      stage: 'complete',
      assetRoute: activeAssetRoute,
      assetCount: result.receipt.assets,
      model: result.receipt.model,
      score: result.visualAcceptance.score,
      message: result.status === 'refined'
        ? `独立精修版通过验收并成为唯一最佳结果，视觉验收 ${result.visualAcceptance.score} 分。`
        : result.status === 'kept'
          ? `原版本通过验收并被保留，视觉验收 ${result.visualAcceptance.score} 分。`
          : `修订版未通过，已自动回退并保留更好的原版本。`
    });
  } catch (error) {
    refinementState = 'failed';
    stageShell.dataset.pipelineState = 'review-failed';
    const message = error instanceof Error ? error.message : String(error);
    renderFailedReceipt(message);
    refineButton.textContent = '重试视觉精修';
    status.textContent = `视觉精修未完成，原专属网页保持不变：${message}`;
    reportPipeline({ stage: 'failed', assetRoute: activeAssetRoute, model: current.model, message: `视觉验收未完成，原专属网页保持不变：${message}` });
  } finally {
    syncState();
  }
}


async function updateActiveJob(patch: Record<string, unknown>): Promise<void> {
  if (!activeJobId) return;
  await fetch(`/api/creative/jobs/${activeJobId}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(patch)
  }).catch(() => undefined);
}

async function recoverGenerationJob(): Promise<void> {
  if (jobPollInFlight) return;
  const snapshot = (window as DirectWindow).__creativeLab?.snapshot();
  const jobId = snapshot?.jobId || activeJobId;
  if (!jobId) return;
  jobPollInFlight = true;
  try {
    const response = await fetch(`/api/creative/jobs/${jobId}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) return;
    const body = await response.json() as { job?: GenerationJobView };
    const job = body.job;
    if (!job) return;
    activeJobId = job.id;
    if (job.status === 'complete' && job.bestReceipt && activeReceipt?.id !== job.bestReceipt.id) {
      activeReceipt = job.bestReceipt;
      buildState = 'compiled';
      refinementState = 'ready';
      stageShell.dataset.pipelineState = 'complete';
      stageShell.dataset.finalRunId = job.bestReceipt.id;
      renderCompiledReceipt(job.bestReceipt);
      const visuallyAccepted = job.finalScore !== null;
      showRecoveredPreview(job.bestReceipt, job.brief, visuallyAccepted);
      status.textContent = visuallyAccepted
        ? `已恢复最终最佳网页 ${job.bestReceipt.id}；案例只使用这个经过视觉评审的版本。`
        : `已恢复可运行网页 ${job.bestReceipt.id}；${job.message}`;
      activeAssetRoute = job.bestReceipt.assets > 0 ? 'catalog' : 'procedural';
      reportPipeline({
        stage: visuallyAccepted ? 'complete' : 'reviewing',
        assetRoute: activeAssetRoute,
        assetCount: job.bestReceipt.assets,
        model: job.bestReceipt.model,
        score: job.finalScore,
        message: visuallyAccepted ? `已恢复经过浏览器视觉评审的最终最佳网页 ${job.bestReceipt.id}。` : job.message
      });
      return;
    }
    if (job.status === 'running') {
      if (buildState === 'idle') {
        receipt.root.hidden = false;
        receipt.root.dataset.state = 'reviewing';
        receipt.state.textContent = `GENERATION JOB · ${job.stage.toUpperCase()}`;
        receipt.note.textContent = `${job.id} · 刷新后仍可接续`;
        receipt.files.textContent = 'SERVER PERSISTED';
        receipt.filesNote.textContent = job.message;
        receipt.compile.textContent = 'IN PROGRESS';
        receipt.security.textContent = 'LOCAL JOB';
        receipt.runtime.textContent = 'RECOVERABLE';
      }
      if ((job.stage === 'reviewing' || job.stage === 'refining') && job.sourceReceipt && activeReceipt?.id !== job.sourceReceipt.id) {
        activeReceipt = job.sourceReceipt;
        showRecoveredPreview(job.sourceReceipt, job.brief, false);
        status.textContent = `${job.message} 当前可先查看已编译网页，视觉检查在后台继续。`;
      }
      if (job.executionOwner !== 'server' && job.stage === 'reviewing' && job.sourceReceipt && buildState !== 'generating' && refinementState !== 'reviewing' && resumedRefinementJobId !== job.id) {
        resumedRefinementJobId = job.id;
        void refineDedicatedPreview(true);
      }
      return;
    }
    if (job.status === 'blocked') {
      renderAssetBlocked(job.error || job.message);
      status.textContent = `任务停在真实素材门禁：${job.message}`;
      activeAssetRoute = 'blocked';
      reportPipeline({ stage: 'blocked', assetRoute: 'blocked', message: job.message });
    } else if (job.status === 'failed') {
      renderFailedReceipt(job.error || job.message);
      status.textContent = `任务可从 ${job.retryableStage || '当前阶段'} 重试；已完成结果不会丢失。`;
      reportPipeline({ stage: 'failed', assetRoute: activeAssetRoute, message: job.error || job.message });
    }
  } finally {
    jobPollInFlight = false;
  }
}

function showRecoveredPreview(next: DirectReceipt, brief: string, visuallyAccepted = false): void {
  const fullUrl = new URL(next.previewUrl, location.href);
  fullUrl.searchParams.set('quality', readQuality(qualitySelect.value));
  fullUrl.searchParams.set('motion', matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'full');
  const frameUrl = new URL(fullUrl);
  frameUrl.searchParams.set('embed', '1');
  stageFrame.setAttribute('sandbox', 'allow-scripts');
  stageFrame.src = frameUrl.href;
  stageTitle.textContent = visuallyAccepted ? '最终最佳网页 · 已恢复' : '可运行网页 · 待视觉确认';
  stageDescription.textContent = visuallyAccepted
    ? `${brief.slice(0, 90)} · ${next.model} · 四状态视觉评审后选中。`
    : `${brief.slice(0, 90)} · ${next.model} · 已编译并通过结构检查，视觉结论待确认。`;
  stageOpen.href = fullUrl.href;
  previewLink.href = fullUrl.href;
  stageStatus.textContent = 'LOADING FINAL BEST…';
}

function persistPipelineSelection(result: DirectRefinementResult): void {
  const record = {
    schemaVersion: 1,
    brief: briefInput.value.trim(),
    sourceRunId: result.parentId,
    finalRunId: result.receipt.id,
    decision: result.status,
    sourceScore: result.sourceAssessment.score,
    finalScore: result.finalAssessment.score,
    selectedAt: new Date().toISOString()
  };
  localStorage.setItem('signal-lab:last-best-pipeline:v1', JSON.stringify(record));
  stageShell.dataset.finalRunId = result.receipt.id;
  window.dispatchEvent(new CustomEvent('creative-lab:pipeline-complete', { detail: record }));
}

async function reviseDedicatedPreview(): Promise<void> {
  const current = activeReceipt;
  const manifest = sourceManifest || manifestFromPreview();
  const instruction = revisionInput.value.trim();
  if (!current || !manifest) {
    status.textContent = '请先生成一个专属网页，再用自然语言继续修改。';
    return;
  }
  if (instruction.length < 4) {
    status.textContent = '请具体描述想改变的画面、交互、节奏或内容。';
    revisionInput.focus();
    return;
  }
  revisionState = 'revising';
  revisionButton.disabled = true;
  revisionButton.textContent = 'Codex 正在修改当前网页…';
  receipt.root.hidden = false;
  receipt.root.dataset.state = 'reviewing';
  receipt.state.textContent = 'TARGETED REVISION';
  receipt.note.textContent = instruction;
  receipt.files.textContent = 'CHANGED FILES ONLY';
  receipt.filesNote.textContent = 'parent remains runnable';
  receipt.compile.textContent = 'WAITING';
  receipt.compileNote.textContent = 'TypeScript gate follows';
  receipt.security.textContent = 'NETWORK DISABLED';
  receipt.securityNote.textContent = 'existing paths only';
  receipt.runtime.textContent = 'CODEX 5.6';
  receipt.runtimeNote.textContent = 'medium reasoning · one pass';
  status.textContent = '正在根据这句话修改当前专属网页；只重写必要文件，原版本会保留。';
  syncState();
  try {
    const response = await fetch('/api/creative/code/revise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: current.id, instruction })
    });
    const body = await response.json() as { result?: DirectRevisionResult; error?: string };
    if (!response.ok || !body.result) throw new Error(body.error || `增量修改接口返回 ${response.status}`);
    activeReceipt = body.result.receipt;
    buildState = 'compiled';
    revisionState = 'ready';
    renderCompiledReceipt(body.result.receipt);
    receipt.state.textContent = 'NATURAL-LANGUAGE REVISION';
    receipt.note.textContent = body.result.summary;
    receipt.files.textContent = `${body.result.changedFiles.length} FILES CHANGED`;
    receipt.filesNote.textContent = body.result.changedFiles.join(' · ');
    receipt.securityNote.textContent = `parent ${body.result.parentId}`;
    showDedicatedPreview(body.result.receipt, manifest);
    revisionInput.value = '';
    status.textContent = `修改完成：${body.result.summary}。原版本 ${body.result.parentId} 仍可运行，现在展示独立子版本。`;
  } catch (error) {
    revisionState = 'failed';
    const message = error instanceof Error ? error.message : String(error);
    renderFailedReceipt(message);
    status.textContent = `这次修改没有通过构建，当前网页保持不变：${message}`;
  } finally {
    revisionButton.disabled = false;
    revisionButton.textContent = '修改当前专属网页';
    syncState();
  }
}

function showDedicatedPreview(next: DirectReceipt, manifest: ExperienceManifest): void {
  const fullUrl = new URL(next.previewUrl, location.href);
  fullUrl.searchParams.set('quality', readQuality(qualitySelect.value));
  fullUrl.searchParams.set('motion', matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'full');
  const frameUrl = new URL(fullUrl);
  frameUrl.searchParams.set('embed', '1');
  stageFrame.setAttribute('sandbox', 'allow-scripts');
  stageFrame.src = frameUrl.href;
  stageTitle.textContent = `${manifest.title} · 专属代码版`;
  stageDescription.textContent = `${next.files} 个模型生成文件，${next.assets} 个已证明来源的素材，${formatBytes(next.sourceBytes)}，本地 TypeScript 编译通过。`;
  stageOpen.href = fullUrl.href;
  previewLink.href = fullUrl.href;
  stageStatus.textContent = 'LOADING DEDICATED CODE…';
}

function resetDirectPreviewSecurity(): void {
  stageFrame.removeAttribute('sandbox');
  activeReceipt = null;
  buildState = 'idle';
  refinementState = 'idle';
  refineButton.hidden = true;
  refineButton.textContent = '自动视觉精修';
  revisionState = 'idle';
  activeAssetRoute = 'pending';
}

function reportPipeline(detail: OutcomeRouteInput): void {
  window.dispatchEvent(new CustomEvent('creative-lab:pipeline-stage', { detail }));
}

function manifestFromPreview(): ExperienceManifest | null {
  try {
    const id = new URL(previewLink.href, location.href).searchParams.get('generated');
    return id ? loadGeneratedExperience(id) : null;
  } catch { return null; }
}

function renderGeneratingReceipt(assetCount: number, startedAt: number): void {
  receipt.root.hidden = false;
  receipt.root.dataset.state = 'generating';
  const assetRoute = assetCount ? `${assetCount} 个获批素材` : '程序化 Three.js 路线';
  hideAssetIntake();
  const render = (): void => {
    receipt.state.textContent = 'CODEX PIPELINE';
    receipt.note.textContent = `${assetRoute} · 已用时 ${formatDuration(performance.now() - startedAt)}`;
    receipt.files.textContent = 'MODEL AUTHORING';
    receipt.filesNote.textContent = '等待完整 bundle 回执';
    receipt.compile.textContent = 'QUEUED';
    receipt.compileNote.textContent = '模型返回后执行';
    receipt.security.textContent = 'POLICY READY';
    receipt.securityNote.textContent = '路径 · 导入 · 网络 · 素材 URI';
    receipt.runtime.textContent = 'QUEUED';
    receipt.runtimeNote.textContent = '编译通过后加载';
  };
  clearPhaseTimer();
  render();
  phaseTimer = window.setInterval(render, 1000);
}

function renderCompiledReceipt(next: DirectReceipt, totalMs = 0): void {
  receipt.root.hidden = false;
  receipt.root.dataset.state = 'compiled';
  receipt.state.textContent = `CODEX · ${next.model.toUpperCase()}`;
  receipt.note.textContent = `${next.id} · attempt ${next.attempts} · total ${formatDuration(totalMs)}`;
  receipt.files.textContent = `${next.files} FILES · ${next.assets} ASSETS`;
  receipt.filesNote.textContent = formatBytes(next.sourceBytes);
  receipt.compile.textContent = 'COMPILED';
  receipt.compileNote.textContent = `${next.compileMs}ms`;
  receipt.security.textContent = 'SANDBOXED';
  receipt.securityNote.textContent = 'network disabled';
  receipt.runtime.textContent = next.hasShaders ? 'THREE + SHADER' : 'THREE.JS';
  receipt.runtimeNote.textContent = next.assets ? 'asset-aware module' : 'procedural module';
}

function renderReviewingReceipt(current: DirectReceipt): void {
  receipt.root.hidden = false;
  receipt.root.dataset.state = 'reviewing';
  receipt.state.textContent = 'VISUAL REVIEW';
  receipt.note.textContent = `${current.id} · four browser states`;
  receipt.files.textContent = '4 FRAMES';
  receipt.filesNote.textContent = 'opening · middle · final · mobile';
  receipt.compile.textContent = 'EVIDENCE FIRST';
  receipt.compileNote.textContent = 'overflow · collision · progress';
  receipt.security.textContent = 'LOCAL ONLY';
  receipt.securityNote.textContent = 'original is immutable';
  receipt.runtime.textContent = 'CODEX JUDGING';
  receipt.runtimeNote.textContent = 'keep or isolated revision';
}

function renderRefinementReceipt(result: DirectRefinementResult): void {
  receipt.root.hidden = false;
  receipt.root.dataset.state = result.status;
  receipt.state.textContent = result.status === 'refined' ? 'VISUALLY REFINED' : result.status === 'kept' ? 'CURRENT VERSION KEPT' : 'REVISION REJECTED';
  receipt.note.textContent = result.summary.slice(0, 240);
  receipt.files.textContent = `SCORE ${result.sourceAssessment.score} → ${result.finalAssessment.score}`;
  receipt.filesNote.textContent = `${result.resolved.length} resolved · ${result.remaining.length} remaining`;
  receipt.compile.textContent = result.status === 'rejected' ? 'BLOCKED' : 'BROWSER CHECKED';
  receipt.compileNote.textContent = result.finalAssessment.verdict.toUpperCase();
  receipt.security.textContent = result.status === 'refined' ? 'NEW VERSION' : 'ORIGINAL KEPT';
  receipt.securityNote.textContent = result.status === 'refined' ? `parent ${result.parentId}` : 'non-destructive recovery';
  receipt.runtime.textContent = result.receipt.hasShaders ? 'THREE + SHADER' : 'THREE.JS';
  const firstFinding = result.finalAssessment.findings[0]?.message;
  receipt.runtimeNote.textContent = firstFinding || 'no mechanical blocker';
}


function renderFailedReceipt(message: string): void {
  receipt.root.hidden = false;
  receipt.root.dataset.state = 'failed';
  receipt.state.textContent = 'BUILD REJECTED';
  receipt.note.textContent = message.slice(0, 240);
  receipt.files.textContent = 'NOT APPLIED';
  receipt.compile.textContent = 'FAILED';
  receipt.security.textContent = 'OLD PREVIEW KEPT';
  receipt.runtime.textContent = 'SAFE RECOVERY';
}

function renderAssetBlocked(message: string): void {
  receipt.root.hidden = false;
  receipt.root.dataset.state = 'failed';
  receipt.state.textContent = 'ASSET GATE';
  receipt.note.textContent = message.slice(0, 240);
  receipt.files.textContent = 'CODE GENERATION HELD';
  receipt.filesNote.textContent = '没有用占位几何冒充主体';
  receipt.compile.textContent = 'NOT STARTED';
  receipt.compileNote.textContent = '素材就绪后继续';
  receipt.security.textContent = 'SOURCE REQUIRED';
  receipt.securityNote.textContent = '真实来源或已连接生成器';
  receipt.runtime.textContent = 'PREVIEW KEPT';
  receipt.runtimeNote.textContent = '当前结果未被覆盖';
  stageShell.dataset.pipelineState = 'asset-blocked';
  assetIntake.root.hidden = false;
  assetIntake.message.textContent = message;
  buildButton.hidden = false;
}

function createAssetIntake(): {
  root: HTMLElement;
  input: HTMLInputElement;
  button: HTMLButtonElement;
  message: HTMLElement;
  result: HTMLElement;
} {
  const root = document.createElement('section');
  root.className = 'wb-asset-intake';
  root.hidden = true;
  root.innerHTML = `
    <div>
      <span>REAL ASSET INTAKE</span>
      <strong>为当前想法补充真实素材</strong>
      <p data-asset-intake-message></p>
    </div>
    <label>
      <span>PNG / JPEG / GLB / MP3 / WAV / MP4 / WebM · 最大 20 MB</span>
      <input type="file" accept=".png,.jpg,.jpeg,.glb,.mp3,.wav,.mp4,.webm" />
    </label>
    <button type="button">登记素材</button>
    <p data-asset-intake-result role="status" aria-live="polite"></p>`;
  return {
    root,
    input: requiredWithin<HTMLInputElement>(root, 'input[type="file"]'),
    button: requiredWithin<HTMLButtonElement>(root, 'button'),
    message: requiredWithin(root, '[data-asset-intake-message]'),
    result: requiredWithin(root, '[data-asset-intake-result]')
  };
}

async function importSelectedAsset(): Promise<void> {
  const file = assetIntake.input.files?.[0];
  if (!file) {
    assetIntake.result.textContent = '请先选择一个素材文件。';
    return;
  }
  if (file.size > 20_000_000) {
    assetIntake.result.textContent = '文件超过 20 MB，请先压缩或拆分。';
    return;
  }
  assetIntake.button.disabled = true;
  assetIntake.button.textContent = '正在校验并登记…';
  assetIntake.result.textContent = '正在检查文件签名、体积和浏览器可访问性。';
  try {
    const response = await fetch('/api/creative/assets/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        schemaVersion: 1,
        brief: briefInput.value.trim(),
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        dataBase64: await fileToBase64(file)
      })
    });
    const body = await response.json() as { asset?: unknown; error?: string };
    if (!response.ok || !body.asset) throw new Error(body.error || `素材接口返回 ${response.status}`);
    const asset = importedUserAssetSchema.parse(body.asset);
    rememberUserAsset(briefInput.value, asset);
    assetIntake.result.textContent = `${asset.kind} 已登记：${formatBytes(asset.payloadBytes)} · L2 可检查 · 发布权利待复核。`;
    buildButton.hidden = false;
    buildButton.textContent = '使用已登记素材继续构建';
    status.textContent = '素材已就绪。再次点击构建，Codex 会把它作为当前目标的真实素材，而不是占位效果。';
  } catch (error) {
    assetIntake.result.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    assetIntake.button.disabled = false;
    assetIntake.button.textContent = '登记素材';
  }
}

function hideAssetIntake(): void {
  assetIntake.root.hidden = true;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('无法读取素材文件。'));
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : '';
      const separator = value.indexOf(',');
      if (separator < 0) reject(new Error('素材读取结果不是有效 Data URL。'));
      else resolve(value.slice(separator + 1));
    };
    reader.readAsDataURL(file);
  });
}

const userAssetStorageKey = 'signal-lab:user-assets:v1';

function rememberUserAsset(brief: string, asset: ImportedUserAsset): void {
  const records = readStoredUserAssets().filter((record) => record.asset.id !== asset.id);
  records.unshift({ brief: brief.trim(), asset });
  localStorage.setItem(userAssetStorageKey, JSON.stringify(records.slice(0, 24)));
}

function userAssetsForBrief(brief: string): ImportedUserAsset[] {
  const key = brief.trim();
  return readStoredUserAssets().filter((record) => record.brief === key).map((record) => record.asset);
}

function readStoredUserAssets(): Array<{ brief: string; asset: ImportedUserAsset }> {
  try {
    const value = JSON.parse(localStorage.getItem(userAssetStorageKey) || '[]') as unknown;
    if (!Array.isArray(value)) return [];
    return value.flatMap((record): Array<{ brief: string; asset: ImportedUserAsset }> => {
      if (!record || typeof record !== 'object' || typeof (record as { brief?: unknown }).brief !== 'string') return [];
      const parsed = importedUserAssetSchema.safeParse((record as { asset?: unknown }).asset);
      return parsed.success ? [{ brief: (record as { brief: string }).brief, asset: parsed.data }] : [];
    });
  } catch {
    return [];
  }
}

function createReceipt(): {
  root: HTMLElement;
  state: HTMLElement;
  note: HTMLElement;
  files: HTMLElement;
  filesNote: HTMLElement;
  compile: HTMLElement;
  compileNote: HTMLElement;
  security: HTMLElement;
  securityNote: HTMLElement;
  runtime: HTMLElement;
  runtimeNote: HTMLElement;
} {
  const root = document.createElement('section');
  root.className = 'wb-direct-build-receipt';
  root.hidden = true;
  root.setAttribute('aria-label', '专属网页代码构建回执');
  root.innerHTML = `
    <div><span>DEDICATED GENERATION</span><strong data-direct-state></strong><small data-direct-note></small></div>
    <div><span>SOURCE BUNDLE</span><strong data-direct-files></strong><small data-direct-files-note></small></div>
    <div><span>TYPE CHECK</span><strong data-direct-compile></strong><small data-direct-compile-note></small></div>
    <div><span>SECURITY</span><strong data-direct-security></strong><small data-direct-security-note></small></div>
    <div><span>RUNTIME</span><strong data-direct-runtime></strong><small data-direct-runtime-note></small></div>`;
  return {
    root,
    state: requiredWithin(root, '[data-direct-state]'),
    note: requiredWithin(root, '[data-direct-note]'),
    files: requiredWithin(root, '[data-direct-files]'),
    filesNote: requiredWithin(root, '[data-direct-files-note]'),
    compile: requiredWithin(root, '[data-direct-compile]'),
    compileNote: requiredWithin(root, '[data-direct-compile-note]'),
    security: requiredWithin(root, '[data-direct-security]'),
    securityNote: requiredWithin(root, '[data-direct-security-note]'),
    runtime: requiredWithin(root, '[data-direct-runtime]'),
    runtimeNote: requiredWithin(root, '[data-direct-runtime-note]')
  };
}

function collectAssetContext(manifest: ExperienceManifest, brief: string): DirectAssetContext[] {
  const imported = userAssetsForBrief(brief).map((asset): DirectAssetContext => ({
    id: asset.id,
    uri: asset.uri,
    bundlePath: asset.bundlePath,
    kind: asset.kind,
    source: asset.source,
    role: asset.role,
    description: asset.description,
    payloadBytes: asset.payloadBytes
  }));
  const fromManifest = Object.values(manifest.scenes).flatMap((scene) => scene.assets || []).flatMap((asset): DirectAssetContext[] => {
    if (!/^\/(?:api\/creative\/assets|creative-assets)\/[a-zA-Z0-9._/-]+$/.test(asset.uri) || asset.uri.includes('..')) return [];
    const extension = asset.uri.match(/\.(?:png|jpe?g|webp)$/i)?.[0] || '.png';
    const kind: DirectAssetContext['kind'] = asset.modality === 'texture' || asset.modality === 'environment' || asset.modality === 'model-3d' || asset.modality === 'audio' || asset.modality === 'video' || asset.modality === 'font'
      ? asset.modality
      : 'image';
    return [{
      id: asset.id,
      uri: asset.uri,
      bundlePath: `assets/${asset.id}${extension}`,
      kind,
      source: asset.source === 'user-provided' ? 'user-provided' : asset.source === 'licensed-library' ? 'licensed' : 'model-generated',
      role: asset.role,
      description: `${asset.qualityLevel} ${asset.role}`,
      payloadBytes: asset.payloadBytes,
      ...(asset.required !== undefined ? { required: asset.required } : {}),
      ...(asset.experience ? { experience: asset.experience } : {})
    }];
  });
  const curated = selectProjectCreativeAssets(brief).map(({ tags: _tags, ...asset }) => asset);
  const deduplicated = new Map<string, DirectAssetContext>();
  [...imported, ...fromManifest, ...curated].forEach((asset) => deduplicated.set(asset.uri, asset));
  return [...deduplicated.values()]
    .sort((left, right) => Number(Boolean(right.required)) - Number(Boolean(left.required)) || (left.experience?.anchor ?? .5) - (right.experience?.anchor ?? .5))
    .slice(0, 6);
}

function readQuality(value: string): 'high' | 'balanced' | 'low' {
  return value === 'high' || value === 'low' ? value : 'balanced';
}

function formatBytes(value: number): string {
  return value < 1024 ? `${value} B` : `${(value / 1024).toFixed(1)} KB`;
}


function formatDuration(value: number): string {
  return value < 1000 ? `${Math.max(0, Math.round(value))}ms` : `${(value / 1000).toFixed(1)}s`;
}
function clearPhaseTimer(): void {
  if (!phaseTimer) return;
  clearInterval(phaseTimer);
  phaseTimer = 0;
}

function requiredWithin<T extends Element>(root: ParentNode, selector: string): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`Direct code child missing: ${selector}`);
  return node;
}

function required<T extends Element>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Direct code mount missing: ${selector}`);
  return node;
}
