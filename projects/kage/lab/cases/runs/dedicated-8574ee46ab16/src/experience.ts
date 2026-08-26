import { defineExperience, startExperience } from "@signal-lab/experience-sdk";
import { DreamRoomScene } from "./scene";
import { directDream } from "./director";

const OPENING_URI = "/creative-assets/dream-room-awakening-v1.png";
const MEMORY_URI = "/creative-assets/dream-memory-fragments-v1.png";
const FINAL_URI = "/creative-assets/dream-night-record-v1.png";

let scene: DreamRoomScene | null = null;
let root: HTMLElement | null = null;
let environmentLayers: HTMLElement[] = [];

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const smooth = (start: number, end: number, value: number): number => {
  const t = clamp01((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};

function environmentOpacity(progress: number): [number, number, number] {
  const p = clamp01(progress);
  const memoryBlend = smooth(0.22, 0.38, p);
  const finalBlend = smooth(0.62, 0.78, p);
  const overlapCurve = 0.4;

  return [
    Math.pow(1 - memoryBlend, overlapCurve),
    Math.pow(memoryBlend, overlapCurve) * Math.pow(1 - finalBlend, overlapCurve),
    Math.pow(finalBlend, overlapCurve)
  ];
}

function buildPage(container: HTMLElement): HTMLElement {
  const page = document.createElement("main");
  page.className = "dream-page";
  page.innerHTML = `
    <div class="dream-environments" aria-hidden="true">
      <div class="dream-environment dream-environment--opening"></div>
      <div class="dream-environment dream-environment--memory"></div>
      <div class="dream-environment dream-environment--final"></div>
    </div>
    <div class="dream-vignette" aria-hidden="true"></div>
    <section class="dream-hero" aria-labelledby="dream-title">
      <div class="dream-copy dream-copy--opening">
        <p class="dream-kicker">梦境记录</p>
        <h1 id="dream-title">醒来以后，<br>先别急着起身。</h1>
        <p class="dream-lede">有些梦只在清晨停留几分钟。慢一点，让房间替你记住它消失前的形状。</p>
        <a class="dream-scroll" href="#memory">沿着记忆往里走 <span aria-hidden="true">↓</span></a>
      </div>
    </section>
    <section id="memory" class="dream-passage" aria-labelledby="memory-title">
      <div class="dream-copy dream-copy--memory">
        <p class="dream-kicker">未整理的片段</p>
        <h2 id="memory-title">窗纱、脚步，<br>一句没说完的话。</h2>
        <p>不必立刻解释。先把声音、光线和身体的感觉留在原处，它们会慢慢连成一条路。</p>
      </div>
    </section>
    <section class="dream-resolution" aria-labelledby="record-title">
      <div class="dream-copy dream-copy--final">
        <p class="dream-kicker">留给清醒的你</p>
        <h2 id="record-title">记录今晚的梦</h2>
        <p>从一个画面开始。无需完整，也无需合理。</p>
        <button class="dream-cta" type="button" aria-label="开始记录今晚的梦">开始记录 <span aria-hidden="true">→</span></button>
        <p class="dream-note">文字、声音，或只写下一个颜色。</p>
      </div>
    </section>`;

  environmentLayers = Array.from(
    page.querySelectorAll<HTMLElement>(".dream-environment")
  );
  environmentLayers[0]?.style.setProperty("background-image", `url("${OPENING_URI}")`);
  environmentLayers[1]?.style.setProperty("background-image", `url("${MEMORY_URI}")`);
  environmentLayers[2]?.style.setProperty("background-image", `url("${FINAL_URI}")`);
  container.appendChild(page);
  return page;
}

startExperience(defineExperience({
  mount(context) {
    root = buildPage(context.container);
    try {
      scene = new DreamRoomScene(
        context.canvas,
        context.viewport,
        context.quality,
        context.reducedMotion
      );
    } catch {
      scene = null;
      root.classList.add("dream-page--fallback");
    }
  },
  update(frame) {
    if (!root) return;
    const state = directDream(
      frame.progress,
      frame.pointer,
      frame.elapsed,
      frame.reducedMotion
    );
    const opacities = environmentOpacity(state.progress);

    scene?.render(state, frame.delta);
    for (let index = 0; index < environmentLayers.length; index += 1) {
      environmentLayers[index].style.opacity = opacities[index].toFixed(3);
    }
    root.classList.toggle("dream-page--final-visible", state.progress >= 0.78);
    root.style.setProperty("--opening-copy", state.openingCopy.toFixed(3));
    root.style.setProperty("--memory-copy", state.memoryCopy.toFixed(3));
    root.style.setProperty("--final-copy", state.finalCopy.toFixed(3));
    root.style.setProperty("--veil", state.veil.toFixed(3));
  },
  resize(viewport) {
    scene?.resize(viewport);
  },
  dispose() {
    scene?.dispose();
    scene = null;
    environmentLayers = [];
    root?.remove();
    root = null;
  }
}));
