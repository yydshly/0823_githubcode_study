type SampleId =
  | 'glass-bead'
  | 'micro-prism'
  | 'reflective-thread'
  | 'honeycomb-film'
  | 'perforated-silver'
  | 'reflective-pigment'
  | 'segmented-guide'
  | 'frosted-return';

type DriveMode = 'demo' | 'manual' | 'paused';

interface SampleDefinition {
  id: SampleId;
  name: string;
  response: string;
  accent: string;
}

interface CatalogSnapshot {
  ready: boolean;
  filter: string;
  visibleCount: number;
  selected: SampleId[];
  selectedCount: number;
  beamX: number;
  beamY: number;
  activeSample: SampleId | null;
  driveMode: DriveMode;
  dialogOpen: boolean;
  saved: boolean;
  fallback: boolean;
  reducedMotion: boolean;
  frames: number;
  canvasCount: number;
  canvasVisualHash: string;
  horizontalOverflow: boolean;
  revision: string;
}

declare global {
  interface Window {
    __nightReflectiveCatalog?: {
      snapshot: () => CatalogSnapshot;
      setFilter: (filter: string) => CatalogSnapshot;
      selectSample: (id: SampleId) => CatalogSnapshot;
      setBeam: (x: number, y: number, id?: SampleId) => CatalogSnapshot;
      openCompare: () => CatalogSnapshot;
      closeCompare: () => CatalogSnapshot;
      save: () => CatalogSnapshot;
      reset: () => CatalogSnapshot;
    };
  }
}

const samples: readonly SampleDefinition[] = [
  { id: 'glass-bead', name: '玻璃微珠织带', response: '细小玻璃珠形成均匀、柔和的回射点阵。', accent: '#e8eee6' },
  { id: 'micro-prism', name: '微棱镜薄膜', response: '三角切面把光集中成锐利、跳动的高亮。', accent: '#d9ff38' },
  { id: 'reflective-thread', name: '反光纱线', response: '纱线方向决定亮带走向，弯折处出现断续反射。', accent: '#ff8e56' },
  { id: 'honeycomb-film', name: '蜂巢反光膜', response: '六边单元让亮度沿边缘分区展开。', accent: '#f6ca54' },
  { id: 'perforated-silver', name: '穿孔银膜', response: '银面与透气孔交替，产生清楚的明暗节奏。', accent: '#ebeee7' },
  { id: 'reflective-pigment', name: '反光颜料网', response: '不规则颗粒产生宽松、带噪点的漫射亮斑。', accent: '#ff6a2b' },
  { id: 'segmented-guide', name: '分段导向贴', response: '断续切片把光组织成具有方向性的道路节奏。', accent: '#d9ff38' },
  { id: 'frosted-return', name: '雾面回射片', response: '低锐度表面把光扩展为更宽、更柔的光晕。', accent: '#cfdfd9' }
];

const sampleById = new Map(samples.map((sample) => [sample.id, sample]));
const materialClassById: Record<SampleId, string> = {
  'glass-bead': 'material-glass',
  'micro-prism': 'material-prism',
  'reflective-thread': 'material-thread',
  'honeycomb-film': 'material-honeycomb',
  'perforated-silver': 'material-perforated',
  'reflective-pigment': 'material-pigment',
  'segmented-guide': 'material-segment',
  'frosted-return': 'material-frosted'
};
const html = document.documentElement;
const query = new URLSearchParams(location.search);
const revision = query.get('revision') || 'r128-live';
const forcedFallback = ['1', 'true', 'canvas', 'off'].includes((query.get('fallback') || '').toLowerCase());
const reducedMotion = query.get('motion') === 'reduce'
  || (query.get('motion') !== 'full' && matchMedia('(prefers-reduced-motion: reduce)').matches);

const cards = Array.from(document.querySelectorAll<HTMLElement>('.sample-card'));
const filterButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('#filter-bar [data-filter]'));
const compareDock = must<HTMLElement>('#compare-dock');
const compareCount = must<HTMLElement>('#compare-count');
const dockSwatches = must<HTMLElement>('.dock-swatches');
const openCompareButton = must<HTMLButtonElement>('#open-compare');
const compareDialog = must<HTMLDialogElement>('#compare-dialog');
const compareGrid = must<HTMLElement>('#compare-grid');
const closeCompareButton = must<HTMLButtonElement>('#close-compare');
const saveButton = must<HTMLButtonElement>('#save-selection');
const saveStatus = must<HTMLElement>('#save-status');
const liveStatus = must<HTMLElement>('#catalog-live');

