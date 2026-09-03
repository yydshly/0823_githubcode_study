import { defineExperience, startExperience } from '@signal-lab/experience-sdk';
import { CoolingScene } from './scene';
import { direct, type StationState } from './director';

let root: HTMLElement | null = null;
let scene: CoolingScene | null = null;
let state: StationState = { progress: 0, density: 72, water: 58, mode: 'manual' };
let scrollRange = 1;
let scrollListener: (() => void) | null = null;
let wheelListener: (() => void) | null = null;
let demoTimer: number | null = null;

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function takeControl(mode: StationState['mode']): void {
  state.mode = mode;
  if (demoTimer !== null) {
    window.clearTimeout(demoTimer);
    demoTimer = null;
  }
}

function updateInterface(): void {
  if (!root) return;
  const noonHeat = Math.exp(-Math.pow((state.progress - 0.55) / 0.23, 2));
  const shade = Math.round(22 + state.density * 0.5 + state.water * 0.05);
  const temp = Math.round(42 + noonHeat * 4 - state.density * 0.11 - state.water * 0.035);
  const phase = state.progress < 0.28 ? '08:10 · 清晨基线' : state.progress < 0.72 ? '12:40 · 正午观察' : '17:20 · 浇灌后';
  root.querySelector<HTMLElement>('[data-phase]')!.textContent = phase;
  root.querySelector<HTMLElement>('[data-shade]')!.textContent = `${shade}%`;
  root.querySelector<HTMLElement>('[data-temp]')!.textContent = `${temp}°C`;
  root.querySelector<HTMLElement>('[data-transpire]')!.textContent = state.water > 50
    ? '叶面蒸腾与地面树荫共同降低体感温度。'
    : '当前补水不足，正午蒸腾效率正在下降。';
  const demo = root.querySelector<HTMLButtonElement>('[data-demo]')!;
  demo.textContent = state.mode === 'demo' ? '暂停演示' : '播放自动演示';
  demo.setAttribute('aria-pressed', String(state.mode === 'demo'));
  root.dataset.driveMode = state.mode;
  const marker = root.querySelector<HTMLElement>('[data-signal-driver-progress]')!;
  marker.dataset.progress = state.progress.toFixed(3);
  marker.setAttribute('aria-valuenow', String(Math.round(state.progress * 100)));
  root.style.setProperty('--progress', state.progress.toFixed(3));
  root.style.setProperty('--scene-pan', `${Math.round((state.progress - 0.5) * -22)}px`);
  root.style.setProperty('--canopy', (state.density / 100).toFixed(3));
  root.style.setProperty('--wet', (state.water / 100).toFixed(3));
  root.style.setProperty('--saturation', `${Math.round(84 + state.density * 0.18)}%`);
  root.style.setProperty('--brightness', `${Math.round(76 + state.water * 0.08)}%`);
}

