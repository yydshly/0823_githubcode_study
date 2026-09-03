import * as THREE from 'three';
import { createGeneratedThreeRuntime, type GeneratedQuality } from '../../../../src/generated-sdk/index.ts';

type HeroState = 'forming' | 'blooming' | 'settled';

type ThinFilmSnapshot = {
  ready: boolean;
  heroProgress: number;
  heroState: HeroState;
  thickness: number;
  tension: number;
  pointerAngle: number;
  lightAngle: number;
  wheelProgress: number;
  frames: number;
  drawCalls: number;
  triangles: number;
  fallback: boolean;
  reducedMotion: boolean;
  horizontalOverflow: boolean;
  quality: GeneratedQuality;
};

declare global {
  interface Window {
    __thinFilmLab?: {
      snapshot: () => ThinFilmSnapshot;
      setThickness: (value: number) => void;
      setTension: (value: number) => void;
    };
  }
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp((value - edge0) / Math.max(.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, value: number) => a + (b - a) * value;

const root = document.documentElement;
const shell = document.querySelector<HTMLElement>('#app');
const canvas = document.querySelector<HTMLCanvasElement>('.film-canvas');
const thicknessInput = document.querySelector<HTMLInputElement>('#thickness');
const tensionInput = document.querySelector<HTMLInputElement>('#tension');
const thicknessReadout = document.querySelector<HTMLElement>('[data-thickness-readout]');
const tensionReadout = document.querySelector<HTMLElement>('[data-tension-readout]');
const angleReadout = document.querySelector<HTMLElement>('[data-angle-readout]');
const thicknessOutput = document.querySelector<HTMLOutputElement>('[data-thickness-output]');
const tensionOutput = document.querySelector<HTMLOutputElement>('[data-tension-output]');
const heroStateNode = document.querySelector<HTMLElement>('[data-hero-state]');
const saveButton = document.querySelector<HTMLButtonElement>('[data-save]');
const saveStatus = document.querySelector<HTMLElement>('[data-save-status]');
const fallbackMessage = document.querySelector<HTMLElement>('.runtime-fallback');

if (!shell || !canvas || !thicknessInput || !tensionInput || !thicknessReadout || !tensionReadout || !angleReadout || !thicknessOutput || !tensionOutput || !heroStateNode || !saveButton || !saveStatus || !fallbackMessage) {
  throw new Error('AURORA FILM delivery is missing required interface elements.');
}

const params = new URLSearchParams(location.search);
const quality: GeneratedQuality = params.get('quality') === 'high' || params.get('quality') === 'low' ? params.get('quality') as GeneratedQuality : 'balanced';
const motionMode = params.get('motion');
const reducedMotion = motionMode === 'reduce'
  ? true
  : motionMode === 'full'
    ? false
    : matchMedia('(prefers-reduced-motion: reduce)').matches;
let fallback = params.get('fallback') === '1';
let heroProgress = reducedMotion ? 1 : 0;
let heroState: HeroState = reducedMotion ? 'settled' : 'forming';
let thickness = 62;
let tension = 74;
let wheelProgress = .595;
let pointerX = 0;
let pointerY = 0;
let pointerTargetX = 0;
let pointerTargetY = 0;
let frames = 0;
let drawCalls = 0;
let triangles = 0;
let ready = false;
let frameId = 0;
let disposed = false;

const updateSemanticState = () => {
  thicknessInput.value = String(Math.round(thickness));
  tensionInput.value = String(Math.round(tension));
  const angle = Math.round(pointerX * 26);
  thicknessReadout.textContent = String(Math.round(thickness)).padStart(2, '0');
  tensionReadout.textContent = String(Math.round(tension)).padStart(2, '0');
  angleReadout.textContent = `${angle >= 0 ? '+' : '−'}${String(Math.abs(angle)).padStart(2, '0')}`;
  thicknessOutput.textContent = String(Math.round(thickness));
  tensionOutput.textContent = `${Math.round(tension)}%`;
  root.style.setProperty('--spectral-shift', `${Math.round((thickness - 50) * 2.8 + pointerX * 28)}deg`);
  root.style.setProperty('--film-scale', String(.88 + tension / 800));
};

const setThickness = (value: number) => {
  thickness = clamp(value, 12, 96);
  wheelProgress = (thickness - 12) / 84;
  updateSemanticState();
};
const setTension = (value: number) => {
  tension = clamp(value, 20, 100);
  updateSemanticState();
};

thicknessInput.addEventListener('input', () => setThickness(Number(thicknessInput.value)));
tensionInput.addEventListener('input', () => setTension(Number(tensionInput.value)));

const onPointer = (event: PointerEvent) => {
  pointerTargetX = clamp(event.clientX / Math.max(1, innerWidth) * 2 - 1, -1, 1);
  pointerTargetY = clamp(-(event.clientY / Math.max(1, innerHeight) * 2 - 1), -1, 1);
};
const onWheel = (event: WheelEvent) => {
  wheelProgress = clamp(wheelProgress + clamp(event.deltaY, -120, 120) * .0015);
  thickness = 12 + wheelProgress * 84;
  tension = clamp(50 + wheelProgress * 38, 20, 100);
  updateSemanticState();
};
addEventListener('pointermove', onPointer, { passive: true });
addEventListener('pointerdown', onPointer, { passive: true });
addEventListener('wheel', onWheel, { passive: true });
addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
    event.preventDefault();
    setThickness(thickness + 2);
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
    event.preventDefault();
    setThickness(thickness - 2);
  }
});
saveButton.addEventListener('click', () => {
  saveStatus.textContent = `已在本页保存视觉方案：膜厚刻度 ${Math.round(thickness)}、张力 ${Math.round(tension)}%。这不是实验测量记录。`;
});

