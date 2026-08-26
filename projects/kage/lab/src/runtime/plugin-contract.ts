import * as THREE from 'three';
import type { SceneDefinition, ThemeTokens } from '../experience/schema';
import type { EffectiveQuality } from './quality';
import type { SceneState } from './experience-scene-state';
import type { MotionPointer } from './experience-motion';

export interface PluginContext {
  scene: THREE.Scene;
  root: THREE.Group;
  theme: ThemeTokens;
  definition: SceneDefinition;
  invalidate: () => void;
}

export interface RuntimeFrame {
  state: SceneState;
  elapsed: number;
  pointer: MotionPointer;
}

export interface PluginSnapshot {
  id: string;
  metrics: Readonly<Record<string, number | string>>;
}

export interface EffectPlugin {
  readonly id: string;
  initialize(context: PluginContext): void;
  update(frame: RuntimeFrame): void;
  setQuality(quality: EffectiveQuality): void;
  snapshot(): PluginSnapshot;
  dispose(): void;
}

export interface ScenePlugin {
  readonly id: string;
  initialize(context: PluginContext): void;
  update(frame: RuntimeFrame): void;
  setQuality(quality: EffectiveQuality): void;
  snapshot(): PluginSnapshot;
  dispose(): void;
}

export type ScenePluginFactory = () => ScenePlugin;
export type EffectPluginFactory = () => EffectPlugin;
