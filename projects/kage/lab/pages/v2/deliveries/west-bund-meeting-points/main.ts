const params = new URLSearchParams(window.location.search);
const reducedMotion = params.get('motion') === 'reduce'
  || (params.get('motion') !== 'full' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const forcedFallback = ['1', 'true', 'image'].includes(params.get('fallback') || '');
const revision = params.get('revision') || 'r136b-live';

type LandmarkId = 'west-bund-museum' | 'tank-shanghai' | 'long-museum' | 'start-museum';

type Landmark = Readonly<{
  id: LandmarkId;
  order: number;
  index: string;
  district: string;
  name: string;
  address: string;
  lng: number;
  lat: number;
  mapX: number;
  mapY: number;
  route: string;
  suggestion: string;
}>;

const landmarks: readonly Landmark[] = [
  {
    id: 'west-bund-museum',
    order: 0,
    index: '01',
    district: '龙华街道',
    name: '西岸美术馆',
    address: '龙腾大道 2600 号',
    lng: 121.4593301,
    lat: 31.1695893,
    mapX: 49.963,
    mapY: 86.598,
    route: '47.541,79.822 48.816,81.595 49.963,86.598',
    suggestion: '把“西岸美术馆”与本卡坐标发给同行者，抵达后请以现场指引相互确认。',
  },
  {
    id: 'tank-shanghai',
    order: 1,
    index: '02',
    district: '龙华街道',
    name: '油罐艺术中心',
    address: '龙腾大道 2380 号',
    lng: 121.4593761,
    lat: 31.1665647,
    mapX: 50.046,
    mapY: 97.322,
    route: '47.541,79.822 48.998,87.623 50.046,97.322',
    suggestion: '把“油罐艺术中心”与本卡坐标发给同行者，抵达后请以现场指引相互确认。',
  },
  {
    id: 'long-museum',
    order: 2,
    index: '03',
    district: '斜土路街道',
    name: '龙美术馆',
    address: '龙腾大道 3398 号',
    lng: 121.4601929,
    lat: 31.1859164,
    mapX: 51.533,
    mapY: 28.697,
    route: '47.541,79.822 49.362,66.702 49.908,44.360 51.533,28.697',
    suggestion: '把“龙美术馆”与本卡坐标发给同行者，抵达后请以现场指引相互确认。',
  },
  {
    id: 'start-museum',
    order: 3,
    index: '04',
    district: '斜土路街道',
    name: '星美术馆',
    address: '瑞宁路 111 号',
    lng: 121.4657116,
    lat: 31.1897166,
    mapX: 61.58,
    mapY: 15.219,
    route: '47.541,79.822 49.362,66.702 49.908,44.360 51.546,26.627 57.008,18.825 61.580,15.219',
    suggestion: '把“星美术馆”与本卡坐标发给同行者，抵达后请以现场指引相互确认。',
  },
];

const html = document.documentElement;
const stage = document.querySelector<HTMLElement>('#panorama-stage')!;
const viewport = document.querySelector<HTMLElement>('#panorama-viewport')!;
const mapSheet = document.querySelector<HTMLElement>('#map-sheet')!;
const mapImage = document.querySelector<HTMLImageElement>('#map-image')!;
const mapCallout = document.querySelector<HTMLElement>('#map-callout')!;
const route = document.querySelector<SVGPolylineElement>('#demo-route')!;
const routeShadow = document.querySelector<SVGPolylineElement>('#demo-route-shadow')!;
const positionNumber = document.querySelector<HTMLElement>('#position-number')!;
const calloutIndex = document.querySelector<HTMLElement>('#callout-index')!;
const calloutName = document.querySelector<HTMLElement>('#callout-name')!;
const calloutAddress = document.querySelector<HTMLElement>('#callout-address')!;
const cardIndex = document.querySelector<HTMLElement>('#card-index')!;
const cardDistrict = document.querySelector<HTMLElement>('#card-district')!;
const cardName = document.querySelector<HTMLElement>('#card-name')!;
const cardAddress = document.querySelector<HTMLElement>('#card-address')!;
const cardCoordinates = document.querySelector<HTMLElement>('#card-coordinates')!;
const cardSuggestion = document.querySelector<HTMLElement>('#card-suggestion')!;
const previousButton = document.querySelector<HTMLButtonElement>('#prev-landmark')!;
const nextButton = document.querySelector<HTMLButtonElement>('#next-landmark')!;
const saveButton = document.querySelector<HTMLButtonElement>('#save-meeting-card')!;
const saveStatus = document.querySelector<HTMLElement>('#save-status')!;
const mapPins = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-landmark-id]'));
const fallbackButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-fallback-id]'));
const railStops = Array.from(document.querySelectorAll<HTMLElement>('[data-rail-index]'));
const assetUrl = new URL('./assets/xuhui-west-bund-osm-map-v1.jpg', import.meta.url).href;
const storageKey = 'r136b-west-bund-saved-meeting-point';

