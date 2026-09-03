export interface JourneyState { progress: number; phase: number; alignment: number; force: number; inspectX: number; pointer: { x: number; y: number }; elapsed: number; }
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => { const x = clamp((v - a) / (b - a)); return x * x * (3 - 2 * x); };

export function direct(progress: number, pointer: { x: number; y: number }, elapsed: number, reduced: boolean): JourneyState {
  const p = clamp(progress);
  const phase = p < .27 ? 0 : p < .58 ? 1 : p < .86 ? 2 : 3;
  return {
    progress: p,
    phase,
    alignment: reduced ? (phase > 0 ? 1 : 0) : smooth(.12, .68, p),
    force: reduced ? (phase > 1 ? 1 : 0) : smooth(.6, .77, p),
    inspectX: reduced ? 0 : pointer.x * 7 * smooth(.3, .72, p) * (1 - smooth(.8, .94, p)),
    pointer,
    elapsed
  };
}
