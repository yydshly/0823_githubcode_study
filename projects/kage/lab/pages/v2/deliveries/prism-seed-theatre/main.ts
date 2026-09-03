import * as THREE from 'three';

type PrismState = 'sealed' | 'warming' | 'spectrum' | 'specimen';

interface PrismSnapshot {
  ready: boolean;
  state: PrismState;
  progress: number;
  pointerX: number;
  pointerY: number;
  lightAngle: number;
  refraction: number;
  spectralSpread: number;
  imageLoaded: boolean;
  frames: number;
  drawCalls: number;
  triangles: number;
  fallback: boolean;
  assetFallback: boolean;
  reducedMotion: boolean;
  saved: boolean;
  horizontalOverflow: number;
  quality: string;
  revision: string;
}

declare global {
  interface Window {
    __prismSeedTheatre?: {
      snapshot: () => PrismSnapshot;
      setProgress: (value: number) => void;
      setPointer: (x: number, y: number) => void;
      saveSpecimen: () => void;
    };
  }
}

const root = document.documentElement;
const stage = document.querySelector<HTMLElement>('#prism-stage');
const canvas = document.querySelector<HTMLCanvasElement>('#prism-canvas');
const image = document.querySelector<HTMLImageElement>('#prism-source-image');
const saveButton = document.querySelector<HTMLButtonElement>('#save-specimen');
const saveStatus = document.querySelector<HTMLElement>('#save-status');
const liveStatus = document.querySelector<HTMLElement>('#live-status');
const stateLabel = document.querySelector<HTMLElement>('#state-label');
const observationIndex = document.querySelector<HTMLElement>('#observation-index');
const observationTitle = document.querySelector<HTMLElement>('#observation-title');
const observationDetail = document.querySelector<HTMLElement>('#observation-detail');
const progressValue = document.querySelector<HTMLElement>('#progress-value');
const railButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-prism-target]')];

if (!stage || !canvas || !image || !saveButton || !saveStatus || !liveStatus || !stateLabel || !observationIndex || !observationTitle || !observationDetail || !progressValue) {
  throw new Error('Prism Seed Theatre: required DOM contract is missing.');
}

const params = new URLSearchParams(location.search);
const quality = params.get('quality') ?? 'high';
const revision = params.get('revision') ?? 'r135-preview';
const forcedFallback = ['1', 'true', 'webgl', 'canvas'].includes(params.get('fallback') ?? '');
const forcedAssetFallback = ['1', 'true', 'image'].includes(params.get('assetFallback') ?? '');
const reducedMotion = params.get('motion') === 'reduce' || (!params.has('motion') && matchMedia('(prefers-reduced-motion: reduce)').matches);

const copy: Record<PrismState, { label: string; index: string; title: string; detail: string }> = {
  sealed: {
    label: '日光停在表皮',
    index: '01 — SEALED',
    title: '光落下，但还没有穿过。',
    detail: '移动指针改变日光方向，滚动让光线继续深入种荚。',
  },
  warming: {
    label: '纤维开始透亮',
    index: '02 — WARMING',
    title: '薄膜把一道光分成了许多路径。',
    detail: '种荚的纤维层逐渐发亮，细小色差沿叶脉般的结构向外移动。',
  },
  spectrum: {
    label: '光谱越过石面',
    index: '03 — SPECTRUM',
    title: '原本透明的日光，开始留下颜色。',
    detail: '继续移动光线，折射会改变方向，而不是只播放预设动画。',
  },
  specimen: {
    label: '今日标本已经形成',
    index: '04 — SPECIMEN',
    title: '光离开之后，形状仍被记住。',
    detail: '保存这一刻。它是一件艺术化折光标本，不代表真实测量结果。',
  },
};

let progress = 0;
let pointerX = 0.22;
let pointerY = 0.48;
let state: PrismState = 'sealed';
let saved = false;
let imageLoaded = false;
let fallback = forcedFallback;
let assetFallback = forcedAssetFallback;
let frames = 0;
let renderer: THREE.WebGLRenderer | null = null;
let material: THREE.ShaderMaterial | null = null;
let animationFrame = 0;
let scrollTick = 0;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const round = (value: number) => Math.round(value * 1000) / 1000;