const state = {
  ready: false,
  filter: 'all',
  selected: [] as SampleId[],
  beamX: 0.52,
  beamY: 0.42,
  activeSample: null as SampleId | null,
  driveMode: (reducedMotion ? 'paused' : 'demo') as DriveMode,
  dialogOpen: false,
  saved: false,
  fallback: forcedFallback,
  reducedMotion,
  frames: 0,
  lastFrameAt: 0,
  visualHash: 'catalog-initial'
};

html.dataset.fallback = String(state.fallback);
html.dataset.reducedMotion = String(state.reducedMotion);
html.dataset.driveMode = state.driveMode;
html.dataset.catalogFilter = state.filter;
html.dataset.catalogRevision = revision;

const canvasSample = new WeakMap<HTMLCanvasElement, SampleId>();
for (const card of cards) {
  const id = sampleId(card.dataset.sampleId);
  const canvas = card.querySelector<HTMLCanvasElement>('.sample-canvas');
  if (canvas) canvasSample.set(canvas, id);
  card.dataset.selected = 'false';
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => setFilter(button.dataset.filter || 'all'));
});

cards.forEach((card) => {
  const id = sampleId(card.dataset.sampleId);
  const selectButton = card.querySelector<HTMLButtonElement>('.sample-select');
  selectButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleSample(id, selectButton);
  });

  const moveBeam = (clientX: number, clientY: number) => {
    const bounds = card.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    setBeam(
      clamp((clientX - bounds.left) / bounds.width),
      clamp((clientY - bounds.top) / bounds.height),
      id
    );
  };

  card.addEventListener('pointermove', (event) => moveBeam(event.clientX, event.clientY));
  card.addEventListener('pointerdown', (event) => moveBeam(event.clientX, event.clientY));
  card.addEventListener('focus', () => setBeam(state.beamX, state.beamY, id));
  card.addEventListener('keydown', (event) => {
    const delta = event.shiftKey ? 0.14 : 0.065;
    if (event.key === 'ArrowLeft') setBeam(state.beamX - delta, state.beamY, id);
    else if (event.key === 'ArrowRight') setBeam(state.beamX + delta, state.beamY, id);
    else if (event.key === 'ArrowUp') setBeam(state.beamX, state.beamY - delta, id);
    else if (event.key === 'ArrowDown') setBeam(state.beamX, state.beamY + delta, id);
    else if (event.key === 'Home') setBeam(.5, .45, id);
    else if (event.key === 'Enter' && event.target === card) toggleSample(id, selectButton || undefined);
    else return;
    event.preventDefault();
  });
});

openCompareButton.addEventListener('click', () => openCompare());
closeCompareButton.addEventListener('click', () => closeCompare());
saveButton.addEventListener('click', () => saveSelection());
compareDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeCompare();
});
compareDialog.addEventListener('close', () => {
  state.dialogOpen = false;
  updateDatasets();
  openCompareButton.focus();
});

const resizeObserver = new ResizeObserver(() => renderAll());
for (const canvas of document.querySelectorAll<HTMLCanvasElement>('.sample-canvas')) resizeObserver.observe(canvas);

function setFilter(filter: string): CatalogSnapshot {
  const allowed = new Set(['all', 'ride', 'wear', 'route', 'stage']);
  state.filter = allowed.has(filter) ? filter : 'all';
  for (const button of filterButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.filter === state.filter));
  }
  for (const card of cards) {
    const categories = (card.dataset.category || '').split(/\s+/);
    card.hidden = state.filter !== 'all' && !categories.includes(state.filter);
  }
  const count = visibleCards().length;
  liveStatus.textContent = `当前显示 ${count} 件样本。`;
  html.dataset.catalogFilter = state.filter;
  renderAll();
  return snapshot();
}

