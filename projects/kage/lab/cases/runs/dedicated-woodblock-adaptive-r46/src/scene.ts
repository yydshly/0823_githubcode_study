import * as THREE from 'three';

export interface PrintScene {
  renderer: THREE.WebGLRenderer;
  world: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  paper: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  paperMaterial: THREE.ShaderMaterial;
  presses: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[];
  shadow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  resize(width: number, height: number, dpr: number): void;
  dispose(): void;
}

const vertexShader = `
  varying vec2 vUv;
  varying float vRelief;
  uniform float uRelief;
  uniform float uTime;
  float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  void main(){
    vUv=uv;
    float fiber=(hash(floor(uv*vec2(90.0,58.0)))-.5)*.008;
    float wave=sin(uv.x*24.0+sin(uv.y*13.0))*uRelief*.012;
    vRelief=wave+fiber;
    vec3 p=position;
    p.z+=vRelief+sin(uv.x*3.14159)*sin(uv.y*3.14159)*.025;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
  }`;

const fragmentShader = `
  precision highp float;
  varying vec2 vUv;
  varying float vRelief;
  uniform sampler2D uArtwork;
  uniform float uIndigo;
  uniform float uVermilion;
  uniform float uRelief;
  uniform float uTime;
  uniform vec2 uPointer;
  float hash(vec2 p){ return fract(sin(dot(p,vec2(41.3,289.1)))*45758.5453); }
  void main(){
    vec2 uv=vUv;
    float grain=hash(floor(uv*vec2(260.0,170.0)))*.06;
    float longFiber=sin(uv.x*430.0+sin(uv.y*31.0))*sin(uv.y*260.0)*.018;
    vec3 paper=vec3(.965,.925,.82)+grain+longFiber;
    float deckle=smoothstep(.0,.025,min(min(uv.x,1.0-uv.x),min(uv.y,1.0-uv.y)));
    vec4 artwork=texture2D(uArtwork,uv);
    float artAlpha=smoothstep(.42,.86,artwork.a);
    float high=max(max(artwork.r,artwork.g),artwork.b);
    float low=min(min(artwork.r,artwork.g),artwork.b);
    float luminance=dot(artwork.rgb,vec3(.2126,.7152,.0722));
    float chromaInk=smoothstep(.025,.12,high-low);
    float darkInk=1.0-smoothstep(.48,.82,luminance);
    float inkMask=max(chromaInk,darkInk)*artAlpha;
    float redClass=smoothstep(.015,.11,artwork.r-artwork.b);
    float redMask=inkMask*redClass;
    float blueMask=inkMask*(1.0-redClass);
    float neutralMask=clamp(artAlpha-inkMask,0.0,1.0);
    vec3 color=mix(paper,artwork.rgb,neutralMask*.9);
    float blueSweep=(1.0-smoothstep(uIndigo*1.2-.14,uIndigo*1.2+.14,uv.x))*uIndigo;
    float redSweep=smoothstep(1.12-uVermilion*1.28,1.32-uVermilion*1.28,uv.x)*uVermilion;
    color=mix(color,artwork.rgb,clamp(blueMask*blueSweep+redMask*redSweep,0.0,1.0));
    float sheen=max(0.0,1.0-distance(uv,uPointer*.12+vec2(.5))*.9)*.025;
    color+=sheen+uRelief*vRelief*1.3;
    float printState=max(uIndigo,uVermilion);
    gl_FragColor=vec4(color,mix(deckle,artAlpha,printState));
  }`;

