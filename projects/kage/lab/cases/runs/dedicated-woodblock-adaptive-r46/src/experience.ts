import { defineExperience, startExperience } from '@signal-lab/experience-sdk';
import { createScene, type PrintScene } from './scene';
import { directScene } from './director';

let scene: PrintScene | null = null;
let root: HTMLElement | null = null;
let stateNodes: HTMLElement[] = [];

const states = [
  { id: 'paper-ready', at: 0, label: '和纸就位' },
  { id: 'pressure-trace', at: .2, label: '木纹压痕' },
  { id: 'indigo-layer', at: .46, label: '靛蓝落版' },
  { id: 'vermilion-register', at: .72, label: '朱红套色' },
  { id: 'finished-imprint', at: 1, label: '作品完成' }
] as const;

function buildPage(container: HTMLElement): HTMLElement {
  const page = document.createElement('main');
  page.className = 'print-page';
  page.innerHTML = `
    <nav class="print-nav" aria-label="页面导航">
      <a class="print-mark" href="#paper-ready">日光套印所</a>
      <div class="state-meter" aria-label="当前工序">
        ${states.map((state, index) => `<span data-state="${state.id}"><b>${String(index + 1).padStart(2, '0')}</b>${state.label}</span>`).join('')}
      </div>
      <a href="#finished-imprint">预约体验</a>
    </nav>
    <div class="paper-fallback" aria-hidden="true">
      <img src="/creative-assets/r31-woodblock/washi-final-print-v1.png" alt="">
    </div>
    <header class="print-hero story-state" id="paper-ready" data-state="paper-ready" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow">一张和纸 · 一次连续套印</p>
        <h1 id="hero-title">让纸记住<br>手的力度</h1>
        <p class="hero-lede">不是三张画面的切换，而是同一张纸在日光、木香和手工压力中逐层留下证据。</p>
        <a class="text-link" href="#pressure-trace">沿着纸面进入工序 <span aria-hidden="true">↓</span></a>
      </div>
      <p class="canvas-note">滚动，观察同一张纸逐层成形</p>
    </header>
    <section class="imprint-journey" aria-label="连续木版套印过程">
      <article class="story-state process-note process-note--pressure" id="pressure-trace" data-state="pressure-trace">
        <span>01 / 03</span><h2>木纹先留下压力</h2><p>湿润的和纸贴合刻版。画面还没有出现，纤维与压痕先记录了手的力度。</p>
      </article>
      <article class="story-state process-note process-note--indigo" id="indigo-layer" data-state="indigo-layer">
        <span>02 / 03</span><h2>靛蓝被纸纤维接住</h2><p>海浪从左向右进入同一坐标。墨色深浅来自施压和吸收，不是另一张图片。</p>
      </article>
      <article class="story-state process-note process-note--vermilion" id="vermilion-register" data-state="vermilion-register">
        <span>03 / 03</span><h2>朱红允许一点错位</h2><p>飞鸟最后落下，微小的套准偏差留在纸上，成为每一张手工作品的签名。</p>
      </article>
    </section>
    <footer class="booking story-state" id="finished-imprint" data-state="finished-imprint" aria-labelledby="booking-title">
      <div>
        <p class="eyebrow">两小时 · 小班制 · 材料齐备</p>
        <h2 id="booking-title">带走一张<br>只属于你的浪</h2>
      </div>
      <div class="booking-action">
        <p>从润纸、上墨到对版，工匠陪你完成每一道工序。无需绘画经验。</p>
        <a class="cta" href="mailto:studio@example.com?subject=预约一次亲手套印">预约一次亲手套印 <span aria-hidden="true">↗</span></a>
      </div>
    </footer>`;
  container.appendChild(page);
  stateNodes = [...page.querySelectorAll<HTMLElement>('[data-state]')];
  return page;
}

function updateExperienceState(progress: number): void {
  if (!root) return;
  const active = states.reduce((best, state) =>
    Math.abs(state.at - progress) < Math.abs(best.at - progress) ? state : best
  );
  root.dataset.activeState = active.id;
  root.style.setProperty('--experience-progress', progress.toFixed(4));
  for (const node of stateNodes) node.classList.toggle('is-active', node.dataset.state === active.id);
}

startExperience(defineExperience({
  mount(context) {
    root = buildPage(context.container);
    root.classList.toggle('is-reduced-motion', context.reducedMotion);
    updateExperienceState(context.reducedMotion ? 1 : 0);
    try {
      scene = createScene(context.canvas, context.viewport.width, context.viewport.height, context.viewport.dpr, context.quality === 'low');
      root.classList.add('webgl-ready');
    } catch {
      context.canvas.style.display = 'none';
      scene = null;
      root.classList.add('webgl-fallback');
    }
  },
  update(frame) {
    const progress = frame.reducedMotion ? 1 : frame.progress;
    updateExperienceState(progress);
    if (!scene) return;
    directScene(scene, progress, frame.pointer.x, frame.pointer.y, frame.elapsed, frame.reducedMotion);
    scene.renderer.render(scene.world, scene.camera);
  },
  resize(viewport) {
    if (scene) scene.resize(viewport.width, viewport.height, viewport.dpr);
  },
  dispose() {
    scene?.dispose();
    scene = null;
    stateNodes = [];
    root?.remove();
    root = null;
  }
}));
