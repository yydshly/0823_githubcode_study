import {
  defineExperience,
  startExperience,
  type GeneratedFrame,
  type GeneratedMountContext,
  type GeneratedViewport
} from '@signal-lab/experience-sdk';
import { createScene, type SceneRuntime } from './scene';
import { createDirector } from './director';

let runtime: SceneRuntime | null = null;
let page: HTMLElement | null = null;

function buildPage(container: HTMLElement): HTMLElement {
  container.querySelector<HTMLElement>('[data-fluid-couture-root]')?.remove();
  const root = document.createElement('main');
  root.className = 'fluid-couture';
  root.dataset.fluidCoutureRoot = '';
  root.innerHTML = `
    <div class="fluid-couture__grain" aria-hidden="true"></div>
    <div class="fluid-couture__progress" aria-hidden="true"><i></i><span>01</span><span>02</span><span>03</span></div>
    <header class="fluid-couture__nav">
      <a class="fluid-couture__mark" href="#arrival" aria-label="Veyra 首页">VEYRA<span>17</span></a>
      <p>Material in motion / 01</p>
      <a href="#collection">View collection</a>
    </header>
    <section class="fluid-couture__hero" id="arrival" aria-labelledby="fluid-title">
      <p class="fluid-couture__eyebrow"><span>New form</span><span>Autumn 2026</span></p>
      <h1 id="fluid-title"><span>Wear the </span><strong>Unfixed.</strong></h1>
      <div class="fluid-couture__intro">
        <p>服装不必服从轮廓。透明层次、液态光泽与身体之间，保留一段自由呼吸的距离。</p>
        <a class="fluid-couture__enter" href="#collection"><span>进入系列</span><i aria-hidden="true">↘</i></a>
      </div>
      <p class="fluid-couture__scroll"><span>Scroll</span><i aria-hidden="true"></i><span>Material dissolves</span></p>
    </section>
    <section class="fluid-couture__manifesto" aria-labelledby="manifesto-title">
      <div class="fluid-couture__section-index"><span>02</span><span>Release the contour</span></div>
      <p class="fluid-couture__kicker">Softness is not surrender.</p>
      <h2 id="manifesto-title">柔软，<br><em>也可以拥有方向。</em></h2>
      <p class="fluid-couture__manifesto-copy">半透明纤维沿身体展开，结构被光重新裁剪。滚动不是浏览页面，而是在亲手释放轮廓。</p>
    </section>
    <section class="fluid-couture__collection" id="collection" aria-labelledby="collection-title">
      <div class="fluid-couture__section-index"><span>03</span><span>The form returns</span></div>
      <div class="fluid-couture__collection-copy">
        <p class="fluid-couture__kicker">Look 01 — The Liquid Veil</p>
        <h2 id="collection-title">A silhouette<br><em>still becoming.</em></h2>
      </div>
      <div class="fluid-couture__details">
        <p><small>Edition</small>17 pieces<br>numbered by hand</p>
        <p><small>Material</small>regenerated organza<br>heat-shaped in Shanghai</p>
        <a class="fluid-couture__cta" href="mailto:studio@veyra.example"><span>预约私人预览</span><span aria-hidden="true">→</span></a>
      </div>
    </section>
    <footer class="fluid-couture__footer"><span>VEYRA / SHANGHAI</span><span>FORM 01 / 2026</span></footer>
  `;
  container.append(root);
  return root;
}

startExperience(defineExperience({
  mount(context: GeneratedMountContext) {
    page = buildPage(context.container);
    const director = createDirector(context.reducedMotion);
    try {
      runtime = createScene(context.canvas, {
        lowQuality: context.quality === 'low',
        reducedMotion: context.reducedMotion,
        director
      });
    } catch (error) {
      page.classList.add('fluid-couture--fallback');
      console.warn('[fluid-couture] WebGL enhancement unavailable', error);
    }
  },
  update(frame: GeneratedFrame) {
    runtime?.setProgress(frame.progress);
    runtime?.setPointer(frame.pointer.x * frame.pointer.strength, frame.pointer.y * frame.pointer.strength);
    runtime?.update(frame.elapsed, frame.delta);
    if (page) {
      page.style.setProperty('--page-progress', frame.progress.toFixed(4));
      page.dataset.chapter = frame.progress < 0.27 ? 'arrival' : frame.progress < 0.68 ? 'release' : 'resolve';
    }
    document.body.dataset.generatedProgress = frame.progress.toFixed(3);
  },
  resize(viewport: GeneratedViewport) { runtime?.resize(viewport.width, viewport.height); },
  dispose() {
    runtime?.dispose();
    runtime = null;
    page?.remove();
    page = null;
  }
}));
