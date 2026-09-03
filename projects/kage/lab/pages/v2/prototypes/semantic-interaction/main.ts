import {
  cycleEvidenceIndex,
  interpolateCoastlineEvidence,
  resolveEvidenceIndexFromPosition,
  semanticInteractionCapability
} from '../../../../src/v2/semantic-interaction-capability.ts';

type RendererMode = 'webgl' | 'fallback';
type InputMode = 'scroll' | 'pointer' | 'touch' | 'keyboard' | 'button' | 'demo' | 'api';

type SemanticInteractionSnapshot = {
  stage: number;
  stageId: 'observe' | 'compare' | 'consequence';
  selectedIndex: number;
  selectedYear: number;
  lossSquareKilometers: number;
  retreatMeters: number;
  relativeWaterCentimeters: number;
  timelinePosition: number;
  dragging: boolean;
  renderer: RendererMode;
  reducedMotion: boolean;
  inputMode: InputMode;
  hasHorizontalOverflow: boolean;
  canvasDrawn: boolean;
};

type SemanticInteractionApi = {
  setStage: (stage: number, syncScroll?: boolean) => SemanticInteractionSnapshot;
  setYear: (index: number, inputMode?: InputMode) => SemanticInteractionSnapshot;
  setTimelinePosition: (position: number, inputMode?: InputMode) => SemanticInteractionSnapshot;
  snapshot: () => SemanticInteractionSnapshot;
};

declare global {
  interface Window {
    __semanticInteractionPrototype?: SemanticInteractionApi;
  }
}

type SceneController = {
  setTargets: (era: number, stage: number) => void;
  setPointer: (x: number, y: number) => void;
  resize: () => void;
  dispose: () => void;
  hasDrawn: () => boolean;
};

const clamp = (value: number, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
const root = document.documentElement;
const archiveStage = requiredElement<HTMLElement>('.archive-stage');
const canvas = requiredElement<HTMLCanvasElement>('#coast-canvas');
const beats = Array.from(document.querySelectorAll<HTMLElement>('.narrative-beat'));
const eraTrack = requiredElement<HTMLElement>('[data-era-track]');
const demoTrigger = requiredElement<HTMLButtonElement>('[data-demo-trigger]');
const eraButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-era-index]'));
const stageNumber = requiredElement<HTMLElement>('[data-stage-number]');
const yearLabel = requiredElement<HTMLElement>('[data-year]');
const eraLabel = requiredElement<HTMLElement>('[data-era-label]');
const summaryLabel = requiredElement<HTMLElement>('[data-summary]');
const lossLabel = requiredElement<HTMLElement>('[data-loss]');
const retreatLabel = requiredElement<HTMLElement>('[data-retreat]');
const waterLabel = requiredElement<HTMLElement>('[data-water]');
const inputModeLabel = requiredElement<HTMLElement>('[data-input-mode]');
const rendererModeLabel = requiredElement<HTMLElement>('[data-renderer-mode]');
const dragYearLabel = requiredElement<HTMLElement>('[data-drag-year]');
const localRetreatLabel = requiredElement<HTMLElement>('[data-local-retreat]');
const localLossLabel = requiredElement<HTMLElement>('[data-local-loss]');
const coastLand = requiredElement<SVGPathElement>('[data-coast-land]');
const coastLoss = requiredElement<SVGPathElement>('[data-coast-loss]');
const coastBaseline = requiredElement<SVGPathElement>('[data-coast-baseline]');
const coastCurrent = requiredElement<SVGPathElement>('[data-coast-current]');
const coastLens = requiredElement<SVGCircleElement>('[data-coast-lens]');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const forcedFallback = new URLSearchParams(window.location.search).get('fallback') === '1';
const autoDemo = new URLSearchParams(window.location.search).get('demo') === '1';
const stageIds = ['observe', 'compare', 'consequence'] as const;

let selectedIndex = 0;
let timelinePosition = 0;
let currentEvidence = interpolateCoastlineEvidence(0);
let activeStage = 0;
let scrollProgress = 0;
let inputMode: InputMode = 'scroll';
let rendererMode: RendererMode = 'fallback';
let scene: SceneController | null = null;
let trackPointerActive = false;
let demoFrame: number | null = null;
let lastDirectInputAt = Number.NEGATIVE_INFINITY;

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`缺少语义交互原型元素：${selector}`);
  return element;
}

