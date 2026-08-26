import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { ExperienceManifest } from '../experience/schema';
import { ChromaticTidePlugin } from '../plugins/chromatic-tide-plugin';
import { ComposedWorldPlugin } from '../plugins/composed-world-plugin';
import { ResonanceFlagshipPlugin } from '../plugins/resonance-flagship-plugin';
import { TidalArchivePlugin } from '../plugins/tidal-archive-plugin';
import { SignalFieldEffect } from '../plugins/signal-field-effect';
import { SignalWorldPlugin } from '../plugins/signal-world-plugin';
import type { CameraPose } from './experience-camera-director';
import { dampingFactor, type MotionPointer } from './experience-motion';
import type { SceneState } from './experience-scene-state';
import type { ScenePlugin } from './plugin-contract';
import { PluginRegistry } from './plugin-registry';
import type { EffectiveQuality } from './quality';
import { qualityProfiles } from './quality';

export interface RuntimeSnapshot {
  lifecycle: 'running' | 'context-lost';
  framesRendered: number;
  drawCalls: number;
  triangles: number;
  points: number;
  dpr: number;
  quality: EffectiveQuality;
  postprocessing: 'bloom' | 'none';
  scenePlugin: ReturnType<ScenePlugin['snapshot']>;
  registry: ReturnType<PluginRegistry['snapshot']>;
  motion: { pointerX: number; pointerY: number; pointerActivity: number; scrollVelocity: number };
}

export class ExperienceRuntime {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(45, 1, .1, 120);
  private readonly root = new THREE.Group();
  private readonly registry = new PluginRegistry();
  private readonly scenePlugin: ScenePlugin;
  private readonly composer: EffectComposer | null;
  private readonly bloomPass: UnrealBloomPass | null;
  private postprocessingActive = false;
  private lifecycle: RuntimeSnapshot['lifecycle'] = 'running';
  private quality: EffectiveQuality;
  private framesRendered = 0;
  private readonly targetCameraPosition = new THREE.Vector3();
  private readonly targetCameraQuaternion = new THREE.Quaternion();
  private readonly pointerQuaternion = new THREE.Quaternion();
  private readonly pointerEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly cameraRight = new THREE.Vector3();
  private readonly cameraUp = new THREE.Vector3();
  private cameraInitialized = false;
  private lastPointer: MotionPointer = { x: 0, y: 0, velocityX: 0, velocityY: 0, activity: 0 };
  private lastScrollVelocity = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    experience: ExperienceManifest,
    quality: EffectiveQuality,
    private readonly onContextLost: () => void,
    private readonly onContextRestored: () => void,
    private readonly onInvalidate: () => void
  ) {
    this.quality = quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: quality !== 'low', powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene.add(this.root);
    this.registry.registerEffect('signal-field', () => new SignalFieldEffect());
    this.registry.registerScene('signal-world', () => new SignalWorldPlugin(this.registry));
    this.registry.registerScene('chromatic-tide', () => new ChromaticTidePlugin());
    this.registry.registerScene('composed-world', () => new ComposedWorldPlugin());
    this.registry.registerScene('resonance-flagship', () => new ResonanceFlagshipPlugin());
    this.registry.registerScene('tidal-archive', () => new TidalArchivePlugin());
    const definition = experience.scenes.main ?? Object.values(experience.scenes)[0];
    if (!definition) throw new Error(`Experience "${experience.id}" has no scene definition.`);
    this.scenePlugin = this.registry.createScene(definition.plugin);
    this.scenePlugin.initialize({ scene: this.scene, root: this.root, theme: experience.theme, definition, invalidate: this.onInvalidate });
    if (definition.postprocess?.type === 'bloom') {
      const composer = new EffectComposer(this.renderer);
      const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), definition.postprocess.strength, definition.postprocess.radius, definition.postprocess.threshold);
      composer.addPass(new RenderPass(this.scene, this.camera));
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
      this.composer = composer;
      this.bloomPass = bloom;
    } else {
      this.composer = null;
      this.bloomPass = null;
    }
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost, false);
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored, false);
    this.setQuality(quality);
    this.resize();
  }

  setQuality(quality: EffectiveQuality): void {
    this.quality = quality;
    const profile = qualityProfiles[quality];
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, profile.dprCap));
    this.renderer.shadowMap.enabled = profile.shadows;
    this.scenePlugin.setQuality(quality);
    this.postprocessingActive = this.composer !== null && quality !== 'low';
    if (this.composer) {
      this.composer.setPixelRatio(Math.min(devicePixelRatio, profile.dprCap));
      if (this.bloomPass) {
        const base = this.scenePlugin.id === 'resonance-flagship' ? .52 : .4;
        this.bloomPass.strength = quality === 'high' ? base : base * .72;
      }
    }
    this.resize();
  }

  resize(): void {
    const width = Math.max(1, innerWidth); const height = Math.max(1, innerHeight);
    this.renderer.setSize(width, height, false);
    this.composer?.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  render(pose: CameraPose, state: SceneState, elapsed: number, pointer: MotionPointer, deltaMs = 16.67, scrollVelocity = 0): void {
    if (this.lifecycle !== 'running') return;
    this.scenePlugin.update({ state, elapsed, pointer });
    this.cameraRight.set(1, 0, 0).applyQuaternion(pose.quaternion);
    this.cameraUp.set(0, 1, 0).applyQuaternion(pose.quaternion);
    this.targetCameraPosition.copy(pose.position)
      .addScaledVector(this.cameraRight, pointer.x * .105)
      .addScaledVector(this.cameraUp, pointer.y * .06);
    this.pointerEuler.set(-pointer.y * .006, pointer.x * .009, -pointer.velocityX * .00045, 'YXZ');
    this.pointerQuaternion.setFromEuler(this.pointerEuler);
    this.targetCameraQuaternion.copy(pose.quaternion).multiply(this.pointerQuaternion);
    const follow = dampingFactor(11, deltaMs);
    if (!this.cameraInitialized) {
      this.camera.position.copy(this.targetCameraPosition);
      this.camera.quaternion.copy(this.targetCameraQuaternion);
      this.camera.fov = pose.fov;
      this.cameraInitialized = true;
    } else {
      this.camera.position.lerp(this.targetCameraPosition, follow);
      this.camera.quaternion.slerp(this.targetCameraQuaternion, follow);
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, pose.fov, follow);
    }
    this.camera.updateProjectionMatrix();
    this.lastPointer = pointer;
    this.lastScrollVelocity = scrollVelocity;
    if (this.postprocessingActive) this.composer!.render(); else this.renderer.render(this.scene, this.camera);
    this.framesRendered += 1;
  }

  snapshot(): RuntimeSnapshot {
    return { lifecycle: this.lifecycle, framesRendered: this.framesRendered, drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, points: this.renderer.info.render.points, dpr: this.renderer.getPixelRatio(), quality: this.quality, postprocessing: this.postprocessingActive ? 'bloom' : 'none', scenePlugin: this.scenePlugin.snapshot(), registry: this.registry.snapshot(), motion: { pointerX: this.lastPointer.x, pointerY: this.lastPointer.y, pointerActivity: this.lastPointer.activity, scrollVelocity: this.lastScrollVelocity } };
  }

  dispose(): void {
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    this.scenePlugin.dispose();
    this.composer?.dispose();
    this.renderer.dispose();
  }

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault(); this.lifecycle = 'context-lost'; this.onContextLost();
  };
  private readonly handleContextRestored = (): void => {
    this.lifecycle = 'running'; this.onContextRestored();
  };
}
