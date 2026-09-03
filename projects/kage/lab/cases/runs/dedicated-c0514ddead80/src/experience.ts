import { defineExperience, startExperience } from '@signal-lab/experience-sdk';
import { WaterAtlasScene, STATIONS, type StationId } from './scene';
import { AtlasDirector } from './director';

type GeneratedViewport = Readonly<{ width: number; height: number; dpr: number }>;
type GeneratedPointer = Readonly<{ x: number; y: number }>;
type GeneratedFrame = Readonly<{
  elapsed: number;
  delta: number;
  progress: number;
  pointer: GeneratedPointer;
  viewport: GeneratedViewport;
  reducedMotion: boolean;
}>;
type GeneratedMountContext = Readonly<{
  container: HTMLElement;
  canvas: HTMLCanvasElement;
  quality: 'low' | 'high';
  reducedMotion: boolean;
  viewport: GeneratedViewport;
}>;

let scene: WaterAtlasScene | null = null;
let director: AtlasDirector | null = null;
let shell: HTMLElement | null = null;
let selectedId: StationId = 'library';
const cleanups: Array<() => void> = [];

function stationById(id: StationId) {
  const station = STATIONS.find((item) => item.id === id);
  if (!station) throw new Error(`Unknown station: ${id}`);
  return station;
}

function createPage(container: HTMLElement): HTMLElement {
  const root = document.createElement('main');
  root.className = 'water-atlas';
  root.innerHTML = `
    <header class="atlas-nav" aria-label="公共饮水导览">
      <a class="atlas-mark" href="#overview" aria-label="城市饮水图册首页"><span>水</span>城市饮水图册</a>
      <nav><a href="#stations">浏览站点</a><a href="#evidence">水质证据</a></nav>
    </header>
    <div class="atlas-canvas-note" aria-hidden="true">上海 · 徐汇滨江 · 真实地理基底</div>
    <section class="hero" id="overview">
      <div class="hero-copy">
        <p class="eyebrow">SHANGHAI WEST BUND / 31.17°N</p>
        <h1>徐汇滨江<br>公共补水地图</h1>
        <p class="hero-deck">以真实道路、黄浦江岸线和文化地标建立地点关系；四个补水站与检测数据为产品交互演示，不代表场馆实际设施。</p>
        <p class="location-disclosure" data-location-disclosure>真实区域：上海徐汇滨江 · 演示点位：4</p>
        <a class="text-link" href="#stations">开始浏览 <span aria-hidden="true">→</span></a>
      </div>
      <aside class="map-key" aria-label="地图图例">
        <span><i class="key-dot current"></i>当前选择</span>
        <span><i class="key-dot available"></i>开放供水</span>
        <span><i class="key-line"></i>示意步行线</span>
        <small class="map-attribution" data-map-attribution><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a></small>
      </aside>
    </section>
    <section class="station-stage" id="stations" aria-labelledby="station-title">
      <div class="stage-heading">
        <p class="eyebrow">横向街区索引</p>
        <h2 id="station-title">选择一个滨江演示点</h2>
        <p>每个点位锚定真实地标坐标；站点能力与水质数值仅用于验证产品交互。</p>
      </div>
      <div class="station-strip" role="list" aria-label="饮水点列表">
        ${STATIONS.map((station, index) => `
          <button class="station-card${station.id === selectedId ? ' is-selected' : ''}" type="button" role="listitem" data-station="${station.id}" aria-pressed="${station.id === selectedId}">
            <span class="card-index">0${index + 1} / ${station.district}</span>
            <strong>${station.name}</strong>
            <span>${station.landmark}</span>
            <b>${station.distance} m</b>
          </button>`).join('')}
      </div>
      <p class="strip-hint">左右滑动浏览街区 · 点按选择站点</p>
    </section>
    <section class="evidence" id="evidence" aria-live="polite">
      <div class="evidence-lead">
        <p class="eyebrow">站点证据 / <span data-field="code"></span></p>
        <h2 data-field="name"></h2>
        <p data-field="landmark"></p>
      </div>
      <dl class="evidence-grid">
        <div><dt>步行距离</dt><dd><span data-field="distance"></span><small>米</small></dd></div>
        <div><dt>今日状态</dt><dd class="status"><span class="status-dot"></span><span data-field="status"></span></dd></div>
        <div><dt>余氯检测</dt><dd><span data-field="chlorine"></span><small>mg/L</small></dd></div>
        <div><dt>浊度</dt><dd><span data-field="turbidity"></span><small>NTU</small></dd></div>
      </dl>
      <p class="evidence-source">演示检测批次 <span data-field="batch"></span> · 非公共设施实时数据</p>
    </section>
    <section class="resolve" id="nearest">
      <div>
        <p class="eyebrow">最近演示点位已确认</p>
        <h2><span data-field="nearestName"></span><br>距你约 <span data-field="nearestDistance"></span> 米</h2>
        <p>路线用于展示地点关联，不作为实际步行导航。</p>
      </div>
      <a class="primary-action" href="#stations" data-route>查看最近演示点 <span aria-hidden="true">↗</span></a>
    </section>
    <footer><span>真实地理基底 · 补水与检测信息均为产品演示</span><a href="#overview">返回地图顶部 ↑</a></footer>`;
  container.appendChild(root);
  return root;
}