function maxScroll() {
  return Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
}

function stageFromProgress(progress: number) {
  if (progress < 0.32) return 0;
  if (progress < 0.7) return 1;
  return 2;
}

function storyWeights(progress: number) {
  const centers = [0.08, 0.5, 0.92];
  return centers.map((center) => clamp(1 - Math.abs(progress - center) / 0.34));
}

function updateInputWitness(nextInput: InputMode) {
  inputMode = nextInput;
  if (nextInput !== 'scroll') lastDirectInputAt = performance.now();
  const labels: Record<InputMode, string> = {
    scroll: 'SCROLL / NARRATIVE',
    pointer: 'POINTER / EVIDENCE',
    touch: 'TOUCH / EVIDENCE',
    keyboard: 'KEYBOARD / EVIDENCE',
    button: 'BUTTON / EVIDENCE',
    demo: 'DEMO / EVIDENCE',
    api: 'TEST API / EVIDENCE'
  };
  inputModeLabel.textContent = labels[nextInput];
}

function renderStory(progress: number) {
  scrollProgress = clamp(progress);
  activeStage = stageFromProgress(scrollProgress);
  const weights = storyWeights(scrollProgress);
  root.style.setProperty('--stage-progress', scrollProgress.toFixed(4));
  root.dataset.stage = stageIds[activeStage];
  stageNumber.textContent = `0${activeStage + 1}`;
  root.style.setProperty('--lens-opacity', activeStage === 1 ? '.72' : '.24');

  beats.forEach((beat, index) => {
    const weight = weights[index] ?? 0;
    beat.style.opacity = weight.toFixed(3);
    beat.style.transform = `translate3d(0, ${(1 - weight) * 28}px, 0)`;
    beat.setAttribute('aria-hidden', weight > 0.12 ? 'false' : 'true');
  });

  renderCoastEvidence(currentEvidence.sceneMorph);
  scene?.setTargets(currentEvidence.sceneMorph, activeStage / 2);
}

function coastlinePoints(morph: number) {
  return Array.from({ length: 29 }, (_, index) => {
    const normalizedY = index / 28;
    const y = normalizedY * 700;
    const baseX = 652 + Math.sin(normalizedY * Math.PI * 4.5 + 0.4) * 34 + Math.sin(normalizedY * Math.PI * 13) * 10;
    const retreat = morph * (58 + normalizedY * 72 + Math.sin(normalizedY * Math.PI * 6 + 1.2) * 13);
    return { x: baseX - retreat, y };
  });
}

function linePath(points: readonly { x: number; y: number }[]) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
}

