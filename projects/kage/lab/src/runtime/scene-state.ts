import * as THREE from 'three';
import type { SceneStateConfig, StoryConfig } from '../config/schema';
import type { StorySegment } from './scroll-driver';

export interface SceneState extends Omit<SceneStateConfig, 'accent' | 'focus'> {
  accent: THREE.Color;
}

export function mixSceneState(story: StoryConfig, segment: StorySegment, reduced: boolean): SceneState {
  const index = reduced ? segment.active : segment.from;
  const from = story.chapters[index].sceneState;
  const to = reduced ? from : story.chapters[segment.to].sceneState;
  const t = reduced ? 0 : THREE.MathUtils.smoothstep(segment.t, 0, 1);
  return {
    assembly: THREE.MathUtils.lerp(from.assembly, to.assembly, t),
    energy: THREE.MathUtils.lerp(from.energy, to.energy, t),
    density: THREE.MathUtils.lerp(from.density, to.density, t),
    fog: THREE.MathUtils.lerp(from.fog, to.fog, t),
    accent: new THREE.Color(from.accent).lerp(new THREE.Color(to.accent), t)
  };
}
