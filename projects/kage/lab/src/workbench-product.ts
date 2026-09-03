import './styles-workbench-product.css';
import './styles-workbench-clarity-r15.css';
import './styles-workbench-truth-r16.css';
import { selectProjectCreativeAssets } from './generation/creative-asset-catalog';
import { describeOutcomeRoute, type OutcomeRouteInput } from './workbench-outcome-route';

type ProductState = 'idle' | 'generating' | 'ready' | 'error';
interface ProductCandidateSnapshot {
  id: string;
  structure: string;
  scenePlugin: string;
  nodeCount: number;
  planStatus: string;
  effectSource: string;
  productionStatus: string;
  productionMissing: string[];
  productionAdaptations: number;
}
interface ProductSnapshot {
  state: ProductState;
  runId: string | null;
  selectedId: string | null;
  provider: string;
  requestedProvider: string;
  model: string | null;
  fallbackReason: string | null;
  cacheStatus: string | null;
  candidates: ProductCandidateSnapshot[];
  localRevision: { state: string };
  assetProduction: { state: string; assets: number; error: string | null };
}
type ProductWindow = Window & { __creativeLab?: { snapshot: () => ProductSnapshot } };
interface GenerationTrace {
  root: HTMLElement;
  model: HTMLElement;
  modelNote: HTMLElement;
  runtime: HTMLElement;
  runtimeNote: HTMLElement;
  assets: HTMLElement;
  assetsNote: HTMLElement;
  cache: HTMLElement;
  cacheNote: HTMLElement;
}

const body = document.body;
const params = new URLSearchParams(location.search);
const generateButton = required<HTMLButtonElement>('#generate');
const variationButton = required<HTMLButtonElement>('#variation');
const briefInput = required<HTMLTextAreaElement>('#brief');
const revisionInput = required<HTMLInputElement>('#revision-instruction');
const revisionButton = required<HTMLButtonElement>('#apply-revision-button');
const progress = required<HTMLElement>('#generation-progress');
const progressItems = [...progress.querySelectorAll<HTMLElement>('[data-generation-phase]')];
const outcomeRoute = required<HTMLElement>('#outcome-route');
const outcomeRouteTitle = required<HTMLElement>('#outcome-route-title');
const outcomeRouteNote = required<HTMLElement>('#outcome-route-note');
const outcomeRouteSteps = [...outcomeRoute.querySelectorAll<HTMLElement>('[data-outcome-step]')];
const workbenchStatus = required<HTMLElement>('#workbench-status');
const stageHeading = required<HTMLElement>('#creative-stage-heading');
const stageStatus = required<HTMLElement>('#creative-stage-status');
const stageTitle = required<HTMLElement>('#creative-stage-title');
const stageDescription = required<HTMLElement>('#creative-stage-description');
const stageShell = required<HTMLElement>('.wb-stage-shell');
const placeholder = required<HTMLElement>('#creative-stage-placeholder');
const placeholderTitle = required<HTMLElement>('#creative-stage-placeholder strong');
const placeholderCopy = required<HTMLElement>('#creative-stage-placeholder p');
const stageFrame = required<HTMLIFrameElement>('#creative-stage-frame');
const stageOpen = required<HTMLAnchorElement>('#creative-stage-open');
const selectionDetail = required<HTMLElement>('#selection-detail');
const directionAnalysis = required<HTMLDetailsElement>('#direction-analysis');
const sourceBadge = createSourceBadge();
const generationTrace = createGenerationTrace();

const phaseMessages = [
  ['正在理解你的目标', '提取主体、受众、情绪和希望发生的变化。'],
  ['正在选择素材路线', '优选或用户素材优先，MiniMax 仅在适合时备用。'],
  ['Codex 正在构建专属网页', '编译页面叙事、Three.js 场景、镜头与交互。'],
  ['正在验收真实页面', '按产品体验节点检查关键状态、移动端与降级方案，并只保留最佳版本。']
] as const;

