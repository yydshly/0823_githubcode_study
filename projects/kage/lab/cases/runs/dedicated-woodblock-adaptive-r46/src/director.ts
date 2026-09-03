import * as THREE from 'three';
import type { PrintScene } from './scene';

const target = new THREE.Vector3();
const ease = (value: number): number => {
  const x = THREE.MathUtils.clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
};
const windowPulse = (progress: number, center: number, width: number): number =>
  Math.max(0, 1 - Math.abs(progress - center) / width);

export function directScene(scene: PrintScene, progress: number, pointerX: number, pointerY: number, elapsed: number, reducedMotion: boolean): void {
  const p = THREE.MathUtils.clamp(progress, 0, 1);
  const relief = ease((p - .09) / .18);
  const indigo = ease((p - .32) / .22);
  const vermilion = ease((p - .62) / .18);
  scene.paperMaterial.uniforms.uRelief.value = relief;
  scene.paperMaterial.uniforms.uIndigo.value = indigo;
  scene.paperMaterial.uniforms.uVermilion.value = vermilion;
  scene.paperMaterial.uniforms.uTime.value = elapsed;
  scene.paperMaterial.uniforms.uPointer.value.set(pointerX, pointerY);

  const centers = [.2, .46, .72];
  for (let index = 0; index < scene.presses.length; index += 1) {
    const press = scene.presses[index];
    const pulse = windowPulse(p, centers[index], .115);
    press.position.y = .28 + (1 - ease(pulse)) * 2.2;
    press.material.opacity = pulse * .42;
    press.visible = pulse > .015 && !reducedMotion;
  }

  const settle = ease((p - .8) / .16);
  const processFocus = windowPulse(p, .5, .43);
  scene.paper.position.x = -.58 * processFocus;
  scene.paper.position.y = .18 - settle * .045;
  scene.paper.rotation.z = THREE.MathUtils.lerp(-.025, .012, settle);
  scene.shadow.material.opacity = .13 + settle * .1;
  scene.shadow.position.x = scene.paper.position.x;
  for (const press of scene.presses) press.position.x = scene.paper.position.x;

  const side = reducedMotion ? 0 : pointerX * .055;
  scene.camera.position.x = THREE.MathUtils.lerp(-.42, .18, ease(p)) + side;
  scene.camera.position.y = THREE.MathUtils.lerp(3.65, 4.05, settle);
  scene.camera.position.z = THREE.MathUtils.lerp(4.55, 4.05, settle) + pointerY * .03;
  target.set(THREE.MathUtils.lerp(.25, 0, settle), 0, 0);
  scene.camera.lookAt(target);
}
