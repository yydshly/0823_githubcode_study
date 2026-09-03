import { defineExperience, startExperience } from '@signal-lab/experience-sdk';
import { calculateFermentation, type Inputs } from './director';
import { FermentationScene } from './scene';

let root: HTMLElement | null = null;
let scene: FermentationScene | null = null;
let inputs: Inputs = { temperature: 24, hydration: 68, hours: 8 };
const disposers: Array<() => void> = [];

const presets: Record<string, Inputs> = {
  slow: { temperature: 19, hydration: 66, hours: 4 },
  balanced: { temperature: 24, hydration: 68, hours: 8 },
  quick: { temperature: 29, hydration: 74, hours: 10 }
};

function writeText(selector: string, value: string): void {
  const element = root?.querySelector(selector);
  if (element) element.textContent = value;
}

function progressForHours(hours: number): number {
  return Math.max(0, Math.min(1, (hours - 2) / 14));
}

function sendProgress(hours: number): void {
  postMessage({ type: 'signal-lab:preview-progress', progress: progressForHours(hours) }, location.origin);
}

function render(): void {
  if (!root || !scene) return;
  const state = calculateFermentation(inputs);
  scene.render(state);
  root.querySelectorAll<HTMLInputElement>('input[data-key]').forEach((input) => {
    input.value = String(inputs[input.dataset.key as keyof Inputs]);
    input.style.setProperty('--value', `${((Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100}%`);
  });
  writeText('[data-value="temperature"]', `${inputs.temperature}°C`);
  writeText('[data-value="hydration"]', `${inputs.hydration}%`);
  writeText('[data-value="hours"]', `${Number.isInteger(inputs.hours) ? inputs.hours : inputs.hours.toFixed(1)} 小时`);
  writeText('[data-phase-label]', state.phaseLabel);
  writeText('[data-phase-note]', state.phaseNote);
  writeText('[data-recommendation]', state.recommendation);
  writeText('[data-volume]', `${state.volume}%`);
  writeText('[data-bubbles]', `${state.bubbles} / dm²`);
  writeText('[data-tension]', `${state.tension} / 100`);
  writeText('[data-progress]', `${Math.round(state.maturity * 100)}%`);
  writeText('[data-scroll-hour]', `${Number.isInteger(inputs.hours) ? inputs.hours : inputs.hours.toFixed(1)}h`);
  root.dataset.phase = state.phase;
}