let activeIndex = 0;
let savedId: LandmarkId | null = null;
let imageLoaded = false;
let fallback = forcedFallback;
let dragging = false;
let dragPointerId: number | null = null;
let dragStartX = 0;
let dragStartScroll = 0;
let programmaticIndex: number | null = null;
let programmaticTimer = 0;
let snapTimer = 0;

function landmarkById(id: LandmarkId): Landmark {
  const landmark = landmarks.find((item) => item.id === id);
  if (!landmark) throw new Error(`Unknown landmark: ${id}`);
  return landmark;
}

function maximumScroll(): number {
  return Math.max(0, viewport.scrollWidth - viewport.clientWidth);
}

function normalizedPosition(): number {
  const maximum = maximumScroll();
  return maximum > 0 ? Math.max(0, Math.min(1, viewport.scrollLeft / maximum)) : 0;
}

function targetForIndex(index: number): number {
  return maximumScroll() * index / Math.max(1, landmarks.length - 1);
}

function nearestIndex(): number {
  return Math.max(0, Math.min(landmarks.length - 1, Math.round(normalizedPosition() * (landmarks.length - 1))));
}

function coordinates(landmark: Landmark): string {
  return `${landmark.lng.toFixed(7)}, ${landmark.lat.toFixed(7)}`;
}

function readSavedId(): LandmarkId | null {
  try {
    const value = window.localStorage.getItem(storageKey) as LandmarkId | null;
    return value && landmarks.some((item) => item.id === value) ? value : null;
  } catch {
    return null;
  }
}

function writeSavedId(id: LandmarkId): void {
  try {
    window.localStorage.setItem(storageKey, id);
  } catch {
    // The visible in-memory saved state remains useful if storage is unavailable.
  }
}

function updateSavedState(landmark: Landmark): void {
  const currentIsSaved = savedId === landmark.id;
  html.dataset.saved = String(savedId !== null);
  saveButton.dataset.saved = String(currentIsSaved);
  saveButton.querySelector('span')!.textContent = currentIsSaved ? '集合点卡已保存' : '保存集合点卡';
  saveButton.querySelector('i')!.textContent = currentIsSaved ? '✓' : '＋';
  if (currentIsSaved) {
    saveStatus.textContent = `已在本浏览器保存：${landmark.name}集合点卡。`;
  } else if (savedId) {
    saveStatus.textContent = `已保存${landmarkById(savedId).name}；可用当前地标替换。`;
  } else {
    saveStatus.textContent = '';
  }
}

function updatePositionVisuals(): void {
  const position = normalizedPosition();
  html.style.setProperty('--position', position.toFixed(4));
}

function updateSelection(index: number): void {
  const landmark = landmarks[index];
  activeIndex = index;
  positionNumber.textContent = landmark.index;
  cardIndex.textContent = landmark.index;
  cardDistrict.textContent = landmark.district;
  cardName.textContent = landmark.name;
  cardAddress.textContent = landmark.address;
  cardCoordinates.textContent = coordinates(landmark);
  cardSuggestion.textContent = landmark.suggestion;
  calloutIndex.textContent = landmark.index;
  calloutName.textContent = landmark.name;
  calloutAddress.textContent = landmark.address;
  mapCallout.style.setProperty('--callout-x', `${landmark.mapX}%`);
  mapCallout.style.setProperty('--callout-y', `${landmark.mapY}%`);
  mapCallout.dataset.edge = landmark.mapY < 36 ? 'north' : 'south';
  route.setAttribute('points', landmark.route);
  routeShadow.setAttribute('points', landmark.route);
  previousButton.disabled = index === 0;
  nextButton.disabled = index === landmarks.length - 1;
  nextButton.childNodes[0].textContent = index === landmarks.length - 1 ? '已到最后一站 ' : '下一站 ';

  mapPins.forEach((button) => {
    const active = button.dataset.landmarkId === landmark.id;
    button.setAttribute('aria-pressed', String(active));
    if (active) button.setAttribute('aria-current', 'location');
    else button.removeAttribute('aria-current');
  });
  fallbackButtons.forEach((button) => {
    const active = button.dataset.fallbackId === landmark.id;
    button.setAttribute('aria-pressed', String(active));
    if (active) button.setAttribute('aria-current', 'location');
    else button.removeAttribute('aria-current');
  });
  railStops.forEach((stop) => { stop.dataset.active = String(Number(stop.dataset.railIndex) === index); });
  updateSavedState(landmark);
}

function releaseProgrammaticScroll(): void {
  window.clearTimeout(programmaticTimer);
  programmaticTimer = window.setTimeout(() => {
    programmaticIndex = null;
    updatePositionVisuals();
  }, reducedMotion ? 0 : 520);
}

function selectIndex(index: number, movePosition = true): void {
  const bounded = Math.max(0, Math.min(landmarks.length - 1, index));
  updateSelection(bounded);
  if (movePosition) {
    programmaticIndex = bounded;
    viewport.scrollTo({ left: targetForIndex(bounded), behavior: reducedMotion ? 'auto' : 'smooth' });
    releaseProgrammaticScroll();
  }
  updatePositionVisuals();
}

function selectLandmark(id: LandmarkId, movePosition = true): void {
  selectIndex(landmarkById(id).order, movePosition);
}

