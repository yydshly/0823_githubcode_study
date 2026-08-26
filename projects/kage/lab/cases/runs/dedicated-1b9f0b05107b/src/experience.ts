import { defineExperience, startExperience } from "@signal-lab/experience-sdk";
import { RainRecorderScene } from "./scene";
import { RainDirector } from "./director";

let scene: RainRecorderScene | null = null;
let director: RainDirector | null = null;
let root: HTMLElement | null = null;

startExperience(defineExperience({
  mount(context) {
    root = document.createElement("main");
    root.className = "rain-experience";
    root.innerHTML = `
      <div class="atmosphere" aria-hidden="true"></div>
      <section class="hero chapter" aria-labelledby="rain-title">
        <div class="copy copy--opening">
          <p class="eyebrow">窗边 · 清晨 06:18</p>
          <h1 id="rain-title">让清晨的雨，<br>被轻轻听见</h1>
          <p class="lede">透明声学膜接住每一滴雨。向下滚动，看声音如何进入同一座共振腔。</p>
          <a class="scroll-cue" href="#resonance">聆听雨声的路径 <span aria-hidden="true">↓</span></a>
        </div>
      </section>
      <section class="resonance chapter" id="resonance" aria-labelledby="resonance-title">
        <div class="copy copy--resonance">
          <p class="eyebrow">真实共振</p>
          <h2 id="resonance-title">雨滴成为声音</h2>
          <p>膜片的细微振动被共振腔温柔放大。没有合成氛围，只有此刻窗外真实的雨。</p>
        </div>
      </section>
      <section class="resolve chapter" aria-labelledby="resolve-title">
        <div class="copy copy--resolve">
          <p class="eyebrow">记录完成</p>
          <h2 id="resolve-title">保存这一刻的声音</h2>
          <p>把一场只属于今天的清晨，留在触手可及的桌面上。</p>
          <button class="primary-action" type="button">开始记录</button>
          <p class="status"><span class="status-dot" aria-hidden="true"></span> 雨声记忆已就绪</p>
        </div>
      </section>`;
    context.container.appendChild(root);

    director = new RainDirector(context.reducedMotion);
    try {
      scene = new RainRecorderScene(context.canvas, context.viewport, context.quality, context.reducedMotion);
    } catch {
      root.classList.add("webgl-fallback");
    }
  },

  update(frame) {
    const state = director?.evaluate(frame.progress, frame.pointer, frame.elapsed);
    if (state && scene) scene.render(state, frame.delta);
    if (root && state) {
      root.style.setProperty("--story-progress", state.progress.toFixed(3));
      root.dataset.phase = state.phase;
    }
  },

  resize(viewport) {
    scene?.resize(viewport);
  },

  dispose() {
    scene?.dispose();
    scene = null;
    director = null;
    root?.remove();
    root = null;
  }
}));
