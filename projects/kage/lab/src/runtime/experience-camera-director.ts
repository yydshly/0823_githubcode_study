import * as THREE from 'three';
import type { CameraShot, ExperienceManifest, Vec3 } from '../experience/schema';
import type { ExperienceSegment } from './experience-scroll-driver';
import { sampleTrackWindow } from './track-sampler';

export interface CameraPose {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  fov: number;
}

const scratchObject = new THREE.PerspectiveCamera();
const vector = (value: Vec3): THREE.Vector3 => new THREE.Vector3(value[0], value[1], value[2]);

function orientation(eye: THREE.Vector3, look: THREE.Vector3): THREE.Quaternion {
  scratchObject.position.copy(eye);
  scratchObject.up.set(0, 1, 0);
  scratchObject.lookAt(look);
  return scratchObject.quaternion.clone();
}

function values(shot: CameraShot, portrait: boolean): Pick<CameraShot, 'eye' | 'look' | 'fov'> {
  return portrait && shot.portrait ? shot.portrait : shot;
}

function mixShots(fromShot: CameraShot, toShot: CameraShot, t: number, portrait: boolean): CameraPose {
  const from = values(fromShot, portrait);
  const to = values(toShot, portrait);
  const fromEye = vector(from.eye);
  const toEye = vector(to.eye);
  return {
    position: fromEye.clone().lerp(toEye, t),
    quaternion: orientation(fromEye, vector(from.look)).slerp(orientation(toEye, vector(to.look)), t),
    fov: THREE.MathUtils.lerp(from.fov, to.fov, t)
  };
}

function nodeShot(experience: ExperienceManifest, nodeId: string, progress: number) {
  const trackId = experience.nodes[nodeId].tracks.camera;
  if (!trackId) throw new Error(`Node "${nodeId}" has no camera track.`);
  return sampleTrackWindow(experience.cameraTracks[trackId].keyframes, progress);
}

export function directExperienceCamera(experience: ExperienceManifest, segment: ExperienceSegment, portrait: boolean, reduced: boolean): CameraPose {
  if (reduced) {
    const current = nodeShot(experience, segment.activeId, 0);
    return mixShots(current.from, current.from, 0, portrait);
  }
  if (segment.fromId === segment.toId) {
    const current = nodeShot(experience, segment.fromId, segment.t);
    return mixShots(current.from, current.to, current.t, portrait);
  }
  const from = nodeShot(experience, segment.fromId, 1);
  const to = nodeShot(experience, segment.toId, 0);
  const transition = to.from.transition ?? from.to.transition ?? 'glide';
  const t = transition === 'cut' ? (segment.t < .5 ? 0 : 1) : THREE.MathUtils.smootherstep(segment.t, 0, 1);
  return mixShots(from.to, to.from, t, portrait);
}
