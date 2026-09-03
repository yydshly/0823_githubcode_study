import { defineExperience, startExperience } from '@signal-lab/experience-sdk';
import { PaperScene } from './scene';
import { direct, type DirectedState } from './director';

let scene: PaperScene | null = null;
let root: HTMLElement | null = null;
let lastState: DirectedState | null = null;

function createPage(container: HTMLElement): HTMLElement {
  const page = document.createElement('main');
  page.className = 'conservation-page';
  page.innerHTML = `
    <div class="environment-field" aria-hidden="true">
      <img class="environment-image environment-damaged" src="/creative-assets/r12-paper-restoration/paper-damaged-v1.png" alt="">
      <img class="environment-image environment-restored" src="/creative-assets/r12-paper-restoration/paper-restored-v1.png" alt="">
      <div class="environment-shade"></div>
      <div class="repair-focus"></div>
    </div>

    <header class="site-head" aria-label="工坊页首">
      <a class="wordmark" href="#opening" aria-label="纸本文献修复工坊首页">
        <span class="wordmark-mark" aria-hidden="true"></span>
        <span>纸本文献修复工坊</span>
      </a>
      <a class="quiet-link" href="#submit">委托修复</a>
    </header>

    <div class="chapter-rail" aria-label="修复过程导航">
      <a href="#opening"><span>01</span> 勘察</a>
      <a href="#fibres"><span>02</span> 理纤</a>
      <a href="#mending"><span>03</span> 补纸</a>
      <a href="#reading"><span>04</span> 复读</a>
    </div>

    <section class="story opening" id="opening" data-scene="opening">
      <div class="copy hero-copy">
        <p class="eyebrow">纸本文献修复 · 一页一案</p>
        <h1>让一页旧纸，<br>重新被读懂。</h1>
        <p class="lede">潮渍、断裂与漫漶并非终点。我们从纸张纤维开始，保存时间留下的证据，也恢复它被阅读的可能。</p>
        <a class="text-action" href="#fibres">沿裂缝进入修复过程 <span aria-hidden="true">↓</span></a>
      </div>
      <p class="scene-note">受潮卷曲 · 裂口失纤 · 墨迹漫漶</p>
    </section>

    <section class="story fibres" id="fibres" data-scene="fibres">
      <div class="copy process-copy">
        <p class="step">01 / 理纤</p>
        <h2>先辨认每一根<br>断开的方向</h2>
        <p>在放大观察下，凌乱纤维被逐根舒展、归位。修复不是覆盖损伤，而是理解原纸如何形成。</p>
        <dl class="evidence">
          <div><dt>观察</dt><dd>纤维走向与纸帘纹</dd></div>
          <div><dt>处理</dt><dd>局部润湿与柔性展平</dd></div>
        </dl>
      </div>
    </section>

    <section class="story mending" id="mending" data-scene="mending">
      <div class="copy process-copy right-copy">
        <p class="step">02 / 手工补纸</p>
        <h2>补上缺失，<br>不抹去时间</h2>
        <p>选择纤维、厚度与色泽相近的手工纸，让毛边沿原裂口自然嵌合。补口可辨，却不抢夺原件的声音。</p>
        <p class="material-label">相近纤维 / 可逆黏合 / 湿润压合</p>
      </div>
    </section>

    <section class="story reading" id="reading" data-scene="reading">
      <div class="copy process-copy">
        <p class="step">03 / 墨迹复读</p>
        <h2>不是添写，<br>是让原迹重现</h2>
        <p>纸面平复、纤维稳定后，光线重新穿过墨与纸的层次。模糊的字迹恢复可辨，原始信息仍保持克制而诚实。</p>
        <blockquote>“修复的尺度，是让文献继续说自己的话。”</blockquote>
      </div>
    </section>

    <section class="story resolution" id="submit" data-scene="resolution">
      <div class="final-copy">
        <p class="eyebrow">私人收藏 · 小型档案机构</p>
        <h2>从这一页，开始保存。</h2>
        <p>上传纸页正反面照片并说明尺寸、损伤与保存环境，我们会先给出一份初步修复判断。</p>
        <a class="primary-action" href="mailto:studio@example.invalid?subject=纸本文献修复咨询">提交一页待修复文献 <span aria-hidden="true">↗</span></a>
        <p class="fine-print">初步判断不改变原件 · 正式处理前确认方案与可逆性</p>
      </div>
      <footer><span>纸本文献修复工坊</span><span>以最少干预，延长真实寿命</span></footer>
    </section>
  `;
  container.appendChild(page);
  return page;
}

startExperience(defineExperience({
  mount(context) {
    root = createPage(context.container);
    scene = new PaperScene(context.canvas, context.quality, context.viewport, context.reducedMotion);
  },
  update(frame) {
    if (!scene || !root) return;
    lastState = direct(frame.progress, frame.pointer, frame.elapsed, frame.reducedMotion);
    scene.render(lastState, frame.delta);
    root.style.setProperty('--story-progress', frame.progress.toFixed(4));
    root.style.setProperty('--restore-blend', lastState.restoredPage.toFixed(4));
    root.style.setProperty('--detail-blend', Math.min(1, lastState.fibreDepth * 1.15).toFixed(4));
    root.style.setProperty('--inspection-x', lastState.inspectionX.toFixed(4));
    root.style.setProperty('--inspection-y', lastState.inspectionY.toFixed(4));
    root.dataset.phase = lastState.phase;
  },
  resize(viewport) {
    scene?.resize(viewport);
  },
  dispose() {
    scene?.dispose();
    scene = null;
    lastState = null;
    root?.remove();
    root = null;
  }
}));