function renderCoastEvidence(morph: number) {
  const baseline = coastlinePoints(0);
  const current = coastlinePoints(morph);
  const landPath = `M0,0 ${linePath(current).replace(/^M/, 'L')} L0,700 Z`;
  const lossPath = `${linePath(baseline)} ${[...current].reverse().map((point) => `L${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')} Z`;
  coastLand.setAttribute('d', landPath);
  coastLoss.setAttribute('d', lossPath);
  coastBaseline.setAttribute('d', linePath(baseline));
  coastCurrent.setAttribute('d', linePath(current));
  root.style.setProperty('--loss-opacity', (0.05 + morph * (0.18 + activeStage * 0.09)).toFixed(3));
}

function renderEvidence() {
  const evidence = currentEvidence;
  yearLabel.textContent = String(Math.round(evidence.year));
  eraLabel.textContent = evidence.label;
  summaryLabel.textContent = evidence.summary;
  lossLabel.textContent = evidence.lossSquareKilometers.toFixed(1);
  retreatLabel.textContent = String(Math.round(evidence.retreatMeters));
  waterLabel.textContent = `${evidence.relativeWaterCentimeters >= 0 ? '+' : ''}${Math.round(evidence.relativeWaterCentimeters)}`;
  dragYearLabel.textContent = String(Math.round(evidence.year));
  root.style.setProperty('--era-progress', timelinePosition.toFixed(4));
  root.style.setProperty('--timeline-position', timelinePosition.toFixed(4));
  root.style.setProperty('--timeline-percent', `${(timelinePosition * 100).toFixed(3)}%`);
  root.dataset.selectedYear = String(Math.round(evidence.year));
  renderCoastEvidence(evidence.sceneMorph);

  eraButtons.forEach((button, index) => {
    const selected = index === selectedIndex;
    button.setAttribute('aria-pressed', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });

  scene?.setTargets(evidence.sceneMorph, activeStage / 2);
}

function snapshot(): SemanticInteractionSnapshot {
  const evidence = currentEvidence;
  return {
    stage: activeStage,
    stageId: stageIds[activeStage],
    selectedIndex,
    selectedYear: evidence.year,
    lossSquareKilometers: evidence.lossSquareKilometers,
    retreatMeters: evidence.retreatMeters,
    relativeWaterCentimeters: evidence.relativeWaterCentimeters,
    timelinePosition,
    dragging: trackPointerActive,
    renderer: rendererMode,
    reducedMotion: reducedMotion.matches,
    inputMode,
    hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    canvasDrawn: rendererMode === 'fallback' || Boolean(scene?.hasDrawn())
  };
}

function setYear(index: number, nextInput: InputMode = 'api') {
  selectedIndex = Math.min(semanticInteractionCapability.evidence.length - 1, Math.max(0, Math.round(index)));
  timelinePosition = selectedIndex / Math.max(1, semanticInteractionCapability.evidence.length - 1);
  currentEvidence = interpolateCoastlineEvidence(timelinePosition);
  updateInputWitness(nextInput);
  renderEvidence();
  return snapshot();
}

function setTimelinePosition(position: number, nextInput: InputMode = 'api') {
  timelinePosition = clamp(position);
  currentEvidence = interpolateCoastlineEvidence(timelinePosition);
  selectedIndex = currentEvidence.anchorIndex;
  updateInputWitness(nextInput);
  renderEvidence();
  return snapshot();
}

function setStage(stage: number, syncScroll = true) {
  const nextStage = Math.min(2, Math.max(0, Math.round(stage)));
  const progress = [0.08, 0.5, 0.92][nextStage]!;
  if (syncScroll) window.scrollTo({ top: progress * maxScroll(), behavior: 'auto' });
  renderStory(progress);
  updateInputWitness('api');
  return snapshot();
}

function updateFromTrackPointer(event: PointerEvent) {
  if (!trackPointerActive) return;
  const bounds = eraTrack.getBoundingClientRect();
  const position = clamp((event.clientX - bounds.left) / Math.max(1, bounds.width));
  setTimelinePosition(position, event.pointerType === 'touch' ? 'touch' : 'pointer');
}

function updateLensFromPointer(event: PointerEvent) {
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest('.control-deck, .evidence-readout, .masthead')) {
    root.dataset.lensActive = 'false';
    return;
  }

  const bounds = archiveStage.getBoundingClientRect();
  const normalizedX = clamp((event.clientX - bounds.left) / Math.max(1, bounds.width));
  const normalizedY = clamp((event.clientY - bounds.top) / Math.max(1, bounds.height));
  const localFactor = clamp(0.58 + normalizedY * 0.48 + Math.sin(normalizedY * 8.2) * 0.07, 0.46, 1.08);
  const localRetreat = Math.round(currentEvidence.retreatMeters * localFactor);
  const localLoss = currentEvidence.lossSquareKilometers * (0.42 + normalizedY * 0.36);

  scene?.setPointer(normalizedX, 1 - normalizedY);
  coastLens.setAttribute('cx', String(normalizedX * 1000));
  coastLens.setAttribute('cy', String(normalizedY * 700));
  root.style.setProperty('--lens-screen-x', `${(normalizedX * 100).toFixed(2)}%`);
  root.style.setProperty('--lens-screen-y', `${(normalizedY * 100).toFixed(2)}%`);
  root.dataset.lensSide = normalizedX > 0.72 ? 'left' : 'right';
  root.dataset.lensActive = activeStage === 1 ? 'true' : 'false';
  localRetreatLabel.textContent = `${localRetreat} m`;
  localLossLabel.textContent = `局部损失 ${localLoss.toFixed(1)} km²`;
}

function stopDemo() {
  if (demoFrame !== null) window.cancelAnimationFrame(demoFrame);
  demoFrame = null;
  root.dataset.demo = 'false';
  demoTrigger.setAttribute('aria-pressed', 'false');
}

function playDemo() {
  stopDemo();
  setStage(1);
  root.dataset.demo = 'true';
  demoTrigger.setAttribute('aria-pressed', 'true');

  if (reducedMotion.matches) {
    setYear(2, 'demo');
    stopDemo();
    return;
  }

  const startedAt = performance.now();
  const duration = 3200;
  const tick = (now: number) => {
    const progress = clamp((now - startedAt) / duration);
    const eased = .5 - Math.cos(progress * Math.PI) / 2;
    setTimelinePosition(eased, 'demo');
    if (progress < 1) {
      demoFrame = window.requestAnimationFrame(tick);
      return;
    }
    setYear(2, 'demo');
    stopDemo();
  };
  demoFrame = window.requestAnimationFrame(tick);
}

function updateScroll() {
  renderStory(clamp(window.scrollY / maxScroll()));
  if (performance.now() - lastDirectInputAt > 180) updateInputWitness('scroll');
}

async function createScene(): Promise<SceneController> {
  const THREE = await import('three');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x101715, 0);

  const scene3d = new THREE.Scene();
  scene3d.fog = new THREE.FogExp2(0x101715, 0.045);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
  camera.position.set(1.4, 7.2, 8.4);
  camera.lookAt(1.6, -1.0, -0.5);

  const uniforms = {
    uEra: { value: 0 },
    uStage: { value: 0 },
    uTime: { value: 0 },
    uPointer: { value: new THREE.Vector2(0.48, 0.5) },
    uResolution: { value: new THREE.Vector2(1, 1) }
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.DoubleSide,
    vertexShader: `
      uniform float uEra;
      uniform float uStage;
      uniform float uTime;
      varying vec2 vUv;
      varying float vHeight;
      varying float vLost;
      varying float vWater;

      float coastLine(vec2 uv, float era) {
        float base = 0.54 + sin(uv.y * 8.0 + 0.7) * 0.055 + sin(uv.y * 19.0) * 0.018;
        float cuts = smoothstep(0.46, 0.62, uv.y) * sin(uv.y * 31.0 + 1.8) * 0.026;
        return base - era * (0.06 + uv.y * 0.13 + cuts);
      }

      void main() {
        vUv = uv;
        float baseCoast = coastLine(uv, 0.0);
        float currentCoast = coastLine(uv, uEra);
        float baseLand = 1.0 - smoothstep(baseCoast - 0.018, baseCoast + 0.018, uv.x);
        float currentLand = 1.0 - smoothstep(currentCoast - 0.018, currentCoast + 0.018, uv.x);
        vLost = clamp(baseLand - currentLand, 0.0, 1.0);
        vWater = 1.0 - currentLand;

        float ridges = sin(uv.x * 28.0 + sin(uv.y * 9.0)) * 0.055;
        ridges += sin(uv.y * 38.0 + uv.x * 4.0) * 0.028;
        float dunes = currentLand * (0.16 + ridges + pow(1.0 - uv.x, 2.0) * 0.28);
        float seabed = -0.14 - vWater * (0.16 + uv.x * 0.09);
        float pulse = sin(uTime * 0.16 + uv.y * 12.0) * 0.006 * (1.0 - uStage);

        vec3 transformed = position;
        transformed.z += mix(seabed, dunes, currentLand) + pulse;
        vHeight = transformed.z;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uEra;
      uniform float uStage;
      uniform vec2 uPointer;
      varying vec2 vUv;
      varying float vHeight;
      varying float vLost;
      varying float vWater;

      void main() {
        vec3 sandLow = vec3(0.25, 0.24, 0.17);
        vec3 sandHigh = vec3(0.68, 0.57, 0.36);
        vec3 lostColor = vec3(0.82, 0.34, 0.15);

        vec3 land = mix(sandLow, sandHigh, smoothstep(0.05, 0.44, vHeight));
        vec3 color = land;

        float contour = 1.0 - smoothstep(0.035, 0.075, abs(fract(vHeight * 16.0) - 0.5));
        color += contour * (1.0 - vWater) * 0.075;
        float foam = smoothstep(0.04, 0.0, abs(vWater - 0.5));
        color = mix(color, vec3(0.86, 0.84, 0.68), foam * 0.72);

        float lens = 1.0 - smoothstep(0.09, 0.28, distance(vUv, uPointer));
        float evidenceReveal = mix(0.14, 0.72, uStage) + lens * 0.7;
        color = mix(color, lostColor, clamp(vLost * evidenceReveal * (0.35 + uEra), 0.0, 0.88));
        color += lens * 0.035;

        float edgeFade = smoothstep(0.0, 0.08, vUv.y) * (1.0 - smoothstep(0.9, 1.0, vUv.y));
        if (vWater > 0.54 && vLost < 0.02) discard;
        gl_FragColor = vec4(color, edgeFade);
      }
    `
  });

  const waterGeometry = new THREE.PlaneGeometry(13.8, 9.4, 1, 1);
  const waterMaterial = new THREE.MeshBasicMaterial({ color: 0x12363a, fog: true });
  const water = new THREE.Mesh(waterGeometry, waterMaterial);
  water.rotation.x = -Math.PI / 2;
  water.rotation.z = -0.08;
  water.position.set(1.8, -1.49, -0.8);
  scene3d.add(water);

  const coastGeometry = new THREE.PlaneGeometry(12, 8, 170, 110);
  const coast = new THREE.Mesh(coastGeometry, material);
  coast.rotation.x = -Math.PI / 2;
  coast.rotation.z = -0.08;
  coast.position.set(1.8, -1.3, -0.8);
  scene3d.add(coast);

  const particleCount = 680;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let index = 0; index < particleCount; index += 1) {
    particlePositions[index * 3] = (Math.random() - 0.32) * 12;
    particlePositions[index * 3 + 1] = -0.4 + Math.random() * 1.8;
    particlePositions[index * 3 + 2] = (Math.random() - 0.5) * 8;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({ color: 0xc9b588, size: 0.018, transparent: true, opacity: 0.34, depthWrite: false })
  );
  scene3d.add(particles);

  let width = 1;
  let height = 1;
  let targetEra = 0;
  let targetStage = 0;
  let currentEra = 0;
  let currentStage = 0;
  let targetPointerX = 0.48;
  let targetPointerY = 0.5;
  let drawn = false;
  let animationFrame = 0;
  const clock = new THREE.Clock();

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(bounds.width));
    height = Math.max(1, Math.round(bounds.height));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 720 ? 1.15 : 1.55));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    uniforms.uResolution.value.set(width, height);
  }

  function frame() {
    const easing = reducedMotion.matches ? 1 : 0.075;
    currentEra += (targetEra - currentEra) * easing;
    currentStage += (targetStage - currentStage) * easing;
    uniforms.uEra.value = currentEra;
    uniforms.uStage.value = currentStage;
    uniforms.uPointer.value.x += (targetPointerX - uniforms.uPointer.value.x) * (reducedMotion.matches ? 1 : 0.12);
    uniforms.uPointer.value.y += (targetPointerY - uniforms.uPointer.value.y) * (reducedMotion.matches ? 1 : 0.12);
    uniforms.uTime.value = reducedMotion.matches ? 0 : clock.getElapsedTime();
    particles.rotation.y = reducedMotion.matches ? 0 : Math.sin(clock.getElapsedTime() * 0.035) * 0.04;
    camera.position.x = 1.4 + currentStage * 0.55;
    camera.position.y = 7.2 - currentStage * 0.45;
    camera.position.z = 8.4 - currentStage * 0.55;
    camera.lookAt(1.6, -1.0, -0.5);
    renderer.render(scene3d, camera);
    drawn = renderer.info.render.calls > 0;
    animationFrame = window.requestAnimationFrame(frame);
  }

  resize();
  frame();

  return {
    setTargets: (era, stage) => {
      targetEra = clamp(era);
      targetStage = clamp(stage);
    },
    setPointer: (x, y) => {
      targetPointerX = clamp(x);
      targetPointerY = clamp(y);
    },
    resize,
    dispose: () => {
      window.cancelAnimationFrame(animationFrame);
      particleGeometry.dispose();
      (particles.material as import('three').Material).dispose();
      coastGeometry.dispose();
      waterGeometry.dispose();
      waterMaterial.dispose();
      material.dispose();
      renderer.dispose();
    },
    hasDrawn: () => drawn
  };
}

