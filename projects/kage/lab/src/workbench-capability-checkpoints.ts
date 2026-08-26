import './styles-workbench-checkpoints-r17.css';
import { loadGeneratedExperience, persistGeneratedExperience } from './generation/generated-store';
import {
  listCapabilityCheckpoints,
  removeCapabilityCheckpoint,
  saveCapabilityCheckpoint,
  type CapabilityCheckpoint
} from './generation/capability-checkpoint-store';

interface CheckpointSnapshot {
  state: 'idle' | 'generating' | 'ready' | 'error';
  provider: string;
  requestedProvider: string;
  model: string | null;
  seed: number;
  runId: string | null;
  selectedId: string | null;
  candidates: Array<{ id: string; scenePlugin: string; productionStatus: string }>;
}

type CheckpointWindow = Window & { __creativeLab?: { snapshot: () => CheckpointSnapshot } };

const briefInput = required<HTMLTextAreaElement>('#brief');
const qualitySelect = required<HTMLSelectElement>('#quality');
const previewLink = required<HTMLAnchorElement>('#preview-link');
const selectionActions = required<HTMLElement>('.wb-selection-actions');
const topbar = required<HTMLElement>('.wb-topbar');
const galleryLink = required<HTMLAnchorElement>('.wb-gallery-link');
const status = required<HTMLElement>('#workbench-status');

const saveButton = document.createElement('button');
saveButton.id = 'save-capability-button';
saveButton.className = 'wb-save-capability';
saveButton.type = 'button';
saveButton.textContent = '保存当前能力';
saveButton.disabled = true;
previewLink.after(saveButton);

const topbarActions = document.createElement('div');
topbarActions.className = 'wb-topbar-actions';
const savedEntry = document.createElement('button');
savedEntry.id = 'saved-capabilities-button';
savedEntry.className = 'wb-gallery-link wb-saved-entry';
savedEntry.type = 'button';
savedEntry.innerHTML = '已保存能力 <span id="saved-capabilities-count">0</span>';
galleryLink.before(topbarActions);
topbarActions.append(savedEntry, galleryLink);

const dialog = document.createElement('dialog');
dialog.id = 'saved-capabilities-dialog';
dialog.className = 'wb-dialog wb-capability-dialog';
dialog.setAttribute('aria-labelledby', 'saved-capabilities-title');
dialog.innerHTML = `
  <div class="wb-dialog-head">
    <div><p class="wb-eyebrow">CAPABILITY CHECKPOINTS</p><h2 id="saved-capabilities-title">已保存能力</h2></div>
    <button type="button" data-checkpoint-close aria-label="关闭已保存能力">关闭</button>
  </div>
  <p class="wb-capability-dialog-intro">保存的是当前可运行 Manifest、创意描述、模型来源与生产边界。打开保存结果不需要再次调用模型；以此继续生成时会复用同一描述和模型缓存。</p>
  <div class="wb-saved-capabilities-list" aria-live="polite"></div>`;
document.body.append(dialog);

const list = requiredWithin<HTMLElement>(dialog, '.wb-saved-capabilities-list');
const count = requiredWithin<HTMLElement>(savedEntry, '#saved-capabilities-count');
const closeButton = requiredWithin<HTMLButtonElement>(dialog, '[data-checkpoint-close]');

saveButton.addEventListener('click', saveCurrentCapability);
savedEntry.addEventListener('click', () => {
  renderSavedCapabilities();
  dialog.showModal();
});
closeButton.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
addEventListener('storage', updateSavedCount);

const statePoll = window.setInterval(syncSaveState, 180);
addEventListener('pagehide', () => clearInterval(statePoll), { once: true });
updateSavedCount();
syncSaveState();

function syncSaveState(): void {
  const snapshot = (window as CheckpointWindow).__creativeLab?.snapshot();
  const generatedId = generatedExperienceId(previewLink.href);
  const ready = Boolean(snapshot?.state === 'ready' && snapshot.runId && snapshot.selectedId && generatedId);
  saveButton.disabled = !ready;
  saveButton.title = ready ? '保存当前结果的可运行网页、描述、模型来源与生产状态' : '生成并选择一个结果后即可保存';
}