function stateFor(value: number): PrismState {
  if (value >= 0.86) return 'specimen';
  if (value >= 0.57) return 'spectrum';
  if (value >= 0.24) return 'warming';
  return 'sealed';
}

function setRootNumber(name: string, value: number): void {
  root.style.setProperty(name, String(round(value)));
}

function renderSemanticState(announce = false): void {
  const next = stateFor(progress);
  const stateChanged = next !== state;
  state = next;
  root.dataset.prismState = state;
  const current = copy[state];
  stateLabel.textContent = current.label;
  observationIndex.textContent = current.index;
  observationTitle.textContent = current.title;
  observationDetail.textContent = current.detail;
  progressValue.textContent = String(Math.round(progress * 100)).padStart(2, '0');
  saveButton.disabled = progress < 0.86;
  railButtons.forEach((button, index) => {
    const matches = index === ['sealed', 'warming', 'spectrum', 'specimen'].indexOf(state);
    if (matches) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
  if ((stateChanged || announce) && liveStatus) liveStatus.textContent = `${current.label}。${current.title}`;
}

function applyProgress(value: number, announce = false): void {
  progress = clamp01(value);
  setRootNumber('--progress', progress);
  setRootNumber('--spectral', Math.max(0, (progress - 0.2) / 0.8));
  if (material) {
    material.uniforms.uProgress.value = progress;
    material.uniforms.uSpectral.value = Math.max(0, (progress - 0.2) / 0.8);
  }
  renderSemanticState(announce);
}

function progressFromScroll(): number {
  const max = Math.max(1, stage.offsetHeight - innerHeight);
  const rect = stage.getBoundingClientRect();
  return clamp01(-rect.top / max);
}

function setScrollProgress(value: number, behavior: ScrollBehavior = reducedMotion ? 'auto' : 'smooth'): void {
  const max = Math.max(1, stage.offsetHeight - innerHeight);
  const target = scrollY + stage.getBoundingClientRect().top + clamp01(value) * max;
  scrollTo({ top: target, behavior });
  if (reducedMotion) applyProgress(value, true);
}

function updatePointer(x: number, y: number): void {
  pointerX = clamp01(x);
  pointerY = clamp01(y);
  setRootNumber('--pointer-x', pointerX);
  setRootNumber('--pointer-y', pointerY);
  if (material) material.uniforms.uPointer.value.set(pointerX, pointerY);
}

function markFallback(reason: string): void {
  fallback = true;
  root.dataset.fallback = 'true';
  canvas.hidden = true;
  if (liveStatus) liveStatus.textContent = `${reason}。静态温室与折光反馈仍可继续操作。`;
}

function markAssetFallback(): void {
  assetFallback = true;
  root.dataset.assetFallback = 'true';
  if (material) material.uniforms.uImageReady.value = 0;
  if (liveStatus) liveStatus.textContent = '主视觉素材未能加载，已使用语义温室回退；完整折光旅程仍可继续。';
}

function saveSpecimen(): void {
  if (progress < 0.86) {
    setScrollProgress(1);
    return;
  }
  saved = true;
  root.dataset.saved = 'true';
  saveButton.querySelector('span')!.textContent = '今日折光标本已保存';
  saveStatus.textContent = '已保存在本次浏览状态中。光线方向和折射进度会继续保留。';
  liveStatus.textContent = '今日折光标本已保存。';
}

function createRenderer(texture: THREE.Texture): void {
  if (forcedFallback) {
    markFallback('已按要求启用 WebGL 回退');
    return;
  }

  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'low', alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, quality === 'high' ? 1.75 : 1.25));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    material = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uImage: { value: texture },
        uImageReady: { value: 1 },
        uResolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
        uImageSize: { value: new THREE.Vector2(texture.image.width, texture.image.height) },
        uPointer: { value: new THREE.Vector2(pointerX, pointerY) },
        uProgress: { value: progress },
        uSpectral: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uImage;
        uniform vec2 uResolution;
        uniform vec2 uImageSize;
        uniform vec2 uPointer;
        uniform float uProgress;
        uniform float uSpectral;
        uniform float uTime;

        vec2 coverUv(vec2 uv) {
          float screenAspect = uResolution.x / max(uResolution.y, 1.0);
          float imageAspect = uImageSize.x / max(uImageSize.y, 1.0);
          if (screenAspect > imageAspect) {
            float scale = imageAspect / screenAspect;
            uv.y = (uv.y - .5) * scale + .5;
          } else {
            float scale = screenAspect / imageAspect;
            uv.x = (uv.x - .5) * scale + .5;
          }
          return uv;
        }

        vec3 spectrum(float t) {
          vec3 a = vec3(.50, .50, .50);
          vec3 b = vec3(.50, .50, .50);
          vec3 c = vec3(1.0, 1.0, 1.0);
          vec3 d = vec3(.00, .33, .67);
          return a + b * cos(6.28318 * (c * t + d));
        }

        void main() {
          vec2 uv = coverUv(vUv);
          vec2 light = vec2(uPointer.x, 1.0 - uPointer.y);
          vec2 direction = normalize((vUv - light) + vec2(.001));
          float seedField = smoothstep(.48, .02, distance(vUv, vec2(.35, .48)));
          float breath = sin(uTime * .32 + vUv.y * 7.0) * .5 + .5;
          float strength = (.0015 + uProgress * .009) * (seedField * .72 + .16);
          vec2 displaced = uv + direction * strength * (.55 + breath * .45);
          vec3 base = texture2D(uImage, displaced).rgb;
          float chroma = .00025 + uSpectral * .002;
          float r = texture2D(uImage, displaced + direction * chroma).r;
          float g = base.g;
          float b = texture2D(uImage, displaced - direction * chroma).b;
          vec3 splitColor = vec3(r, g, b);
          float splitMix = uSpectral * (.035 + seedField * .32);
          vec3 color = mix(base, splitColor, splitMix);

          float ray = abs((vUv.y - .12) - (vUv.x * (.26 + (uPointer.x - .5) * .22)));
          float ribbon = exp(-ray * (32.0 - uSpectral * 10.0)) * smoothstep(.18, .72, vUv.x) * uSpectral;
          float grain = sin((vUv.x * 20.0 + vUv.y * 12.0 + uTime * .12) * 2.2) * .5 + .5;
          vec3 prism = spectrum(vUv.x * 1.45 + uPointer.x * .28);
          color += prism * ribbon * (.045 + grain * .065);

          float sun = smoothstep(.25, 0.0, distance(vUv, light));
          color += vec3(1.0, .96, .72) * sun * (.025 + uProgress * .05);
          color *= .96 + uProgress * .045;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(plane);

    const resize = () => {
      if (!renderer || !material) return;
      renderer.setSize(innerWidth, innerHeight, false);
      material.uniforms.uResolution.value.set(innerWidth, innerHeight);
    };
    resize();
    addEventListener('resize', resize, { passive: true });

    const start = performance.now();
    const render = (time: number) => {
      if (!renderer || !material) return;
      material.uniforms.uTime.value = reducedMotion ? 0 : (time - start) / 1000;
      renderer.render(scene, camera);
      frames += 1;
      animationFrame = requestAnimationFrame(render);
    };
    animationFrame = requestAnimationFrame(render);

    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      cancelAnimationFrame(animationFrame);
      renderer = null;
      material = null;
      markFallback('WebGL 上下文中断');
    });
  } catch (error) {
    console.warn('[prism-seed-theatre] WebGL unavailable; continuing with the generated key visual.', error);
    renderer = null;
    material = null;
    markFallback('WebGL 无法初始化');
  }
}

