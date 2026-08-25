import * as THREE from 'three';
import { U, setRender } from '../upstream/src/part.js';
import { setDepthRank } from '../upstream/src/rig.js';
import { createAnimator } from '../upstream/src/anim.js';
import { buildContentCharacter } from '../runtime/visual-pipeline.js';
import { createActorState } from './state-hooks.js';

export const SCENE_ADAPTER_SCHEMA = 'kindergrimm-scene-adapter/0.1';

const nextFrame = () => typeof requestAnimationFrame === 'function'
  ? new Promise(resolve => requestAnimationFrame(resolve))
  : Promise.resolve();

export function createSceneAdapter(options = {}) {
  const scene = options.scene ?? null;
  const actors = [];
  let lastNow = 0;

  function dispose() {
    for (const actor of actors) {
      scene?.remove(actor.holder);
      actor.face.dispose();
    }
    actors.length = 0;
  }

  async function mount(items, pack, mountOptions = {}) {
    dispose();
    if (!scene) return [];
    setRender({ u: mountOptions.resolution ?? 92, frames: mountOptions.frames ?? 2 });
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const face = buildContentCharacter(item.recipe, pack);
      const holder = new THREE.Group();
      holder.add(face.group);
      scene.add(holder);
      const animatorOptions = typeof mountOptions.animatorOptions === 'function'
        ? mountOptions.animatorOptions(item, index)
        : (mountOptions.animatorOptions ?? {});
      const actor = {
        item, face, holder,
        animator: createAnimator(() => face, animatorOptions),
        state: createActorState('idle', { context: { assetFingerprint: item.fingerprint } }),
        layout: null
      };
      actors.push(actor);
      mountOptions.onProgress?.(index + 1, items.length, actor);
      if (index % (mountOptions.yieldEvery ?? 2) === (mountOptions.yieldEvery ?? 2) - 1) await nextFrame();
    }
    return actors;
  }

  function applyLayouts(layouts) {
    actors.forEach((actor, index) => {
      const layout = layouts[index];
      if (!layout) return;
      const value = Array.isArray(layout)
        ? { x: layout[0], y: layout[1], scale: layout[2], pose: layout[3] }
        : layout;
      actor.layout = { ...value };
      actor.holder.scale.setScalar(value.scale);
      actor.holder.position.set(value.x, value.y + (actor.face.F.B.floorY / U) * value.scale, 0);
      actor.animator.setPose(value.pose);
    });
    [...actors].sort((a, b) => b.layout.y - a.layout.y).forEach((actor, rank) => setDepthRank(actor.face, rank));
    return actors;
  }

  function update(now, options = {}) {
    const dt = Math.min(.05, Math.max(0, lastNow ? (now - lastNow) / 1000 : 0));
    lastNow = now;
    if (!options.paused && !options.reducedMotion) for (const actor of actors) actor.animator.update(now / 1000, dt);
    return dt;
  }

  function trigger(index, pose, runtimeState = 'selected') {
    const actor = actors[index];
    if (!actor) return false;
    actor.animator.setPose(pose);
    actor.state.transition(runtimeState, { pose });
    return true;
  }

  function snapshot() {
    return {
      schemaVersion: SCENE_ADAPTER_SCHEMA,
      actors: actors.length,
      assetFingerprints: actors.map(actor => actor.item.fingerprint),
      visualFingerprints: actors.map(actor => actor.item.visual?.fingerprint ?? null),
      visiblePlanes: actors.reduce((sum, actor) => sum + actor.face.entries.length, 0),
      authoredPlanes: actors.reduce((sum, actor) => sum + actor.face.entries.filter(entry => entry.authoredBy).length, 0),
      upstreamVisiblePlanes: actors.reduce((sum, actor) => sum + (actor.face.rendererAudit?.upstreamVisiblePartPlanes ?? actor.face.entries.filter(entry => !entry.authoredBy).length), 0),
      actorStates: actors.map(actor => actor.state.snapshot())
    };
  }

  return { mount, applyLayouts, update, trigger, dispose, actors: () => actors, snapshot };
}
