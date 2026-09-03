export type Direction = { enter:number; vineX:number; vineY:number; dewX:number; dewY:number; dewOpacity:number; glow:number };
const ease = (v:number):number => v * v * (3 - 2 * v);
export function direct(progress:number, pointer:{ x:number; y:number }, elapsed:number, humidity:number, manual:boolean, reduced:boolean): Direction {
  const enter = ease(Math.min(1, Math.max(0, (progress - .08) / .66)));
  const p = reduced ? 0 : Math.max(-1, Math.min(1, pointer.x));
  const humidityLevel = (humidity - 32) / 60;
  const breath = reduced || manual ? 0 : Math.sin(elapsed * .00035) * .012;
  return { enter, vineX: (1 - enter) * (p * 12 + 18), vineY: (1 - enter) * 8, dewX: (1 - enter) * (p * 34 - 24), dewY: (1 - enter) * -15, dewOpacity: .22 + humidityLevel * .68 + breath, glow: enter };
}