function cancelProgrammaticScroll(): void {
  window.clearTimeout(programmaticTimer);
  programmaticIndex = null;
}

function snapToNearest(): void {
  window.clearTimeout(snapTimer);
  snapTimer = window.setTimeout(() => selectIndex(nearestIndex(), true), 130);
}

function setFallback(next: boolean): void {
  fallback = next;
  html.dataset.fallback = String(next);
  if (next) {
    imageLoaded = false;
    mapImage.hidden = true;
  } else {
    mapImage.hidden = false;
  }
}

function moveBy(direction: number): void {
  selectIndex(activeIndex + direction, true);
}

viewport.addEventListener('scroll', () => {
  updatePositionVisuals();
  if (programmaticIndex !== null || dragging) return;
  const next = nearestIndex();
  if (next !== activeIndex) updateSelection(next);
}, { passive: true });

stage.addEventListener('wheel', (event) => {
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (!Number.isFinite(delta) || Math.abs(delta) < .1) return;
  cancelProgrammaticScroll();
  event.preventDefault();
  const maximum = maximumScroll();
  const scaledDelta = delta * Math.max(1, maximum / Math.max(1, viewport.clientWidth * 2.6));
  viewport.scrollLeft = Math.max(0, Math.min(maximum, viewport.scrollLeft + scaledDelta));
  const next = nearestIndex();
  if (next !== activeIndex) updateSelection(next);
  snapToNearest();
}, { passive: false });

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('button, a'));
}

function startDrag(event: PointerEvent): void {
  if (event.button !== 0 || isInteractiveTarget(event.target)) return;
  cancelProgrammaticScroll();
  dragging = true;
  dragPointerId = event.pointerId;
  dragStartX = event.clientX;
  dragStartScroll = viewport.scrollLeft;
  viewport.dataset.dragging = 'true';
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function continueDrag(event: PointerEvent): void {
  if (!dragging || dragPointerId !== event.pointerId) return;
  const maximum = maximumScroll();
  const scale = maximum / Math.max(1, stage.clientWidth * 1.25);
  viewport.scrollLeft = Math.max(0, Math.min(maximum, dragStartScroll - (event.clientX - dragStartX) * scale));
  const next = nearestIndex();
  if (next !== activeIndex) updateSelection(next);
}

function stopDrag(event: PointerEvent): void {
  if (!dragging || dragPointerId !== event.pointerId) return;
  dragging = false;
  dragPointerId = null;
  viewport.dataset.dragging = 'false';
  snapToNearest();
}

for (const surface of [mapSheet, viewport]) {
  surface.addEventListener('pointerdown', startDrag);
  surface.addEventListener('pointermove', continueDrag);
  surface.addEventListener('pointerup', stopDrag);
  surface.addEventListener('pointercancel', stopDrag);
}

window.addEventListener('keydown', (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  moveBy(event.key === 'ArrowRight' ? 1 : -1);
});

mapPins.forEach((button) => {
  button.addEventListener('click', () => selectLandmark(button.dataset.landmarkId as LandmarkId));
});

fallbackButtons.forEach((button) => {
  button.addEventListener('click', () => selectLandmark(button.dataset.fallbackId as LandmarkId));
});

previousButton.addEventListener('click', () => moveBy(-1));
nextButton.addEventListener('click', () => moveBy(1));

saveButton.addEventListener('click', () => {
  const landmark = landmarks[activeIndex];
  savedId = landmark.id;
  writeSavedId(landmark.id);
  updateSavedState(landmark);
});

mapImage.addEventListener('load', () => {
  imageLoaded = true;
  setFallback(false);
});
mapImage.addEventListener('error', () => setFallback(true));

if (forcedFallback) {
  mapImage.removeAttribute('src');
  setFallback(true);
} else if (mapImage.complete && mapImage.naturalWidth > 0) {
  imageLoaded = true;
}

window.addEventListener('resize', () => {
  cancelProgrammaticScroll();
  viewport.scrollLeft = targetForIndex(activeIndex);
  updatePositionVisuals();
});

savedId = readSavedId();
selectIndex(0, false);
viewport.scrollLeft = 0;
updatePositionVisuals();
html.dataset.ready = 'true';

const runtime = {
  snapshot: () => ({
    ready: html.dataset.ready === 'true',
    activeLandmark: landmarks[activeIndex].id,
    activeName: landmarks[activeIndex].name,
    activeAddress: landmarks[activeIndex].address,
    coordinates: coordinates(landmarks[activeIndex]),
    positionIndex: activeIndex,
    position: Number(normalizedPosition().toFixed(4)),
    scrollLeft: Math.round(viewport.scrollLeft),
    savedId,
    imageLoaded,
    fallback,
    reducedMotion,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    assetUrl,
    routeIsProductDemo: true,
    revision,
  }),
  selectLandmark: (id: LandmarkId) => selectLandmark(id),
  setFallback,
};

declare global {
  interface Window { __westBundMeetingPoints?: typeof runtime }
}

window.__westBundMeetingPoints = runtime;