function loadPrimaryAsset(): void {
  if (forcedAssetFallback) {
    image.removeAttribute('src');
    markAssetFallback();
    markFallback('主视觉素材回退');
    root.dataset.prismReady = 'true';
    return;
  }

  image.addEventListener('load', () => { imageLoaded = true; }, { once: true });
  image.addEventListener('error', () => {
    imageLoaded = false;
    markAssetFallback();
    markFallback('主视觉素材未能加载');
  }, { once: true });
  if (image.complete && image.naturalWidth > 0) imageLoaded = true;

  new THREE.TextureLoader().load(
    image.src,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      imageLoaded = true;
      createRenderer(texture);
      root.dataset.prismReady = 'true';
      liveStatus.textContent = '棱镜种子剧场已经准备。滚动让日光穿过种荚，移动指针改变方向。';
    },
    undefined,
    () => {
      imageLoaded = false;
      markAssetFallback();
      markFallback('WebGL 纹理未能加载');
      root.dataset.prismReady = 'true';
    },
  );
}

function snapshot(): PrismSnapshot {
  return {
    ready: root.dataset.prismReady === 'true',
    state,
    progress: round(progress),
    pointerX: round(pointerX),
    pointerY: round(pointerY),
    lightAngle: round((pointerX - 0.5) * 54),
    refraction: round(0.0015 + progress * 0.009),
    spectralSpread: round(Math.max(0, (progress - 0.2) / 0.8)),
    imageLoaded,
    frames,
    drawCalls: renderer?.info.render.calls ?? 0,
    triangles: renderer?.info.render.triangles ?? 0,
    fallback,
    assetFallback,
    reducedMotion,
    saved,
    horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    quality,
    revision,
  };
}

