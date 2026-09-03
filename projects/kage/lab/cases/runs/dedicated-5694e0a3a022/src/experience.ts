import { defineExperience, startExperience } from '@signal-lab/experience-sdk';
import { RepairScene, type FaultKind } from './scene';
import { directRepairStory } from './director';

let scene: RepairScene | null = null;
let root: HTMLElement | null = null;
let currentFault: FaultKind = 'stalled';
let removeListeners: Array<() => void> = [];

const faultCopy: Record<FaultKind, { part: string; order: string; safety: string; difficulty: string }> = {
  stalled: {
    part: '启动电容与轴套',
    order: '先断电并拨动扇叶，再检查轴套阻力，最后测量启动电容。',
    safety: '电容可能存有余电；拆线前先由志愿者确认放电。',
    difficulty: '预计难度：中等 · 约 35 分钟'
  },
  noise: {
    part: '护网、扇叶与轴套',
    order: '先查护网松动，再检查扇叶偏摆，最后清洁并评估轴套。',
    safety: '任何通电测试都必须装回护网，并保持工具离开旋转面。',
    difficulty: '预计难度：入门 · 约 25 分钟'
  },
  weak: {
    part: '扇叶积尘与电机绕组',
    order: '先清洁风道和扇叶，再检查转速档位，最后测量绕组状态。',
    safety: '清洁前拔掉插头；不要向电机内部直接喷洒清洁剂。',
    difficulty: '预计难度：中等 · 约 40 分钟'
  }
};

function markup(): string {
  return `
    <main class="repair-story" aria-label="社区维修工作坊电风扇诊断">
      <header class="workshop-header">
        <a class="workshop-mark" href="#diagnosis" aria-label="回到诊断台">
          <span aria-hidden="true">修</span>
          <strong>街坊维修间</strong>
        </a>
        <p>周六开放 · 工具与志愿者在桌边等你</p>
      </header>

      <section class="hero" id="diagnosis">
        <div class="hero-copy">
          <p class="eyebrow">老式台式风扇 · 诊断卡 08</p>
          <h1>先听它怎么说，<br>再决定拆哪里。</h1>
          <p class="intro">选择最接近的症状。装配图会标出可能的故障部件，并给出一条安全、可执行的检查顺序。</p>
          <div class="fault-picker" role="group" aria-label="选择风扇症状">
            <button type="button" data-fault="stalled" aria-pressed="true"><span>01</span>不转</button>
            <button type="button" data-fault="noise" aria-pressed="false"><span>02</span>异响</button>
            <button type="button" data-fault="weak" aria-pressed="false"><span>03</span>风力变弱</button>
          </div>
        </div>

        <aside class="diagnostic-card" aria-live="polite">
          <p class="card-label">当前检查对象</p>
          <h2 data-field="part">启动电容与轴套</h2>
          <ol class="stage-rail" aria-label="维修阶段">
            <li data-stage="0" class="is-active"><b>诊断</b><span>观察与手动检查</span></li>
            <li data-stage="1"><b>拆解</b><span>按顺序展开部件</span></li>
            <li data-stage="2"><b>测试</b><span>确认结果再复装</span></li>
          </ol>
          <p class="check-order" data-field="order">先断电并拨动扇叶，再检查轴套阻力，最后测量启动电容。</p>
          <p class="safety"><strong>安全提示</strong><span data-field="safety">电容可能存有余电；拆线前先由志愿者确认放电。</span></p>
          <p class="difficulty" data-field="difficulty">预计难度：中等 · 约 35 分钟</p>
        </aside>
      </section>

      <section class="process-note" aria-label="维修流程说明">
        <p class="note-number">桌面流程 / 01—03</p>
        <div>
          <h2>从判断，到拆开，再到有把握地装回去。</h2>
          <p>向下滚动查看同一台风扇的三个工作状态。图中彩色部件保持原位关系，只有当前需要理解的结构会展开。</p>
        </div>
      </section>

      <section class="booking" id="booking">
        <div>
          <p class="eyebrow">带上你的风扇，也带上它最近的声音</p>
          <h2>给旧东西一张<br>认真检查的桌子。</h2>
        </div>
        <div class="booking-action">
          <p>每张桌提供万用表、常用工具、护目镜和一位社区志愿者。零经验也可以来。</p>
          <a href="#booking" data-book>预约一张维修桌 <span aria-hidden="true">→</span></a>
          <small>周六 10:00—17:00 · 每桌 60 分钟</small>
        </div>
      </section>
    </main>`;
}

function updateCopy(fault: FaultKind): void {
  if (!root) return;
  const copy = faultCopy[fault];
  (root.querySelector('[data-field="part"]') as HTMLElement | null)?.replaceChildren(copy.part);
  (root.querySelector('[data-field="order"]') as HTMLElement | null)?.replaceChildren(copy.order);
  (root.querySelector('[data-field="safety"]') as HTMLElement | null)?.replaceChildren(copy.safety);
  (root.querySelector('[data-field="difficulty"]') as HTMLElement | null)?.replaceChildren(copy.difficulty);
}

startExperience(defineExperience({
  mount(context) {
    root = context.container.ownerDocument.createElement('div');
    root.className = 'repair-page';
    root.innerHTML = markup();
    context.container.appendChild(root);

    try {
      scene = new RepairScene(context.canvas, context.viewport, context.quality === 'low');
    } catch {
      scene = null;
      root.classList.add('webgl-unavailable');
    }

    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-fault]'));
    buttons.forEach((button) => {
      const handler = (): void => {
        const next = button.dataset.fault;
        if (next !== 'stalled' && next !== 'noise' && next !== 'weak') return;
        currentFault = next;
        buttons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
        updateCopy(next);
        scene?.setFault(next);
      };
      button.addEventListener('click', handler);
      removeListeners.push(() => button.removeEventListener('click', handler));
    });

    const booking = root.querySelector<HTMLAnchorElement>('[data-book]');
    if (booking) {
      const handler = (event: MouseEvent): void => {
        event.preventDefault();
        booking.textContent = '已为你保留预约入口 ✓';
        booking.setAttribute('aria-label', '预约入口已准备，请在工作坊开放时登记');
      };
      booking.addEventListener('click', handler);
      removeListeners.push(() => booking.removeEventListener('click', handler));
    }
  },

  update(frame) {
    if (!root) return;
    const state = directRepairStory(frame.progress, frame.pointer, frame.elapsed, frame.reducedMotion);
    root.style.setProperty('--story-progress', state.progress.toFixed(3));
    root.style.setProperty('--stage-shift', `${state.stageShift.toFixed(2)}%`);
    const stages = Array.from(root.querySelectorAll<HTMLElement>('[data-stage]'));
    stages.forEach((item, index) => item.classList.toggle('is-active', index === state.stage));
    scene?.render(state, currentFault, frame.delta);
  },

  resize(viewport) {
    scene?.resize(viewport);
  },

  dispose() {
    removeListeners.forEach((remove) => remove());
    removeListeners = [];
    scene?.dispose();
    scene = null;
    root?.remove();
    root = null;
  }
}));
