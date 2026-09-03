const root = document.documentElement;
const shell = document.querySelector<HTMLElement>('#chart-shell');
const revealCircle = document.querySelector<SVGCircleElement>('#reveal-circle');
const lamp = document.querySelector<HTMLElement>('#lamp');
const scanNote = document.querySelector<HTMLElement>('#scan-note');
const foundCount = document.querySelector<HTMLElement>('#found-count');
const completion = document.querySelector<HTMLElement>('#completion');
const saveButton = document.querySelector<HTMLButtonElement>('#save-route');
const canvas = document.querySelector<HTMLCanvasElement>('#caustics');
const waveLabel = document.querySelector<HTMLElement>('#wavelength-label');

if (!shell || !revealCircle || !lamp || !scanNote || !foundCount || !completion || !saveButton || !canvas || !waveLabel) {
  throw new Error('R160 required surface is missing');
}

type BeaconId = 'a' | 'b' | 'c';
type Point = { x: number; y: number };

const viewBox = { width: 1200, height: 760 };
const beaconPoints: Record<BeaconId, Point> = {
  a: { x: 265, y: 500 },
  b: { x: 610, y: 335 },
  c: { x: 930, y: 255 },
};
const beaconNames: Record<BeaconId, string> = { a: '北湾', b: '裂隙', c: '东岬' };
const found = new Set<BeaconId>();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let target: Point = { x: 690, y: 350 };
let current: Point = { ...target };
let lastPointer = { clientX: 0, clientY: 0 };
let canvasContext: CanvasRenderingContext2D | null = null;
let raf = 0;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clientToChart(clientX: number, clientY: number): Point {
  const rect = shell.getBoundingClientRect();
  return {
    x: clamp(((clientX - rect.left) / rect.width) * viewBox.width, 55, viewBox.width - 55),
    y: clamp(((clientY - rect.top) / rect.height) * viewBox.height, 35, viewBox.height - 55),
  };
}

function renderLight(point: Point) {
  revealCircle.setAttribute('cx', point.x.toFixed(1));
  revealCircle.setAttribute('cy', point.y.toFixed(1));
  lamp.style.left = `${(point.x / viewBox.width) * 100}%`;
  lamp.style.top = `${(point.y / viewBox.height) * 100}%`;
  root.dataset.lightX = point.x.toFixed(0);
  root.dataset.lightY = point.y.toFixed(0);
}

function frame(time: number) {
  const ease = reducedMotion ? 1 : 0.16;
  current.x += (target.x - current.x) * ease;
  current.y += (target.y - current.y) * ease;
  renderLight(current);
  drawCaustics(time);
  raf = requestAnimationFrame(frame);
}

function setTarget(point: Point) {
  target = point;
  if (reducedMotion) {
    current = { ...point };
    renderLight(current);
  }
}

function nearestBeacon() {
  let best: { id: BeaconId; distance: number } | null = null;
  for (const id of Object.keys(beaconPoints) as BeaconId[]) {
    if (found.has(id)) continue;
    const point = beaconPoints[id];
    const distance = Math.hypot(current.x - point.x, current.y - point.y);
    if (!best || distance < best.distance) best = { id, distance };
  }
  return best;
}

function updateInterface(id: BeaconId) {
  const fixed = document.querySelector<SVGCircleElement>(`[data-fixed="${id}"]`);
  const listItem = document.querySelector<HTMLElement>(`[data-list-beacon="${id}"]`);
  fixed?.classList.add('is-found');
  listItem?.classList.add('is-found');
  const detail = listItem?.querySelector('em');
  if (detail) detail.textContent = '坐标已固定';
  foundCount.textContent = `${found.size} / 3`;
  root.dataset.foundCount = String(found.size);

  if (found.size === 3) {
    root.dataset.state = 'route-complete';
    scanNote.textContent = '返航线已恢复 · 可以保存这次显影';
    completion.setAttribute('aria-hidden', 'false');
    window.setTimeout(() => saveButton.focus({ preventScroll: true }), reducedMotion ? 0 : 650);
  } else {
    scanNote.textContent = `${beaconNames[id]}印记已固定 · 继续寻找 ${3 - found.size} 枚`;
  }
}

