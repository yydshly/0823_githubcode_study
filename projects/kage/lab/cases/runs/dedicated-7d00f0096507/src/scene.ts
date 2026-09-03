import * as THREE from 'three';
import type { DirectedState } from './director';

type RectSpec = [x: number, y: number, width: number, height: number];
type ItemSpec = [x: number, y: number, rotation?: number];

interface FloorLayout {
  zones: RectSpec[];
  walls: RectSpec[];
  tables: ItemSpec[];
  shelves: ItemSpec[];
  path: Array<[number, number]>;
  windowSide: 'north' | 'east' | 'south';
}

interface PlanZone {
  slab: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  outline: THREE.LineLoop<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  center: THREE.Vector2;
}

interface FloorVisual {
  group: THREE.Group;
  zones: PlanZone[];
}

export interface LibraryScene {
  update(state: DirectedState): void;
  resize(width: number, height: number, dpr: number): void;
  setContext(floor: number, timeIndex: number, zoneIndex: number): void;
  dispose(): void;
}

const PAPER = 0xf2eddf;
const INK = 0x40545e;
const MUTED = 0xaab3ae;
const AMBER = 0xd59434;

const layouts: FloorLayout[] = [
  {
    zones: [[-2.15, 1.15, 2.15, 1.5], [0.55, 1.03, 2.65, 1.72], [-0.62, -0.72, 2.05, 1.35], [2.08, -0.72, 1.96, 1.35]],
    walls: [[-0.82, 1.08, 0.08, 1.88], [1.9, 1.1, 0.08, 1.75], [-2.25, 0.17, 2.2, 0.08], [1.58, 0.12, 3.5, 0.08], [0.42, -1.48, 0.08, 1.2]],
    tables: [[-2.35, 1.2], [-1.75, 1.2], [0.1, 1.18], [0.78, 1.18], [1.46, 1.18], [1.48, -0.62], [2.12, -0.62], [2.76, -0.62]],
    shelves: [[-2.6, -1.38, 0], [-1.85, -1.38, 0], [-1.1, -1.38, 0]],
    path: [[-3.05, -1.7], [-1.15, -0.65], [0.45, -0.25], [2.95, 0.45]],
    windowSide: 'east',
  },
  {
    zones: [[-2.05, 1.28, 2.45, 1.22], [0.25, 1.16, 1.7, 1.46], [-0.55, -0.65, 2.35, 1.55], [2.0, -0.57, 2.05, 2.18]],
    walls: [[-0.7, 1.28, 0.08, 1.55], [1.18, 1.28, 0.08, 1.55], [-2.05, 0.48, 2.5, 0.08], [1.98, 0.56, 2.15, 0.08], [0.68, -1.36, 0.08, 1.25]],
    tables: [[1.42, 0.05], [2.06, 0.05], [2.7, 0.05], [1.42, -0.72], [2.06, -0.72], [2.7, -0.72], [-0.95, -0.74], [-0.28, -0.74]],
    shelves: [[-2.72, 1.6, 0], [-2.02, 1.6, 0], [-1.32, 1.6, 0], [-2.72, 1.0, 0], [-2.02, 1.0, 0], [-1.32, 1.0, 0]],
    path: [[-3.08, -1.72], [-1.4, -0.18], [0.45, 0.15], [3.05, 1.65]],
    windowSide: 'east',
  },
  {
    zones: [[-2.18, 0.92, 2.28, 2.38], [0.56, 1.28, 2.35, 1.22], [-0.4, -0.78, 1.78, 1.38], [2.08, -0.62, 1.92, 2.18]],
    walls: [[-0.82, 0.88, 0.08, 2.45], [1.78, 1.18, 0.08, 1.62], [-2.15, -0.38, 2.3, 0.08], [1.85, 0.43, 2.2, 0.08], [0.58, -1.45, 0.08, 1.05]],
    tables: [[0.02, 1.32], [0.72, 1.32], [1.42, 1.32], [1.54, -0.48], [2.18, -0.48], [2.82, -0.48], [1.54, -1.05], [2.18, -1.05], [2.82, -1.05]],
    shelves: [[-2.75, 1.45, 0], [-2.05, 1.45, 0], [-1.35, 1.45, 0], [-2.75, 0.82, 0], [-2.05, 0.82, 0], [-1.35, 0.82, 0], [-2.75, 0.2, 0], [-2.05, 0.2, 0], [-1.35, 0.2, 0]],
    path: [[-3.08, -1.72], [-1.2, -0.65], [0.62, -0.15], [3.02, 1.58]],
    windowSide: 'north',
  },
];

function rectangleLine(width: number, height: number, color: number, opacity: number): THREE.LineLoop<THREE.BufferGeometry, THREE.LineBasicMaterial> {
  const points = [
    new THREE.Vector3(-width / 2, -height / 2, 0),
    new THREE.Vector3(width / 2, -height / 2, 0),
    new THREE.Vector3(width / 2, height / 2, 0),
    new THREE.Vector3(-width / 2, height / 2, 0),
  ];
  return new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
  );
}