function mount(context: Parameters<ReturnType<typeof defineExperience>['mount']>[0]): void {
  root = document.createElement('main');
  root.className = `fermentation-workspace${context.reducedMotion ? ' reduced-motion' : ''}`;
  root.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#workspace" aria-label="发酵观察工作台首页"><span class="brand-mark">F</span><span>FERMENT / 发酵观察</span></a>
      <div class="lesson-note"><span></span>社区烘焙课 · 教学估算</div>
    </header>
    <section class="workspace" id="workspace" aria-labelledby="page-title">
      <div class="visual-column">
        <div class="intro-block">
          <p class="eyebrow">同一罐面团 · 三种成熟状态</p>
          <h1 id="page-title">看见面团<br>如何醒来</h1>
          <p>拖动参数，透明发酵罐会从建立、活跃到成熟连续变化。视觉、数值和建议来自同一组教学估算。</p>
        </div>
        <div class="jar-field" aria-label="透明发酵罐状态视图">
          <div class="sun-wash" aria-hidden="true"></div>
          <div class="jar-visual" role="img" aria-label="同一只透明发酵罐随参数改变呈现不同成熟状态">
            <span class="jar-frame jar-early"></span><span class="jar-frame jar-active"></span><span class="jar-frame jar-mature"></span><span class="jar-shadow" aria-hidden="true"></span>
          </div>
          <div class="state-marker"><span>当前状态</span><strong data-phase-label>活跃期</strong><small data-phase-note>气泡网络已经清晰，体积与表面张力处于可观察窗口。</small></div>
          <div class="metric metric-volume"><span>预计体积</span><strong data-volume>158%</strong></div>
          <div class="metric metric-bubbles"><span>气泡密度</span><strong data-bubbles>68 / dm²</strong></div>
          <div class="scroll-cue" aria-hidden="true">
            <div><span>SCROLL / 滚动推演</span><strong data-scroll-hour>8h</strong></div>
            <div class="scroll-track"><i></i></div>
            <small>向下增加发酵时间 · 向上回看早期状态</small>
          </div>
        </div>
      </div>
      <aside class="control-panel" aria-label="发酵参数与教学结果">
        <div class="panel-heading"><p class="eyebrow">建立你的烘焙计划</p><span class="progress-ring" data-progress>55%</span></div>
        <div class="preset-row" aria-label="发酵预设"><button type="button" data-preset="slow">慢速风味</button><button type="button" class="selected" data-preset="balanced">均衡观察</button><button type="button" data-preset="quick">当天快发</button></div>
        <div class="sliders">
          <label><span><b>室温</b><output data-value="temperature">24°C</output></span><input type="range" min="18" max="30" value="24" step="1" data-key="temperature"><small>影响酵母活性与变化速度</small></label>
          <label><span><b>面团含水率</b><output data-value="hydration">68%</output></span><input type="range" min="58" max="82" value="68" step="1" data-key="hydration"><small>影响气泡延展与表面张力</small></label>
          <label><span><b>发酵时间</b><output data-value="hours">8 小时</output></span><input type="range" min="2" max="16" value="8" step="0.5" data-key="hours"><small>鼠标滚轮也会同步改变这个参数</small></label>
        </div>
        <div class="reading" aria-live="polite"><div><span>表面张力</span><strong data-tension>67 / 100</strong></div><p data-recommendation>现在适合练习折叠、判断弹性，并记录气泡分布。</p><small>教学估算 · 实际发酵仍需结合触感、气味与环境判断</small></div>
        <button type="button" class="save-plan"><span>保存这份烘焙计划</span><span aria-hidden="true">→</span></button>
        <p class="save-status" role="status" aria-live="polite"></p>
      </aside>
    </section>`;
  context.container.appendChild(root);
  const visual = root.querySelector<HTMLElement>('.jar-field');
  if (!visual) throw new Error('发酵罐视觉区域未挂载。');
  scene = new FermentationScene(visual);

  root.querySelectorAll<HTMLInputElement>('input[data-key]').forEach((input) => {
    const handler = () => {
      const key = input.dataset.key as keyof Inputs;
      inputs = { ...inputs, [key]: Number(input.value) };
      root?.querySelectorAll('[data-preset]').forEach((button) => button.classList.remove('selected'));
      render();
      if (key === 'hours') sendProgress(inputs.hours);
    };
    input.addEventListener('input', handler); disposers.push(() => input.removeEventListener('input', handler));
  });
  root.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((button) => {
    const handler = () => {
      inputs = presets[button.dataset.preset || 'balanced'];
      root?.querySelectorAll('[data-preset]').forEach((item) => item.classList.toggle('selected', item === button));
      render();
      sendProgress(inputs.hours);
    };
    button.addEventListener('click', handler); disposers.push(() => button.removeEventListener('click', handler));
  });
  const save = root.querySelector<HTMLButtonElement>('.save-plan');
  const saveHandler = () => {
    if (!root || !save) return;
    const state = calculateFermentation(inputs);
    save.classList.add('saved'); save.querySelector('span')!.textContent = '计划已保存';
    writeText('.save-status', `${state.phaseLabel} · ${inputs.temperature}°C · ${inputs.hydration}% · ${inputs.hours} 小时`);
  };
  save?.addEventListener('click', saveHandler); if (save) disposers.push(() => save.removeEventListener('click', saveHandler));
  render();
}

function update(frame: Parameters<ReturnType<typeof defineExperience>['update']>[0]): void {
  if (!root || frame.viewport.width <= 760) return;
  const nextHours = Math.round((2 + frame.progress * 14) * 2) / 2;
  root.style.setProperty('--scroll-progress', frame.progress.toFixed(4));
  if (Math.abs(nextHours - inputs.hours) < .01) return;
  inputs = { ...inputs, hours: nextHours };
  const selected = root.querySelector<HTMLButtonElement>('[data-preset].selected');
  if (selected) {
    const preset = presets[selected.dataset.preset || 'balanced'];
    if (Math.abs(preset.hours - nextHours) > .51) selected.classList.remove('selected');
  }
  render();
}
function resize(): void {}
function dispose(): void { disposers.splice(0).forEach((disposeListener) => disposeListener()); scene?.dispose(); scene = null; root?.remove(); root = null; }

startExperience(defineExperience({ mount, update, resize, dispose }));
