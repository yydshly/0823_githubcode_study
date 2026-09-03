import { defineExperience, startExperience } from '@signal-lab/experience-sdk';
import { createScene, type PrintScene } from './scene';
import { directScene } from './director';

let scene: PrintScene | null = null;
let root: HTMLElement | null = null;

function buildPage(container: HTMLElement): HTMLElement {
  const page = document.createElement('main');
  page.className = 'print-page';
  page.innerHTML = `
    <style>
      .webgl-ready .paper-fallback { display: none !important; }
      .print-page.is-reduced-motion { min-height: 100svh; }
      .print-page.is-reduced-motion .process,
      .print-page.is-reduced-motion .booking,
      .print-page.is-reduced-motion .canvas-note,
      .print-page.is-reduced-motion .text-link { display: none; }
      .print-page.is-reduced-motion .print-hero { min-height: 100svh; }
      .print-page.is-reduced-motion .hero-cta { display: inline-block; margin-top: 8px; }
      .print-page.is-reduced-motion .hero-copy { position: relative; z-index: 3; }
      .booking {
        background: linear-gradient(90deg, rgba(242,220,177,.84), rgba(242,220,177,.18) 34%, transparent 48%, rgba(242,220,177,.12) 66%, rgba(242,220,177,.8));
      }
      .process article { max-width: 290px; }
      .process h2 { font-size: clamp(21px, 2.25vw, 31px); }
      .process {
        grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
        gap: 14px;
        align-content: center;
      }
      .process article,
      .process article:nth-child(2),
      .process article:nth-child(3) {
        grid-column: 2;
        margin: 0;
        max-width: none;
        padding: 14px 18px 16px;
        background: rgba(239, 211, 162, .82);
        border-top-color: rgba(45, 39, 31, .35);
        box-shadow: 0 18px 42px rgba(91, 52, 25, .08);
      }
      .booking {
        align-items: end;
        padding-top: 58vh;
        background: linear-gradient(180deg, transparent 0 46%, rgba(242,220,177,.5) 68%, rgba(242,220,177,.92));
      }
      @media (max-width: 700px) {
        .process { display: flex; gap: 12vh; }
        .process article,
        .process article:nth-child(2),
        .process article:nth-child(3) { max-width: 78%; }
        .process article:nth-child(2) { margin-left: auto; }
        .booking { padding-top: 16vh; }
      }
    </style>
    <nav class="print-nav" aria-label="页面导航">
      <a class="print-mark" href="#opening">日光套印所</a>
      <a href="#booking">预约体验</a>
    </nav>
    <div class="paper-fallback" aria-hidden="true">
      <img src="/creative-assets/r31-woodblock/washi-final-print-v1.png" alt="" style="display:block;width:100%;height:auto">
    </div>
    <section class="print-hero" id="opening" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow">一张和纸 · 三次落版</p>
        <h1 id="hero-title">让纸记住<br>手的力度</h1>
        <p class="hero-lede">在日光与木香之间，亲手完成靛蓝海浪与朱红飞鸟的套印。</p>
        <a class="text-link" href="#process">沿着纸面看套色 <span aria-hidden="true">↓</span></a>
        <a class="hero-cta" href="#booking">预约一次亲手套印 <span aria-hidden="true">↗</span></a>
      </div>
      <p class="canvas-note">滚动，观察同一张纸逐层成形</p>
    </section>
    <section class="process" id="process" aria-label="木版套印过程">
      <article><span>01</span><h2>木纹先留下压力</h2><p>湿润的和纸贴合刻版，纤维顺着刀痕轻轻下陷。</p></article>
      <article><span>02</span><h2>靛蓝压出海浪</h2><p>墨色被纸纤维吸收，深浅来自一次真实的手工施压。</p></article>
      <article><span>03</span><h2>朱红允许一点错位</h2><p>飞鸟略偏离刻线，那一点不齐，正是每张作品的签名。</p></article>
    </section>
    <section class="booking" id="booking" aria-labelledby="booking-title">
      <div>
        <p class="eyebrow">两小时 · 小班制 · 材料齐备</p>
        <h2 id="booking-title">带走一张<br>只属于你的浪</h2>
      </div>
      <div class="booking-action">
        <p>从润纸、上墨到对版，工匠会陪你完成每一道工序。无需绘画经验。</p>
        <a class="cta" href="mailto:studio@example.com?subject=预约一次亲手套印">预约一次亲手套印 <span aria-hidden="true">↗</span></a>
      </div>
    </section>`;
  container.appendChild(page);
  return page;
}

startExperience(defineExperience({
  mount(context) {
    root = buildPage(context.container);
    root.classList.toggle('is-reduced-motion', context.reducedMotion);
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
    if (!scene) return;
    directScene(scene, frame.reducedMotion ? 1 : frame.progress, frame.pointer.x, frame.pointer.y, frame.elapsed, frame.reducedMotion);
    scene.renderer.render(scene.world, scene.camera);
  },
  resize(viewport) {
    if (scene) scene.resize(viewport.width, viewport.height, viewport.dpr);
  },
  dispose() {
    scene?.dispose();
    scene = null;
    root?.remove();
    root = null;
  }
}));