function toggleSample(id: SampleId, button?: HTMLButtonElement): CatalogSnapshot {
  const existingIndex = state.selected.indexOf(id);
  if (existingIndex >= 0) {
    state.selected.splice(existingIndex, 1);
    state.saved = false;
    liveStatus.textContent = `已从比较中移除${sampleById.get(id)?.name || id}。`;
  } else if (state.selected.length >= 2) {
    liveStatus.textContent = '最多比较两件样本，请先取消一件。';
    button?.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }],
      { duration: 220 }
    );
    return snapshot();
  } else {
    state.selected.push(id);
    state.saved = false;
    liveStatus.textContent = `已选择${sampleById.get(id)?.name || id}。`;
  }
  syncSelectionUI();
  renderAll();
  return snapshot();
}

function syncSelectionUI(): void {
  for (const card of cards) {
    const id = sampleId(card.dataset.sampleId);
    const selected = state.selected.includes(id);
    card.dataset.selected = String(selected);
    const button = card.querySelector<HTMLButtonElement>('.sample-select');
    button?.setAttribute('aria-pressed', String(selected));
    const label = button?.querySelector('span');
    if (label) label.textContent = selected ? '移出比较' : '加入比较';
  }
  compareCount.textContent = `${state.selected.length} / 2`;
  compareDock.dataset.visible = String(state.selected.length > 0);
  openCompareButton.disabled = state.selected.length !== 2;
  dockSwatches.replaceChildren(...state.selected.map((id) => {
    const swatch = document.createElement('i');
    swatch.style.borderColor = sampleById.get(id)?.accent || '#d9ff38';
    return swatch;
  }));
  updateDatasets();
}

function setBeam(x: number, y: number, id?: SampleId): CatalogSnapshot {
  state.beamX = clamp(x);
  state.beamY = clamp(y);
  state.activeSample = id || state.activeSample;
  state.driveMode = 'manual';
  updateDatasets();
  renderAll();
  return snapshot();
}

function openCompare(): CatalogSnapshot {
  if (state.selected.length !== 2) {
    liveStatus.textContent = '请选择两件样本后再比较。';
    return snapshot();
  }
  buildCompareGrid();
  if (typeof compareDialog.showModal === 'function') compareDialog.showModal();
  else compareDialog.setAttribute('open', '');
  state.dialogOpen = true;
  updateDatasets();
  requestAnimationFrame(() => {
    renderCompare();
    closeCompareButton.focus();
  });
  return snapshot();
}

function closeCompare(): CatalogSnapshot {
  if (compareDialog.open && typeof compareDialog.close === 'function') compareDialog.close();
  else compareDialog.removeAttribute('open');
  state.dialogOpen = false;
  updateDatasets();
  openCompareButton.focus();
  return snapshot();
}

function buildCompareGrid(): void {
  compareGrid.replaceChildren(...state.selected.map((id) => {
    const definition = sampleById.get(id)!;
    const article = document.createElement('article');
    article.className = `compare-item ${materialClassById[id]}`;
    article.dataset.sampleId = id;
    const copy = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = definition.name;
    const response = document.createElement('p');
    response.textContent = definition.response;
    copy.append(title, response);
    if (state.fallback) {
      article.append(copy);
    } else {
      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvasSample.set(canvas, id);
      article.append(canvas, copy);
    }
    return article;
  }));
}

function saveSelection(): CatalogSnapshot {
  if (state.selected.length !== 2) return snapshot();
  try {
    localStorage.setItem('kage-r128-reflective-selection', JSON.stringify(state.selected));
    state.saved = true;
    saveStatus.textContent = `已收藏 ${state.selected.map((id) => sampleById.get(id)?.name).join(' + ')}。`;
    liveStatus.textContent = saveStatus.textContent;
  } catch {
    state.saved = false;
    saveStatus.textContent = '当前浏览器无法保存，但这组比较仍保留在页面中。';
  }
  updateDatasets();
  return snapshot();
}

function reset(): CatalogSnapshot {
  state.selected = [];
  state.filter = 'all';
  state.beamX = .52;
  state.beamY = .42;
  state.activeSample = null;
  state.driveMode = state.reducedMotion ? 'paused' : 'demo';
  state.saved = false;
  if (state.dialogOpen) closeCompare();
  setFilter('all');
  syncSelectionUI();
  return snapshot();
}