function attemptReveal() {
  if (found.size === 3) return;
  const nearest = nearestBeacon();
  if (nearest && nearest.distance <= 96) {
    found.add(nearest.id);
    updateInterface(nearest.id);
    return;
  }
  scanNote.classList.remove('is-miss');
  void scanNote.offsetWidth;
  scanNote.classList.add('is-miss');
  scanNote.textContent = '纸面只有盐迹 · 把光移向靛蓝印记';
}

shell.addEventListener('pointermove', (event) => {
  lastPointer = { clientX: event.clientX, clientY: event.clientY };
  setTarget(clientToChart(event.clientX, event.clientY));
});
shell.addEventListener('pointerdown', (event) => {
  shell.setPointerCapture?.(event.pointerId);
  setTarget(clientToChart(event.clientX, event.clientY));
  current = { ...target };
  renderLight(current);
  attemptReveal();
});

shell.addEventListener('keydown', (event) => {
  const movement: Record<string, Point> = {
    ArrowLeft: { x: -42, y: 0 }, ArrowRight: { x: 42, y: 0 },
    ArrowUp: { x: 0, y: -42 }, ArrowDown: { x: 0, y: 42 },
  };
  if (movement[event.key]) {
    event.preventDefault();
    const delta = movement[event.key];
    setTarget({ x: clamp(target.x + delta.x, 55, 1145), y: clamp(target.y + delta.y, 35, 705) });
    current = { ...target };
    renderLight(current);
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    attemptReveal();
  }
});

document.querySelectorAll<HTMLButtonElement>('.wavelength').forEach((button) => {
  button.addEventListener('click', () => {
    const wave = button.dataset.wave ?? 'warm';
    root.dataset.wave = wave;
    document.querySelectorAll<HTMLButtonElement>('.wavelength').forEach((item) => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    waveLabel.textContent = ({ warm: '暖白 / 520nm', cyan: '青光 / 490nm', violet: '紫外 / 405nm' } as Record<string, string>)[wave];
  });
});

saveButton.addEventListener('click', () => {
  root.dataset.state = 'saved';
  saveButton.innerHTML = '已保存到虚构档案 <span>✓</span>';
  saveButton.disabled = true;
  scanNote.textContent = '显影完成 · 返航线已留在纸面';
});

function setupCanvas() {
  if (new URLSearchParams(location.search).get('canvas') === 'off') {
    root.dataset.canvasFallback = 'true';
    return;
  }
  try {
    canvasContext = canvas.getContext('2d');
    if (!canvasContext) throw new Error('2D canvas unavailable');
    resizeCanvas();
  } catch {
    root.dataset.canvasFallback = 'true';
  }
}

function resizeCanvas() {
  const dpr = Math.min(devicePixelRatio || 1, 1.6);
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  canvasContext?.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawCaustics(time: number) {
  if (!canvasContext || reducedMotion) return;
  const ctx = canvasContext;
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineWidth = 1;
  const originX = lastPointer.clientX || innerWidth * .68;
  const originY = lastPointer.clientY || innerHeight * .45;
  for (let i = 0; i < 11; i += 1) {
    const phase = time * .00028 + i * .71;
    ctx.beginPath();
    for (let x = -80; x <= innerWidth + 80; x += 36) {
      const y = originY + Math.sin(x * .009 + phase) * (24 + i * 2.4) + (i - 5) * 46;
      if (x === -80) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(127, 224, 202, ${.018 + (i % 3) * .008})`;
    ctx.stroke();
  }
  const glow = ctx.createRadialGradient(originX, originY, 0, originX, originY, 260);
  glow.addColorStop(0, 'rgba(255,244,184,.07)');
  glow.addColorStop(1, 'rgba(255,244,184,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, innerWidth, innerHeight);
  ctx.restore();
}

addEventListener('resize', resizeCanvas);
addEventListener('beforeunload', () => cancelAnimationFrame(raf));
setupCanvas();
renderLight(current);
root.dataset.assetBatchCount = '0';
root.dataset.mediumRoute = 'svg-mask-canvas-runtime';
root.dataset.r160Ready = 'true';
raf = requestAnimationFrame(frame);

