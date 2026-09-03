const params = new URLSearchParams(window.location.search);
const quality = params.get('quality') || 'high';
const revision = params.get('revision') || 'r132-live';
const reducedMotion = params.get('motion') === 'reduce'
  || (params.get('motion') !== 'full' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const forcedFallback = ['1', 'true', 'image'].includes(params.get('fallback') || '');

type StationId = 'rock' | 'anemone' | 'crab';

type Station = {
  id: StationId;
  order: number;
  x: number;
  y: number;
  index: string;
  distance: string;
  eyebrow: string;
  title: string;
  description: string;
};

const stations: Station[] = [
  {
    id: 'rock', order: 0, x: .17, y: .66, index: '湿岩观察 · 01', distance: '距起点 18 m',
    eyebrow: '石莼下的慢速居民', title: '海螺把月光背在壳上',
    description: '潮水刚退，湿岩仍像一面镜子。海螺沿石莼边缘缓慢移动，留下几乎看不见的取食路径。',
  },
  {
    id: 'anemone', order: 1, x: .57, y: .64, index: '浅池观察 · 02', distance: '距起点 46 m',
    eyebrow: '水面以下的花', title: '海葵在静水里保持张开',
    description: '浅池隔开了外海的浪。触手随着微小水流起伏；它看起来像花，却是一只等待食物经过的动物。',
  },
  {
    id: 'crab', order: 2, x: .84, y: .48, index: '岩隙观察 · 03', distance: '距起点 71 m',
    eyebrow: '洞口亮起两点反光', title: '岸蟹先观察，再离开岩隙',
    description: '层叠岩片形成潮水回不到的短暂避难所。岸蟹停在阴影边缘，直到检查光离开才继续觅食。',
  },
];

const html = document.documentElement;
const viewport = document.querySelector<HTMLElement>('#panorama-viewport')!;
const track = document.querySelector<HTMLElement>('#panorama-track')!;
const image = document.querySelector<HTMLImageElement>('#panorama-image')!;
const lens = document.querySelector<HTMLElement>('#inspection-lens')!;
const routePath = document.querySelector<SVGPathElement>('#route-path')!;
const visitedCount = document.querySelector<HTMLElement>('#visited-count')!;
const stationIndex = document.querySelector<HTMLElement>('#station-index')!;
const stationDistance = document.querySelector<HTMLElement>('#station-distance')!;
const stationEyebrow = document.querySelector<HTMLElement>('#station-eyebrow')!;
const stationTitle = document.querySelector<HTMLElement>('#station-title')!;
const stationDescription = document.querySelector<HTMLElement>('#station-description')!;
const prevButton = document.querySelector<HTMLButtonElement>('#prev-station')!;
const nextButton = document.querySelector<HTMLButtonElement>('#next-station')!;
const saveButton = document.querySelector<HTMLButtonElement>('#save-route')!;
const saveStatus = document.querySelector<HTMLElement>('#save-status')!;
const progressBar = document.querySelector<HTMLElement>('#traverse-progress-bar')!;
const hotspotButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-station-id]'));
const progressMarkers = Array.from(document.querySelectorAll<HTMLElement>('[data-progress-id]'));
const assetUrl = new URL('./assets/moonlit-tidepool-panorama-v1.png', import.meta.url).href;

let activeStation: StationId | null = null;
const visited: StationId[] = [];
let saved = false;
let imageLoaded = false;
let fallback = forcedFallback;
let dragging = false;
let dragStartX = 0;
let dragStartScroll = 0;
let lastProgress = 0;

function maximumScroll() {
  return Math.max(0, viewport.scrollWidth - viewport.clientWidth);
}

function normalizedProgress() {
  const maximum = maximumScroll();
  return maximum ? viewport.scrollLeft / maximum : 0;
}

function stationById(id: StationId) {
  return stations.find((station) => station.id === id)!;
}

function stationScrollTarget(station: Station) {
  const target = station.x * viewport.scrollWidth - viewport.clientWidth / 2;
  return Math.max(0, Math.min(maximumScroll(), target));
}

function routeReady() {
  return visited.length === stations.length;
}

function setFallback(next: boolean) {
  fallback = next;
  html.dataset.fallback = String(next);
  if (next) {
    imageLoaded = false;
    image.hidden = true;
  }
}

function setTrackLens(x: number, y: number) {
  const xPercent = `${Math.max(0, Math.min(1, x)) * 100}%`;
  const yPercent = `${Math.max(0, Math.min(1, y)) * 100}%`;
  track.style.setProperty('--lens-x', xPercent);
  track.style.setProperty('--lens-y', yPercent);
  lens.style.left = xPercent;
  lens.style.top = yPercent;
}

function updateRoute() {
  const percentage = visited.length / stations.length;
  track.style.setProperty('--route-offset', String(1000 - percentage * 1000));
  visitedCount.textContent = String(visited.length);
  progressMarkers.forEach((marker) => {
    marker.dataset.visited = String(visited.includes(marker.dataset.progressId as StationId));
  });
  hotspotButtons.forEach((button) => {
    const id = button.dataset.stationId as StationId;
    button.dataset.visited = String(visited.includes(id));
    button.dataset.active = String(activeStation === id);
    button.setAttribute('aria-pressed', String(visited.includes(id)));
  });
  saveButton.disabled = !routeReady();
  if (routeReady() && !saved) saveButton.textContent = '保存今晚的潮池路线';
}