addEventListener('scroll', () => {
  if (scrollTick) return;
  scrollTick = requestAnimationFrame(() => {
    scrollTick = 0;
    applyProgress(progressFromScroll());
  });
}, { passive: true });

addEventListener('pointermove', (event) => updatePointer(event.clientX / innerWidth, event.clientY / innerHeight), { passive: true });
let touchStartX = 0;
let touchStartY = 0;
addEventListener('touchstart', (event) => {
  const point = event.touches[0];
  if (!point) return;
  touchStartX = point.clientX;
  touchStartY = point.clientY;
}, { passive: true });
addEventListener('touchmove', (event) => {
  const point = event.touches[0];
  if (!point) return;
  updatePointer(point.clientX / innerWidth, point.clientY / innerHeight);
  const deltaY = touchStartY - point.clientY;
  if (Math.abs(deltaY) > 24) setScrollProgress(progress + deltaY / 1100, 'auto');
  touchStartX = point.clientX;
  touchStartY = point.clientY;
}, { passive: true });

addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight') updatePointer(pointerX + 0.06, pointerY);
  if (event.key === 'ArrowLeft') updatePointer(pointerX - 0.06, pointerY);
  if (event.key === 'ArrowDown' || event.key === 'PageDown') setScrollProgress(progress + 0.18);
  if (event.key === 'ArrowUp' || event.key === 'PageUp') setScrollProgress(progress - 0.18);
  if (event.key === 'Home') setScrollProgress(0);
  if (event.key === 'End') setScrollProgress(1);
});

railButtons.forEach((button) => button.addEventListener('click', () => {
  const target = Number(button.dataset.prismTarget ?? 0);
  setScrollProgress(target);
}));
saveButton.addEventListener('click', saveSpecimen);

addEventListener('pagehide', () => {
  cancelAnimationFrame(animationFrame);
  renderer?.dispose();
  material?.dispose();
});

root.dataset.fallback = forcedFallback ? 'true' : 'false';
root.dataset.assetFallback = forcedAssetFallback ? 'true' : 'false';
root.dataset.saved = 'false';
applyProgress(progressFromScroll());
updatePointer(pointerX, pointerY);
loadPrimaryAsset();

window.__prismSeedTheatre = {
  snapshot,
  setProgress: (value: number) => {
    applyProgress(value, true);
    setScrollProgress(value, 'auto');
  },
  setPointer: updatePointer,
  saveSpecimen,
};

setTimeout(() => {
  if (root.dataset.prismReady !== 'true') {
    markFallback('WebGL 首次预览超时');
    root.dataset.prismReady = 'true';
  }
}, 5500);
