import * as THREE from 'three';
import type { ExperienceManifest, SceneStateValue } from '../experience/schema';
import type { ExperienceSegment } from './experience-scroll-driver';
import { sampleTrackWindow } from './track-sampler';

export interface SceneState extends Omit<SceneStateValue, 'accent'> {
  accent: THREE.Color;
}

function mix(from: SceneStateValue, to: SceneStateValue, t: number): SceneState {
  return {
    assembly: THREE.MathUtils.lerp(from.assembly, to.assembly, t),
    energy: THREE.MathUtils.lerp(from.energy, to.energy, t),
    density: THREE.MathUtils.lerp(from.density, to.density, t),
    fog: THREE.MathUtils.lerp(from.fog, to.fog, t),
    focus: t < .5 ? from.focus : to.focus,
    accent: new THREE.Color(from.accent).lerp(new THREE.Color(to.accent), t)
  };
}

function nodeState(experience: ExperienceManifest, nodeId: string, progress: number): SceneState {
  const trackId = experience.nodes[nodeId].tracks.scene;
  if (!trackId) throw new Error(`Node "${nodeId}" has no scene track.`);
  const window = sampleTrackWindow(experience.sceneTracks[trackId].keyframes, progress);
  return mix(window.from, window.to, window.t);
}

export function mixExperienceSceneState(experience: ExperienceManifest, segment: ExperienceSegment, reduced: boolean): SceneState {
  if (reduced) return nodeState(experience, segment.activeId, 0);
  if (segment.fromId === segment.toId) return nodeState(experience, segment.fromId, segment.t);
  const from = nodeState(experience, segment.fromId, 1);
  const to = nodeState(experience, segment.toId, 0);
  const t = THREE.MathUtils.smoothstep(segment.t, 0, 1);
  return {
    assembly: THREE.MathUtils.lerp(from.assembly, to.assembly, t),
    energy: THREE.MathUtils.lerp(from.energy, to.energy, t),
    density: THREE.MathUtils.lerp(from.density, to.density, t),
    fog: THREE.MathUtils.lerp(from.fog, to.fog, t),
    focus: t < .5 ? from.focus : to.focus,
    accent: from.accent.clone().lerp(to.accent, t)
  };
}
