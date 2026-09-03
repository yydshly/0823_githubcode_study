import { defineExperience, startExperience } from '@signal-lab/experience-sdk';
import { LanternScene } from './scene';
import { direct, type DirectedState } from './director';

let scene: LanternScene | null = null;
let root: HTMLElement | null = null;
let cleanups: Array<() => void> = [];
let lastState: DirectedState | null = null;

function mount(context: Parameters<Parameters<typeof defineExperience>[0]['mount']>[0]): void {
  const { container, canvas, reducedMotion } = context;
  root = document.createElement('main');
  root.className = `lantern-page${reducedMotion ? ' is-reduced' : ''}`;
  root.innerHTML = `
    <div class="visual-wrap" data-signal-visual-anchor aria-hidden="true"></div>
    <header class="hero" id="start">
      <p class="eyebrow">FIELD NOTE 04 · 可折叠日光露营灯</p>
      <h1>把一盏日光，<br>收进背包侧袋。</h1>
      <p class="lead">向下滚动，亲眼看它从扁平收纳展开成稳定、温暖的营地照明。</p>
      <nav class="state-nav" aria-label="查看灯具状态">
        <button data-stop="0">收纳</button><button data-stop="0.34">半展开</button><button data-stop="0.68">完全展开</button><button data-stop="1">点亮</button>
      </nav>
      <a class="scroll-cue" href="#structure">查看折叠结构 ↓</a>
    </header>
    <section class="note note-a" id="structure">
      <p class="index">01 / PACK</p><h2>扁平时，给真正要带的装备让路。</h2>
      <p>灯罩沿纵向褶线收拢，提手与上下铝环保持完整；不拆零件，抵达营地后也无需重新组装。</p>
      <dl><div><dt>当前任务</dt><dd>展开灯罩</dd></div><div><dt>可见结果</dt><dd>照明体积由薄片恢复</dd></div></dl>
    </section>
    <section class="note note-b">
      <p class="index">02 / HINGE</p><h2>一拉展开，结构自己找到位置。</h2>
      <p>顶部提手抬升时，象牙色折叠灯罩逐层张开。固定的顶盖与底座让受力路径清楚，也让操作容易判断。</p>
    </section>
    <section class="note note-c">
      <p class="index">03 / USE</p><h2>完整展开，才是它真实工作的形态。</h2>
      <p>灯罩形成均匀的扩散面，宽底座稳定接地。白天看清结构，入夜后获得柔和而不刺眼的近场光。</p>
    </section>
    <section class="resolve" id="resolve">
      <div><p class="eyebrow">READY FOR CAMP</p><h2>为下一次露营<br>点亮它。</h2><p>从收纳到照明，只需一次连续展开。把可用的暖光，留给帐篷、晚餐和同行的人。</p><a class="cta" href="#start" data-action>选择这盏灯 <span>→</span></a></div>
    </section>`;
  container.appendChild(root);
  const visual = root.querySelector<HTMLElement>('.visual-wrap');
  if (!visual) return;
  scene = new LanternScene(visual, canvas);
  root.querySelectorAll<HTMLButtonElement>('[data-stop]').forEach((button) => {
    const handler = (): void => {
      const value = Number(button.dataset.stop ?? 0);
      const range = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      scrollTo({ top: range * value, behavior: reducedMotion ? 'auto' : 'smooth' });
    };
    button.addEventListener('click', handler);
    cleanups.push(() => button.removeEventListener('click', handler));
  });
}

function update(frame: Parameters<Parameters<typeof defineExperience>[0]['update']>[0]): void {
  if (!scene || !root) return;
  lastState = direct(frame.progress, frame.pointer.x, frame.elapsed, frame.reducedMotion);
  scene.update(lastState);
  root.style.setProperty('--story', String(lastState.progress));
  root.querySelectorAll<HTMLButtonElement>('[data-stop]').forEach((button, index) => button.classList.toggle('active', index === lastState?.stage));
}

function resize(viewport: Parameters<Parameters<typeof defineExperience>[0]['resize']>[0]): void {
  scene?.resize(viewport.width, viewport.height, viewport.dpr);
}

function dispose(): void {
  cleanups.forEach((cleanup) => cleanup());
  cleanups = [];
  scene?.dispose();
  scene = null;
  root?.remove();
  root = null;
  lastState = null;
}

startExperience(defineExperience({ mount, update, resize, dispose }));
