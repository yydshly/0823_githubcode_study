import * as THREE from 'three';
import type { EffectPlugin, PluginContext, RuntimeFrame, ScenePlugin } from '../runtime/plugin-contract';
import type { PluginRegistry } from '../runtime/plugin-registry';
import type { EffectiveQuality } from '../runtime/quality';

export class SignalWorldPlugin implements ScenePlugin {
  readonly id = 'signal-world';
  private readonly effects: EffectPlugin[] = [];
  private scene!: THREE.Scene;

  constructor(private readonly registry: PluginRegistry) {}

  initialize(context: PluginContext): void {
    this.scene = context.scene;
    this.scene.background = new THREE.Color(context.theme.deep);
    this.scene.fog = new THREE.FogExp2(context.theme.deep, .045);
    const hemi = new THREE.HemisphereLight(context.theme.text, context.theme.deep, 1.4);
    const key = new THREE.DirectionalLight(context.theme.accentSoft, 3.1);
    key.position.set(5, 9, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    context.root.add(hemi, key);
    for (const id of context.definition.effectPlugins ?? []) {
      const effect = this.registry.createEffect(id);
      effect.initialize(context);
      this.effects.push(effect);
    }
  }

  update(frame: RuntimeFrame): void {
    this.effects.forEach((effect) => effect.update(frame));
    if (this.scene.fog instanceof THREE.FogExp2) this.scene.fog.density = .012 + frame.state.fog * .055;
  }

  setQuality(quality: EffectiveQuality): void {
    this.effects.forEach((effect) => effect.setQuality(quality));
  }

  snapshot() {
    const metrics: Record<string, number | string> = { effects: this.effects.length };
    for (const effect of this.effects) for (const [key, value] of Object.entries(effect.snapshot().metrics)) metrics[`${effect.id}.${key}`] = value;
    return { id: this.id, metrics };
  }

  dispose(): void {
    this.effects.forEach((effect) => effect.dispose());
    this.effects.length = 0;
  }
}