let phaseIndex = 0;
let phaseTimer = 0;
let lastState: ProductState | null = null;
let autoSelectedRunId: string | null = null;
let userRequestedGeneration = params.get('autorun') === '1' || params.get('provider') === 'local' || /^job-[a-f0-9]{16}$/.test(params.get('job') || '');
let lastOutcomeStage: OutcomeRouteInput['stage'] = 'idle';

upgradeReferenceLibrary();

generateButton.addEventListener('click', () => beginUserGeneration(), { capture: true });
variationButton.addEventListener('click', () => beginUserGeneration(), { capture: true });
briefInput.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    generateButton.click();
  }
});
revisionInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    revisionButton.click();
  }
});

revisionButton.addEventListener('click', () => {
  queueMicrotask(() => {
    const snapshot = (window as ProductWindow).__creativeLab?.snapshot();
    const instruction = revisionInput.value.trim();
    if (!snapshot || !instruction || snapshot.requestedProvider === 'local') return;
    if (snapshot.localRevision.state !== 'unsupported') return;
    briefInput.value = `${briefInput.value.trim()}\n\n修订要求：${instruction}`.slice(0, 600);
    briefInput.dispatchEvent(new Event('input', { bubbles: true }));
    revisionInput.value = '';
    generateButton.click();
  });
});
window.addEventListener('creative-lab:pipeline-stage', ((event: Event) => {
  if (!(event instanceof CustomEvent) || !event.detail?.stage) return;
  renderOutcomeRoute(event.detail as OutcomeRouteInput);
}) as EventListener);

stageFrame.addEventListener('load', () => {
  if (stageFrame.src === 'about:blank') return;
  const snapshot = (window as ProductWindow).__creativeLab?.snapshot();
  if (!snapshot || isSuppressedBootstrap(snapshot)) {
    suppressBootstrapDraft();
    return;
  }
  prepareEmbeddedPreview();
  stageShell.dataset.previewState = 'ready';
  placeholder.classList.add('is-hidden');
  stageFrame.classList.add('is-ready');
  stageOpen.removeAttribute('aria-disabled');
});

const statePoll = window.setInterval(syncProductState, 120);
addEventListener('pagehide', () => {
  clearInterval(statePoll);
  clearPhaseTimer();
}, { once: true });

renderOutcomeRoute({ stage: 'idle' });
syncProductState();

function syncProductState(): void {
  const snapshot = (window as ProductWindow).__creativeLab?.snapshot();
  if (!snapshot) return;

  if (isSuppressedBootstrap(snapshot)) {
    renderWaitingState();
    lastState = snapshot.state;
    return;
  }

  body.dataset.productAwaiting = 'false';
  body.dataset.productState = snapshot.state;
  directionAnalysis.hidden = false;

  if (snapshot.state !== lastState) {
    lastState = snapshot.state;
    if (snapshot.state === 'generating') renderGeneratingState();
    if (snapshot.state === 'error') showErrorState();
  }
  if (snapshot.state !== 'ready' || !snapshot.runId) return;

  if (autoSelectedRunId !== snapshot.runId) {
    const best = chooseBestCandidate(snapshot.candidates);
    const card = best ? document.querySelector<HTMLElement>(`[data-candidate-id="${CSS.escape(best.id)}"]`) : null;
    const selectButton = card?.querySelector<HTMLButtonElement>('.wb-select-candidate');
    if (!selectButton) return;
    autoSelectedRunId = snapshot.runId;
    selectButton.click();
    card?.setAttribute('data-auto-selected', 'true');
  }
  const current = (window as ProductWindow).__creativeLab?.snapshot() || snapshot;
  renderReadyState(current);
}

function isSuppressedBootstrap(snapshot: ProductSnapshot): boolean {
  return !userRequestedGeneration && snapshot.requestedProvider !== 'local';
}

function beginUserGeneration(): void {
  userRequestedGeneration = true;
  body.dataset.productAwaiting = 'false';
  renderGeneratingState();
}

