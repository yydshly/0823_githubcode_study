import { defineExperience, startExperience } from "@signal-lab/experience-sdk";
import { ExperienceDirector } from "./director";
import { AcousticScene } from "./scene";

let scene: AcousticScene | null = null;
let director: ExperienceDirector | null = null;
let interfaceRoot: HTMLElement | null = null;
let currentQuality = "high";

const createInterface = (container: HTMLElement): HTMLElement => {
  const root = document.createElement("main");
  root.className = "echo-page";
  root.setAttribute("aria-label", "澄响智能声音产品发布页");
  root.innerHTML = `
    <div class="ambient-grid" aria-hidden="true"></div>
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow">CLARITY, UNDER YOUR DIRECTION · 01</p>
        <h1 id="hero-title">听见创作<br><span>真正的形状</span></h1>
        <p class="lead">澄响把复杂声场收束成清晰判断。为独立创作者而生的智能声学中枢，让灵感不再消耗于反复试听。</p>
        <a class="primary-action" href="#reserve">申请优先体验 <span aria-hidden="true">↗</span></a>
      </div>
      <p class="scroll-note"><span></span>向下，让信号显形</p>
    </section>
    <section class="capability" aria-labelledby="capability-title">
      <div class="section-index">02 / RESONANCE</div>
      <div class="capability-copy">
        <p class="eyebrow">意图识别 · 空间校准 · 动态成形</p>
        <h2 id="capability-title">不是替你创作，<br>是替你守住每个决定。</h2>
        <p>实时感知人声、环境与叙事重心，澄响将散乱频段聚合为可控声场。你描述情绪，它完成监听校准、层次建议与跨设备一致性。</p>
      </div>
      <ul class="metrics" aria-label="核心能力">
        <li><strong>12 ms</strong><span>意图响应</span></li>
        <li><strong>360°</strong><span>空间感知</span></li>
        <li><strong>1 voice</strong><span>你的审美主导</span></li>
      </ul>
    </section>
    <section class="resolution" id="reserve" aria-labelledby="resolve-title">
      <div class="resolve-copy">
        <p class="eyebrow">THE FIELD IS YOURS · 03</p>
        <h2 id="resolve-title">让声音，终于与你站在同一边。</h2>
        <p>首批创作者体验计划现已开放。带上一个正在发生的作品，听见它更准确的版本。</p>
        <a class="primary-action light" href="mailto:studio@example.invalid?subject=澄响优先体验">加入创作者名单 <span aria-hidden="true">↗</span></a>
      </div>
      <footer><span>澄响 ACOUSTIC INTELLIGENCE</span><span>Designed for independent voices</span></footer>
    </section>
  `;
  container.appendChild(root);
  return root;
};

startExperience(defineExperience({
  mount(context) {
    interfaceRoot = createInterface(context.container);
    director = new ExperienceDirector();
    currentQuality = context.quality;
    try {
      scene = new AcousticScene({
        canvas: context.canvas,
        width: context.viewport.width,
        height: context.viewport.height,
        dpr: context.viewport.dpr,
        quality: context.quality,
        reducedMotion: context.reducedMotion,
      });
      context.canvas.classList.add("acoustic-canvas");
    } catch {
      context.canvas.classList.add("canvas-unavailable");
      scene = null;
    }
  },
  update(frame) {
    if (scene === null || director === null) return;
    const state = director.evaluate({
      progress: frame.progress,
      pointerX: frame.pointer.x,
      pointerY: frame.pointer.y,
      elapsed: frame.elapsed,
      reducedMotion: frame.reducedMotion,
    });
    scene.update(state, frame.elapsed);
    interfaceRoot?.style.setProperty("--story-progress", frame.progress.toFixed(4));
  },
  resize(viewport) {
    scene?.resize(viewport.width, viewport.height, viewport.dpr, currentQuality);
  },
  dispose() {
    scene?.dispose();
    scene = null;
    director = null;
    interfaceRoot?.remove();
    interfaceRoot = null;
  },
}));