const useFallback = () => {
  fallback = true;
  root.dataset.fallback = 'true';
  fallbackMessage.hidden = false;
  heroProgress = 1;
  heroState = 'settled';
  heroStateNode.textContent = '基础视觉模拟已就绪';
};

const filmVertex = `
  uniform float uTime;
  uniform float uFormation;
  uniform float uTension;
  uniform vec2 uPointer;
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vWorldPosition;
  varying float vRipple;
  void main() {
    vUv = uv;
    vec3 p = position;
    float radial = length(uv - .5) * 2.0;
    float edge = smoothstep(.98, .56, radial);
    float ripple = sin(uv.x * 13.0 + uTime * .45) * sin(uv.y * 11.0 - uTime * .35);
    float breath = sin(uTime * .55 + radial * 5.5) * .035;
    float pointerWell = exp(-10.0 * distance(uv, uPointer * .16 + .5));
    p.z += edge * (ripple * mix(.08, .018, uTension) + breath * (1.0 - uTension) + pointerWell * .075);
    p.xy *= mix(.12, 1.0, uFormation);
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorldPosition = world.xyz;
    vNormalWorld = normalize(mat3(modelMatrix) * normal);
    vRipple = ripple;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const filmFragment = `
  precision highp float;
  uniform float uTime;
  uniform float uFormation;
  uniform float uBloom;
  uniform float uThickness;
  uniform float uTension;
  uniform vec2 uPointer;
  uniform vec3 uLight;
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vWorldPosition;
  varying float vRipple;

  vec3 spectral(float phase) {
    vec3 wave = .56 + .44 * cos(6.28318 * (phase + vec3(.02, .34, .67)));
    return pow(wave, vec3(1.32));
  }

  void main() {
    float radius = length(vUv - .5) * 2.0;
    float edge = 1.0 - smoothstep(.9, 1.0, radius);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float ndv = clamp(abs(dot(normalize(vNormalWorld), viewDirection)), 0.0, 1.0);
    float fresnel = pow(1.0 - ndv, 2.2);
    float lightAngle = dot(normalize(uLight - vWorldPosition), normalize(vNormalWorld)) * .5 + .5;
    float angular = atan(vUv.y - .5, vUv.x - .5);
    float contour = sin(radius * 22.0 - angular * 2.0 + uTime * .16) * .035;
    float localThickness = uThickness + vRipple * mix(.24, .055, uTension) + radius * .16 + contour + uPointer.x * .04;
    vec3 spectrumA = spectral(localThickness * 3.7 + ndv * 1.2 + lightAngle * .26);
    vec3 spectrumB = spectral(localThickness * 5.15 - ndv * .72 + radius * .28);
    vec3 spectrum = mix(spectrumA, spectrumB, .28 + fresnel * .32);
    vec3 pearl = vec3(.94, .98, .96);
    vec3 color = mix(pearl, spectrum, (.56 + fresnel * .44) * uBloom);
    float glint = pow(max(0.0, dot(reflect(-normalize(uLight - vWorldPosition), normalize(vNormalWorld)), viewDirection)), 44.0);
    color += glint * vec3(1.0, .94, .74) * 1.8;
    float transparency = mix(.03, .66 + fresnel * .24, uBloom) * uFormation * edge;
    gl_FragColor = vec4(color, transparency);
  }
