import type { EffectPluginFactory, ScenePluginFactory } from './plugin-contract';

export class PluginRegistry {
  private readonly scenes = new Map<string, ScenePluginFactory>();
  private readonly effects = new Map<string, EffectPluginFactory>();

  registerScene(id: string, factory: ScenePluginFactory): this {
    if (this.scenes.has(id)) throw new Error(`Scene plugin "${id}" is already registered.`);
    this.scenes.set(id, factory);
    return this;
  }

  registerEffect(id: string, factory: EffectPluginFactory): this {
    if (this.effects.has(id)) throw new Error(`Effect plugin "${id}" is already registered.`);
    this.effects.set(id, factory);
    return this;
  }

  createScene(id: string) {
    const factory = this.scenes.get(id);
    if (!factory) throw new Error(`Unknown scene plugin "${id}".`);
    return factory();
  }

  createEffect(id: string) {
    const factory = this.effects.get(id);
    if (!factory) throw new Error(`Unknown effect plugin "${id}".`);
    return factory();
  }

  snapshot(): { scenes: string[]; effects: string[] } {
    return { scenes: [...this.scenes.keys()], effects: [...this.effects.keys()] };
  }
}