function renderWaitingState(): void {
  delete stageShell.dataset.previewState;
  body.dataset.productAwaiting = 'true';
  body.dataset.productState = 'idle';
  sourceBadge.textContent = 'WAITING / CLICK GENERATE';
  generationTrace.root.hidden = true;
  stageHeading.textContent = '先生成，再判断质量';
  stageStatus.textContent = 'NO RESULT YET';
  stageTitle.textContent = '等待真实生成';
  stageDescription.textContent = '点击生成后，系统才会调用当前可用模型并构造你的 Three.js 网页。';
  workbenchStatus.textContent = '尚未生成。点击“生成并构建最佳网页”，系统会完成素材选择、Codex 专属构建和真实页面验收。';
  selectionDetail.hidden = true;
  directionAnalysis.hidden = true;
  progress.hidden = true;
  placeholder.classList.remove('is-hidden');
  placeholderTitle.textContent = '从一句想法开始生成';
  placeholderCopy.textContent = '这里不会用本地启动草案冒充生成结果。点击生成后，才呈现模型构建的真实网页。';
  renderOutcomeRoute({ stage: 'idle' });
  suppressBootstrapDraft();
}

function suppressBootstrapDraft(): void {
  delete stageShell.dataset.previewState;
  stageFrame.classList.remove('is-ready');
  stageOpen.setAttribute('aria-disabled', 'true');
  if (stageFrame.getAttribute('src') !== 'about:blank') stageFrame.src = 'about:blank';
}

function renderGeneratingState(): void {
  stageShell.dataset.previewState = 'loading';
  body.dataset.productAwaiting = 'false';
  body.dataset.productState = 'generating';
  sourceBadge.textContent = 'MODEL GENERATING';
  generationTrace.root.hidden = true;
  stageHeading.textContent = '正在把想法构造成网页';
  stageStatus.textContent = 'MODEL WORKING';
  selectionDetail.hidden = true;
  directionAnalysis.hidden = true;
  startProgress();
  renderOutcomeRoute({ stage: 'interpret' });
}

function renderReadyState(snapshot: ProductSnapshot): void {
  const candidate = snapshot.candidates.find((item) => item.id === snapshot.selectedId) || chooseBestCandidate(snapshot.candidates);
  const isLocal = snapshot.requestedProvider === 'local';
  const isModelEffect = !isLocal && candidate?.effectSource === 'model' && !snapshot.provider.includes('baseline');
  sourceBadge.textContent = isLocal
    ? 'LOCAL DRAFT'
    : isModelEffect ? `MODEL EFFECTSPEC · ${providerLabel(snapshot)}` : 'MODEL FALLBACK → LOCAL';
  stageHeading.textContent = isLocal
    ? '本地草案已生成'
    : isModelEffect ? '模型方案已构造成网页' : '模型不可用，已显示本地草案';
  renderGenerationTrace(snapshot, candidate, isLocal, isModelEffect);
  if (isLocal && (lastOutcomeStage === 'interpret' || lastOutcomeStage === 'idle')) {
    completeProgress();
    renderOutcomeRoute({
      stage: 'complete',
      assetRoute: selectProjectCreativeAssets(briefInput.value).length ? 'catalog' : 'procedural',
      assetCount: selectProjectCreativeAssets(briefInput.value).length,
      model: 'local draft',
      message: '本地草案已完成；选择模型后可继续生成专属代码并执行浏览器验收。'
    });
  } else if (lastOutcomeStage === 'interpret' || lastOutcomeStage === 'idle') {
    setProgressPhase(1);
    renderOutcomeRoute({ stage: 'assets' });
  }
  selectionDetail.hidden = false;
  directionAnalysis.hidden = false;
}