function addRect(group: THREE.Group, spec: RectSpec, color: number, opacity = 1, z = 0.03): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  const [x, y, width, height] = spec;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }),
  );
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

function addTable(group: THREE.Group, [x, y, rotation = 0]: ItemSpec): void {
  const table = addRect(group, [x, y, 0.52, 0.19], 0x8e9b97, 0.72, 0.1);
  table.rotation.z = rotation;
  [-0.3, 0.3].forEach((offset) => {
    const seat = new THREE.Mesh(
      new THREE.CircleGeometry(0.065, 16),
      new THREE.MeshBasicMaterial({ color: 0x667981, transparent: true, opacity: 0.62 }),
    );
    seat.position.set(x, y + offset, 0.105);
    group.add(seat);
  });
}

function addShelf(group: THREE.Group, [x, y, rotation = 0]: ItemSpec): void {
  const shelf = addRect(group, [x, y, 0.48, 0.17], 0x596c73, 0.72, 0.1);
  shelf.rotation.z = rotation;
  for (let index = -1; index <= 1; index += 1) {
    const mark = addRect(group, [x + index * 0.13, y, 0.025, 0.15], 0xf2eddf, 0.62, 0.11);
    mark.rotation.z = rotation;
  }
}

function createFloor(layout: FloorLayout): FloorVisual {
  const group = new THREE.Group();
  const building = new THREE.Shape();
  building.moveTo(-3.4, -2.05);
  building.lineTo(2.86, -2.05);
  building.lineTo(3.42, -1.45);
  building.lineTo(3.42, 2.08);
  building.lineTo(-3.4, 2.08);
  building.closePath();
  const slab = new THREE.Mesh(
    new THREE.ShapeGeometry(building),
    new THREE.MeshBasicMaterial({ color: PAPER, transparent: true, opacity: 0.94, depthWrite: false }),
  );
  slab.position.z = -0.04;
  group.add(slab);

  const buildingOutline = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-3.4, -2.05, 0.08), new THREE.Vector3(2.86, -2.05, 0.08),
      new THREE.Vector3(3.42, -1.45, 0.08), new THREE.Vector3(3.42, 2.08, 0.08),
      new THREE.Vector3(-3.4, 2.08, 0.08),
    ]),
    new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.9 }),
  );
  group.add(buildingOutline);

  const zones = layout.zones.map((spec) => {
    const [x, y, width, height] = spec;
    const zoneSlab = addRect(group, spec, 0xdfe5df, 0.31, 0.015);
    const outline = rectangleLine(width, height, MUTED, 0.55);
    outline.position.set(x, y, 0.09);
    group.add(outline);
    return { slab: zoneSlab, outline, center: new THREE.Vector2(x, y) };
  });

  layout.walls.forEach((wall) => addRect(group, wall, INK, 0.8, 0.12));
  layout.tables.forEach((table) => addTable(group, table));
  layout.shelves.forEach((shelf) => addShelf(group, shelf));

  const core = addRect(group, [-0.04, -1.58, 0.98, 0.62], 0xd1d8d3, 0.78, 0.08);
  const coreOutline = rectangleLine(0.98, 0.62, INK, 0.78);
  coreOutline.position.set(-0.04, -1.58, 0.11);
  group.add(coreOutline);
  for (let step = 0; step < 5; step += 1) {
    addRect(group, [-0.34 + step * 0.15, -1.58, 0.035, 0.48], INK, 0.48, 0.12);
  }
  core.userData.role = 'circulation-core';

  const pathCurve = new THREE.CatmullRomCurve3(layout.path.map(([x, y]) => new THREE.Vector3(x, y, 0.14)));
  const pathLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pathCurve.getPoints(80)),
    new THREE.LineDashedMaterial({ color: 0x7b8c8e, dashSize: 0.12, gapSize: 0.09, transparent: true, opacity: 0.62 }),
  );
  pathLine.computeLineDistances();
  group.add(pathLine);

  const windowGroup = new THREE.Group();
  for (let index = 0; index < 12; index += 1) {
    const horizontal = layout.windowSide !== 'east';
    const x = layout.windowSide === 'east' ? 3.44 : -2.9 + index * 0.5;
    const y = layout.windowSide === 'east' ? -1.28 + index * 0.27 : (layout.windowSide === 'north' ? 2.12 : -2.09);
    const tick = addRect(windowGroup, [x, y, horizontal ? 0.32 : 0.055, horizontal ? 0.055 : 0.2], AMBER, 0.9, 0.16);
    tick.userData.role = 'window';
  }
  group.add(windowGroup);

  return { group, zones };
}

