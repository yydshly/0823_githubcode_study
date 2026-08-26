import { defineExperience, startExperience } from '@signal-lab/experience-sdk';
import { createObservatoryScene, type ObservatoryScene } from './scene';
import { directObservatory } from './director';

let scene: ObservatoryScene | null = null;
let shell: HTMLElement | null = null;

const mount = (context: { container: HTMLElement; canvas: HTMLCanvasElement; quality: 'low' | 'balanced' | 'high'; reducedMotion: boolean; viewport: { width: number; height: number; dpr: number } }): void => {
  shell = document.createElement('main');
  shell.className = 'observatory-page';
  shell.innerHTML = '<section class="hero"><p class="eyebrow">AERIA / 07:12</p><h1>云上观测站</h1><p class="lede">沿着引桥进入晨光中的透明穹顶，让同一台望远镜把云海之外的坐标慢慢显影。</p><a class="cta" href="#atlas">开始观测 <span aria-hidden="true">↓</span></a></section><section class="waypoint"><p>穿过玻璃边缘</p><h2>把地平线留在身后</h2></section><section class="waypoint atlas-copy" id="atlas"><p>已锁定 / STAR ATLAS</p><h2>星图不是屏幕上的数据，<br>而是穹顶中的方向。</h2><a class="cta cta-light" href="#top">返回黎明 <span aria-hidden="true">↑</span></a></section>';
  shell.id = 'top';
  context.container.appendChild(shell);
  scene = createObservatoryScene(context.canvas, context.quality);
  scene.resize(context.viewport.width, context.viewport.height, context.viewport.dpr);
};

const update = (frame: { elapsed: number; delta: number; progress: number; pointer: { x: number; y: number }; viewport: { width: number; height: number; dpr: number }; reducedMotion: boolean }): void => {
  if (!scene) return;
  const state = directObservatory(frame.progress, frame.pointer.x, frame.pointer.y, frame.elapsed, frame.reducedMotion);
  scene.render(state);
};

const resize = (viewport: { width: number; height: number; dpr: number }): void => {
  if (scene) scene.resize(viewport.width, viewport.height, viewport.dpr);
};

const dispose = (): void => {
  if (scene) scene.dispose();
  scene = null;
  if (shell) shell.remove();
  shell = null;
};

startExperience(defineExperience({ mount, update, resize, dispose }));