function setRendererMode(mode: RendererMode) {
  rendererMode = mode;
  root.dataset.renderer = mode;
  rendererModeLabel.textContent = mode === 'webgl' ? 'WEBGL / ACTIVE' : 'READABLE / FALLBACK';
}

eraButtons.forEach((button, index) => {
  button.addEventListener('click', () => {
    stopDemo();
    setYear(index, 'button');
  });
  button.addEventListener('focus', () => {
    if (index !== selectedIndex) setYear(index, 'keyboard');
  });
});

demoTrigger.addEventListener('pointerdown', (event) => event.stopPropagation());
demoTrigger.addEventListener('click', (event) => {
  event.stopPropagation();
  if (demoFrame !== null) {
    stopDemo();
    return;
  }
  playDemo();
});

eraTrack.addEventListener('pointerdown', (event) => {
  stopDemo();
  trackPointerActive = true;
  root.dataset.dragging = 'true';
  eraTrack.setPointerCapture?.(event.pointerId);
  updateFromTrackPointer(event);
});
eraTrack.addEventListener('pointermove', updateFromTrackPointer);
eraTrack.addEventListener('pointerup', (event) => {
  updateFromTrackPointer(event);
  trackPointerActive = false;
  root.dataset.dragging = 'false';
  eraTrack.releasePointerCapture?.(event.pointerId);
  setYear(
    resolveEvidenceIndexFromPosition(timelinePosition),
    event.pointerType === 'touch' ? 'touch' : 'pointer'
  );
});
eraTrack.addEventListener('pointercancel', () => {
  trackPointerActive = false;
  root.dataset.dragging = 'false';
  setYear(resolveEvidenceIndexFromPosition(timelinePosition), inputMode);
});