function renderGenerationTrace(snapshot: ProductSnapshot, candidate: ProductCandidateSnapshot | null, isLocal: boolean, isModelEffect: boolean): void {
  generationTrace.root.hidden = false;
  generationTrace.root.dataset.production = candidate?.productionStatus || 'unknown';
  generationTrace.model.textContent = isLocal ? 'LOCAL BASELINE' : isModelEffect ? providerLabel(snapshot) : 'FALLBACK / LOCAL';
  generationTrace.modelNote.textContent = isLocal
    ? '关键词解释与兼容方案'
    : isModelEffect ? '模型生成方向与 EffectSpec' : snapshot.fallbackReason || '远程模型没有产生可用方案';
  generationTrace.runtime.textContent = (candidate?.scenePlugin || 'none').toUpperCase();
  generationTrace.runtimeNote.textContent = '已注册 Three.js 运行时负责最终编译与渲染';
  const curatedAssets = selectProjectCreativeAssets(briefInput.value);
  const mediaMissing = (candidate?.productionMissing || []).filter((item) => item.includes('image') || item.includes('texture') || item.includes('video') || item.includes('model-3d'));
  generationTrace.assets.textContent = curatedAssets.length
    ? `${curatedAssets.length} APPROVED`
    : snapshot.assetProduction.state === 'ready' ? `${snapshot.assetProduction.assets} GENERATED`
      : mediaMissing.length ? 'AWAITING ASSET' : 'PROCEDURAL / NONE';
  generationTrace.assetsNote.textContent = curatedAssets.length
    ? curatedAssets.map((asset) => asset.role).join(' · ')
    : snapshot.assetProduction.state === 'ready' ? 'MiniMax 素材已物化并进入当前预览'
      : mediaMissing.length ? `缺少：${mediaMissing.map(capabilityLabel).join('、')}` : '当前目标经门禁确认可由程序化视觉完成';
  generationTrace.cache.textContent = (snapshot.cacheStatus || 'unknown').toUpperCase();
  generationTrace.cacheNote.textContent = snapshot.cacheStatus === 'hit' ? '复用此前同一想法的真实模型结果' : snapshot.cacheStatus === 'miss' ? '本次真实调用模型并写入缓存' : '未使用远程模型缓存';
}

function capabilityLabel(value: string): string {
  const labels: Record<string, string> = {
    'image-generation': '图像生成',
    'texture-generation': '纹理生成',
    'video-generation': '视频生成',
    'model-3d-generation': '3D 模型生成'
  };
  return labels[value] || value;
}

function providerLabel(snapshot: ProductSnapshot): string {
  if (snapshot.model) return snapshot.model.toUpperCase();
  const labels: Record<string, string> = { auto: 'AUTO', codex: 'CODEX', minimax: 'MINIMAX', mimo: 'MIMO', openai: 'OPENAI' };
  return labels[snapshot.requestedProvider] || snapshot.requestedProvider.toUpperCase();
}

function createSourceBadge(): HTMLElement {
  const badge = document.createElement('span');
  badge.className = 'wb-generation-source';
  badge.textContent = 'WAITING / CLICK GENERATE';
  stageStatus.before(badge);
  return badge;
}

function createGenerationTrace(): GenerationTrace {
  const root = document.createElement('section');
  root.className = 'wb-generation-trace';
  root.setAttribute('aria-label', '本次网页生成链路');
  root.hidden = true;
  root.innerHTML = `
    <div><span>MODEL INTERPRETATION</span><strong data-trace-model></strong><small data-trace-model-note></small></div>
    <div><span>THREE.JS RUNTIME</span><strong data-trace-runtime></strong><small data-trace-runtime-note></small></div>
    <div><span>GENERATED ASSETS</span><strong data-trace-assets></strong><small data-trace-assets-note></small></div>
    <div><span>MODEL CACHE</span><strong data-trace-cache></strong><small data-trace-cache-note></small></div>`;
  stageShell.before(root);
  return {
    root,
    model: requiredWithin(root, '[data-trace-model]'),
    modelNote: requiredWithin(root, '[data-trace-model-note]'),
    runtime: requiredWithin(root, '[data-trace-runtime]'),
    runtimeNote: requiredWithin(root, '[data-trace-runtime-note]'),
    assets: requiredWithin(root, '[data-trace-assets]'),
    assetsNote: requiredWithin(root, '[data-trace-assets-note]'),
    cache: requiredWithin(root, '[data-trace-cache]'),
    cacheNote: requiredWithin(root, '[data-trace-cache-note]')
  };
}