function saveCurrentCapability(): void {
  const snapshot = (window as CheckpointWindow).__creativeLab?.snapshot();
  const generatedId = generatedExperienceId(previewLink.href);
  const manifest = generatedId ? loadGeneratedExperience(generatedId) : null;
  const candidate = snapshot?.candidates.find((item) => item.id === snapshot.selectedId);
  if (!snapshot?.runId || !snapshot.selectedId || !manifest || !candidate) {
    status.textContent = '当前结果还没有形成可保存的运行产物。请先完成生成并选择结果。';
    return;
  }
  try {
    saveCapabilityCheckpoint({
      label: manifest.title,
      brief: briefInput.value,
      quality: readQuality(qualitySelect.value),
      provider: snapshot.provider,
      model: snapshot.model,
      seed: snapshot.seed,
      runId: snapshot.runId,
      selectedId: snapshot.selectedId,
      scenePlugin: candidate.scenePlugin,
      productionStatus: candidate.productionStatus,
      manifest
    });
    saveButton.textContent = '已保存当前能力 ✓';
    window.setTimeout(() => { saveButton.textContent = '保存当前能力'; }, 1600);
    status.textContent = '当前能力已保存。你可以继续换方向；稍后从“已保存能力”直接打开原结果。';
    updateSavedCount();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    status.textContent = `保存失败：${message}`;
  }
}

function renderSavedCapabilities(): void {
  const records = listCapabilityCheckpoints();
  if (!records.length) {
    list.innerHTML = '<div class="wb-saved-capability-empty"><strong>还没有保存的能力</strong><p>先生成一个结果，再点击“保存当前能力”。</p></div>';
    return;
  }
  list.replaceChildren(...records.map(renderSavedCapability));
}

function renderSavedCapability(record: CapabilityCheckpoint): HTMLElement {
  const card = document.createElement('article');
  card.className = 'wb-saved-capability';
  const content = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = record.label;
  const brief = document.createElement('p');
  brief.textContent = record.brief;
  const meta = document.createElement('div');
  meta.className = 'wb-saved-capability-meta';
  meta.append(
    textNode(formatTime(record.savedAt)),
    textNode(record.model || record.provider),
    textNode(record.scenePlugin),
    textNode(`production / ${record.productionStatus}`)
  );
  content.append(title, brief, meta);

  const actions = document.createElement('div');
  actions.className = 'wb-saved-capability-actions';
  const open = document.createElement('a');
  open.textContent = '打开保存结果 ↗';
  open.href = savedExperienceUrl(record).href;
  open.target = '_blank';
  open.rel = 'noopener';
  const continueLink = document.createElement('a');
  continueLink.textContent = '以此继续生成';
  continueLink.href = continueUrl(record).href;
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = '删除记录';
  remove.addEventListener('click', () => {
    removeCapabilityCheckpoint(record.id);
    renderSavedCapabilities();
    updateSavedCount();
    status.textContent = '已删除保存记录；当前预览和生成结果没有变化。';
  });
  actions.append(open, continueLink, remove);
  card.append(content, actions);
  return card;
}

function savedExperienceUrl(record: CapabilityCheckpoint): URL {
  const generatedId = persistGeneratedExperience(record.manifest);
  const url = new URL('./', location.href);
  url.search = '';
  url.searchParams.set('generated', generatedId);
  url.searchParams.set('quality', record.quality);
  return url;
}

function continueUrl(record: CapabilityCheckpoint): URL {
  const url = new URL('./workbench.html', location.href);
  url.searchParams.set('brief', record.brief);
  url.searchParams.set('quality', record.quality);
  url.searchParams.set('provider', providerId(record.provider));
  url.searchParams.set('seed', String(record.seed));
  return url;
}

function updateSavedCount(): void {
  count.textContent = String(listCapabilityCheckpoints().length);
}

function generatedExperienceId(value: string): string | null {
  try { return new URL(value, location.href).searchParams.get('generated'); } catch { return null; }
}

function providerId(value: string): string {
  const provider = value.split(':')[0];
  return ['codex', 'mimo', 'minimax', 'openai', 'local'].includes(provider) ? provider : 'auto';
}

function readQuality(value: string): CapabilityCheckpoint['quality'] {
  return value === 'high' || value === 'low' ? value : 'balanced';
}

function formatTime(value: string): string {
  try { return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
  catch { return value; }
}

function textNode(value: string): HTMLElement {
  const node = document.createElement('span');
  node.textContent = value;
  return node;
}

function requiredWithin<T extends Element>(root: ParentNode, selector: string): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`Capability checkpoint child missing: ${selector}`);
  return node;
}

function required<T extends Element>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Capability checkpoint mount missing: ${selector}`);
  return node;
}

void selectionActions;
void topbar;
