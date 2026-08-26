import * as THREE from 'three';
import type { Director } from './director';

interface SceneOptions { lowQuality: boolean; reducedMotion: boolean; director: Director; }
export interface SceneRuntime {
  update(elapsed: number, delta: number): void;
  resize(width: number, height: number): void;
  setPointer(x: number, y: number): void;
  setProgress(value: number): void;
  dispose(): void;
}

const subjectVertex = `
varying vec2 vUv;
varying float vDepth;
uniform float uTime;
uniform float uDistortion;
uniform float uDissolve;
uniform float uDepth;
uniform vec2 uPointer;
void main() {
  vUv = uv;
  vec3 p = position;
  float body = sin(uv.y * 8.0 + uTime * 0.55) * 0.5 + sin(uv.x * 11.0 - uTime * 0.4) * 0.5;
  float rupture = sin(uv.y * 27.0 + uv.x * 8.0 + uTime) * uDissolve;
  float falloff = sin(uv.y * 3.1415926);
  float relief = (sin(uv.y * 19.0 + uv.x * 6.0) * 0.5 + sin(uv.x * 23.0 - uv.y * 4.0) * 0.5) * 0.065 * falloff * uDepth;
  p.x += (body * 0.045 + rupture * 0.055) * uDistortion * falloff;
  p.y += sin(uv.x * 8.0 + uTime * 0.35) * 0.025 * uDistortion;
  p.z += (body * 0.10 + rupture * 0.16) * uDistortion + (uv.x - 0.5) * uPointer.x * 0.12 + relief;
  vDepth = p.z;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const subjectFragment = `