startExperience(defineExperience({
  mount(context) {
    root = document.createElement('main');
    root.className = `station${context.reducedMotion ? ' reduced' : ''}`;
    root.setAttribute('data-signal-shared-driver', '');
    root.setAttribute('data-drive-mode', state.mode);
    context.canvas.setAttribute('data-signal-visual-anchor', '');
    root.innerHTML = `
      <div class="driver-progress" data-signal-driver-progress role="progressbar" aria-label="一天中的观察进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div>
      <header class="masthead"><a class="identity" href="#top">CANOPY / 01</a><span>街道微气候观察计划</span><button class="demo" data-demo data-signal-demo-control aria-pressed="false">播放自动演示</button></header>
      <section class="hero" id="top">
        <div class="hero-copy">
          <p class="eyebrow">一棵成熟行道树 · 一天的实测推演</p>
          <h1>让树荫<br>成为街道<br>基础设施</h1>
          <p class="intro">滚动经过清晨、正午与浇灌后，观察同一段路面如何获得可以感知的阴凉。</p>
          <button class="start" data-jump>进入正午观察 <span>↓</span></button>
        </div>
        <p class="photo-note">影像为场景表达 · 温度为方案估算</p>
      </section>
      <section class="workspace" aria-label="降温方案工作区">
        <div class="station-card">
          <div class="card-head"><span data-phase>08:10 · 清晨基线</span><span class="live"><i></i>方案联动中</span></div>
          <div class="metrics" data-signal-primary-result>
            <div><small>预计树荫覆盖</small><strong data-shade>—</strong></div>
            <div><small>路面温度 <em>估算</em></small><strong data-temp>—</strong></div>
          </div>
          <p class="transpire" data-transpire aria-live="polite">—</p>
          <label>树冠密度 <output data-density>72%</output><input data-density-input data-signal-primary-control type="range" min="25" max="100" value="72" aria-label="树冠密度"></label>
          <label>补水水平 <output data-water>58%</output><input data-water-input data-signal-primary-control type="range" min="0" max="100" value="58" aria-label="补水水平"></label>
          <div class="routes" aria-label="观察时间"><button data-route="0">08:10</button><button data-route=".56">12:40</button><button data-route="1">17:20</button></div>
        </div>
        <aside class="field-note"><span>01</span><p>树荫不是装饰。冠幅、供水与一天中的太阳位置，共同决定路面是否适合停留。</p></aside>
      </section>
      <section class="closing">
        <div><p class="eyebrow">当前方案 · 可继续讨论</p><h2>把阴凉留在<br>行人需要的地方</h2></div>
        <div class="closing-action"><p>保存当前冠幅与补水参数，形成一份可用于街道绿化讨论的降温建议。</p><button class="save" data-save data-signal-primary-action>保存这次降温方案</button><p class="saved" aria-live="polite"></p></div>
      </section>`;
    context.container.appendChild(root);
    scene = new CoolingScene(context.canvas, context.viewport, context.quality);

    const density = root.querySelector<HTMLInputElement>('[data-density-input]')!;
    const water = root.querySelector<HTMLInputElement>('[data-water-input]')!;
    density.addEventListener('input', () => { state.density = Number(density.value); takeControl('manual'); });
    water.addEventListener('input', () => { state.water = Number(water.value); takeControl('manual'); });
    root.querySelectorAll<HTMLButtonElement>('[data-route]').forEach((button) => button.addEventListener('click', () => {
      takeControl('manual');
      state.progress = Number(button.dataset.route);
      window.scrollTo({ top: state.progress * scrollRange, behavior: context.reducedMotion ? 'auto' : 'smooth' });
    }));
    root.querySelector<HTMLButtonElement>('[data-demo]')!.addEventListener('click', () => {
      takeControl(state.mode === 'demo' ? 'paused' : 'demo');
    });
    root.querySelector<HTMLButtonElement>('[data-jump]')!.addEventListener('click', () => {
      takeControl('scroll');
      root?.querySelector('.workspace')?.scrollIntoView({ behavior: context.reducedMotion ? 'auto' : 'smooth' });
    });
    root.querySelector<HTMLButtonElement>('[data-save]')!.addEventListener('click', () => {
      root?.querySelector<HTMLElement>('.saved')!.replaceChildren('已保存：树冠密度、补水水平与当前路温估算。');
    });
    wheelListener = () => takeControl('scroll');
    scrollListener = () => {
      scrollRange = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      if (state.mode === 'scroll') state.progress = clamp(scrollY / scrollRange);
    };
    addEventListener('wheel', wheelListener, { passive: true });
    addEventListener('scroll', scrollListener, { passive: true });
    scrollListener();
    updateInterface();
    if (!context.reducedMotion) demoTimer = window.setTimeout(() => {
      if (state.mode === 'manual') state.mode = 'demo';
      demoTimer = null;
    }, 1400);
  },
  update(frame) {
    if (!scene || !root) return;
    if (state.mode === 'demo' && !frame.reducedMotion) state.progress = (frame.elapsed * 0.052) % 1;
    if (frame.reducedMotion && state.mode === 'demo') state.progress = 0.56;
    const view = direct(state, frame.pointer, frame.elapsed, frame.reducedMotion);
    scene.render(view, frame.viewport);
    root.querySelector<HTMLOutputElement>('[data-density]')!.value = `${state.density}%`;
    root.querySelector<HTMLOutputElement>('[data-water]')!.value = `${state.water}%`;
    updateInterface();
  },
  resize(viewport) { scene?.resize(viewport); },
  dispose() {
    if (demoTimer !== null) window.clearTimeout(demoTimer);
    if (scrollListener) removeEventListener('scroll', scrollListener);
    if (wheelListener) removeEventListener('wheel', wheelListener);
    document.querySelector('canvas[data-signal-visual-anchor]')?.removeAttribute('data-signal-visual-anchor');
    scene?.dispose();
    root?.remove();
    root = null;
    scene = null;
  },
}));
