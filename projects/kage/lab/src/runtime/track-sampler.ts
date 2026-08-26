import type { TrackKeyframe } from '../experience/schema';

export interface TrackWindow<T> {
  from: T;
  to: T;
  t: number;
}

const clamp = (value: number): number => Math.min(1, Math.max(0, value));

export function sampleTrackWindow<T>(keyframes: readonly TrackKeyframe<T>[], progress: number): TrackWindow<T> {
  if (keyframes.length === 0) throw new Error('Cannot sample an empty track.');
  const p = clamp(progress);
  let from = keyframes[0];
  let to = keyframes[0];
  for (let index = 1; index < keyframes.length; index += 1) {
    to = keyframes[index];
    if (p <= to.at) break;
    from = to;
  }
  const span = Math.max(Number.EPSILON, to.at - from.at);
  let t = from === to ? 0 : clamp((p - from.at) / span);
  const easing = to.easing ?? from.easing ?? 'linear';
  if (easing === 'smoothstep') t = t * t * (3 - 2 * t);
  if (easing === 'smootherstep') t = t * t * t * (t * (t * 6 - 15) + 10);
  return { from: from.value, to: to.value, t };
}