export function createLibraryScene(canvas: HTMLCanvasElement, quality: string): LibraryScene {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: quality !== 'low' });
  renderer.setClearColor(0xf7f1e4, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-5, 5, 3, -3, 0.1, 30);
  camera.position.set(0, 0, 8.5);
  camera.lookAt(0, 0, 0);

  const plan = new THREE.Group();
  plan.rotation.x = -0.035;
  plan.rotation.z = -0.012;
  scene.add(plan);

  const floors = layouts.map((layout) => {
    const visual = createFloor(layout);
    plan.add(visual.group);
    return visual;
  });

  const daylightMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(0xf0b854) },
      uOpacity: { value: 0.22 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform vec3 uColor; uniform float uOpacity; void main(){ float x=smoothstep(0.0,.24,vUv.x)*(1.0-smoothstep(.78,1.0,vUv.x)); float y=smoothstep(0.0,.16,vUv.y)*(1.0-smoothstep(.86,1.0,vUv.y)); gl_FragColor=vec4(uColor,x*y*uOpacity); }`,
  });
  const daylight = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 7.8), daylightMaterial);
  daylight.position.z = 0.18;
  plan.add(daylight);

  const locator = new THREE.Mesh(
    new THREE.RingGeometry(0.16, 0.23, 36),
    new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0.9, depthWrite: false }),
  );
  locator.position.z = 0.22;
  plan.add(locator);

  let selectedFloor = 2;
  let selectedTime = 1;
  let selectedZone = 3;
  let aspect = 1.6;
  let daylightBaseOpacity = 0.19;

  const applyContext = (): void => {
    floors.forEach((floor, index) => { floor.group.visible = index === selectedFloor - 1; });
    const active = floors[selectedFloor - 1] ?? floors[0]!;
    active.zones.forEach((zone, index) => {
      const selected = index === selectedZone;
      zone.slab.material.color.setHex(selected ? 0xe3b45b : 0xdfe5df);
      zone.slab.material.opacity = selected ? 0.58 : 0.25;
      zone.outline.material.color.setHex(selected ? 0xa3691d : MUTED);
      zone.outline.material.opacity = selected ? 0.95 : 0.48;
    });
    const zone = active.zones[selectedZone] ?? active.zones[0]!;
    locator.position.x = zone.center.x;
    locator.position.y = zone.center.y;

    const positions = [
      { x: -2.3, y: 0.35, rotation: -0.74, color: 0xf4c878, opacity: 0.25 },
      { x: 2.5, y: 0.1, rotation: 0.68, color: 0xe8b65d, opacity: 0.19 },
      { x: 0.7, y: 0.85, rotation: 0.06, color: 0x8196a0, opacity: 0.11 },
    ];
    const light = positions[selectedTime] ?? positions[1]!;
    daylight.position.x = light.x;
    daylight.position.y = light.y;
    daylight.rotation.z = light.rotation;
    daylightMaterial.uniforms.uColor.value.setHex(light.color);
    daylightBaseOpacity = light.opacity;
    daylightMaterial.uniforms.uOpacity.value = light.opacity;
  };

  applyContext();

  return {
    update(state: DirectedState): void {
      const reveal = Math.max(0, Math.min(1, state.planOpen * 1.18));
      plan.visible = state.planOpen > 0.025 && state.resolve < 0.985;
      plan.scale.setScalar((aspect > 1.2 ? 0.88 : 0.68) * (0.92 + reveal * 0.08));
      plan.rotation.z = -0.012 + (1 - reveal) * -0.025;
      const active = floors[selectedFloor - 1] ?? floors[0]!;
      active.group.position.y = (1 - reveal) * 0.22;

      const pulse = 1 + Math.sin(state.resolve * Math.PI * 2 + state.daylight * 3) * 0.08;
      locator.scale.setScalar(pulse);
      locator.material.opacity = 0.64 + state.selectedZone * 0.28;
      daylightMaterial.uniforms.uOpacity.value = daylightBaseOpacity * (0.88 + state.daylight * 0.12);
      camera.position.set(state.cameraX, state.cameraY, state.cameraZ);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    },
    resize(width: number, height: number, dpr: number): void {
      aspect = width / Math.max(1, height);
      const vertical = aspect < 0.78 ? 4.25 : 3.18;
      plan.position.set(aspect > 1.2 ? -1.42 : 0, aspect < 0.78 ? -0.34 : -0.18, 0);
      camera.left = -vertical * aspect;
      camera.right = vertical * aspect;
      camera.top = vertical;
      camera.bottom = -vertical;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(dpr, quality === 'low' ? 1.25 : 2));
      renderer.setSize(width, height, false);
    },
    setContext(floor: number, timeIndex: number, zoneIndex: number): void {
      selectedFloor = Math.max(1, Math.min(floors.length, floor));
      selectedTime = Math.max(0, Math.min(2, timeIndex));
      selectedZone = Math.max(0, Math.min(3, zoneIndex));
      applyContext();
    },
    dispose(): void {
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineLoop || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
    },
  };
}