`;

const causticFragment = `
  precision highp float;
  uniform float uTime;
  uniform float uBloom;
  uniform float uThickness;
  uniform vec2 uPointer;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - .5;
    p.x *= 1.8;
    float band = exp(-18.0 * abs(length(p) - .27 - sin(atan(p.y,p.x)*3.0 + uTime*.18)*.035));
    vec3 color = .58 + .42*cos(6.28318*(uThickness*2.9 + length(p)*2.4 + vec3(.0,.32,.67) + uPointer.x*.04));
    float fade = smoothstep(.65,.05,length(p));
    gl_FragColor = vec4(color, band * fade * uBloom * .24);
  }
`;

let runtime: ReturnType<typeof createGeneratedThreeRuntime> | null = null;
let filmMaterial: THREE.ShaderMaterial | null = null;
let causticMaterial: THREE.ShaderMaterial | null = null;
let ringGroup: THREE.Group | null = null;
let filmMesh: THREE.Mesh | null = null;

if (!fallback) {
  try {
    runtime = createGeneratedThreeRuntime(canvas, {
      quality,
      camera: { fov: 32, near: .1, far: 40 },
      clearColor: 0xeee9df,
      clearAlpha: 0,
      toneMappingExposure: 1.12,
      maxDpr: 2,
      lowQualityMaxDpr: 1
    });
    runtime.camera.position.set(0, .05, 7.4);

    const segments = quality === 'high' ? 128 : quality === 'balanced' ? 88 : 56;
    ringGroup = new THREE.Group();
    const ringGeometry = runtime.geometry(new THREE.TorusGeometry(2.16, .12, quality === 'low' ? 14 : 24, segments));
    const ringMaterial = runtime.material(new THREE.MeshPhysicalMaterial({
      color: 0x8f8576,
      metalness: .82,
      roughness: .22,
      clearcoat: .75,
      clearcoatRoughness: .16
    }));
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.castShadow = false;
    ring.receiveShadow = true;
    ringGroup.add(ring);

    const filmGeometry = runtime.geometry(new THREE.CircleGeometry(2.055, segments));
    filmMaterial = runtime.material(new THREE.ShaderMaterial({
      vertexShader: filmVertex,
      fragmentShader: filmFragment,
      uniforms: {
        uTime: { value: 0 },
        uFormation: { value: 0 },
        uBloom: { value: 0 },
        uThickness: { value: .62 },
        uTension: { value: .74 },
        uPointer: { value: new THREE.Vector2() },
        uLight: { value: new THREE.Vector3(3.5, 4.5, 5) }
      },
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
      blending: THREE.NormalBlending
    }));
    filmMesh = new THREE.Mesh(filmGeometry, filmMaterial);
    filmMesh.position.z = .012;
    filmMesh.renderOrder = 2;
    ringGroup.add(filmMesh);
    ringGroup.position.set(1.08, -.05, 0);
    runtime.scene.add(ringGroup);

    const causticGeometry = runtime.geometry(new THREE.PlaneGeometry(7.8, 4.6));
    causticMaterial = runtime.material(new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: causticFragment,
      uniforms: {
        uTime: { value: 0 },
        uBloom: { value: 0 },
        uThickness: { value: .62 },
        uPointer: { value: new THREE.Vector2() }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }));
    const caustic = new THREE.Mesh(causticGeometry, causticMaterial);
    caustic.position.set(1.1, -1.1, -1.15);
    caustic.rotation.z = -.12;
    runtime.scene.add(caustic);

    runtime.scene.add(new THREE.HemisphereLight(0xffffff, 0x857969, 2.5));
    const key = new THREE.DirectionalLight(0xfff4d6, 5.5);
    key.position.set(4.5, 5.2, 5.6);
    runtime.scene.add(key);
    const rim = new THREE.DirectionalLight(0x8cb9ff, 2.4);
    rim.position.set(-4, 1.5, 3);
    runtime.scene.add(rim);
  } catch (error) {
    console.warn('[thin-film-lab] WebGL unavailable; using complete CSS fallback.', error);
    runtime?.dispose();
    runtime = null;
    useFallback();
  }
} else {
  useFallback();
}

const resize = () => {
  runtime?.resize({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio || 1 });
};
resize();
addEventListener('resize', resize, { passive: true });

const started = performance.now();
let last = started;
const tick = (now: number) => {
  if (disposed) return;
  const delta = Math.min(.05, Math.max(0, (now - last) / 1000));
  last = now;
  if (!reducedMotion && !fallback) heroProgress = clamp((now - started) / 5000);
  else heroProgress = 1;
  heroState = heroProgress < .34 ? 'forming' : heroProgress < .78 ? 'blooming' : 'settled';
  heroStateNode.textContent = heroState === 'forming' ? '正在形成薄膜…' : heroState === 'blooming' ? '干涉色正在展开…' : '模拟光谱已稳定';

  const smoothing = reducedMotion ? 1 : 1 - Math.exp(-delta * 7.2);
  pointerX += (pointerTargetX - pointerX) * smoothing;
  pointerY += (pointerTargetY - pointerY) * smoothing;

  const settle = smoothstep(0, .26, heroProgress);
  const formation = smoothstep(.1, .46, heroProgress);
  const bloom = smoothstep(.27, .7, heroProgress);
  const arc = smoothstep(.48, .86, heroProgress);

  if (runtime && ringGroup && filmMaterial && causticMaterial && filmMesh) {
    const portrait = innerWidth / Math.max(1, innerHeight) < .72;
    const baseX = portrait ? .48 : 1.08;
    ringGroup.position.x = baseX + lerp(1.8, 0, settle);
    ringGroup.position.y = portrait ? .17 : -.04;
    ringGroup.rotation.x = lerp(-.15, -.32 + pointerY * .09, arc);
    ringGroup.rotation.y = lerp(.48, pointerX * .15, arc);
    ringGroup.rotation.z = lerp(.22, -.09, settle);
    ringGroup.scale.setScalar(portrait ? .68 : .88);
    filmMesh.scale.setScalar(.985);

    runtime.camera.position.x = lerp(-.28, .12, arc) + pointerX * .16;
    runtime.camera.position.y = .08 + pointerY * .1;
    runtime.camera.position.z = portrait ? 8.15 : 7.4;
    runtime.camera.lookAt(baseX * .2, 0, 0);

    filmMaterial.uniforms.uTime.value = (now - started) / 1000;
    filmMaterial.uniforms.uFormation.value = formation;
    filmMaterial.uniforms.uBloom.value = bloom;
    filmMaterial.uniforms.uThickness.value = thickness / 100;
    filmMaterial.uniforms.uTension.value = tension / 100;
    (filmMaterial.uniforms.uPointer.value as THREE.Vector2).set(pointerX, pointerY);
    (filmMaterial.uniforms.uLight.value as THREE.Vector3).set(3.5 + pointerX * 2.2, 4.2 + pointerY, 5);
    causticMaterial.uniforms.uTime.value = (now - started) / 1000;
    causticMaterial.uniforms.uBloom.value = bloom;
    causticMaterial.uniforms.uThickness.value = thickness / 100;
    (causticMaterial.uniforms.uPointer.value as THREE.Vector2).set(pointerX, pointerY);

    runtime.render();
    frames += 1;
    drawCalls = runtime.renderer.info.render.calls;
    triangles = runtime.renderer.info.render.triangles;
  }
  updateSemanticState();
  ready = true;
  root.dataset.thinFilmReady = 'true';
  frameId = requestAnimationFrame(tick);
};

const snapshot = (): ThinFilmSnapshot => ({
  ready,
  heroProgress: Number(heroProgress.toFixed(3)),
  heroState,
  thickness: Number(thickness.toFixed(1)),
  tension: Number(tension.toFixed(1)),
  pointerAngle: Number((pointerX * 26).toFixed(1)),
  lightAngle: Number((pointerX * 31 + pointerY * 8).toFixed(1)),
  wheelProgress: Number(wheelProgress.toFixed(3)),
  frames,
  drawCalls,
  triangles,
  fallback,
  reducedMotion,
  horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
  quality
});

window.__thinFilmLab = { snapshot, setThickness, setTension };
updateSemanticState();
frameId = requestAnimationFrame(tick);

const dispose = () => {
  if (disposed) return;
  disposed = true;
  cancelAnimationFrame(frameId);
  runtime?.dispose();
  removeEventListener('resize', resize);
  removeEventListener('pointermove', onPointer);
  removeEventListener('pointerdown', onPointer);
  removeEventListener('wheel', onWheel);
  delete window.__thinFilmLab;
};
addEventListener('pagehide', dispose, { once: true });
