import { defineExperience, startExperience } from '@signal-lab/experience-sdk';
import { ScentScene } from './scene';
import { MemoryDirector } from './director';

let scene: ScentScene | null = null;
let director: MemoryDirector | null = null;
let root: HTMLElement | null = null;
let memoryLine: HTMLElement | null = null;
let ratioLine: HTMLElement | null = null;
let stageLabel: HTMLElement | null = null;
let sealButton: HTMLButtonElement | null = null;
let sealedNote: HTMLElement | null = null;
let onSeal: (() => void) | null = null;

const makeMarkup = (): HTMLElement => {
  const element = document.createElement('main');
  element.className = 'scent-page';
  element.innerHTML = `
    <div class="scent-canvas-wash" aria-hidden="true"></div>
    <header class="scent-nav" aria-label="气味标本室导航">
      <a class="scent-mark" href="#opening">气味标本室 <span>NO. 083</span></a>
      <span class="scent-nav-note">一座私人嗅觉档案</span>
    </header>

    <div class="scent-scroll" id="opening">
      <section class="scent-hero" aria-labelledby="scent-title">
        <div class="scent-kicker">OLFACTORY MEMORY · 2026</div>
        <h1 id="scent-title">有些记忆，<br>先于语言回来。</h1>
        <p>将一次雨、一页旧书与一件晒暖的衬衫，保存成可以重新打开的气味标本。</p>
        <a class="scent-enter" href="#blend">进入这段记忆 <span aria-hidden="true">↓</span></a>
      </section>

      <section class="scent-blend" id="blend" aria-labelledby="blend-title">
        <div class="scent-panel">
          <div class="scent-kicker">MEMORY COMPOSITION</div>
          <h2 id="blend-title">记忆正在显影</h2>
          <p id="memory-line" aria-live="polite">雨停不久，玻璃上的雾气还没有散。</p>
          <div class="scent-ratios" id="ratio-line">雨后泥土 34 · 旧书纸张 33 · 晒过的棉布 33</div>
          <p class="scent-hint">移动指针或轻触画面，改变三种气味的混合比例。</p>
        </div>
        <div class="scent-index" aria-label="气味构成">
          <span><i class="soil"></i>雨后泥土</span>
          <span><i class="paper"></i>旧书纸张</span>
          <span><i class="cotton"></i>晒过的棉布</span>
        </div>
      </section>

      <section class="scent-final" aria-labelledby="final-title">
        <div class="scent-final-copy">
          <div class="scent-kicker" id="stage-label">SPECIMEN READY</div>
          <h2 id="final-title">把今天，<br>留给未来的你。</h2>
          <p>三层气味已经重新汇合。它会保留此刻的比例，也保留你为它停留的时间。</p>
          <button class="scent-seal" type="button">封存这段记忆</button>
          <div class="scent-sealed-note" aria-live="polite"></div>
        </div>
        <div class="scent-catalog" aria-label="标本信息">
          <span>采集地</span><b>一场雨后的房间</b>
          <span>保存状态</span><b>等待封存</b>
          <span>标本编号</span><b>SM–083</b>
        </div>
      </section>
    </div>`;
  return element;
};

startExperience(defineExperience({
  mount(context) {
    root = makeMarkup();
    context.container.appendChild(root);
    memoryLine = root.querySelector<HTMLElement>('#memory-line');
    ratioLine = root.querySelector<HTMLElement>('#ratio-line');
    stageLabel = root.querySelector<HTMLElement>('#stage-label');
    sealButton = root.querySelector<HTMLButtonElement>('.scent-seal');
    sealedNote = root.querySelector<HTMLElement>('.scent-sealed-note');

    director = new MemoryDirector(context.reducedMotion);
    scene = new ScentScene(context.canvas, context.quality, context.reducedMotion, context.viewport);

    onSeal = () => {
      if (sealButton === null || sealedNote === null) return;
      sealButton.textContent = '已封存';
      sealButton.disabled = true;
      sealedNote.textContent = '气味标本 SM–083 已收入你的私人档案。';
      root?.classList.add('is-sealed');
      scene?.setSealed(true);
    };
    sealButton?.addEventListener('click', onSeal);
  },

  update(frame) {
    if (scene === null || director === null) return;
    const state = director.sample(frame.progress, frame.pointer.x, frame.pointer.y, frame.elapsed);
    scene.render(state, frame.delta);

    if (memoryLine !== null) memoryLine.textContent = state.memoryText;
    if (ratioLine !== null) {
      ratioLine.textContent = `雨后泥土 ${Math.round(state.mix.soil * 100)} · 旧书纸张 ${Math.round(state.mix.paper * 100)} · 晒过的棉布 ${Math.round(state.mix.cotton * 100)}`;
    }
    if (stageLabel !== null) stageLabel.textContent = state.progress > 0.84 ? 'SPECIMEN READY' : 'MEMORY IN PROCESS';
    root?.style.setProperty('--clarity', state.clarity.toFixed(3));
    root?.style.setProperty('--story-progress', state.progress.toFixed(3));
  },

  resize(viewport) {
    scene?.resize(viewport);
  },

  dispose() {
    if (sealButton !== null && onSeal !== null) sealButton.removeEventListener('click', onSeal);
    scene?.dispose();
    scene = null;
    director = null;
    root?.remove();
    root = null;
    memoryLine = null;
    ratioLine = null;
    stageLabel = null;
    sealButton = null;
    sealedNote = null;
    onSeal = null;
  }
}));