archiveStage.addEventListener('pointermove', (event) => {
  updateLensFromPointer(event);
  updateInputWitness(event.pointerType === 'touch' ? 'touch' : 'pointer');
});
archiveStage.addEventListener('pointerleave', () => {
  root.dataset.lensActive = 'false';
});

canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  setRendererMode('fallback');
});
canvas.addEventListener('webglcontextrestored', () => {
  window.requestAnimationFrame(() => {
    if (scene?.hasDrawn()) setRendererMode('webgl');
  });
});

window.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  stopDemo();
  const direction = event.key === 'ArrowLeft' ? -1 : 1;
  const nextIndex = cycleEvidenceIndex(selectedIndex, direction);
  setYear(nextIndex, 'keyboard');
  eraButtons[nextIndex]?.focus({ preventScroll: true });
});

window.addEventListener('scroll', updateScroll, { passive: true });
window.addEventListener('resize', () => {
  scene?.resize();
  updateScroll();
}, { passive: true });
reducedMotion.addEventListener('change', () => {
  scene?.setTargets(currentEvidence.sceneMorph, activeStage / 2);
});
window.addEventListener('pagehide', () => {
  stopDemo();
  scene?.dispose();
}, { once: true });

window.__semanticInteractionPrototype = { setStage, setYear, setTimelinePosition, snapshot };

async function bootstrap() {
  setRendererMode('fallback');
  renderEvidence();
  updateScroll();

  if (!forcedFallback) {
    try {
      scene = await createScene();
      scene.setTargets(currentEvidence.sceneMorph, activeStage / 2);
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      setRendererMode(scene.hasDrawn() ? 'webgl' : 'fallback');
    } catch (error) {
      console.warn('WebGL enhancement unavailable; readable fallback remains active.', error);
      setRendererMode('fallback');
    }
  }

  window.requestAnimationFrame(() => {
    root.dataset.prototypeReady = 'true';
    if (autoDemo) window.setTimeout(playDemo, 420);
  });
}

void bootstrap();

export {};
