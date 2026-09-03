import { defineExperience, startExperience } from "@signal-lab/experience-sdk";
import { createWindScene, type WindScene } from "./scene";
import { directWindStory } from "./director";

let scene: WindScene | null = null;
let root: HTMLElement | null = null;
let environmentImage: HTMLImageElement | null = null;
let imageErrorHandler: (() => void) | null = null;

function buildPage(container: HTMLElement): HTMLElement {
  const page = document.createElement("main");
  page.className = "wind-page";
  page.setAttribute("aria-label", "读取今夜的风");
  page.innerHTML = `
    <div class="environment" aria-hidden="true">
      <img class="environment__image" src="/creative-assets/r16-night-wind-instrument-v1.png" alt="" />
      <div class="environment__veil"></div>
      <div class="window-slit"></div>
    </div>
    <nav class="quiet-nav" aria-label="页面导航">
      <a href="#opening" class="quiet-nav__mark">夜风谱</a>
      <a href="#reading">观测证据</a>
      <a href="#resolve">今夜读数</a>
    </nav>
    <div class="story">
      <section class="opening" id="opening">
        <p class="eyebrow">窗边气象装置 · 21:40</p>
        <h1>风经过房间之前，<br />先留下形状。</h1>
        <p class="lede">月白陶瓷收住室内的静，氧化铜与细纤维把窗外看不见的流动，变成能够停留片刻的证据。</p>
        <a class="text-link" href="#reading">沿窗缝向外看 <span aria-hidden="true">↓</span></a>
      </section>

      <section class="evidence" id="reading" aria-labelledby="reading-title">
        <div class="evidence__copy">
          <p class="eyebrow">气流经过窗缝</p>
          <h2 id="reading-title">不是数字先抵达，<br />是纤维先弯曲。</h2>
          <p>不同风速改变纤维的弧度；温度、湿度与方向沿同一条气流轨迹显影。读数因此有了来处，也有了方向。</p>
        </div>
        <dl class="readings" aria-label="今夜环境证据">
          <div><dt>风向</dt><dd>东南偏东</dd></div>
          <div><dt>温度</dt><dd>22.8°C</dd></div>
          <div><dt>湿度</dt><dd>67%</dd></div>
          <div><dt>风速</dt><dd>1.6 m/s</dd></div>
        </dl>
      </section>

      <section class="resolve" id="resolve" aria-labelledby="resolve-title">
        <div class="resolve__panel">
          <p class="eyebrow">窗边 · 稳定观测</p>
          <h2 id="resolve-title">读取今夜的风</h2>
          <p>让窗外的自然节律，成为房间里一件安静、可信的日常事物。</p>
          <button class="primary-action" type="button">开始今夜读取</button>
          <p class="status" aria-live="polite">装置已就绪 · 纤维处于低风速状态</p>
        </div>
      </section>
    </div>`;
  container.appendChild(page);
  return page;
}

startExperience(defineExperience({
  mount(context) {
    root = buildPage(context.container);
    environmentImage = root.querySelector<HTMLImageElement>(".environment__image");
    imageErrorHandler = () => root?.classList.add("asset-fallback");
    environmentImage?.addEventListener("error", imageErrorHandler);

    const action = root.querySelector<HTMLButtonElement>(".primary-action");
    action?.addEventListener("click", () => {
      const status = root?.querySelector<HTMLElement>(".status");
      if (status) status.textContent = "正在读取 · 请留意纤维方向的缓慢变化";
    });

    try {
      scene = createWindScene(context.canvas, context.viewport, context.quality, context.reducedMotion);
    } catch {
      root.classList.add("webgl-fallback");
      scene = null;
    }
  },

  update(frame) {
    if (!root) return;
    const state = directWindStory(frame.progress, frame.pointer, frame.elapsed, frame.reducedMotion);
    root.style.setProperty("--clarity", state.environmentClarity.toFixed(3));
    root.style.setProperty("--veil", state.veilOpacity.toFixed(3));
    root.style.setProperty("--slit", state.slitPresence.toFixed(3));
    root.dataset.phase = state.phase;
    scene?.render(state, frame.delta);
  },

  resize(viewport) {
    scene?.resize(viewport);
  },

  dispose() {
    if (environmentImage && imageErrorHandler) {
      environmentImage.removeEventListener("error", imageErrorHandler);
    }
    scene?.dispose();
    scene = null;
    environmentImage = null;
    imageErrorHandler = null;
    root?.remove();
    root = null;
  }
}));
