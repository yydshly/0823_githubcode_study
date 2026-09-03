import {
  identityEvidenceCapability,
  type IdentityEvidenceStateId
} from '../../../../src/v2/identity-evidence-capability.ts';

type InputMode = 'scroll' | 'button' | 'keyboard' | 'api';

type Snapshot = {
  activeIndex: number;
  activeId: IdentityEvidenceStateId;
  inputMode: InputMode;
  assetMode: 'media' | 'fallback';
  reducedMotion: boolean;
  hasHorizontalOverflow: boolean;
};

declare global {
  interface Window {
    __identityEvidencePrototype?: {
      setState: (index: number, inputMode?: InputMode, syncScroll?: boolean) => Snapshot;
      snapshot: () => Snapshot;
    };
  }
}

const root = document.documentElement;
const story = requiredElement<HTMLElement>('[data-story]');
const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-state-index]'));
const assets = Array.from(document.querySelectorAll<HTMLImageElement>('[data-asset]'));
const eyebrow = requiredElement<HTMLElement>('[data-eyebrow]');
const title = requiredElement<HTMLElement>('[data-title]');
const summary = requiredElement<HTMLElement>('[data-summary]');
const proofLabel = requiredElement<HTMLElement>('[data-proof-label]');
const proofValue = requiredElement<HTMLElement>('[data-proof-value]');
const proofDetail = requiredElement<HTMLElement>('[data-proof-detail]');
const inputLabel = requiredElement<HTMLElement>('[data-input-mode]');
const assetLabel = requiredElement<HTMLElement>('[data-asset-mode]');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const forcedFallback = new URLSearchParams(window.location.search).get('assets') === 'off';

let activeIndex = 0;
let inputMode: InputMode = 'scroll';
let assetMode: 'media' | 'fallback' = forcedFallback ? 'fallback' : 'media';
let lastDirectInput = Number.NEGATIVE_INFINITY;

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`缺少身份与证据原型元素：${selector}`);
  return element;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function storyRange() {
  return Math.max(1, story.scrollHeight - window.innerHeight);
}

function snapshot(): Snapshot {
  return {
    activeIndex,
    activeId: identityEvidenceCapability.states[activeIndex]!.id,
    inputMode,
    assetMode,
    reducedMotion: reducedMotion.matches,
    hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1
  };
}

function setAssetMode(mode: 'media' | 'fallback') {
  assetMode = mode;
  root.dataset.assets = mode;
  assetLabel.textContent = mode === 'media' ? 'MEDIA / ACTIVE' : 'READABLE / FALLBACK';
}

function renderState(index: number, nextInput: InputMode) {
  const state = identityEvidenceCapability.states[index]!;
  activeIndex = index;
  inputMode = nextInput;
  if (nextInput !== 'scroll') lastDirectInput = performance.now();
  root.dataset.evidence = state.id;
  eyebrow.textContent = state.eyebrow;
  title.textContent = state.title;
  summary.textContent = state.summary;
  proofLabel.textContent = state.proofLabel;
  proofValue.textContent = state.proofValue;
  proofDetail.textContent = state.proofDetail;
  buttons.forEach((button, buttonIndex) => button.setAttribute('aria-pressed', String(buttonIndex === activeIndex)));
  inputLabel.textContent = ({
    scroll: 'SCROLL / EVIDENCE',
    button: 'BUTTON / EVIDENCE',
    keyboard: 'KEYBOARD / EVIDENCE',
    api: 'TEST API / EVIDENCE'
  } satisfies Record<InputMode, string>)[nextInput];
}

function setState(index: number, nextInput: InputMode = 'api', syncScroll = false) {
  const safeIndex = clamp(Math.round(index), 0, identityEvidenceCapability.states.length - 1);
  renderState(safeIndex, nextInput);
  if (syncScroll) {
    const progress = safeIndex / Math.max(1, identityEvidenceCapability.states.length - 1);
    window.scrollTo({ top: story.offsetTop + progress * storyRange(), behavior: 'auto' });
  }
  return snapshot();
}

function updateScroll() {
  if (performance.now() - lastDirectInput < 220) return;
  const progress = clamp((window.scrollY - story.offsetTop) / storyRange(), 0, 1);
  const index = Math.min(identityEvidenceCapability.states.length - 1, Math.floor(progress * identityEvidenceCapability.states.length));
  if (index !== activeIndex || inputMode !== 'scroll') renderState(index, 'scroll');
}

buttons.forEach((button, index) => {
  button.addEventListener('click', () => setState(index, 'button', true));
});

window.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
  event.preventDefault();
  const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
  const nextIndex = clamp(activeIndex + direction, 0, identityEvidenceCapability.states.length - 1);
  setState(nextIndex, 'keyboard', true);
  buttons[nextIndex]?.focus({ preventScroll: true });
});

window.addEventListener('scroll', updateScroll, { passive: true });
window.addEventListener('resize', updateScroll, { passive: true });

if (forcedFallback) {
  assets.forEach((asset) => asset.removeAttribute('src'));
  setAssetMode('fallback');
} else {
  let loaded = 0;
  let failed = false;
  assets.forEach((asset) => {
    if (asset.complete && asset.naturalWidth > 0) loaded += 1;
    asset.addEventListener('load', () => {
      loaded += 1;
      if (!failed && loaded >= assets.length) setAssetMode('media');
    }, { once: true });
    asset.addEventListener('error', () => {
      failed = true;
      setAssetMode('fallback');
    }, { once: true });
  });
  if (loaded >= assets.length) setAssetMode('media');
}

renderState(0, 'scroll');
updateScroll();
root.dataset.ready = 'true';
window.__identityEvidencePrototype = { setState, snapshot };

export {};
