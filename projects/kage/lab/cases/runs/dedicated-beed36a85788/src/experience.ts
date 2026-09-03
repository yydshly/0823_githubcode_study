import { defineExperience, startExperience } from '@signal-lab/experience-sdk';
import { createGreenhouseScene, type GreenhouseScene } from './scene';
import { direct } from './director';

let root: HTMLElement | null = null;
let scene: GreenhouseScene | null = null;
let humidity = 58;
let manual = false;

function build(container: HTMLElement): void {
  root = document.createElement('main');
  root.className = 'greenhouse-page';
  root.innerHTML = `
    <canvas class="greenhouse-canvas" aria-hidden="true"></canvas>
    <div class="media environment" role="img" aria-label="清晨的城市屋顶温室与远处天际线"></div>
    <img class="media vine" src="/creative-assets/r84-rooftop-greenhouse/greenhouse-subject-v1.png" alt="温室中结着番茄的藤蔓" />
    <img class="media dew" src="/creative-assets/r84-rooftop-greenhouse/greenhouse-foreground-dew-v1.svg" alt="玻璃上的晨露" />
    <div class="veil"></div>
    <header><a class="brand" href="#begin">Roof Garden</a><span>晨间观察 · 08:14</span></header>
    <section class="intro" id="begin"><p class="eyebrow">城市屋顶温室</p><h1>从一滴晨露，<br>走进今天的生长。</h1><p>穿过结露玻璃，查看番茄藤与城市醒来的同一刻。</p><a class="scroll-cue" href="#observe">向下观察</a></section>
    <section class="observe" id="observe"><div class="reading"><p class="eyebrow">湿度观察</p><h2>叶片正慢慢醒来</h2><p>拖动湿度，露珠覆盖会同步落在藤蔓与玻璃上。</p><label for="humidity">空气湿度 <output>58%</output></label><input id="humidity" type="range" min="32" max="92" value="58" aria-label="调整温室空气湿度" /><p class="estimate">基于当前湿度的可见凝露估算</p></div></section>
    <section class="save"><div><p class="eyebrow">今日记录</p><h2>把这段清晨，留给下一次照料。</h2><p>保存当前露水、藤蔓状态和温室晨光。</p><button type="button">保存今日温室记录</button><p class="save-status" aria-live="polite"></p></div></section>
  `;
  container.appendChild(root);
  const slider = root.querySelector<HTMLInputElement>('#humidity');
  const output = root.querySelector<HTMLOutputElement>('output');
  if (slider && output) slider.addEventListener('input', () => {
    humidity = Number(slider.value);
    output.value = `${humidity}%`;
    manual = true;
    root?.style.setProperty('--humidity', String((humidity - 32) / 60));
  });
  const saveButton = root.querySelector<HTMLButtonElement>('.save button');
  const saveStatus = root.querySelector<HTMLElement>('.save-status');
  saveButton?.addEventListener('click', () => {
    saveButton.disabled = true;
    saveButton.textContent = '已保存';
    if (saveStatus) saveStatus.textContent = `今日温室记录已保存 · 湿度 ${humidity}%`;
  });
  root.style.setProperty('--humidity', String((humidity - 32) / 60));
}

startExperience(defineExperience({
  mount(context) {
    build(context.container);
    if (root && context.reducedMotion) root.classList.add('reduced-motion');
    const canvas = root?.querySelector<HTMLCanvasElement>('.greenhouse-canvas');
    if (canvas) scene = createGreenhouseScene(canvas, context.viewport, context.quality, context.reducedMotion);
  },
  update(frame) {
    if (!root || !scene) return;
    const state = direct(frame.progress, frame.pointer, frame.elapsed, humidity, manual, frame.reducedMotion);
    root.style.setProperty('--enter', String(state.enter));
    root.style.setProperty('--vine-x', `${state.vineX}px`);
    root.style.setProperty('--vine-y', `${state.vineY}px`);
    root.style.setProperty('--dew-x', `${state.dewX}px`);
    root.style.setProperty('--dew-y', `${state.dewY}px`);
    root.style.setProperty('--dew-opacity', String(state.dewOpacity));
    root.classList.toggle('inside', state.enter > 0.56);
    scene.render(state, frame.viewport, frame.delta);
  },
  resize(viewport) { scene?.resize(viewport); },
  dispose() {
    scene?.dispose();
    root?.remove(); root = null; scene = null;
  }
}));