function showStation(station: Station) {
  activeStation = station.id;
  stationIndex.textContent = station.index;
  stationDistance.textContent = station.distance;
  stationEyebrow.textContent = station.eyebrow;
  stationTitle.textContent = station.title;
  stationDescription.textContent = station.description;
  setTrackLens(station.x, station.y);
  updateRoute();
}

function focusStation(station: Station, markVisited = false) {
  viewport.scrollTo({ left: stationScrollTarget(station), behavior: reducedMotion ? 'auto' : 'smooth' });
  showStation(station);
  if (markVisited && !visited.includes(station.id)) {
    visited.push(station.id);
    saveStatus.textContent = routeReady() ? '三处观察完成，路线已经连成。' : `已记录 ${visited.length} / 3 处观察。`;
    updateRoute();
  }
  html.dataset.started = 'true';
}

function nearestStation() {
  return stations.reduce((nearest, station) => {
    const distance = Math.abs(stationScrollTarget(station) - viewport.scrollLeft);
    const nearestDistance = Math.abs(stationScrollTarget(nearest) - viewport.scrollLeft);
    return distance < nearestDistance ? station : nearest;
  });
}

function updateFromScroll() {
  lastProgress = normalizedProgress();
  progressBar.style.setProperty('--traverse-progress', `${lastProgress * 100}%`);
  progressBar.style.width = `${lastProgress * 100}%`;
  if (lastProgress > .025) html.dataset.started = 'true';
  const nearest = nearestStation();
  if (activeStation !== nearest.id) showStation(nearest);
}

hotspotButtons.forEach((button) => {
  button.addEventListener('click', () => focusStation(stationById(button.dataset.stationId as StationId), true));
});

viewport.addEventListener('scroll', updateFromScroll, { passive: true });

viewport.addEventListener('wheel', (event) => {
  if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
  const before = viewport.scrollLeft;
  const next = Math.max(0, Math.min(maximumScroll(), before + event.deltaY));
  if (Math.abs(next - before) < .5) return;
  event.preventDefault();
  viewport.scrollLeft = next;
}, { passive: false });

viewport.addEventListener('pointerdown', (event) => {
  if ((event.target as HTMLElement).closest('button')) return;
  dragging = true;
  dragStartX = event.clientX;
  dragStartScroll = viewport.scrollLeft;
  viewport.dataset.dragging = 'true';
  viewport.setPointerCapture(event.pointerId);
});

viewport.addEventListener('pointermove', (event) => {
  const bounds = track.getBoundingClientRect();
  setTrackLens((event.clientX - bounds.left) / bounds.width, (event.clientY - bounds.top) / bounds.height);
  if (!dragging) return;
  viewport.scrollLeft = dragStartScroll - (event.clientX - dragStartX);
});

function stopDragging() {
  dragging = false;
  viewport.dataset.dragging = 'false';
}

viewport.addEventListener('pointerup', stopDragging);
viewport.addEventListener('pointercancel', stopDragging);

window.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  const direction = event.key === 'ArrowRight' ? 1 : -1;
  viewport.scrollBy({ left: direction * viewport.clientWidth * .42, behavior: reducedMotion ? 'auto' : 'smooth' });
});

function moveByStation(direction: number) {
  const currentIndex = activeStation ? stationById(activeStation).order : -1;
  const nextIndex = Math.max(0, Math.min(stations.length - 1, currentIndex + direction));
  focusStation(stations[nextIndex], false);
}

prevButton.addEventListener('click', () => moveByStation(-1));
nextButton.addEventListener('click', () => moveByStation(1));

saveButton.addEventListener('click', () => {
  if (!routeReady()) return;
  saved = true;
  saveButton.dataset.saved = 'true';
  saveButton.textContent = '路线已保存';
  saveStatus.textContent = '已保存：湿岩带 → 浅池带 → 岩隙带。';
});

image.addEventListener('load', () => {
  imageLoaded = true;
  setFallback(false);
});
image.addEventListener('error', () => setFallback(true));

if (forcedFallback) {
  image.removeAttribute('src');
  setFallback(true);
} else if (image.complete && image.naturalWidth > 0) {
  imageLoaded = true;
}

window.addEventListener('resize', updateFromScroll);

const runtime = {
  snapshot: () => ({
    ready: html.dataset.tidepoolReady === 'true',
    activeStation,
    visited: [...visited],
    routeReady: routeReady(),
    saved,
    progress: Number(lastProgress.toFixed(4)),
    scrollLeft: Math.round(viewport.scrollLeft),
    imageLoaded,
    fallback,
    reducedMotion,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    assetUrl,
    quality,
    revision,
  }),
  focusStation: (id: StationId, markVisited = true) => focusStation(stationById(id), markVisited),
};

declare global {
  interface Window { __moonlitTidepool?: typeof runtime }
}

window.__moonlitTidepool = runtime;
updateFromScroll();
updateRoute();
html.dataset.tidepoolReady = 'true';
