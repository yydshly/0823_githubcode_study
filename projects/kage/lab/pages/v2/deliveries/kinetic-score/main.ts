type Beat = {
  name: string;
  instruction: string;
  direction: number;
  energy: number;
  duration: number;
  color: string;
};

type KineticSnapshot = {
  ready: boolean;
  activeBeat: number;
  activeName: string;
  direction: number;
  energy: number;
  duration: number;
  wheelProgress: number;
  pointer: { x: number; y: number };
  frames: number;
  fallback: boolean;
  reducedMotion: boolean;
  horizontalOverflow: boolean;
  saved: boolean;
};

declare global {
  interface Window {
    __kineticScore?: {
      snapshot: () => KineticSnapshot;
      selectBeat: (index: number) => void;
    };
  }
}

const beats: Beat[] = [
  { name: '压低', instruction: '重心向左脚掌落下，让肩线延迟半拍。', direction: -18, energy: 46, duration: 12, color: '#ff4b19' },
  { name: '转身', instruction: '右肩引导旋转，手臂留下一条未闭合的弧。', direction: 38, energy: 72, duration: 9, color: '#1d55ff' },
  { name: '悬停', instruction: '在最高点收住速度，让呼吸先于脚步抵达。', direction: 5, energy: 31, duration: 18, color: '#8aa927' },
  { name: '抵达', instruction: '沿对角线穿出，将最后一拍交给视线完成。', direction: 61, energy: 86, duration: 14, color: '#151515' }
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const wrap = (value: number, length: number) => ((value % length) + length) % length;
const root = document.documentElement;
const canvas = document.querySelector<HTMLCanvasElement>('.trail-canvas');
const stage = document.querySelector<HTMLElement>('[data-stage]');
const beatButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-beat]')];
const activeNumber = document.querySelector<HTMLElement>('[data-active-number]');
const activeName = document.querySelector<HTMLElement>('[data-active-name]');
const activeInstruction = document.querySelector<HTMLElement>('[data-active-instruction]');
const directionNode = document.querySelector<HTMLElement>('[data-direction]');
const energyNode = document.querySelector<HTMLElement>('[data-energy]');
const durationNode = document.querySelector<HTMLElement>('[data-duration]');
const energyInput = document.querySelector<HTMLInputElement>('#energy');
const durationInput = document.querySelector<HTMLInputElement>('#duration');
const energyOutput = document.querySelector<HTMLOutputElement>('[data-energy-output]');
const durationOutput = document.querySelector<HTMLOutputElement>('[data-duration-output]');
const saveButton = document.querySelector<HTMLButtonElement>('[data-save]');
const saveStatus = document.querySelector<HTMLElement>('[data-save-status]');
const fallbackMessage = document.querySelector<HTMLElement>('[data-fallback-message]');

if (!canvas || !stage || beatButtons.length !== beats.length || !activeNumber || !activeName || !activeInstruction || !directionNode || !energyNode || !durationNode || !energyInput || !durationInput || !energyOutput || !durationOutput || !saveButton || !saveStatus || !fallbackMessage) {
  throw new Error('KINETIC SCORE is missing required synchronized elements.');
}

const params = new URLSearchParams(location.search);
const reducedMotion = params.get('motion') === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
let fallback = params.get('fallback') === '1';
let activeBeat = 0;
let wheelProgress = 0;
let pointerX = 0;
let pointerY = 0;
let pointerTargetX = 0;
let pointerTargetY = 0;
let frames = 0;
let saved = false;
let ready = false;
let frameId = 0;
let disposed = false;
let lastWheelAt = 0;
const context = fallback ? null : canvas.getContext('2d', { alpha: true });
if (!context) fallback = true;

