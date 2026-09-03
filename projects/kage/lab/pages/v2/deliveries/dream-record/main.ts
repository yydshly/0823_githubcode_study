type SceneId = "awakening" | "fragments" | "record";

type DeliverySnapshot = {
  progress: number;
  activeScene: SceneId;
  activeBeat: number;
  assetsLoaded: boolean[];
  fallback: boolean;
  dialogOpen: boolean;
  saved: boolean;
  draftLength: number;
  viewport: { width: number; height: number };
  hasHorizontalOverflow: boolean;
  reducedMotion: boolean;
  activeElement: string | null;
};

declare global {
  interface Window {
    __dreamRecordDelivery?: {
      setProgress: (progress: number) => void;
      snapshot: () => DeliverySnapshot;
      openRecord: () => void;
    };
  }
}

const root = document.documentElement;
const journey = document.querySelector<HTMLElement>(".journey");
const layers = [...document.querySelectorAll<HTMLElement>(".media-layer[data-scene]")];
const images = [...document.querySelectorAll<HTMLImageElement>("img[data-asset]")];
const beats = [...document.querySelectorAll<HTMLElement>("[data-beat]")];
const progressItems = [...document.querySelectorAll<HTMLElement>("[data-progress-item]")];
const progressIndex = document.querySelector<HTMLElement>("[data-index]");
const chapterLabel = document.querySelector<HTMLElement>("[data-chapter]");
const stateLabel = document.querySelector<HTMLElement>("[data-state-label]");
const dialog = document.querySelector<HTMLDialogElement>(".record-dialog");
const openButton = document.querySelector<HTMLButtonElement>("[data-open-record]");
const closeButton = document.querySelector<HTMLButtonElement>("[data-close-record]");
const form = document.querySelector<HTMLFormElement>("[data-record-form]");
const textarea = document.querySelector<HTMLTextAreaElement>("#dream-draft");
const saveStatus = document.querySelector<HTMLElement>("[data-save-status]");

if (!journey || layers.length !== 3 || images.length !== 3 || beats.length !== 3) {
  throw new Error("Dream record delivery is missing required scene elements.");
}

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const params = new URLSearchParams(window.location.search);
const fallback = params.get("fallback") === "1";
const storageKey = "kage-dream-record-v2";
const chapters = ["刚醒来", "记忆正在靠近", "留下今晚的梦"];
const states = ["房间还没有完全清晰", "碎片正在重新取得联系", "现在，把它写下来"];
const sceneIds: SceneId[] = ["awakening", "fragments", "record"];

let targetProgress = 0;
let renderedProgress = 0;
let activeBeat = 0;
let saved = false;
let frame = 0;
let lastTrigger: HTMLElement | null = null;

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smoothstep = (edge0: number, edge1: number, value: number) => {
  const x = clamp((value - edge0) / Math.max(edge1 - edge0, 0.0001));
  return x * x * (3 - 2 * x);
};
const rangeWeight = (value: number, start: number, peakStart: number, peakEnd: number, end: number) => {
  const enter = smoothstep(start, peakStart, value);
  const exit = 1 - smoothstep(peakEnd, end, value);
  return clamp(Math.min(enter, exit));
};

function setImageSource(image: HTMLImageElement) {
  if (image.src || fallback) return;
  const asset = image.dataset.asset;
  if (!asset) return;
  image.src = `${import.meta.env.BASE_URL}creative-assets/${asset}`;
}

function markReadyWhenSettled() {
  if (fallback) {
    root.dataset.fallback = "true";
    root.dataset.dreamReady = "true";
    return;
  }

  const settled = images.map(
    (image) =>
      new Promise<void>((resolve) => {
        if (image.complete) {
          resolve();
          return;
        }
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      }),
  );

  Promise.all(settled).then(() => {
    root.dataset.dreamReady = "true";
    if (images.every((image) => image.naturalWidth === 0)) root.dataset.fallback = "true";
  });
}

function loadAssets() {
  if (fallback) {
    markReadyWhenSettled();
    return;
  }

  setImageSource(images[0]);
  const loadRemaining = () => {
    setImageSource(images[1]);
    setImageSource(images[2]);
    markReadyWhenSettled();
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(loadRemaining, { timeout: 900 });
  } else {
    window.setTimeout(loadRemaining, 240);
  }
}

function getScrollProgress() {
  const scrollRange = Math.max(journey.offsetHeight - window.innerHeight, 1);
  return clamp(window.scrollY / scrollRange);
}

function setProgress(progress: number) {
  const value = clamp(progress);
  const scrollRange = Math.max(journey.offsetHeight - window.innerHeight, 1);
  window.scrollTo({ top: value * scrollRange, behavior: "auto" });
  targetProgress = value;
  renderedProgress = value;
  render(value);
}

