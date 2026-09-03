import * as THREE from 'three';
import type { Direction } from './director';

type Viewport = { width:number; height:number; dpr:number };
export type GreenhouseScene = { render:(state:Direction, viewport:Viewport, delta:number)=>void; resize:(viewport:Viewport)=>void; dispose:()=>void };

export function createGreenhouseScene(canvas: HTMLCanvasElement, viewport: Viewport, quality: string, reducedMotion: boolean): GreenhouseScene {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha:true, antialias:quality !== 'low' });
  const scene = new THREE.Scene();
  const background = new THREE.Color('#f3efe1'); scene.background = background;
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const material = new THREE.ShaderMaterial({ transparent:true, depthWrite:false, uniforms:{ uEnter:{value:0}, uTime:{value:0}, uHumidity:{value:.45} }, vertexShader:'void main(){gl_Position=vec4(position,1.);}', fragmentShader:'uniform float uEnter,uTime,uHumidity; void main(){vec2 p=gl_FragCoord.xy/vec2(1800.,1000.); float sun=exp(-18.*dot(p-vec2(.77,.72),p-vec2(.77,.72))); float mist=(1.-uEnter)*.15+uHumidity*.035; gl_FragColor=vec4(vec3(.97,.76,.43)*sun+vec3(.78,.91,.72)*mist, .14+sun*.22);}' });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2,2), material); scene.add(mesh);
  function resize(v:Viewport):void { renderer.setPixelRatio(v.dpr); renderer.setSize(v.width, v.height, false); }
  resize(viewport);
  return { render(state, v, delta) { material.uniforms.uEnter.value = state.enter; material.uniforms.uHumidity.value = Math.min(1, Math.max(0, state.dewOpacity)); if (!reducedMotion) material.uniforms.uTime.value += delta; background.set('#f3efe1'); renderer.render(scene, camera); }, resize, dispose() { mesh.geometry.dispose(); material.dispose(); renderer.dispose(); } };
}