function renderAll(timestamp = performance.now()): void {
  if (state.fallback) {
    state.visualHash = visualHash();
    return;
  }
  for (const card of cards) {
    if (card.hidden) continue;
    const canvas = card.querySelector<HTMLCanvasElement>('.sample-canvas');
    if (!canvas) continue;
    const id = sampleId(card.dataset.sampleId);
    drawMaterial(canvas, id, state.beamX, state.beamY, state.activeSample === id ? 1.15 : .84, timestamp);
  }
  if (state.dialogOpen) renderCompare(timestamp);
  state.visualHash = visualHash();
}

function renderCompare(timestamp = performance.now()): void {
  if (state.fallback) return;
  compareGrid.querySelectorAll<HTMLCanvasElement>('canvas').forEach((canvas) => {
    const id = canvasSample.get(canvas);
    if (id) drawMaterial(canvas, id, state.beamX, state.beamY, 1.06, timestamp);
  });
}

function drawMaterial(
  canvas: HTMLCanvasElement,
  id: SampleId,
  beamX: number,
  beamY: number,
  boost: number,
  timestamp: number
): void {
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.max(1, Math.round(rect.width));
  const cssHeight = Math.max(1, Math.round(rect.height));
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  const width = Math.round(cssWidth * dpr);
  const height = Math.round(cssHeight * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext('2d');
  if (!context) return;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = cssWidth;
  const h = cssHeight;
  const x = beamX * w;
  const y = beamY * h;
  const radius = Math.max(w, h) * (id === 'frosted-return' ? .62 : .43);

  const base = context.createLinearGradient(0, 0, w, h);
  base.addColorStop(0, '#20231d');
  base.addColorStop(.48, '#0f110e');
  base.addColorStop(1, '#252720');
  context.fillStyle = base;
  context.fillRect(0, 0, w, h);

  context.save();
  context.globalCompositeOperation = 'screen';
  if (id === 'glass-bead') drawGlassBeads(context, w, h, x, y, radius, boost);
  else if (id === 'micro-prism') drawMicroPrisms(context, w, h, x, y, radius, boost);
  else if (id === 'reflective-thread') drawThreads(context, w, h, x, y, radius, boost);
  else if (id === 'honeycomb-film') drawHoneycomb(context, w, h, x, y, radius, boost);
  else if (id === 'perforated-silver') drawPerforated(context, w, h, x, y, radius, boost);
  else if (id === 'reflective-pigment') drawPigment(context, w, h, x, y, radius, boost);
  else if (id === 'segmented-guide') drawSegments(context, w, h, x, y, radius, boost);
  else drawFrosted(context, w, h, x, y, radius, boost, timestamp);

  const lamp = context.createRadialGradient(x, y, 0, x, y, radius);
  lamp.addColorStop(0, `rgba(246,249,230,${.46 * boost})`);
  lamp.addColorStop(.22, `rgba(217,255,56,${.13 * boost})`);
  lamp.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = lamp;
  context.fillRect(0, 0, w, h);
  context.restore();

  const shade = context.createLinearGradient(0, 0, 0, h);
  shade.addColorStop(0, 'rgba(0,0,0,.08)');
  shade.addColorStop(.62, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,.48)');
  context.fillStyle = shade;
  context.fillRect(0, 0, w, h);
}

function drawGlassBeads(ctx: CanvasRenderingContext2D, w: number, h: number, x: number, y: number, radius: number, boost: number): void {
  for (let i = 0; i < 360; i += 1) {
    const px = seeded(i * 2 + 11) * w;
    const py = seeded(i * 3 + 31) * h;
    const proximity = response(px, py, x, y, radius);
    const size = .65 + seeded(i * 5 + 7) * 2.5;
    ctx.beginPath();
    ctx.arc(px, py, size + proximity * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(232,238,230,${.08 + proximity * .92 * boost})`;
    ctx.fill();
  }
}

function drawMicroPrisms(ctx: CanvasRenderingContext2D, w: number, h: number, x: number, y: number, radius: number, boost: number): void {
  const size = 34;
  for (let row = -1; row < h / size + 2; row += 1) {
    for (let col = -1; col < w / size + 2; col += 1) {
      const px = col * size + (row % 2) * size * .5;
      const py = row * size * .86;
      const proximity = response(px, py, x, y, radius);
      ctx.beginPath();
      ctx.moveTo(px, py - size * .45);
      ctx.lineTo(px + size * .5, py + size * .42);
      ctx.lineTo(px - size * .5, py + size * .42);
      ctx.closePath();
      ctx.strokeStyle = `rgba(217,255,56,${.07 + proximity * .75 * boost})`;
      ctx.lineWidth = 1 + proximity * 1.4;
      ctx.stroke();
      if (proximity > .52) {
        ctx.fillStyle = `rgba(239,255,175,${(proximity - .5) * .42 * boost})`;
        ctx.fill();
      }
    }
  }
}

function drawThreads(ctx: CanvasRenderingContext2D, w: number, h: number, x: number, y: number, radius: number, boost: number): void {
  ctx.lineCap = 'round';
  for (let line = -h; line < w + h; line += 12) {
    const px = line + h * .5;
    const py = h * .5;
    const proximity = response(px, py, x, y, radius * 1.2);
    ctx.beginPath();
    ctx.moveTo(line, h);
    ctx.quadraticCurveTo(line + h * .54, h * .44 + Math.sin(line * .03) * 8, line + h, 0);
    ctx.strokeStyle = `rgba(255,142,86,${.08 + proximity * .8 * boost})`;
    ctx.lineWidth = 1.2 + proximity * 3.1;
    ctx.stroke();
  }
  for (let yLine = 0; yLine < h; yLine += 18) {
    ctx.strokeStyle = 'rgba(226,232,225,.075)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, yLine);
    ctx.lineTo(w, yLine + Math.sin(yLine) * 2);
    ctx.stroke();
  }
}

function drawHoneycomb(ctx: CanvasRenderingContext2D, w: number, h: number, x: number, y: number, radius: number, boost: number): void {
  const cell = 28;
  for (let row = -1; row < h / (cell * 1.5) + 2; row += 1) {
    for (let col = -1; col < w / (cell * 1.73) + 2; col += 1) {
      const px = col * cell * 1.73 + (row % 2) * cell * .86;
      const py = row * cell * 1.5;
      const proximity = response(px, py, x, y, radius);
      hexagon(ctx, px, py, cell * .82);
      ctx.strokeStyle = `rgba(246,202,84,${.08 + proximity * .78 * boost})`;
      ctx.lineWidth = 1 + proximity * 2.4;
      ctx.stroke();
    }
  }
}

function drawPerforated(ctx: CanvasRenderingContext2D, w: number, h: number, x: number, y: number, radius: number, boost: number): void {
  const silver = ctx.createLinearGradient(0, 0, w, h);
  silver.addColorStop(0, 'rgba(203,207,199,.14)');
  silver.addColorStop(.5, 'rgba(250,252,246,.28)');
  silver.addColorStop(1, 'rgba(150,154,148,.08)');
  ctx.fillStyle = silver;
  ctx.fillRect(0, 0, w, h);
  for (let py = 16; py < h; py += 28) {
    for (let px = 16; px < w; px += 28) {
      const proximity = response(px, py, x, y, radius);
      ctx.beginPath();
      ctx.arc(px + ((py / 28) % 2) * 7, py, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(4,5,4,${.72 - proximity * .25})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(235,238,231,${.12 + proximity * .82 * boost})`;
      ctx.lineWidth = 1.2 + proximity;
      ctx.stroke();
    }
  }
}

function drawPigment(ctx: CanvasRenderingContext2D, w: number, h: number, x: number, y: number, radius: number, boost: number): void {
  for (let i = 0; i < 620; i += 1) {
    const px = seeded(i * 7 + 19) * w;
    const py = seeded(i * 11 + 37) * h;
    const proximity = response(px, py, x, y, radius * 1.12);
    const size = .35 + seeded(i * 13 + 5) * 2.1;
    ctx.fillStyle = `rgba(255,106,43,${.04 + proximity * .78 * boost * seeded(i + 99)})`;
    ctx.fillRect(px, py, size * (1 + proximity * 2), size);
  }
}

function drawSegments(ctx: CanvasRenderingContext2D, w: number, h: number, x: number, y: number, radius: number, boost: number): void {
  ctx.save();
  ctx.translate(w * .5, h * .5);
  ctx.rotate(-.16);
  for (let row = -4; row <= 4; row += 1) {
    for (let col = -7; col <= 7; col += 1) {
      const px = col * 72;
      const py = row * 48;
      const worldX = px + w * .5;
      const worldY = py + h * .5;
      const proximity = response(worldX, worldY, x, y, radius * 1.1);
      ctx.fillStyle = `rgba(217,255,56,${.07 + proximity * .82 * boost})`;
      ctx.fillRect(px - 25, py - 8, 51, 16);
    }
  }
  ctx.restore();
}

function drawFrosted(ctx: CanvasRenderingContext2D, w: number, h: number, x: number, y: number, radius: number, boost: number, timestamp: number): void {
  const haze = ctx.createRadialGradient(x, y, 0, x, y, radius);
  haze.addColorStop(0, `rgba(225,235,228,${.7 * boost})`);
  haze.addColorStop(.3, `rgba(183,204,194,${.34 * boost})`);
  haze.addColorStop(1, 'rgba(150,170,160,0)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, w, h);
  ctx.lineWidth = 1;
  for (let row = 0; row < 22; row += 1) {
    ctx.beginPath();
    for (let px = 0; px <= w; px += 12) {
      const py = (row / 21) * h + Math.sin(px * .025 + row * .7 + timestamp * .0002) * 7;
      if (px === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = 'rgba(220,230,223,.07)';
    ctx.stroke();
  }
}

function animationLoop(timestamp: number): void {
  if (!state.ready) return;
  if (state.driveMode === 'demo' && !state.reducedMotion && !state.fallback) {
    if (timestamp - state.lastFrameAt >= 32) {
      state.lastFrameAt = timestamp;
      state.beamX = .5 + Math.sin(timestamp * .00044) * .34;
      state.beamY = .46 + Math.cos(timestamp * .00031) * .2;
      state.frames += 1;
      renderAll(timestamp);
    }
  }
  requestAnimationFrame(animationLoop);
}

function snapshot(): CatalogSnapshot {
  return {
    ready: state.ready,
    filter: state.filter,
    visibleCount: visibleCards().length,
    selected: [...state.selected],
    selectedCount: state.selected.length,
    beamX: round(state.beamX),
    beamY: round(state.beamY),
    activeSample: state.activeSample,
    driveMode: state.driveMode,
    dialogOpen: state.dialogOpen,
    saved: state.saved,
    fallback: state.fallback,
    reducedMotion: state.reducedMotion,
    frames: state.frames,
    canvasCount: state.fallback ? 0 : document.querySelectorAll('.sample-canvas').length,
    canvasVisualHash: state.visualHash,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    revision
  };
}

function updateDatasets(): void {
  html.dataset.driveMode = state.driveMode;
  html.dataset.catalogState = state.dialogOpen ? 'compare' : state.saved ? 'saved' : state.selected.length ? 'inspect' : 'overview';
  html.dataset.selectedCount = String(state.selected.length);
}

function visualHash(): string {
  const source = `${state.filter}|${state.selected.join(',')}|${round(state.beamX)}|${round(state.beamY)}|${state.activeSample}|${state.driveMode}|${state.dialogOpen}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `catalog-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function response(px: number, py: number, x: number, y: number, radius: number): number {
  return Math.max(0, 1 - Math.hypot(px - x, py - y) / radius) ** 1.6;
}

function seeded(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function hexagon(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  ctx.beginPath();
  for (let side = 0; side < 6; side += 1) {
    const angle = Math.PI / 3 * side;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (side === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function visibleCards(): HTMLElement[] {
  return cards.filter((card) => !card.hidden);
}

function sampleId(value: string | undefined): SampleId {
  if (value && sampleById.has(value as SampleId)) return value as SampleId;
  throw new Error(`Unknown material sample: ${value || 'missing'}`);
}

function must<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element;
}

function clamp(value: number): number { return Math.min(1, Math.max(0, value)); }
function round(value: number): number { return Math.round(value * 10000) / 10000; }

window.__nightReflectiveCatalog = {
  snapshot,
  setFilter,
  selectSample: (id) => toggleSample(id),
  setBeam,
  openCompare,
  closeCompare,
  save: saveSelection,
  reset
};

syncSelectionUI();
setFilter('all');
renderAll();
requestAnimationFrame(() => {
  state.ready = true;
  html.dataset.r128Ready = 'true';
  updateDatasets();
  renderAll();
  requestAnimationFrame(animationLoop);
});

export {};