varying vec2 vUv;
varying float vDepth;
uniform sampler2D uMap;
uniform float uOpacity;
uniform float uReveal;
uniform float uDissolve;
uniform float uTime;
void main() {
  vec4 tex = texture2D(uMap, vUv);
  float luminance = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
  float flowA = 0.5 + 0.5 * sin(vUv.y * 16.0 + sin(vUv.x * 8.0 + uTime * 0.16) * 2.2);
  float flowB = 0.5 + 0.5 * sin(vUv.y * 7.0 - vUv.x * 12.0 - uTime * 0.11);
  float fibers = smoothstep(0.2, 0.82, flowA * 0.68 + flowB * 0.22 + luminance * 0.18);
  float survival = mix(1.0, 0.08 + fibers * 0.92, uDissolve);
  float reveal = smoothstep(1.0 - uReveal - 0.18, 1.0 - uReveal + 0.12, vUv.y + flowA * 0.055);
  float alpha = tex.a * survival * reveal * uOpacity;
  vec3 pearl = vec3(0.93, 0.88, 1.0);
  vec3 color = mix(tex.rgb * vec3(0.93, 0.9, 1.08), pearl, max(vDepth, 0.0) * 1.4 + luminance * 0.05);
  if (alpha < 0.012) discard;
  gl_FragColor = vec4(color, alpha);
}`;

const environmentVertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const environmentFragment = `
varying vec2 vUv;
uniform sampler2D uMap;
uniform float uOpacity;
void main() {
  vec2 drift = vec2(
    sin(vUv.y * 8.0 + vUv.x * 3.0),
    sin(vUv.x * 7.0 - vUv.y * 4.0)
  ) * 0.012;
  vec2 sampleUv = vec2(0.5) + drift;
  vec3 anchor = (
    texture2D(uMap, sampleUv + vec2(-0.12, 0.08)).rgb +
    texture2D(uMap, sampleUv + vec2(0.1, -0.1)).rgb +
    texture2D(uMap, sampleUv + vec2(0.04, 0.14)).rgb
  ) / 3.0;
  float wave = 0.5 + 0.5 * sin(vUv.x * 4.2 + sin(vUv.y * 5.1) * 1.15);
  float cross = 0.5 + 0.5 * sin(vUv.y * 3.6 - vUv.x * 2.4);
  float edges = smoothstep(0.0, 0.08, vUv.x) * smoothstep(0.0, 0.08, 1.0 - vUv.x)
    * smoothstep(0.0, 0.08, vUv.y) * smoothstep(0.0, 0.08, 1.0 - vUv.y);
  vec3 color = mix(vec3(0.07, 0.025, 0.105), anchor, 0.2);
  float atmosphere = 0.04 + wave * 0.022 + cross * 0.014;
  gl_FragColor = vec4(color, edges * atmosphere * uOpacity);
}`;

const veilVertex = `
varying vec2 vUv;
varying float vFold;
uniform float uPhase;
uniform float uMotion;
void main() {
  vUv = uv;
  vec3 p = position;
  float fold = sin(uv.y * 8.0 + uPhase) * 0.11 + sin(uv.x * 5.0 - uPhase * 0.7) * 0.06;
  p.z += fold * uMotion;
  p.x += sin(uv.y * 4.0 + uPhase) * 0.09 * uMotion;
  vFold = fold;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const veilFragment = `
varying vec2 vUv;
varying float vFold;
uniform float uBloom;
uniform float uEnergy;
void main() {
  float center = 1.0 - abs(vUv.x - 0.5) * 2.0;
  float edge = pow(max(center, 0.0), 2.4);
  float filament = 0.5 + 0.5 * sin(vUv.y * 40.0 + vFold * 70.0);
  float breakup = 0.68 + 0.32 * sin(vUv.y * 13.0 + vUv.x * 7.0);
  vec3 color = mix(vec3(0.16, 0.035, 0.24), vec3(0.57, 0.34, 0.78), edge * 0.78 + filament * 0.1);
  color = mix(color, vec3(0.9, 0.78, 1.0), max(vFold, 0.0) * 2.5 * uBloom);
  float alpha = (edge * 0.05 + filament * 0.006) * breakup * (0.72 + uEnergy * 0.45);
  alpha *= smoothstep(0.0, 0.18, vUv.x) * smoothstep(0.0, 0.18, 1.0 - vUv.x);
  alpha *= smoothstep(0.0, 0.16, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
  gl_FragColor = vec4(color, alpha);
}`;

const particleVertex = `
attribute float aScale;
attribute float aPhase;
uniform float uTime;
uniform float uSpread;
uniform float uEnergy;
uniform vec2 uPointer;
varying float vAlpha;
void main() {
  vec3 p = position;
  float pulse = sin(uTime * 0.7 + aPhase * 6.28318);
  p.x += sin(aPhase * 15.0 + uTime * 0.32) * uSpread * 0.42 + uPointer.x * (0.08 + aPhase * 0.08);
  p.y += cos(aPhase * 11.0 + uTime * 0.24) * uSpread * 0.16 + uPointer.y * 0.05;
  p.z += pulse * uSpread * 0.36;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (1.2 + aScale * 3.2 + uEnergy * 1.4) * (5.0 / max(1.0, -mv.z));
  vAlpha = (0.18 + aScale * 0.55) * (0.5 + uEnergy * 0.5);
}`;

const particleFragment = `
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float alpha = smoothstep(0.5, 0.08, d) * vAlpha;
  gl_FragColor = vec4(vec3(0.72, 0.49, 0.95), alpha);
}`;

const depthFieldVertex = `
attribute vec2 aUv;
attribute float aPhase;
attribute float aSize;
uniform sampler2D uMap;
uniform float uTime;
uniform float uProgress;
uniform float uEnergy;
uniform float uPixelRatio;
uniform vec2 uPointer;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec4 tex = texture2D(uMap, aUv);
  float luminance = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
  float density = smoothstep(0.05, 0.62, tex.a);
  float flow = 0.5 + 0.5 * sin(aUv.y * 19.0 + aUv.x * 7.0 + aPhase * 6.28318);
  float depth = (luminance - 0.44) * 0.62 + (flow - 0.5) * 0.13;
  float release = sin(clamp(uProgress, 0.0, 1.0) * 3.1415926);
  float edge = 1.0 - smoothstep(0.12, 0.88, tex.a);
  float burst = release * (0.04 + edge * 0.24);
  vec3 p = position;
  p.z += depth;
  p.x += sin(aPhase * 17.0 + uTime * 0.22) * burst + uPointer.x * depth * 0.14;
  p.y += cos(aPhase * 13.0 - uTime * 0.18) * burst * 0.72 + uPointer.y * depth * 0.08;
  p.z += sin(aPhase * 23.0 + uTime * 0.28) * burst * 0.42;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = density * (aSize + uEnergy * 1.25) * uPixelRatio * (10.5 / max(1.0, -mv.z));
  vColor = mix(tex.rgb * vec3(1.08, 1.02, 1.16), vec3(0.86, 0.7, 1.0), edge * 0.28 + max(depth, 0.0) * 0.32);
  vAlpha = density * (0.055 + uEnergy * 0.18) * (0.72 + edge * 0.55);
}`;

const depthFieldFragment = `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float distanceToCenter = length(gl_PointCoord - 0.5);
  float core = smoothstep(0.5, 0.08, distanceToCenter);
  float halo = smoothstep(0.5, 0.22, distanceToCenter) * 0.24;
  float alpha = (core + halo) * vAlpha;
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(vColor, alpha);
}`;

function makeDepthField(columns: number, rows: number, texture: THREE.Texture): {
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  points: THREE.Points;
} {
  const count = columns * rows;
  const positions = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const phases = new Float32Array(count);
  const sizes = new Float32Array(count);
  let index = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const u = columns > 1 ? column / (columns - 1) : 0.5;
      const v = rows > 1 ? row / (rows - 1) : 0.5;
      const phase = ((column * 73 + row * 151) % 997) / 997;
      positions[index * 3] = (u - 0.5) * 2.58;
      positions[index * 3 + 1] = (0.5 - v) * 3.87;
      positions[index * 3 + 2] = -0.2;
      uvs[index * 2] = u;
      uvs[index * 2 + 1] = 1.0 - v;
      phases[index] = phase;
      sizes[index] = 1.15 + phase * 2.1;
      index += 1;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aUv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  const material = new THREE.ShaderMaterial({
    vertexShader: depthFieldVertex,
    fragmentShader: depthFieldFragment,
    uniforms: {
      uMap: { value: texture }, uTime: { value: 0 }, uProgress: { value: 0 },
      uEnergy: { value: 0.3 }, uPixelRatio: { value: 1 }, uPointer: { value: new THREE.Vector2() }
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NormalBlending
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 1;
  return { geometry, material, points };
}
function makeParticles(count: number): { geometry: THREE.BufferGeometry; material: THREE.ShaderMaterial; points: THREE.Points } {
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const phases = new Float32Array(count);
  let seed = 1917;
  const random = (): number => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < count; i += 1) {
    const t = random();
    const angle = t * Math.PI * 9 + random() * 1.4;
    const radius = 0.24 + random() * 0.78;
    positions[i * 3] = Math.sin(angle) * radius * (0.5 + t * 0.4);
    positions[i * 3 + 1] = (t - 0.5) * 3.7;
    positions[i * 3 + 2] = Math.cos(angle) * radius * 0.55 - 0.04;
    scales[i] = random();
    phases[i] = random();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  const material = new THREE.ShaderMaterial({
    vertexShader: particleVertex,
    fragmentShader: particleFragment,
    uniforms: { uTime: { value: 0 }, uSpread: { value: 0 }, uEnergy: { value: 0.3 }, uPointer: { value: new THREE.Vector2() } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  return { geometry, material, points: new THREE.Points(geometry, material) };
}

function makeOrbit(rx: number, ry: number, opacity: number): { geometry: THREE.BufferGeometry; material: THREE.LineBasicMaterial; line: THREE.LineLoop } {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < 128; i += 1) {
    const angle = i / 128 * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * rx, Math.sin(angle) * ry, 0));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: 0xb996d9, transparent: true, opacity, depthWrite: false });
  return { geometry, material, line: new THREE.LineLoop(geometry, material) };
}

export function createScene(canvas: HTMLCanvasElement, options: SceneOptions): SceneRuntime {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !options.lowQuality, powerPreference: 'high-performance' });
  renderer.setClearColor(0x08060d, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x08060d, 0.12);
  const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 40);
  camera.position.set(0, 0, 5.65);
  const world = new THREE.Group();
  const subjectGroup = new THREE.Group();
  scene.add(world);
  world.add(subjectGroup);

  const placeholderTexture = new THREE.DataTexture(new Uint8Array([82, 47, 105, 255]), 1, 1, THREE.RGBAFormat);
  placeholderTexture.needsUpdate = true;
  const useDepthField = !options.lowQuality && !options.reducedMotion;
  const environmentGeometry = new THREE.PlaneGeometry(10.8, 8.6, options.lowQuality ? 1 : 18, options.lowQuality ? 1 : 10);
  const environmentMaterial = new THREE.ShaderMaterial({
    vertexShader: environmentVertex,
    fragmentShader: environmentFragment,
    uniforms: { uMap: { value: placeholderTexture }, uOpacity: { value: 0.26 } },
    transparent: true,
    depthWrite: false
  });
  const environment = new THREE.Mesh(environmentGeometry, environmentMaterial);
  environment.position.z = -0.92;
  world.add(environment);

  const subjectGeometry = new THREE.PlaneGeometry(2.58, 3.87, options.lowQuality ? 24 : 52, options.lowQuality ? 36 : 78);
  const subjectMaterial = new THREE.ShaderMaterial({
    vertexShader: subjectVertex,
    fragmentShader: subjectFragment,
    uniforms: {
      uMap: { value: placeholderTexture }, uTime: { value: 0 }, uOpacity: { value: 0.8 },
      uReveal: { value: 0.6 }, uDissolve: { value: 0 }, uDistortion: { value: 0.18 },
      uDepth: { value: useDepthField ? 0.62 : 0 }, uPointer: { value: new THREE.Vector2() }
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const subject = new THREE.Mesh(subjectGeometry, subjectMaterial);
  subject.position.z = -0.12;
  subject.renderOrder = 2;
  subjectGroup.add(subject);

  const fallbackGeometry = new THREE.IcosahedronGeometry(0.58, options.lowQuality ? 2 : 4);
  const fallbackMaterial = new THREE.MeshBasicMaterial({ color: 0x8f66b4, wireframe: true, transparent: true, opacity: 0.24 });
  const fallback = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
  subjectGroup.add(fallback);

  const depthField = makeDepthField(useDepthField ? 48 : 8, useDepthField ? 72 : 12, placeholderTexture);
  depthField.points.visible = false;
  subjectGroup.add(depthField.points);

  const makeVeil = (side: number): { mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>; geometry: THREE.PlaneGeometry; material: THREE.ShaderMaterial } => {
    const geometry = new THREE.PlaneGeometry(10.8, 8.6, options.lowQuality ? 16 : 38, options.lowQuality ? 30 : 72);
    const material = new THREE.ShaderMaterial({
      vertexShader: veilVertex,
      fragmentShader: veilFragment,
      uniforms: { uPhase: { value: side * 0.8 }, uMotion: { value: options.reducedMotion ? 0.1 : 1 }, uBloom: { value: 0.4 }, uEnergy: { value: 0.3 } },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = side * 0.27;
    mesh.position.z = 0.18;
    world.add(mesh);
    return { mesh, geometry, material };
  };
  const leftVeil = makeVeil(-1);
  const rightVeil = makeVeil(1);
  const particleSystem = makeParticles(options.lowQuality ? 360 : 980);
  particleSystem.points.position.z = 0.2;
  subjectGroup.add(particleSystem.points);
  const orbits = [makeOrbit(1.12, 1.52, 0.16), makeOrbit(1.48, 0.82, 0.1), makeOrbit(0.86, 1.82, 0.08)];
  orbits.forEach((orbit, index) => {
    orbit.line.position.z = -0.52 - index * 0.06;
    orbit.line.rotation.z = index * 0.74;
    subjectGroup.add(orbit.line);
  });

  const textureLoader = new THREE.TextureLoader();
  textureLoader.setCrossOrigin('anonymous');
  let environmentTexture: THREE.Texture | null = null;
  let subjectTexture: THREE.Texture | null = null;
  let disposed = false;
  textureLoader.load('/creative-assets/fashion-fluid-couture-v1.png', (texture) => {
    if (disposed) { texture.dispose(); return; }
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    environmentTexture = texture;
    environmentMaterial.uniforms.uMap.value = texture;
  }, undefined, () => { environment.visible = false; });
  textureLoader.load('/creative-assets/fashion-fluid-couture-cutout-v2.png', (texture) => {
    if (disposed) { texture.dispose(); return; }
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    subjectTexture = texture;
    subjectMaterial.uniforms.uMap.value = texture;
    depthField.material.uniforms.uMap.value = texture;
    depthField.points.visible = useDepthField;
    fallback.visible = false;
  }, undefined, () => { fallback.visible = true; });

  const pointerTarget = new THREE.Vector2();
  const pointer = new THREE.Vector2();
  let progressTarget = 0;
  let progress = 0;
  const resize = (width: number, height: number): void => {
    const safeWidth = Math.max(1, width || canvas.clientWidth || window.innerWidth);
    const safeHeight = Math.max(1, height || canvas.clientHeight || window.innerHeight);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, options.lowQuality ? 1 : 1.6);
    renderer.setPixelRatio(pixelRatio);
    depthField.material.uniforms.uPixelRatio.value = pixelRatio;
    renderer.setSize(safeWidth, safeHeight, false);
    camera.aspect = safeWidth / safeHeight;
    camera.fov = safeWidth < 720 ? 49 : safeWidth < 1024 ? 43 : 39;
    camera.updateProjectionMatrix();
    world.scale.setScalar(safeWidth < 720 ? 0.82 : safeWidth < 1024 ? 0.94 : 1);
  };
  resize(canvas.clientWidth, canvas.clientHeight);

  return {
    update(elapsed, delta) {
      const smoothing = options.reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, 0.05) * 5.8);
      pointer.lerp(pointerTarget, smoothing);
      progress += (progressTarget - progress) * smoothing;
      const state = options.director.sample(progress, pointer, elapsed);
      camera.position.lerp(state.camera, smoothing);
      camera.lookAt(state.target);
      subjectGroup.position.x += (state.subjectX - subjectGroup.position.x) * smoothing;
      subjectGroup.position.y += (state.subjectY - subjectGroup.position.y) * smoothing;
      const scale = subjectGroup.scale.x + (state.subjectScale - subjectGroup.scale.x) * smoothing;
      subjectGroup.scale.setScalar(scale);
      world.rotation.z += (state.worldRotation - world.rotation.z) * smoothing;
      subjectMaterial.uniforms.uTime.value = elapsed;
      subjectMaterial.uniforms.uOpacity.value = state.subjectOpacity;
      subjectMaterial.uniforms.uReveal.value = state.subjectReveal;
      subjectMaterial.uniforms.uDissolve.value = state.subjectDissolve;
      subjectMaterial.uniforms.uDistortion.value = state.distortion;
      subjectMaterial.uniforms.uPointer.value.copy(pointer);
      subjectMaterial.uniforms.uDepth.value = useDepthField ? 0.52 + state.bloom * 0.32 : 0;
      subject.rotation.y += ((useDepthField ? pointer.x * 0.12 : 0) - subject.rotation.y) * smoothing;
      subject.rotation.x += ((useDepthField ? -pointer.y * 0.07 : 0) - subject.rotation.x) * smoothing;
      depthField.material.uniforms.uTime.value = elapsed;
      depthField.material.uniforms.uProgress.value = progress;
      depthField.material.uniforms.uEnergy.value = 0.18 + state.threadEnergy * 0.82;
      depthField.material.uniforms.uPointer.value.copy(pointer);
      depthField.points.rotation.y += ((useDepthField ? pointer.x * 0.2 + progress * 0.08 : 0) - depthField.points.rotation.y) * smoothing;
      depthField.points.rotation.x += ((useDepthField ? -pointer.y * 0.1 : 0) - depthField.points.rotation.x) * smoothing;
      environmentMaterial.uniforms.uOpacity.value = 0.32 + state.bloom * 0.08;
      environment.rotation.z = world.rotation.z * -0.38;
      leftVeil.mesh.position.x = -2.15 - state.veilSpread * 0.25;
      rightVeil.mesh.position.x = 2.15 + state.veilSpread * 0.25;
      leftVeil.material.uniforms.uPhase.value = state.phase;
      rightVeil.material.uniforms.uPhase.value = state.phase + 1.9;
      leftVeil.material.uniforms.uBloom.value = state.bloom;
      rightVeil.material.uniforms.uBloom.value = state.bloom;
      leftVeil.material.uniforms.uEnergy.value = state.threadEnergy;
      rightVeil.material.uniforms.uEnergy.value = state.threadEnergy;
      particleSystem.material.uniforms.uTime.value = elapsed;
      particleSystem.material.uniforms.uSpread.value = state.particleSpread;
      particleSystem.material.uniforms.uEnergy.value = state.threadEnergy;
      particleSystem.material.uniforms.uPointer.value.copy(pointer);
      particleSystem.points.rotation.y = options.reducedMotion ? 0.12 : elapsed * 0.025 + progress * 0.46;
      orbits.forEach((orbit, index) => {
        orbit.line.rotation.z += options.reducedMotion ? 0 : (index % 2 ? -1 : 1) * delta * (0.025 + state.threadEnergy * 0.018);
        orbit.material.opacity = (0.055 + state.bloom * 0.1) * (1 - state.subjectDissolve * 0.34);
      });
      fallback.rotation.x = options.reducedMotion ? 0.3 : elapsed * 0.07;
      fallback.rotation.y = options.reducedMotion ? -0.2 : elapsed * 0.1;
      renderer.render(scene, camera);
    },
    resize,
    setPointer(x, y) { pointerTarget.set(THREE.MathUtils.clamp(x, -1, 1), THREE.MathUtils.clamp(y, -1, 1)); },
    setProgress(value) { progressTarget = THREE.MathUtils.clamp(value, 0, 1); },
    dispose() {
      disposed = true;
      environmentTexture?.dispose();
      subjectTexture?.dispose();
      placeholderTexture.dispose();
      environmentGeometry.dispose();
      environmentMaterial.dispose();
      subjectGeometry.dispose();
      subjectMaterial.dispose();
      depthField.geometry.dispose();
      depthField.material.dispose();
      fallbackGeometry.dispose();
      fallbackMaterial.dispose();
      leftVeil.geometry.dispose(); leftVeil.material.dispose();
      rightVeil.geometry.dispose(); rightVeil.material.dispose();
      particleSystem.geometry.dispose(); particleSystem.material.dispose();
      orbits.forEach((orbit) => { orbit.geometry.dispose(); orbit.material.dispose(); });
      scene.clear();
      renderer.renderLists.dispose();
      renderer.dispose();
    }
  };
}
