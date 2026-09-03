import * as THREE from 'three';

type GeneratedViewport = Readonly<{ width: number; height: number; dpr: number }>;
export type StationId = 'library' | 'market' | 'garden' | 'canal';
export type Quality = 'low' | 'high';

export type Station = Readonly<{
  id: StationId;
  code: string;
  district: string;
  name: string;
  landmark: string;
  distance: number;
  status: string;
  chlorine: number;
  turbidity: number;
  batch: string;
  lng: number;
  lat: number;
  x: number;
  y: number;
}>;

type MapPoint = Readonly<{ lng: number; lat: number }>;
const MAP_ZOOM = 15;
const MAP_TILE_SIZE = 256;
const MAP_COLS = 5;
const MAP_ROWS = 3;
const MAP_WIDTH = 9.4;
const MAP_HEIGHT = 5.64;
const MAP_CENTER: MapPoint = { lng: 121.4612, lat: 31.1778 };
const REAL_MAP_URI = '/creative-assets/xuhui-west-bund-osm-map-v1.jpg';
const ORIGIN: MapPoint = { lng: 121.4580, lat: 31.1715 };

function worldPixel(point: MapPoint): Readonly<{ x: number; y: number }> {
  const scale = MAP_TILE_SIZE * Math.pow(2, MAP_ZOOM);
  const sin = Math.sin(point.lat * Math.PI / 180);
  return {
    x: (point.lng + 180) / 360 * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale
  };
}

const centerPixel = worldPixel(MAP_CENTER);
const MAP_TILE_X0 = Math.floor(centerPixel.x / MAP_TILE_SIZE) - Math.floor(MAP_COLS / 2);
const MAP_TILE_Y0 = Math.floor(centerPixel.y / MAP_TILE_SIZE) - Math.floor(MAP_ROWS / 2);

function projectLngLat(point: MapPoint): Readonly<{ x: number; y: number }> {
  const pixel = worldPixel(point);
  return {
    x: ((pixel.x - MAP_TILE_X0 * MAP_TILE_SIZE) / (MAP_COLS * MAP_TILE_SIZE) - 0.5) * MAP_WIDTH,
    y: (0.5 - (pixel.y - MAP_TILE_Y0 * MAP_TILE_SIZE) / (MAP_ROWS * MAP_TILE_SIZE)) * MAP_HEIGHT
  };
}

function station(input: Omit<Station, 'x' | 'y'>): Station {
  return { ...input, ...projectLngLat(input) };
}

export const STATIONS: readonly Station[] = [
  station({ id: 'library', code: 'WB-01', district: '龙华街道', name: '西岸美术馆演示补水点', landmark: '龙腾大道 2600 号 · 真实地标 / 演示数据', distance: 280, status: '演示状态：可用', chlorine: 0.18, turbidity: 0.3, batch: 'DEMO-WB01', lng: 121.4593301, lat: 31.1695893 }),
  station({ id: 'market', code: 'WB-02', district: '龙华街道', name: '油罐艺术中心演示补水点', landmark: '龙腾大道 2380 号 · 真实地标 / 演示数据', distance: 650, status: '演示状态：可用', chlorine: 0.21, turbidity: 0.4, batch: 'DEMO-WB02', lng: 121.4593761, lat: 31.1665647 }),
  station({ id: 'garden', code: 'WB-03', district: '斜土路街道', name: '龙美术馆演示补水点', landmark: '龙腾大道 3398 号 · 真实地标 / 演示数据', distance: 1680, status: '演示状态：可用', chlorine: 0.16, turbidity: 0.2, batch: 'DEMO-WB03', lng: 121.4601929, lat: 31.1859164 }),
  station({ id: 'canal', code: 'WB-04', district: '斜土路街道', name: '星美术馆演示补水点', landmark: '瑞宁路 111 号 · 真实地标 / 演示数据', distance: 2300, status: '演示状态：可用', chlorine: 0.19, turbidity: 0.3, batch: 'DEMO-WB04', lng: 121.4657116, lat: 31.1897166 })
];