function render(progress: number) {
  const firstExit = smoothstep(0.17, 0.43, progress);
  const middleWeight = rangeWeight(progress, 0.17, 0.36, 0.58, 0.82);
  const finalEnter = smoothstep(0.59, 0.84, progress);
  const layerWeights = [1 - firstExit, middleWeight, finalEnter];
  const beatWeights = [
    1 - smoothstep(0.13, 0.31, progress),
    rangeWeight(progress, 0.2, 0.36, 0.58, 0.77),
    smoothstep(0.66, 0.83, progress),
  ];

  activeBeat = progress < 0.3 ? 0 : progress < 0.72 ? 1 : 2;
  root.style.setProperty("--progress", progress.toFixed(4));
  root.dataset.scene = sceneIds[activeBeat];

  layers.forEach((layer, index) => {
    const weight = layerWeights[index];
    layer.style.opacity = weight.toFixed(4);
    const movement = reducedMotionQuery.matches ? 0 : (progress - index * 0.48) * (index === 1 ? -2.6 : 2.2);
    const scale = reducedMotionQuery.matches ? 1 : 1.045 + Math.abs(progress - index * 0.5) * 0.025;
    layer.style.transform = `translate3d(0, ${movement.toFixed(2)}vh, 0) scale(${scale.toFixed(4)})`;
    layer.setAttribute("aria-hidden", index === activeBeat ? "false" : "true");
  });

  beats.forEach((beat, index) => {
    const weight = beatWeights[index];
    beat.style.opacity = weight.toFixed(4);
    beat.style.transform = reducedMotionQuery.matches
      ? "translate3d(0, 0, 0)"
      : `translate3d(0, ${(1 - weight) * 22}px, 0)`;
    beat.setAttribute("aria-hidden", index === activeBeat ? "false" : "true");
    beat.inert = index !== activeBeat;
    beat.style.pointerEvents = index === activeBeat ? "auto" : "none";
  });

  progressItems.forEach((item, index) => {
    item.dataset.active = index === activeBeat ? "true" : "false";
  });
  if (chapterLabel) chapterLabel.textContent = chapters[activeBeat];
  if (stateLabel) stateLabel.textContent = states[activeBeat];
  if (progressIndex) progressIndex.textContent = `0${activeBeat + 1}`;
}

function tick() {
  targetProgress = getScrollProgress();
  const easing = reducedMotionQuery.matches ? 1 : 0.12;
  renderedProgress += (targetProgress - renderedProgress) * easing;
  if (Math.abs(targetProgress - renderedProgress) < 0.0001) renderedProgress = targetProgress;
  render(renderedProgress);
  frame = window.requestAnimationFrame(tick);
}

function openRecord() {
  if (!dialog || !textarea) return;
  lastTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : openButton;
  if (!dialog.open) dialog.showModal();
  window.requestAnimationFrame(() => textarea.focus());
}

function loadDraft() {
  if (!textarea || !saveStatus) return;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { draft?: string; savedAt?: string };
    if (typeof parsed.draft === "string") textarea.value = parsed.draft;
    if (parsed.draft) {
      saved = true;
      saveStatus.textContent = "这段梦已保存在这台设备。";
      if (openButton) openButton.textContent = "继续记录";
    }
  } catch {
    localStorage.removeItem(storageKey);
  }
}

function saveDraft(event: SubmitEvent) {
  event.preventDefault();
  if (!textarea || !saveStatus || !dialog) return;
  const draft = textarea.value.trim();
  if (!draft) {
    saveStatus.textContent = "先写下一点仍然记得的东西。";
    textarea.focus();
    return;
  }

  try {
    const savedAt = new Date();
    localStorage.setItem(storageKey, JSON.stringify({ draft, savedAt: savedAt.toISOString() }));
    saved = true;
    dialog.dataset.saved = "true";
    saveStatus.textContent = `已保存在这台设备 · ${savedAt.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
    if (openButton) openButton.textContent = "已经留下";
  } catch {
    saveStatus.textContent = "浏览器阻止了本机保存，请先复制这段文字。";
  }
}

function snapshot(): DeliverySnapshot {
  const activeElement = document.activeElement;
  return {
    progress: Number(renderedProgress.toFixed(4)),
    activeScene: sceneIds[activeBeat],
    activeBeat,
    assetsLoaded: images.map((image) => image.complete && image.naturalWidth > 0),
    fallback: root.dataset.fallback === "true",
    dialogOpen: Boolean(dialog?.open),
    saved,
    draftLength: textarea?.value.length ?? 0,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    reducedMotion: reducedMotionQuery.matches,
    activeElement:
      activeElement instanceof HTMLElement
        ? activeElement.id || activeElement.dataset.testid || activeElement.tagName.toLowerCase()
        : null,
  };
}

openButton?.addEventListener("click", openRecord);
closeButton?.addEventListener("click", () => dialog?.close());
form?.addEventListener("submit", saveDraft);
dialog?.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
dialog?.addEventListener("close", () => {
  lastTrigger?.focus();
});
window.addEventListener("resize", () => render(renderedProgress), { passive: true });
window.addEventListener("pagehide", () => window.cancelAnimationFrame(frame));
reducedMotionQuery.addEventListener("change", () => render(renderedProgress));

window.__dreamRecordDelivery = { setProgress, snapshot, openRecord };
loadDraft();
loadAssets();
render(0);
frame = window.requestAnimationFrame(tick);

export {};
