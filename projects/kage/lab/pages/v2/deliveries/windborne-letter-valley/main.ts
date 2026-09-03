const root = document.documentElement;
const scene = document.querySelector<HTMLElement>('#scene');
const image = document.querySelector<HTMLImageElement>('#valley-image');
const letter = document.querySelector<HTMLElement>('#letter-flight');
const canvas = document.querySelector<HTMLCanvasElement>('#wind-field');
const stageIndex = document.querySelector<HTMLElement>('#stage-index');
const stageKicker = document.querySelector<HTMLElement>('#stage-kicker');
const stageTitle = document.querySelector<HTMLElement>('#stage-title');
const distanceValue = document.querySelector<HTMLElement>('#distance-value');
const windLabel = document.querySelector<HTMLElement>('#wind-label');
const beginButton = document.querySelector<HTMLButtonElement>('#begin-button');
const deliverButton = document.querySelector<HTMLButtonElement>('#deliver-button');
const deliveryNote = document.querySelector<HTMLElement>('#delivery-note');
const soundToggle = document.querySelector<HTMLButtonElement>('#sound-toggle');

if (!scene || !image || !letter || !canvas || !stageIndex || !stageKicker || !stageTitle
  || !distanceValue || !windLabel || !beginButton || !deliverButton || !deliveryNote || !soundToggle) {
  throw new Error('R159 页面缺少必需元素');
}

const ctx = canvas.getContext('2d');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const stages = [
  { threshold: 0, state: 'waiting', kicker: 'RIDGE / 起风', title: '让纸先记住风向' },
  { threshold: .2, state: 'lifted', kicker: 'LIFT / 离手', title: '折痕开始抓住空气' },
  { threshold: .47, state: 'crossing', kicker: 'VALLEY / 穿越', title: '沿峡谷的连续风路' },
  { threshold: .73, state: 'arriving', kicker: 'HOUSE / 靠近', title: '向一盏暖灯收束' }
] as const;

let progress = 0;
let targetProgress = 0;
let windBias = 0;
let targetWindBias = 0;
let viewportWidth = window.innerWidth;
let viewportHeight = window.innerHeight;
let frame = 0;
let audioContext: AudioContext | null = null;
let windGain: GainNode | null = null;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function cubicBezier(a: number, b: number, c: number, d: number, t: number) {
  const mt = 1 - t;
  return (mt ** 3 * a) + (3 * mt * mt * t * b) + (3 * mt * t * t * c) + (t ** 3 * d);
}

function resize() {
  viewportWidth = window.innerWidth;
  viewportHeight = window.innerHeight;
  const ratio = Math.min(window.devicePixelRatio || 1, 1.6);
  canvas.width = Math.round(viewportWidth * ratio);
  canvas.height = Math.round(viewportHeight * ratio);
  canvas.style.width = `${viewportWidth}px`;
  canvas.style.height = `${viewportHeight}px`;
  ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function readScroll() {
  const range = Math.max(document.documentElement.scrollHeight - viewportHeight, 1);
  targetProgress = clamp(window.scrollY / range);
}

function setLetterTransform() {
  const mobile = viewportWidth < 760;
  const startX = mobile ? viewportWidth * .62 : viewportWidth * .48;
  const startY = viewportHeight * .73;
  const endX = viewportWidth * (mobile ? .77 : .84);
  const endY = viewportHeight * .39;
  const x = cubicBezier(startX, viewportWidth * .46, viewportWidth * .61, endX, progress);
  const y = cubicBezier(startY, viewportHeight * .36, viewportHeight * .61, endY, progress)
    + windBias * viewportHeight * .045 * Math.sin(progress * Math.PI);
  const scale = (mobile ? .84 : 1) * (1 - progress * .72);
  const lift = Math.sin(progress * Math.PI * 4.4) * (1 - progress) * 8;
  const rotate = -7 + progress * 18 + windBias * 13 + lift * .32;
  const tilt = Math.sin(progress * Math.PI * 3) * 14 * (1 - progress * .55);
  const opacity = progress > .965 ? clamp((1 - progress) / .035) : 1;
  letter.style.transform = `translate3d(${x}px, ${y + lift}px, 0) translate(-50%, -50%) scale(${scale}) rotate(${rotate}deg) rotateY(${tilt}deg)`;
  letter.style.opacity = String(opacity);
}

function drawWind(time: number) {
  if (!ctx) return;
  ctx.clearRect(0, 0, viewportWidth, viewportHeight);
  const lines = reduceMotion ? 7 : 18;
  const speed = reduceMotion ? 0 : time * .00016;
  for (let index = 0; index < lines; index += 1) {
    const lane = index / Math.max(lines - 1, 1);
    const phase = (lane * 1.8 + speed * (1 + lane * .8)) % 1.25;
    const x = -viewportWidth * .16 + phase * viewportWidth * 1.28;
    const y = viewportHeight * (.2 + lane * .57) + Math.sin(time * .0006 + index) * 11;
    const length = 64 + lane * 108 + progress * 54;
    const bend = (windBias * 28) + Math.sin(index * 1.7 + time * .0005) * 10;
    const gradient = ctx.createLinearGradient(x, y, x + length, y + bend);
    gradient.addColorStop(0, 'rgba(230,241,240,0)');
    gradient.addColorStop(.45, `rgba(230,241,240,${.07 + progress * .11})`);
    gradient.addColorStop(1, 'rgba(240,184,113,0)');
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + length * .34, y - 8, x + length * .68, y + bend + 8, x + length, y + bend);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = .6 + lane * .8;
    ctx.stroke();
  }
}