const ROUTES: Readonly<Record<StationId, readonly MapPoint[]>> = {
  library: [ORIGIN, { lng: 121.4587, lat: 31.1710 }, { lng: 121.4593301, lat: 31.1695893 }],
  market: [ORIGIN, { lng: 121.4588, lat: 31.1693 }, { lng: 121.4593761, lat: 31.1665647 }],
  garden: [ORIGIN, { lng: 121.4590, lat: 31.1752 }, { lng: 121.4593, lat: 31.1815 }, { lng: 121.4601929, lat: 31.1859164 }],
  canal: [ORIGIN, { lng: 121.4590, lat: 31.1752 }, { lng: 121.4593, lat: 31.1815 }, { lng: 121.4602, lat: 31.1865 }, { lng: 121.4632, lat: 31.1887 }, { lng: 121.4657116, lat: 31.1897166 }]
};

const VERTEX_SHADER = `
  varying vec2 vUv;
  uniform float uFold;
  void main() {
    vUv = uv;
    vec3 p = position;
    float crease = sin((p.x + 4.5) * 2.05) * uFold;
    p.z += max(0.0, crease) * 0.025;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  varying vec2 vUv;
  uniform float uFocus;
  uniform float uResolve;
  void main() {
    vec3 paper = mix(vec3(0.985, 0.972, 0.910), vec3(0.958, 0.945, 0.890), uFocus * 0.35);
    float minorX = 1.0 - smoothstep(0.0, 0.035, abs(fract(vUv.x * 18.0) - 0.5));
    float minorY = 1.0 - smoothstep(0.0, 0.035, abs(fract(vUv.y * 12.0) - 0.5));
    float atlasGrid = min(1.0, minorX + minorY);
    vec3 color = mix(paper, vec3(0.53, 0.65, 0.62), atlasGrid * 0.09);
    float fold = pow(abs(fract(vUv.x * 4.0) - 0.5) * 2.0, 22.0);
    color -= fold * 0.045 * (1.0 - uResolve);
    gl_FragColor = vec4(color, 0.97);
  }
`;