function prepareEmbeddedPreview(): void {
  stageFrame.setAttribute('scrolling', 'auto');
  const doc = stageFrame.contentDocument;
  if (!doc?.head) return;
  if (!doc.querySelector('#workbench-preview-r16')) {
    const style = doc.createElement('style');
    style.id = 'workbench-preview-r16';
    style.textContent = `
      body[data-signal-embed="true"] .lab-controls,
      body[data-signal-embed="true"] .controls-toggle { display: none !important; }
      body[data-signal-embed="true"] #story { min-height: 100vh; }
      body[data-signal-embed="true"] .story-intro { box-sizing: border-box; width: 100%; min-height: 100vh; }
    `;
    doc.head.append(style);
  }
  stageFrame.contentWindow?.scrollTo(0, 0);
}

function upgradeReferenceLibrary(): void {
  const library = document.querySelector<HTMLDetailsElement>('.wb-reference-library');
  const summary = library?.querySelector<HTMLElement>('summary');
  const switcher = library?.querySelector<HTMLElement>('.wb-showcase-switcher');
  if (!library || !summary || !switcher) return;
  library.open = true;
  summary.textContent = '两个可运行能力样例（单独打开，不会替换你的结果）';
  const samples = [
    { id: 'resonance-flagship', label: '资产驱动产品电影' },
    { id: 'tidal-archive', label: '潮汐记忆叙事空间' }
  ];
  const runtimeBase = import.meta.env.BASE_URL !== '/' ? './v1/showcase/' : './';
  const buttons = [...switcher.querySelectorAll<HTMLButtonElement>('.wb-showcase-option')];
  buttons.forEach((button, index) => {
    const sample = samples[index];
    if (!sample) {
      button.remove();
      return;
    }
    const link = document.createElement('a');
    link.className = `${button.className} wb-sample-link`;
    const sampleUrl = new URL(runtimeBase, location.href);
    sampleUrl.searchParams.set('experience', sample.id);
    sampleUrl.searchParams.set('quality', 'high');
    sampleUrl.searchParams.set('motion', 'full');
    link.href = sampleUrl.href;
    link.target = '_blank';
    link.rel = 'noopener';
    link.setAttribute('aria-label', `单独打开${sample.label}样例`);
    link.innerHTML = button.innerHTML;
    button.replaceWith(link);
  });
}

function chooseBestCandidate(candidates: ProductCandidateSnapshot[]): ProductCandidateSnapshot | null {
  return [...candidates].sort((left, right) => candidateScore(right) - candidateScore(left))[0] || null;
}

function candidateScore(candidate: ProductCandidateSnapshot): number {
  const production = candidate.productionStatus === 'ready' ? 42 : candidate.productionStatus === 'adapted' ? 18 : -80;
  const capability = candidate.planStatus === 'fit' ? 28 : candidate.planStatus === 'adapted' ? 10 : -35;
  const source = candidate.effectSource === 'model' ? 24 : 4;
  const structure = candidate.nodeCount >= 3 && candidate.nodeCount <= 8 ? 8 : 0;
  return production + capability + source + structure - candidate.productionMissing.length * 8 - candidate.productionAdaptations * 2;
}

function startProgress(): void {
  const keepCurrentPreview = hasUsablePreview();
  clearPhaseTimer();
  phaseIndex = 0;
  progress.hidden = false;
  placeholder.classList.toggle('is-hidden', keepCurrentPreview);
  stageFrame.classList.toggle('is-ready', keepCurrentPreview);
  if (keepCurrentPreview) {
    stageShell.dataset.previewState = 'ready';
    stageOpen.removeAttribute('aria-disabled');
  } else {
    stageOpen.setAttribute('aria-disabled', 'true');
  }
  renderPhase();
}

function renderPhase(): void {
  progressItems.forEach((item, index) => {
    item.classList.toggle('is-complete', index < phaseIndex);
    item.classList.toggle('is-active', index === phaseIndex);
  });
  placeholderTitle.textContent = phaseMessages[phaseIndex][0];
  placeholderCopy.textContent = phaseMessages[phaseIndex][1];
}