function createWoodTexture(): THREE.CanvasTexture {
  const canvas=document.createElement('canvas');
  canvas.width=512;
  canvas.height=512;
  const context=canvas.getContext('2d');
  if(!context) return new THREE.CanvasTexture(canvas);
  const gradient=context.createLinearGradient(0,0,512,512);
  gradient.addColorStop(0,'#b8753e');
  gradient.addColorStop(.48,'#d49a5e');
  gradient.addColorStop(1,'#a96537');
  context.fillStyle=gradient;
  context.fillRect(0,0,512,512);
  for(let index=0;index<42;index+=1){
    const y=index*13+Math.sin(index*1.7)*7;
    context.beginPath();
    context.moveTo(0,y);
    for(let x=0;x<=512;x+=24) context.lineTo(x,y+Math.sin(x*.035+index)*4);
    context.strokeStyle=index%5===0?'rgba(88,43,20,.16)':'rgba(255,231,184,.09)';
    context.lineWidth=index%5===0?2:1;
    context.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(2.6,1.8);
  return texture;
}

export function createScene(canvas: HTMLCanvasElement, width: number, height: number, dpr: number, lowQuality: boolean): PrintScene {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !lowQuality, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(dpr, lowQuality ? 1.25 : 2));
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !lowQuality;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const world = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, width / Math.max(height, 1), .1, 30);
  camera.position.set(0, 3.8, 4.4);
  camera.lookAt(0, 0, 0);

  const tableTexture=createWoodTexture();
  tableTexture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const tableMaterial = new THREE.MeshStandardMaterial({ color: 0xc58a52, map: tableTexture, roughness: .82, metalness: 0 });
  const table = new THREE.Mesh(new THREE.PlaneGeometry(20, 14), tableMaterial);
  table.rotation.x = -Math.PI / 2;
  table.position.y = -.14;
  world.add(table);

  const artwork=new THREE.TextureLoader().load('/creative-assets/r31-woodblock/washi-final-print-v1.png');
  artwork.colorSpace=THREE.SRGBColorSpace;
  artwork.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const paperMaterial = new THREE.ShaderMaterial({
    vertexShader, fragmentShader, transparent: true, side: THREE.DoubleSide,
    uniforms: {
      uArtwork: { value: artwork }, uIndigo: { value: 0 }, uVermilion: { value: 0 }, uRelief: { value: 0 },
      uTime: { value: 0 }, uPointer: { value: new THREE.Vector2() }
    }
  });
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(3.55, 2.36, lowQuality ? 32 : 72, lowQuality ? 22 : 48), paperMaterial);
  paper.rotation.x = -Math.PI / 2;
  paper.position.y = .18;
  paper.castShadow = !lowQuality;
  world.add(paper);

  const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x56351f, transparent: true, opacity: .16, depthWrite: false });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 2.5), shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -.125;
  world.add(shadow);

  const pressGeometry = new THREE.BoxGeometry(3.35, .09, 2.16);
  const pressColors = [0x9b6339, 0x315979, 0xa84532];
  const presses = pressColors.map((color, index) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness: .86, transparent: true, opacity: 0 });
    const mesh = new THREE.Mesh(pressGeometry, material);
    mesh.position.set(0, 2.6 + index * .18, 0);
    mesh.castShadow = !lowQuality;
    world.add(mesh);
    return mesh;
  });

  world.add(new THREE.HemisphereLight(0xfff5db, 0x8b5735, 2.1));
  const sun = new THREE.DirectionalLight(0xffe3b0, 3.2);
  sun.position.set(-3, 6, 4);
  sun.castShadow = !lowQuality;
  world.add(sun);

  const resize = (nextWidth: number, nextHeight: number, nextDpr: number): void => {
    camera.aspect = nextWidth / Math.max(nextHeight, 1);
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(nextDpr, lowQuality ? 1.25 : 2));
    renderer.setSize(nextWidth, nextHeight, false);
  };
  const dispose = (): void => {
    paper.geometry.dispose();
    paperMaterial.dispose();
    shadow.geometry.dispose();
    shadowMaterial.dispose();
    pressGeometry.dispose();
    for (const press of presses) press.material.dispose();
    table.geometry.dispose();
    tableMaterial.dispose();
    tableTexture.dispose();
    artwork.dispose();
    renderer.dispose();
  };
  return { renderer, world, camera, paper, paperMaterial, presses, shadow, resize, dispose };
}