export class WaterAtlasScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-5, 5, 3, -3, 0.1, 20);
  readonly mapGroup = new THREE.Group();
  readonly routeGroup = new THREE.Group();
  readonly markerGroup = new THREE.Group();
  readonly mapMaterial: THREE.ShaderMaterial;
  readonly stationMeshes = new Map<StationId, THREE.Mesh>();
  readonly stationHalos = new Map<StationId, THREE.Mesh>();
  selectedId: StationId = 'library';
  private viewport: GeneratedViewport;
  private readonly ownedGeometries: THREE.BufferGeometry[] = [];
  private readonly ownedMaterials: THREE.Material[] = [];
  private readonly ownedTextures: THREE.Texture[] = [];
  private readonly routeMaterial: THREE.MeshBasicMaterial;
  private routeMesh: THREE.Mesh | null = null;

  constructor(canvas: HTMLCanvasElement, viewport: GeneratedViewport, quality: Quality) {
    this.viewport = viewport;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high', alpha: true, powerPreference: quality === 'low' ? 'low-power' : 'high-performance' });
    this.renderer.setClearColor(0xf7f1df, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera.position.set(0, 0, 8);
    this.camera.lookAt(0, 0, 0);

    const mapGeometry = new THREE.PlaneGeometry(9.4, 5.6, quality === 'low' ? 14 : 40, quality === 'low' ? 8 : 24);
    this.mapMaterial = new THREE.ShaderMaterial({ vertexShader: VERTEX_SHADER, fragmentShader: FRAGMENT_SHADER, transparent: true, uniforms: { uFold: { value: 0.0 }, uFocus: { value: 0.0 }, uResolve: { value: 0.0 } } });
    const map = new THREE.Mesh(mapGeometry, this.mapMaterial);
    map.position.z = -0.3;
    this.mapGroup.add(map);
    this.ownedGeometries.push(mapGeometry);
    this.ownedMaterials.push(this.mapMaterial);

    this.routeMaterial = this.material(0xe75f32, 0.96);
    this.buildDistrictBlocks();
    this.buildWaterAndParks();
    this.buildStreetNetwork();
    this.buildRealMapLayer();
    this.buildStations();
    this.buildOriginMarker();
    this.mapGroup.add(this.routeGroup, this.markerGroup);
    this.scene.add(this.mapGroup);
    this.updateRoute('library');
    this.resize(viewport);
  }

  private material(color: number, opacity = 1): THREE.MeshBasicMaterial {
    const material = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
    this.ownedMaterials.push(material);
    return material;
  }

  private lineMaterial(color: number, opacity = 1): THREE.LineBasicMaterial {
    const material = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
    this.ownedMaterials.push(material);
    return material;
  }

  private buildDistrictBlocks(): void {
    const blocks: ReadonlyArray<Readonly<{ x: number; y: number; width: number; height: number; color: number; rotation?: number }>> = [
      { x: -3.75, y: 1.75, width: 1.3, height: 1.05, color: 0xe6ddc8, rotation: -0.035 },
      { x: -2.15, y: 1.75, width: 1.42, height: 1.02, color: 0xdde8df, rotation: 0.025 },
      { x: -0.55, y: 1.72, width: 1.35, height: 1.08, color: 0xe9dfc9 },
      { x: 1.02, y: 1.7, width: 1.35, height: 1.05, color: 0xd7e6d2, rotation: -0.02 },
      { x: 2.62, y: 1.72, width: 1.45, height: 1.02, color: 0xe5ddc9, rotation: 0.02 },
      { x: 4.05, y: 1.68, width: 0.92, height: 1.0, color: 0xdce5de },
      { x: -3.75, y: 0.1, width: 1.35, height: 1.25, color: 0xe7deca },
      { x: -2.12, y: 0.05, width: 1.38, height: 1.2, color: 0xdfe8df },
      { x: -0.55, y: 0.0, width: 1.34, height: 1.22, color: 0xeadcc4 },
      { x: 1.02, y: 0.03, width: 1.35, height: 1.18, color: 0xe6dec8 },
      { x: 2.6, y: 0.0, width: 1.45, height: 1.22, color: 0xdde7df },
      { x: 4.02, y: -0.05, width: 0.9, height: 1.25, color: 0xe7dfcb },
      { x: -3.75, y: -1.45, width: 1.3, height: 0.95, color: 0xdde6dd },
      { x: -2.12, y: -1.42, width: 1.4, height: 0.92, color: 0xe8dfca },
      { x: -0.55, y: -1.42, width: 1.34, height: 0.9, color: 0xeee4cf },
      { x: 1.02, y: -1.42, width: 1.35, height: 0.9, color: 0xdce6de },
      { x: 2.62, y: -1.42, width: 1.45, height: 0.9, color: 0xe7dfcb },
      { x: 4.02, y: -1.42, width: 0.9, height: 0.9, color: 0xdde8df }
    ];
    blocks.forEach((block) => {
      const geometry = new THREE.PlaneGeometry(block.width, block.height);
      const mesh = new THREE.Mesh(geometry, this.material(block.color, 0.94));
      mesh.position.set(block.x, block.y, -0.21);
      mesh.rotation.z = block.rotation || 0;
      this.mapGroup.add(mesh);
      const edges = new THREE.EdgesGeometry(geometry);
      const outline = new THREE.LineSegments(edges, this.lineMaterial(0x7f928b, 0.38));
      outline.position.copy(mesh.position);
      outline.position.z = -0.19;
      outline.rotation.copy(mesh.rotation);
      this.mapGroup.add(outline);
      this.ownedGeometries.push(geometry, edges);
    });
  }

  private buildWaterAndParks(): void {
    const waterCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4.8, -2.42, -0.14),
      new THREE.Vector3(-2.7, -2.28, -0.14),
      new THREE.Vector3(-0.5, -2.5, -0.14),
      new THREE.Vector3(1.7, -2.25, -0.14),
      new THREE.Vector3(4.8, -2.38, -0.14)
    ]);
    const waterGeometry = new THREE.TubeGeometry(waterCurve, 72, 0.22, 10, false);
    this.mapGroup.add(new THREE.Mesh(waterGeometry, this.material(0x73c5d1, 0.8)));
    this.ownedGeometries.push(waterGeometry);

    const parks = [
      { x: 1.55, y: 1.55, width: 1.05, height: 0.68 },
      { x: -3.65, y: 0.18, width: 0.78, height: 0.56 }
    ];
    parks.forEach((park) => {
      const geometry = new THREE.PlaneGeometry(park.width, park.height);
      const mesh = new THREE.Mesh(geometry, this.material(0xaec9a2, 0.88));
      mesh.position.set(park.x, park.y, -0.12);
      this.mapGroup.add(mesh);
      this.ownedGeometries.push(geometry);
    });
  }

  private addRoad(points: ReadonlyArray<readonly [number, number]>, primary: boolean): void {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(x, y, -0.03)), false, 'catmullrom', 0.02);
    const baseGeometry = new THREE.TubeGeometry(curve, 40, primary ? 0.095 : 0.058, 6, false);
    const base = new THREE.Mesh(baseGeometry, this.material(0xfffcf1, 0.98));
    this.mapGroup.add(base);
    this.ownedGeometries.push(baseGeometry);
    const centerGeometry = new THREE.TubeGeometry(curve, 40, primary ? 0.018 : 0.01, 5, false);
    const center = new THREE.Mesh(centerGeometry, this.material(primary ? 0x607b78 : 0x93a29c, primary ? 0.64 : 0.42));
    center.position.z = 0.015;
    this.mapGroup.add(center);
    this.ownedGeometries.push(centerGeometry);
  }

  private buildStreetNetwork(): void {
    const roads: ReadonlyArray<Readonly<{ primary: boolean; points: ReadonlyArray<readonly [number, number]> }>> = [
      { primary: true, points: [[-4.7, 1.02], [-3.2, 0.95], [-1.4, 0.82], [0.4, 0.82], [2.3, 0.74], [4.7, 0.86]] },
      { primary: true, points: [[-4.7, -0.78], [-3.2, -0.74], [-1.4, -0.78], [0.4, -0.78], [2.3, -0.78], [4.7, -0.66]] },
      { primary: false, points: [[-4.7, 2.32], [-3.2, 2.28], [-1.4, 2.3], [0.4, 2.28], [2.3, 2.3], [4.7, 2.26]] },
      { primary: false, points: [[-4.7, -1.9], [-3.2, -1.9], [-1.4, -1.9], [0.4, -1.9], [2.3, -1.9], [4.7, -1.86]] },
      { primary: true, points: [[-3.2, 2.7], [-3.2, 1.02], [-3.2, -0.78], [-3.2, -2.55]] },
      { primary: false, points: [[-1.4, 2.7], [-1.4, 0.82], [-1.4, -0.78], [-1.4, -2.55]] },
      { primary: true, points: [[0.4, 2.7], [0.4, 0.82], [0.4, -0.78], [0.4, -2.55]] },
      { primary: false, points: [[2.3, 2.7], [2.3, 0.74], [2.3, -0.78], [2.3, -2.55]] },
      { primary: false, points: [[3.75, 2.7], [3.75, 0.82], [3.75, -0.72], [3.75, -2.55]] }
    ];
    roads.forEach((road) => this.addRoad(road.points, road.primary));
  }

  private createLabel(text: string, color = '#31505b', strong = false): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D canvas unavailable for map labels.');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = color;
    context.font = `${strong ? 760 : 600} ${strong ? 30 : 24}px "Microsoft YaHei", sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(strong ? 1.45 : 1.25, strong ? 0.28 : 0.24, 1);
    this.ownedTextures.push(texture);
    this.ownedMaterials.push(material);
    return sprite;
  }

  private buildRealMapLayer(): void {
    const texture = new THREE.TextureLoader().load(REAL_MAP_URI);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    this.ownedTextures.push(texture);

    const geometry = new THREE.PlaneGeometry(MAP_WIDTH, MAP_HEIGHT);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      color: 0xfffbf2,
      transparent: true,
      opacity: 0.94,
      depthWrite: false
    });
    const map = new THREE.Mesh(geometry, material);
    map.name = 'real-osm-map-layer';
    map.position.z = 0.045;
    this.mapGroup.add(map);
    this.ownedGeometries.push(geometry);
    this.ownedMaterials.push(material);

    const area = this.createLabel('上海 · 徐汇滨江', '#173044', true);
    area.position.set(-3.75, 2.35, 0.095);
    area.scale.set(1.65, 0.25, 1);
    this.mapGroup.add(area);
  }

  private buildDistrictLabels(): void {
    const labels = [
      { text: '文教街区', x: -2.72, y: 2.12 },
      { text: '中央街区', x: -0.55, y: 0.2 },
      { text: '花园街区', x: 1.5, y: 2.08 },
      { text: '运河街区', x: 3.35, y: -1.48 }
    ];
    labels.forEach((label) => {
      const sprite = this.createLabel(label.text, '#536d69');
      sprite.position.set(label.x, label.y, 0.08);
      this.mapGroup.add(sprite);
    });
    const canal = this.createLabel('南岸运河 · CANAL WALK', '#247e91', true);
    canal.position.set(1.75, -2.48, 0.08);
    canal.scale.set(2.4, 0.28, 1);
    this.mapGroup.add(canal);
  }

  private buildStations(): void {
    STATIONS.forEach((station, index) => {
      const geometry = new THREE.CircleGeometry(0.12, 28);
      const mesh = new THREE.Mesh(geometry, this.material(0x126f8b));
      mesh.position.set(station.x, station.y, 0.18);
      mesh.userData.stationId = station.id;
      this.markerGroup.add(mesh);
      this.stationMeshes.set(station.id, mesh);
      this.ownedGeometries.push(geometry);

      const haloGeometry = new THREE.RingGeometry(0.18, 0.235, 32);
      const halo = new THREE.Mesh(haloGeometry, this.material(0xe75f32, 0.68));
      halo.position.set(station.x, station.y, 0.16);
      this.markerGroup.add(halo);
      this.stationHalos.set(station.id, halo);
      this.ownedGeometries.push(haloGeometry);

      const code = this.createLabel(`0${index + 1}  ${station.code}`, '#173044', true);
      code.position.set(station.x + 0.58, station.y + 0.24, 0.22);
      code.scale.set(1.05, 0.2, 1);
      this.markerGroup.add(code);
    });
  }

  private buildOriginMarker(): void {
    const geometry = new THREE.CircleGeometry(0.09, 24);
    const marker = new THREE.Mesh(geometry, this.material(0x173044));
    const origin = projectLngLat(ORIGIN);
    marker.position.set(origin.x, origin.y, 0.19);
    this.markerGroup.add(marker);
    this.ownedGeometries.push(geometry);
    const label = this.createLabel('你在这里', '#173044', true);
    label.position.set(origin.x + 0.52, origin.y + 0.12, 0.21);
    label.scale.set(0.95, 0.2, 1);
    this.markerGroup.add(label);
  }

  private updateRoute(id: StationId): void {
    if (this.routeMesh) {
      this.routeGroup.remove(this.routeMesh);
      this.routeMesh.geometry.dispose();
      this.routeMesh = null;
    }
    const curve = new THREE.CatmullRomCurve3(ROUTES[id].map((point) => {
      const projected = projectLngLat(point);
      return new THREE.Vector3(projected.x, projected.y, 0.13);
    }), false, 'catmullrom', 0.02);
    const geometry = new THREE.TubeGeometry(curve, 54, 0.045, 7, false);
    this.routeMesh = new THREE.Mesh(geometry, this.routeMaterial);
    this.routeMesh.name = 'selected-walking-route';
    this.routeGroup.add(this.routeMesh);
  }

  selectStation(id: StationId): void {
    this.selectedId = id;
    this.updateRoute(id);
    this.stationMeshes.forEach((mesh, stationId) => {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((material) => {
        if (material instanceof THREE.MeshBasicMaterial) material.color.setHex(stationId === id ? 0xe75f32 : 0x126f8b);
      });
      mesh.scale.setScalar(stationId === id ? 1.55 : 1);
    });
    this.stationHalos.forEach((halo, stationId) => { halo.visible = stationId === id; });
  }

  resize(viewport: GeneratedViewport): void {
    this.viewport = viewport;
    const aspect = viewport.width / Math.max(1, viewport.height);
    const vertical = viewport.width < 640 ? 4.9 : 3.15;
    this.camera.left = -vertical * aspect;
    this.camera.right = vertical * aspect;
    this.camera.top = vertical;
    this.camera.bottom = -vertical;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(viewport.dpr, viewport.width < 640 ? 1.5 : 2));
    this.renderer.setSize(viewport.width, viewport.height, false);
  }

  render(): void { this.renderer.render(this.scene, this.camera); }

  dispose(): void {
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
      if ('material' in object) {
        const value = (object as THREE.Mesh).material;
        const materials = Array.isArray(value) ? value : value ? [value] : [];
        materials.forEach((material) => material.dispose());
      }
    });
    this.ownedTextures.forEach((texture) => texture.dispose());
    this.stationMeshes.clear();
    this.stationHalos.clear();
    this.renderer.renderLists.dispose();
    this.renderer.dispose();
  }
}