function updateStage() {
  const active = [...stages].reverse().find((stage) => progress >= stage.threshold) ?? stages[0];
  const index = stages.indexOf(active) + 1;
  root.dataset.state = active.state;
  root.style.setProperty('--progress', progress.toFixed(4));
  root.style.setProperty('--wind-bias', windBias.toFixed(3));
  stageIndex.textContent = String(index).padStart(2, '0');
  stageKicker.textContent = active.kicker;
  stageTitle.textContent = active.title;
  distanceValue.textContent = Math.max(0, 3.8 * (1 - progress)).toFixed(1);
  windLabel.textContent = `${windBias < -.16 ? '东南' : windBias > .16 ? '西北' : '西南'}风 ${String(Math.round(8 + Math.abs(windBias) * 7)).padStart(2, '0')}`;
  document.querySelectorAll<HTMLElement>('.chapter').forEach((chapter) => {
    chapter.classList.toggle('is-current', chapter.dataset.stage === active.state
      || (progress > .93 && chapter.dataset.stage === 'delivered'));
  });
  const ready = progress > .91;
  const delivered = root.dataset.delivered === 'true';
  deliverButton.disabled = !ready || delivered;
  if (delivered) {
    deliveryNote.textContent = '投递已留在这台设备上 · RIDGE 159';
  } else {
    deliveryNote.textContent = ready ? '信纸已经抵达，可以留下这次投递' : '等待信纸抵达山屋';
  }
}

function animate(time: number) {
  progress += (targetProgress - progress) * (reduceMotion ? 1 : .075);
  windBias += (targetWindBias - windBias) * (reduceMotion ? 1 : .06);
  setLetterTransform();
  updateStage();
  drawWind(time);
  if (windGain && audioContext) {
    const level = .018 + progress * .025 + Math.abs(windBias) * .012;
    windGain.gain.setTargetAtTime(level, audioContext.currentTime, .12);
  }
  frame = window.requestAnimationFrame(animate);
}

function createWindAudio() {
  if (audioContext) return;
  audioContext = new AudioContext();
  const length = audioContext.sampleRate * 2;
  const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    last = last * .985 + white * .015;
    data[i] = last * 2.5;
  }
  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  windGain = audioContext.createGain();
  source.buffer = buffer;
  source.loop = true;
  filter.type = 'bandpass';
  filter.frequency.value = 620;
  filter.Q.value = .55;
  windGain.gain.value = 0;
  source.connect(filter).connect(windGain).connect(audioContext.destination);
  source.start();
}

function toggleSound() {
  createWindAudio();
  if (!audioContext || !windGain) return;
  const enabled = soundToggle.getAttribute('aria-pressed') !== 'true';
  soundToggle.setAttribute('aria-pressed', String(enabled));
  if (enabled) {
    void audioContext.resume();
    windGain.gain.setTargetAtTime(.024, audioContext.currentTime, .15);
  } else {
    windGain.gain.setTargetAtTime(0, audioContext.currentTime, .12);
  }
}

window.addEventListener('scroll', readScroll, { passive: true });
window.addEventListener('resize', resize);
window.addEventListener('pointermove', (event) => {
  targetWindBias = clamp((event.clientX / Math.max(viewportWidth, 1) - .5) * 2, -1, 1);
}, { passive: true });
window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowDown' || event.key === 'PageDown') window.scrollBy({ top: viewportHeight * .72, behavior: reduceMotion ? 'auto' : 'smooth' });
  if (event.key === 'ArrowUp' || event.key === 'PageUp') window.scrollBy({ top: -viewportHeight * .72, behavior: reduceMotion ? 'auto' : 'smooth' });
});
beginButton.addEventListener('click', () => window.scrollTo({ top: viewportHeight * 1.02, behavior: reduceMotion ? 'auto' : 'smooth' }));
soundToggle.addEventListener('click', toggleSound);
deliverButton.addEventListener('click', () => {
  if (progress <= .91) return;
  root.dataset.delivered = 'true';
  deliveryNote.textContent = '投递已留在这台设备上 · RIDGE 159';
  deliverButton.textContent = '这封信已经抵达 ✓';
  deliverButton.disabled = true;
});
image.addEventListener('error', () => scene.classList.add('asset-failed'));

resize();
readScroll();
frame = window.requestAnimationFrame(animate);

window.addEventListener('pagehide', () => {
  window.cancelAnimationFrame(frame);
  void audioContext?.close();
}, { once: true });

root.dataset.r159Ready = 'true';
root.dataset.assetBatchCount = '1';
root.dataset.mediumRoute = 'generated-image-runtime';