function completeProgress(): void {
  clearPhaseTimer();
  progress.hidden = false;
  progressItems.forEach((item) => {
    item.classList.add('is-complete');
    item.classList.remove('is-active');
  });
}

function showErrorState(): void {
  if (hasUsablePreview()) {
    stageShell.dataset.previewState = 'ready';
    clearPhaseTimer();
    sourceBadge.textContent = 'NEW GENERATION FAILED · CURRENT KEPT';
    generationTrace.root.hidden = true;
    progress.hidden = true;
    placeholder.classList.add('is-hidden');
    stageFrame.classList.add('is-ready');
    stageOpen.removeAttribute('aria-disabled');
    renderOutcomeRoute({ stage: 'failed', message: '新任务未完成；当前可运行页面、链接和交互均已保留。' });
    return;
  }
  stageShell.dataset.previewState = 'failed';
  clearPhaseTimer();
  sourceBadge.textContent = 'GENERATION FAILED';
  generationTrace.root.hidden = true;
  progress.hidden = true;
  placeholder.classList.remove('is-hidden');
  placeholderTitle.textContent = '这次没有构建完成';
  placeholderCopy.textContent = '你的描述仍然保留。检查提示后可以直接重新生成。';
  renderOutcomeRoute({ stage: 'failed', message: '目标描述仍然保留；修正错误后可以直接重试。' });
}

function renderOutcomeRoute(input: OutcomeRouteInput): void {
  lastOutcomeStage = input.stage;
  const view = describeOutcomeRoute(input);
  outcomeRoute.dataset.tone = view.tone;
  outcomeRouteTitle.textContent = view.title;
  outcomeRouteNote.textContent = view.note;
  view.steps.forEach((step, index) => {
    const item = outcomeRouteSteps[index];
    if (!item) return;
    item.dataset.state = step.state;
    const title = item.querySelector('strong');
    const detail = item.querySelector('small');
    if (title) title.textContent = step.label;
    if (detail) detail.textContent = step.detail;
  });

  const phaseByStage: Partial<Record<OutcomeRouteInput['stage'], number>> = {
    interpret: 0,
    assets: 1,
    authoring: 2,
    reviewing: 3,
    'review-required': 3,
    blocked: 1,
    failed: Math.max(0, phaseIndex)
  };
  if (input.stage === 'idle') progress.hidden = true;
  else if (input.stage === 'complete') completeProgress();
  else if (phaseByStage[input.stage] != null) setProgressPhase(phaseByStage[input.stage]!);

  if (input.stage === 'assets' || input.stage === 'authoring' || (input.stage === 'reviewing' && stageFrame.src === 'about:blank')) {
    placeholder.classList.remove('is-hidden');
    placeholderTitle.textContent = view.title;
    placeholderCopy.textContent = view.note;
  }
  if (input.stage === 'complete' && stageFrame.src !== 'about:blank') {
    placeholder.classList.add('is-hidden');
    stageFrame.classList.add('is-ready');
    stageOpen.removeAttribute('aria-disabled');
  }
  if (input.stage === 'failed' && !hasUsablePreview()) {
    placeholder.classList.remove('is-hidden');
    placeholderTitle.textContent = '这次没有构建完成';
    placeholderCopy.textContent = '你的描述仍然保留。检查提示后可以直接重新生成。';
  }
}

function hasUsablePreview(): boolean {
  return stageFrame.getAttribute('src') !== 'about:blank'
    && stageFrame.classList.contains('is-ready');
}

function setProgressPhase(index: number): void {
  phaseIndex = Math.max(0, Math.min(index, progressItems.length - 1));
  progress.hidden = false;
  renderPhase();
}

function clearPhaseTimer(): void {
  if (!phaseTimer) return;
  clearInterval(phaseTimer);
  phaseTimer = 0;
}

function requiredWithin<T extends Element>(root: ParentNode, selector: string): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`Product workbench child missing: ${selector}`);
  return node;
}

function required<T extends Element>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Product workbench mount missing: ${selector}`);
  return node;
}
