const body = document.body;
const journey = document.querySelector<HTMLElement>('#journey');
const stage = document.querySelector<HTMLElement>('#stage');
const sceneWindow = document.querySelector<HTMLElement>('#scene-window');
const lightCanvas = document.querySelector<HTMLCanvasElement>('#light-field');
const images = [...document.querySelectorAll<HTMLImageElement>('[data-scene-image]')];
const progressValue = document.querySelector<HTMLElement>('.progress-value');
const inviteButton = document.querySelector<HTMLButtonElement>('#invite-button');
const footerInviteButton = document.querySelector<HTMLButtonElement>('#footer-invite-button');
const invitationStatus = document.querySelector<HTMLElement>('#invitation-status');
const fallback = document.querySelector<HTMLElement>('#asset-fallback');
const stageButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-stage-progress]')];

if (!journey || !stage || !sceneWindow || !lightCanvas || images.length !== 2 || !progressValue || !inviteButton || !footerInviteButton || !invitationStatus || !fallback) {
  throw new Error('R141 delivery is missing a required DOM surface.');
}

type JourneyState = 'apart' | 'nearing' | 'together' | 'invited';
type InputChannel = 'initial' | 'scroll' | 'stage-navigation' | 'keyboard' | 'cta';

const params = new URLSearchParams(location.search);
const forceAssetFailure = params.get('forceAssetFailure') === '1';
const assetPath = forceAssetFailure
  ? './assets/missing-distant-dinner-panorama.png'
  : './assets/distant-dinner-panorama-v1.png';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const context = lightCanvas.getContext('2d');
let progress = 0;
let invitationSent = false;
let assetReady = false;
let ticking = false;

declare global {
  interface Window {
    __R141_SNAPSHOT__?: () => Record<string, unknown>;
  }
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function stateFor(value: number): JourneyState {
  if (invitationSent) return 'invited';
  if (value < .34) return 'apart';
  if (value < .82) return 'nearing';
  return 'together';
}

function renderLightField(value: number) {
  if (!context || !assetReady) return;
  const rect = sceneWindow.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 1.75);
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const pixelWidth = Math.round(width * dpr);
  const pixelHeight = Math.round(height * dpr);
  if (lightCanvas.width !== pixelWidth || lightCanvas.height !== pixelHeight) {
    lightCanvas.width = pixelWidth;
    lightCanvas.height = pixelHeight;
  }
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  if (reducedMotion && value < .8) return;

  const strength = clamp((value - .35) / .65);
  const centerY = height * .69;
  const separation = width * (.23 * (1 - strength) + .035);
  const leftX = width * .5 - separation;
  const rightX = width * .5 + separation;

  context.globalCompositeOperation = 'screen';
  for (const [x, color] of [[leftX, '105, 174, 222'], [rightX, '244, 164, 71']] as const) {
    const glow = context.createRadialGradient(x, centerY, 0, x, centerY, width * .22);
    glow.addColorStop(0, `rgba(${color}, ${.13 * strength})`);
    glow.addColorStop(.55, `rgba(${color}, ${.045 * strength})`);
    glow.addColorStop(1, `rgba(${color}, 0)`);
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
  }

  const reflection = context.createLinearGradient(leftX, 0, rightX, 0);
  reflection.addColorStop(0, `rgba(116, 185, 227, ${.08 * strength})`);
  reflection.addColorStop(.5, `rgba(247, 222, 177, ${.18 * strength})`);
  reflection.addColorStop(1, `rgba(244, 165, 75, ${.09 * strength})`);
  context.strokeStyle = reflection;
  context.lineWidth = Math.max(1, 2 * strength);
  context.beginPath();
  context.moveTo(leftX, centerY);
  context.bezierCurveTo(width * .43, centerY - height * .018, width * .57, centerY - height * .018, rightX, centerY);
  context.stroke();
  context.globalCompositeOperation = 'source-over';
}

function applyProgress(next: number, input: InputChannel) {
  progress = clamp(next);
  const state = stateFor(progress);
  body.dataset.state = state;
  body.dataset.progress = progress.toFixed(3);
  body.dataset.input = input;
  body.style.setProperty('--progress', progress.toFixed(4));
  body.style.setProperty('--distance', (1 - progress).toFixed(4));
  progressValue.textContent = String(Math.round(progress * 100)).padStart(2, '0');
  inviteButton.disabled = progress < .82 && !invitationSent;
  stageButtons.forEach((button) => {
    const buttonProgress = Number(button.dataset.stageProgress || 0);
    const active = Math.abs(buttonProgress - progress) < .19
      || (buttonProgress === 1 && progress > .81)
      || (buttonProgress === 0 && progress < .2);
    if (active) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
  renderLightField(progress);
}

function scrollProgress() {
  const start = journey.offsetTop;
  const range = Math.max(1, journey.offsetHeight - innerHeight);
  return clamp((scrollY - start) / range);
}

function updateFromScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    applyProgress(scrollProgress(), 'scroll');
    ticking = false;
  });
}

function scrollToProgress(value: number, input: InputChannel) {
  const range = Math.max(1, journey.offsetHeight - innerHeight);
  const top = journey.offsetTop + range * clamp(value);
  body.dataset.input = input;
  scrollTo({ top, behavior: reducedMotion ? 'auto' : 'smooth' });
  if (reducedMotion) applyProgress(value, input);
}

function confirmInvitation() {
  invitationSent = true;
  body.dataset.invitation = 'sent';
  body.dataset.input = 'cta';
  body.dataset.state = 'invited';
  invitationStatus.textContent = '邀请已留在桌上。对方加入后，两处灯光会在同一时刻亮起。';
  inviteButton.disabled = false;
  renderLightField(1);
}

function markAssetReady() {
  if (assetReady) return;
  assetReady = true;
  body.dataset.asset = 'ready';
  fallback.hidden = true;
  renderLightField(progress);
}

function markAssetFailed() {
  assetReady = false;
  body.dataset.asset = 'failed';
  fallback.hidden = false;
  inviteButton.disabled = false;
}

let loaded = 0;
images.forEach((image) => {
  image.addEventListener('load', () => {
    loaded += 1;
    if (loaded === images.length) markAssetReady();
  }, { once: true });
  image.addEventListener('error', markAssetFailed, { once: true });
  image.src = assetPath;
});

stageButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const value = Number(button.dataset.stageProgress || 0);
    scrollToProgress(value, 'stage-navigation');
  });
});

inviteButton.addEventListener('click', confirmInvitation);
footerInviteButton.addEventListener('click', confirmInvitation);

addEventListener('scroll', updateFromScroll, { passive: true });
addEventListener('resize', () => {
  applyProgress(scrollProgress(), body.dataset.input as InputChannel || 'scroll');
}, { passive: true });
addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLAnchorElement) return;
  if (event.key === 'Home') {
    event.preventDefault();
    scrollToProgress(0, 'keyboard');
  }
  if (event.key === 'End') {
    event.preventDefault();
    scrollToProgress(1, 'keyboard');
  }
});

window.__R141_SNAPSHOT__ = () => ({
  state: body.dataset.state,
  progress: body.dataset.progress,
  input: body.dataset.input,
  asset: body.dataset.asset,
  invitation: body.dataset.invitation,
  viewport: { width: innerWidth, height: innerHeight },
  horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
  stageTop: Math.round(stage.getBoundingClientRect().top),
  canvas: { width: lightCanvas.width, height: lightCanvas.height },
});

applyProgress(scrollProgress(), 'initial');
