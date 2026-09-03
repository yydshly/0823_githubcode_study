import { defineExperience, startExperience } from '@signal-lab/experience-sdk';
import { createScene, type SceneController } from './scene';
import { direct, type JourneyState } from './director';

let scene: SceneController | null = null;
let root: HTMLElement | null = null;
let state: JourneyState | null = null;
let onScroll: (() => void) | null = null;
let onClick: ((event: MouseEvent) => void) | null = null;
let onKey: ((event: KeyboardEvent) => void) | null = null;

const markup = `<main class="journey" aria-label="榫卯结构互动学习">
  <nav class="rail" aria-label="探索节点">
    <button data-stop="0" aria-label="查看构件">01</button><button data-stop="0.36" aria-label="观察咬合">02</button><button data-stop="0.7" aria-label="查看受力与修复证据">03</button><button data-stop="1" aria-label="前往课程预约">04</button>
  </nav>
  <section class="beat opening" data-beat="0">
    <div class="copy"><p class="eyebrow">古建结构 · 互动拆解</p><h1>两块旧木，如何托住一座屋檐？</h1><p>沿着同一组真实木构件，观察榫头进入卯眼、力量如何传递，以及修复师如何判断它还能否继续承重。</p><button class="begin" data-stop="0.36">开始对齐构件 <span>↓</span></button></div>
    <aside class="object-key"><span>当前对象</span><strong>梁端榫 × 柱身卯</strong><small>滚动推进装配过程</small></aside>
  </section>
  <section class="beat threshold" data-beat="1"><div class="copy"><p class="eyebrow">对齐 · 进入</p><h2>不是钉住，<br>是让木头彼此约束。</h2><p>榫头沿木纹方向进入卯眼。肩部贴合后，水平位移被限制，构件从“分开”变为可共同受力。</p><dl><div><dt>方向</dt><dd>顺纹入榫</dd></div><div><dt>结果</dt><dd>限制侧向位移</dd></div></dl></div></section>
  <section class="beat evidence" data-beat="2"><div class="copy"><p class="eyebrow">贴合 · 受力</p><h2>先看接触面，<br>再理解力如何通过。</h2><p>榫头进入后，梁端肩部与卯口完整贴合。重量由真实接触面传递，而不是依赖钉子或页面上的示意箭头。</p><div class="legend"><i></i><span>观察依据：同轴进入 · 四面留隙 · 榫肩贴合</span></div></div><article class="archive"><p>修复档案 07</p><strong>榫肩磨损，卯壁仍完整</strong><span>观察到手工凿痕与局部压痕。建议保留原件，以同材补配松动处。</span><small>档案内容为本体验教学示例</small></article></section>
  <section class="beat ending" data-beat="3"><div class="copy"><p class="eyebrow">从看懂，到亲手拆解</p><h2>把一处接合，读成一座建筑。</h2><p>线上拆解课将用同一组构件讲清识别、装配、受力与修复判断。适合零基础学习者。</p><a class="cta" href="#booking">预约一次线上拆解课 <span>↗</span></a><p class="meta" id="booking">60 分钟 · 小班直播 · 含课后结构图谱</p></div></section>
</main>`;

function scrollProgress(): number {
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  return Math.min(1, Math.max(0, window.scrollY / max));
}

startExperience(defineExperience({
  mount(context) {
    root = document.createElement('div');
    root.className = `mortise-app${context.reducedMotion ? ' is-reduced' : ''}`;
    root.innerHTML = markup;
    context.container.appendChild(root);
    scene = createScene(root, context.canvas, context.quality);
    state = direct(scrollProgress(), { x: 0, y: 0 }, 0, context.reducedMotion);
    scene.apply(state);
    onScroll = () => { if (scene) { state = direct(scrollProgress(), state?.pointer ?? { x: 0, y: 0 }, state?.elapsed ?? 0, context.reducedMotion); scene.apply(state); } };
    onClick = (event) => { const target = (event.target as Element).closest<HTMLElement>('[data-stop]'); if (target) window.scrollTo({ top: Number(target.dataset.stop) * (document.documentElement.scrollHeight - innerHeight), behavior: context.reducedMotion ? 'auto' : 'smooth' }); };
    onKey = (event) => { if (event.key >= '1' && event.key <= '4') root?.querySelectorAll<HTMLElement>('[data-stop]')[Number(event.key) - 1]?.click(); };
    window.addEventListener('scroll', onScroll, { passive: true });
    root.addEventListener('click', onClick);
    window.addEventListener('keydown', onKey);
  },
  update(frame) {
    if (!scene) return;
    state = direct(scrollProgress(), frame.pointer, frame.elapsed, frame.reducedMotion);
    scene.apply(state);
  },
  resize(viewport) { scene?.resize(viewport.width, viewport.height, viewport.dpr); },
  dispose() {
    if (onScroll) window.removeEventListener('scroll', onScroll);
    if (onClick && root) root.removeEventListener('click', onClick);
    if (onKey) window.removeEventListener('keydown', onKey);
    scene?.dispose(); root?.remove(); scene = null; root = null; state = null;
  }
}));