function updateEvidence(root: HTMLElement, id: StationId): void {
  const station = stationById(id);
  const values: Readonly<Record<string, string>> = {
    code: station.code,
    name: station.name,
    landmark: station.landmark,
    distance: String(station.distance),
    status: station.status,
    chlorine: station.chlorine.toFixed(2),
    turbidity: station.turbidity.toFixed(1),
    batch: station.batch,
    nearestName: STATIONS[0].name,
    nearestDistance: String(STATIONS[0].distance)
  };
  root.querySelectorAll<HTMLElement>('[data-field]').forEach((element) => {
    const field = element.dataset.field;
    if (field && values[field] !== undefined) element.textContent = values[field];
  });
  root.querySelectorAll<HTMLButtonElement>('[data-station]').forEach((button) => {
    const active = button.dataset.station === id;
    button.classList.toggle('is-selected', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function mount(context: GeneratedMountContext): void {
  shell = createPage(context.container);
  updateEvidence(shell, selectedId);
  try {
    scene = new WaterAtlasScene(context.canvas, context.viewport, context.quality);
    scene.selectStation(selectedId);
    director = new AtlasDirector(scene, context.reducedMotion);
  } catch (error: unknown) {
    context.canvas.hidden = true;
    context.container.classList.add('webgl-unavailable');
    console.warn('WebGL enhancement unavailable', error);
  }

  shell.querySelectorAll<HTMLButtonElement>('[data-station]').forEach((button) => {
    const onSelect = (): void => {
      const id = button.dataset.station as StationId | undefined;
      if (!id || !STATIONS.some((station) => station.id === id)) return;
      selectedId = id;
      updateEvidence(shell as HTMLElement, id);
      scene?.selectStation(id);
    };
    button.addEventListener('click', onSelect);
    cleanups.push(() => button.removeEventListener('click', onSelect));
  });

  const route = shell.querySelector<HTMLAnchorElement>('[data-route]');
  if (route) {
    const onRoute = (): void => {
      selectedId = 'library';
      updateEvidence(shell as HTMLElement, selectedId);
      scene?.selectStation(selectedId);
    };
    route.addEventListener('click', onRoute);
    cleanups.push(() => route.removeEventListener('click', onRoute));
  }
}

function update(frame: GeneratedFrame): void {
  if (!scene || !director) return;
  director.update(frame.progress, frame.pointer, frame.elapsed, frame.delta, frame.reducedMotion);
  scene.render();
}

function resize(viewport: GeneratedViewport): void {
  scene?.resize(viewport);
}

function dispose(): void {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  director?.dispose();
  scene?.dispose();
  shell?.remove();
  director = null;
  scene = null;
  shell = null;
}

startExperience(defineExperience({ mount, update, resize, dispose }));
