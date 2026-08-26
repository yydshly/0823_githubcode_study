import { defineExperience, startExperience, type GeneratedFrame, type GeneratedMountContext, type GeneratedViewport } from '@signal-lab/experience-sdk';
import { createGreenhouseScene, type GreenhouseScene } from './scene';
import { direct } from './director';

let scene: GreenhouseScene | null = null;
let shell: HTMLElement | null = null;

function buildPage(container: HTMLElement): HTMLElement {
  const page = document.createElement('div');
  page.className = 'night-greenhouse';
  page.style.setProperty('--story', '0');
  page.style.setProperty('--middle', '0');
  page.innerHTML = `
    <div class="mature-environment" aria-hidden="true"></div>
    <div class="transition-environment" aria-hidden="true"></div>
    <img class="seed-pod-plate" src="/creative-assets/biomaterial-seed-pod-plate-v1.png" alt="" aria-hidden="true">
    <main class="copy-layer">
      <section class="hero-copy" aria-labelledby="page-title">
        <p class="eyebrow">NOCTURNE MATERIAL HOUSE · 2026</p>
        <h1 id="page-title">夜生表皮，<br>从一枚种子开始呼吸</h1>
        <p class="lede">一座仅在夜间开放的生物材料温室。为建筑师与材料研究者呈现纤维如何从培养基中聚合，成为可被信任的空间表皮。</p>
        <a class="primary-action" href="#visit">预约夜访 <span aria-hidden="true">↗</span></a>
      </section>
      <section class="scroll-note" aria-label="叙事进度"><span>01—03</span><i></i><span>向下阅读</span></section>
      <section class="research-note"><p>培养中的菌丝纤维<br>低照度观察 / 22:00—01:00</p></section>
      <section class="final-copy" id="visit" aria-labelledby="visit-title">
        <p class="eyebrow">NIGHT VISITATION</p>
        <h2 id="visit-title">一层会呼吸的安静穹顶</h2>
        <p>走入成熟表皮围合的中庭，查看材料样本、透湿性能与实际尺度构件。每晚限额十二位。</p>
        <a class="secondary-action" href="mailto:visit@nocturnematerial.house?subject=Night%20Greenhouse%20Visit">申请参观席位</a>
      </section>
    </main>`;
  container.appendChild(page);
  return page;
}

function mount(context: GeneratedMountContext): void {
  shell = buildPage(context.container);
  shell.classList.toggle('is-reduced-motion', context.reducedMotion);
  try {
    scene = createGreenhouseScene(context.canvas, context.quality, context.reducedMotion, context.viewport);
  } catch {
    shell.classList.add('webgl-fallback');
    scene = null;
  }
}

function update(frame: GeneratedFrame): void {
  if (!shell) return;
  const state = direct(frame.progress, frame.pointer, frame.elapsed, frame.reducedMotion);
  shell.style.setProperty('--story', state.story.toFixed(3));
  shell.style.setProperty('--middle', Math.max(0, 1 - Math.abs(state.story - 0.44) / 0.24).toFixed(3));
  scene?.render(state);
}

function resize(viewport: GeneratedViewport): void {
  scene?.resize(viewport);
}

function dispose(): void {
  scene?.dispose();
  scene = null;
  shell?.remove();
  shell = null;
}

startExperience(defineExperience({ mount, update, resize, dispose }));
