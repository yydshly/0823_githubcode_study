import * as THREE from 'three';
import type { StoryConfig, Vec3 } from '../config/schema';
import type { StorySegment } from './scroll-driver';

export interface CameraPose {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  fov: number;
}

const scratchObject = new THREE.PerspectiveCamera();

function smootherstep(value: number): number {
  const t = Math.min(1, Math.max(0, value));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function vector(value: Vec3): THREE.Vector3 {
  return new THREE.Vector3(value[0], value[1], value[2]);
}

function hermite(
  start: THREE.Vector3,
  end: THREE.Vector3,
  before: THREE.Vector3,
  after: THREE.Vector3,
  t: number
): THREE.Vector3 {
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  const tangentStart = end.clone().sub(before).multiplyScalar(0.48);
  const tangentEnd = after.clone().sub(start).multiplyScalar(0.48);
  return start.clone().multiplyScalar(h00)
    .add(tangentStart.multiplyScalar(h10))
    .add(end.clone().multiplyScalar(h01))
    .add(tangentEnd.multiplyScalar(h11));
}

function orientation(eye: THREE.Vector3, look: THREE.Vector3): THREE.Quaternion {
  scratchObject.position.copy(eye);
  scratchObject.up.set(0, 1, 0);
  scratchObject.lookAt(look);
  return scratchObject.quaternion.clone();
}

function shotValues(story: StoryConfig, index: number, portrait: boolean): { eye: Vec3; look: Vec3; fov: number } {
  const shot = story.chapters[Math.min(story.chapters.length - 1, Math.max(0, index))].shot;
  return portrait && shot.portrait ? shot.portrait : shot;
}

export function directCamera(story: StoryConfig, segment: StorySegment, portrait: boolean, reduced: boolean): CameraPose {
  if (reduced || story.chapters[segment.to].shot.transition === 'cut') {
    const selected = reduced ? segment.active : (segment.t < 0.5 ? segment.from : segment.to);
    const shot = shotValues(story, selected, portrait);
    const position = vector(shot.eye);
    return { position, quaternion: orientation(position, vector(shot.look)), fov: shot.fov };
  }

  const from = shotValues(story, segment.from, portrait);
  const to = shotValues(story, segment.to, portrait);
  const before = shotValues(story, segment.from - 1, portrait);
  const after = shotValues(story, segment.to + 1, portrait);
  const eased = smootherstep(segment.t);
  const startEye = vector(from.eye);
  const endEye = vector(to.eye);
  const position = hermite(startEye, endEye, vector(before.eye), vector(after.eye), eased);
  const startQuaternion = orientation(startEye, vector(from.look));
  const endQuaternion = orientation(endEye, vector(to.look));
  const quaternion = startQuaternion.slerp(endQuaternion, eased);
  return { position, quaternion, fov: THREE.MathUtils.lerp(from.fov, to.fov, eased) };
}