const directionLabel = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(Math.round(value))}°`;

function updateInterface() {
  const beat = beats[activeBeat];
  beatButtons.forEach((button, index) => {
    const selected = index === activeBeat;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  activeNumber.textContent = String(activeBeat + 1).padStart(2, '0');
  activeName.textContent = beat.name;
  activeName.style.color = beat.color;
  activeInstruction.textContent = beat.instruction;
  directionNode.textContent = directionLabel(beat.direction);
  energyNode.textContent = `${Math.round(beat.energy)}%`;
  durationNode.textContent = `${(beat.duration / 10).toFixed(1)}拍`;
  energyInput.value = String(beat.energy);
  durationInput.value = String(beat.duration);
  energyOutput.textContent = `${Math.round(beat.energy)}%`;
  durationOutput.textContent = `${(beat.duration / 10).toFixed(1)}拍`;
  root.style.setProperty('--active-color', beat.color);
}

function selectBeat(index: number, focus = false) {
  activeBeat = wrap(index, beats.length);
  wheelProgress = activeBeat / (beats.length - 1);
  saved = false;
  updateInterface();
  if (focus) beatButtons[activeBeat].focus();
}

beatButtons.forEach((button) => {
  button.addEventListener('click', () => selectBeat(Number(button.dataset.beat)));
  button.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault(); selectBeat(activeBeat + 1, true);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault(); selectBeat(activeBeat - 1, true);
    } else if (event.key === 'Home') {
      event.preventDefault(); selectBeat(0, true);
    } else if (event.key === 'End') {
      event.preventDefault(); selectBeat(beats.length - 1, true);
    }
  });
});

energyInput.addEventListener('input', () => {
  beats[activeBeat].energy = Number(energyInput.value);
  saved = false;
  updateInterface();
});
durationInput.addEventListener('input', () => {
  beats[activeBeat].duration = Number(durationInput.value);
  saved = false;
  updateInterface();
});

const onPointer = (event: PointerEvent) => {
  pointerTargetX = clamp(event.clientX / Math.max(1, innerWidth) * 2 - 1, -1, 1);
  pointerTargetY = clamp(-(event.clientY / Math.max(1, innerHeight) * 2 - 1), -1, 1);
  beats[activeBeat].direction = Math.round(pointerTargetX * 72);
  saved = false;
  updateInterface();
};
const onWheel = (event: WheelEvent) => {
  const now = performance.now();
  wheelProgress = clamp(wheelProgress + clamp(event.deltaY, -150, 150) * .0018, 0, 1);
  const next = Math.round(wheelProgress * (beats.length - 1));
  if (next !== activeBeat && now - lastWheelAt > 100) {
    activeBeat = next;
    lastWheelAt = now;
    saved = false;
    updateInterface();
  }
};
addEventListener('pointermove', onPointer, { passive: true });
addEventListener('pointerdown', onPointer, { passive: true });
addEventListener('wheel', onWheel, { passive: true });
addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
  if (event.key === 'ArrowRight') selectBeat(activeBeat + 1);
  if (event.key === 'ArrowLeft') selectBeat(activeBeat - 1);
  if (event.key === 'ArrowUp') { beats[activeBeat].energy = clamp(beats[activeBeat].energy + 4, 10, 100); updateInterface(); }
  if (event.key === 'ArrowDown') { beats[activeBeat].energy = clamp(beats[activeBeat].energy - 4, 10, 100); updateInterface(); }
});

saveButton.addEventListener('click', () => {
  saved = true;
  saveStatus.textContent = `已保存模拟短句：${beats.map((beat) => `${beat.name} ${beat.energy}%`).join(' · ')}。`;
});

if (fallback) {
  root.dataset.fallback = 'true';
  fallbackMessage.hidden = false;
}

let width = 1;
let height = 1;
function resize() {
  width = Math.max(1, innerWidth);
  height = Math.max(1, innerHeight);
  if (!context) return;
  const dpr = Math.min(devicePixelRatio || 1, params.get('quality') === 'low' ? 1 : 1.75);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resize();
addEventListener('resize', resize, { passive: true });

const points = [
  { x: .12, y: .68 }, { x: .36, y: .35 }, { x: .60, y: .62 }, { x: .84, y: .29 }
];

function drawTrail(ctx: CanvasRenderingContext2D, offset: number, color: string, lineWidth: number, alpha: number) {
  const active = beats[activeBeat];
  ctx.beginPath();
  points.forEach((point, index) => {
    const selectedPull = index === activeBeat ? active.direction / 430 : 0;
    const x = point.x * width + selectedPull * width + pointerX * (index === activeBeat ? 24 : 4) + offset;
    const y = point.y * height - pointerY * (index === activeBeat ? 32 : 5) + offset * .4;
    if (index === 0) ctx.moveTo(x, y);
    else {
      const previous = points[index - 1];
      const previousX = previous.x * width + (index - 1 === activeBeat ? active.direction / 430 * width : 0) + offset;
      const previousY = previous.y * height + offset * .4;
      const middle = (previousX + x) / 2;
      ctx.bezierCurveTo(middle, previousY, middle, y, x, y);
    }
  });
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawBody(ctx: CanvasRenderingContext2D, time: number) {
  const beat = beats[activeBeat];
  const point = points[activeBeat];
  const x = point.x * width + beat.direction / 430 * width + pointerX * 24;
  const y = point.y * height - pointerY * 32;
  const energy = beat.energy / 100;
  const breath = reducedMotion ? 0 : Math.sin(time * 1.6) * 4 * energy;
  const angle = beat.direction * Math.PI / 180;
  ctx.save();
  ctx.translate(x, y + breath);
  ctx.rotate(angle * .16);
  ctx.strokeStyle = '#151515';
  ctx.fillStyle = beat.color;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, -42, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(0, 33); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(-34 - energy * 16, 12 + pointerY * 16); ctx.moveTo(0, -10); ctx.lineTo(35 + energy * 17, -22 - pointerY * 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 32); ctx.lineTo(-25 - energy * 12, 76); ctx.moveTo(0, 32); ctx.lineTo(29 + energy * 13, 70 - pointerY * 15); ctx.stroke();
  ctx.restore();
}

let started = performance.now();
function tick(now: number) {
  if (disposed) return;
  const smoothing = reducedMotion ? 1 : .12;
  pointerX += (pointerTargetX - pointerX) * smoothing;
  pointerY += (pointerTargetY - pointerY) * smoothing;
  if (context) {
    context.clearRect(0, 0, width, height);
    drawTrail(context, 0, '#ff4b19', 18, .86);
    drawTrail(context, -16, '#1d55ff', 5, .95);
    drawTrail(context, 21, '#151515', 2, .75);
    context.setLineDash([5, 14]);
    drawTrail(context, 38, '#8aa927', 3, .9);
    context.setLineDash([]);
    points.forEach((point, index) => {
      const beat = beats[index];
      const x = point.x * width + (index === activeBeat ? beat.direction / 430 * width + pointerX * 24 : 0);
      const y = point.y * height - (index === activeBeat ? pointerY * 32 : 0);
      context.beginPath(); context.arc(x, y, index === activeBeat ? 25 : 9, 0, Math.PI * 2);
      context.fillStyle = index === activeBeat ? '#c8f14c' : '#f3eddf'; context.fill();
      context.strokeStyle = '#151515'; context.lineWidth = index === activeBeat ? 4 : 2; context.stroke();
    });
    drawBody(context, (now - started) / 1000);
    frames += 1;
  }
  ready = true;
  root.dataset.kineticScoreReady = 'true';
  frameId = requestAnimationFrame(tick);
}

function snapshot(): KineticSnapshot {
  const beat = beats[activeBeat];
  return {
    ready,
    activeBeat,
    activeName: beat.name,
    direction: beat.direction,
    energy: beat.energy,
    duration: beat.duration,
    wheelProgress: Number(wheelProgress.toFixed(3)),
    pointer: { x: Number(pointerX.toFixed(3)), y: Number(pointerY.toFixed(3)) },
    frames,
    fallback,
    reducedMotion,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    saved
  };
}

window.__kineticScore = { snapshot, selectBeat };
updateInterface();
frameId = requestAnimationFrame(tick);

function dispose() {
  if (disposed) return;
  disposed = true;
  cancelAnimationFrame(frameId);
  removeEventListener('resize', resize);
  removeEventListener('pointermove', onPointer);
  removeEventListener('pointerdown', onPointer);
  removeEventListener('wheel', onWheel);
  delete window.__kineticScore;
}
addEventListener('pagehide', dispose, { once: true });
