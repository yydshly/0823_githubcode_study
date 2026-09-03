type TeamId = 'cyan' | 'coral' | 'yellow' | 'blue';
type StrategyId = 'early' | 'line';
type RelayPhase = 'opening' | 'team-selected' | 'running' | 'confluence' | 'saved';
type DriveMode = 'demo' | 'manual' | 'paused';

type RelaySnapshot = {
  ready: boolean;
  phase: RelayPhase;
  selectedTeam: TeamId | null;
  strategy: StrategyId | null;
  driveMode: DriveMode;
  progress: number;
  saved: boolean;
  fallback: boolean;
  reducedMotion: boolean;
  routeHash: string;
  routeD: string;
  formationSpread: number;
  exchangeOverlap: number;
  canvasFrames: number;
  runnerTransforms: string[];
  horizontalOverflow: boolean;
  revision: string;
};

declare global {
  interface Window {
    __colorRelay?: {
      snapshot: () => RelaySnapshot;
      selectTeam: (team: TeamId) => RelaySnapshot;
      chooseStrategy: (strategy: StrategyId) => RelaySnapshot;
      replay: () => RelaySnapshot;
      backToStrategy: () => RelaySnapshot;
      save: () => RelaySnapshot;
      reset: () => RelaySnapshot;
    };
  }
}

const teams: Record<TeamId, { name: string; code: string; color: string; route: Record<StrategyId, string> }> = {
  cyan: {
    name: '北岸青', code: '01', color: '#00d7d2',
    route: {
      early: 'M-70 184 C270 145 410 275 608 405 C716 476 850 492 1018 406 C1165 330 1278 276 1350 230',
      line: 'M-70 184 C290 150 468 300 664 424 L760 458 L844 492 C1032 436 1202 306 1350 230'
    }
  },
  coral: {
    name: '南桥红', code: '02', color: '#ff4f57',
    route: {
      early: 'M-70 792 C260 804 430 675 612 536 C734 444 876 420 1040 507 C1188 588 1288 690 1350 760',
      line: 'M-70 792 C300 806 476 650 662 520 L755 483 L846 451 C1038 498 1212 660 1350 760'
    }
  },
  yellow: {
    name: '晨光黄', code: '03', color: '#ffd21f',
    route: {
      early: 'M340 -80 C360 184 440 305 610 428 C735 518 820 560 932 712 C994 796 1048 834 1100 860',
      line: 'M340 -80 C358 220 480 342 650 438 L758 470 L842 505 C916 650 1012 798 1100 860'
    }
  },
  blue: {
    name: '远洋蓝', code: '04', color: '#2857ff',
    route: {
      early: 'M1350 -80 C1316 190 1196 304 1012 422 C866 516 780 576 664 722 C570 840 452 868 360 860',
      line: 'M1350 -80 C1310 210 1160 348 978 438 L850 474 L762 520 C630 690 476 830 360 860'
    }
  }
};

const html = document.documentElement;
const stage = must<HTMLElement>('#relay-stage');
const selectedRoute = must<SVGPathElement>('#selected-route');
const selectedRouteShadow = must<SVGPathElement>('#selected-route-shadow');
const baton = must<SVGGElement>('#baton');
const runnerPack = must<SVGGElement>('#runner-pack');
const runners = Array.from(runnerPack.querySelectorAll<SVGGElement>('.runner'));
const exchangePulse = must<SVGEllipseElement>('#exchange-pulse');
const trailCanvas = must<HTMLCanvasElement>('#trail-canvas');
const trailContext = trailCanvas.getContext('2d');
const teamButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-team]'));
const branchChoice = must<HTMLElement>('#branch-choice');
const strategyButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-strategy]'));
const currentTeamName = must<HTMLElement>('#current-team-name');
const outcomeTicket = must<HTMLElement>('#outcome-ticket');
const outcomeTitle = must<HTMLElement>('#outcome-title');
const outcomeCopy = must<HTMLElement>('#outcome-copy');
const ticketTeamCode = must<HTMLElement>('#ticket-team-code');
const ticketStrategyCode = must<HTMLElement>('#ticket-strategy-code');
const replayButton = must<HTMLButtonElement>('#replay-branch');
const chooseAgainButton = must<HTMLButtonElement>('#choose-again');
const saveButton = must<HTMLButtonElement>('#save-plan');
const saveStatus = must<HTMLElement>('#save-status');
const resetButton = must<HTMLButtonElement>('#reset-relay');
const stageInstruction = must<HTMLElement>('#stage-instruction');
const live = must<HTMLElement>('#relay-live');
const query = new URLSearchParams(location.search);
const revision = query.get('revision') || 'r129-live';
const fallback = ['1', 'true', 'canvas', 'off'].includes((query.get('fallback') || '').toLowerCase());
const reducedMotion = query.get('motion') === 'reduce'
  || (query.get('motion') !== 'full' && matchMedia('(prefers-reduced-motion: reduce)').matches);

const state = {
  ready: false,
  phase: 'opening' as RelayPhase,
  selectedTeam: null as TeamId | null,
  strategy: null as StrategyId | null,
  driveMode: (reducedMotion ? 'paused' : 'demo') as DriveMode,
  progress: 0,
  saved: false,
  animationFrame: 0,
  animationStartedAt: 0,
  canvasFrames: 0,
  routeHash: 'relay-opening',
  formationSpread: 0,
  exchangeOverlap: 0,
  lastStrategyButton: null as HTMLButtonElement | null,
  trails: [] as Array<{ x: number; y: number; life: number; color: string }>
};

html.dataset.fallback = String(fallback);
html.dataset.reducedMotion = String(reducedMotion);
html.dataset.relayRevision = revision;
if (fallback) trailCanvas.hidden = true;

teamButtons.forEach((button) => button.addEventListener('click', () => selectTeam(teamId(button.dataset.team))));
strategyButtons.forEach((button) => button.addEventListener('click', () => {
  state.lastStrategyButton = button;
  chooseStrategy(strategyId(button.dataset.strategy));
}));
replayButton.addEventListener('click', () => replay());
chooseAgainButton.addEventListener('click', () => backToStrategy());
saveButton.addEventListener('click', () => save());
resetButton.addEventListener('click', () => reset());
addEventListener('resize', () => resizeCanvas());
addEventListener('keydown', (event) => {
  const keyTeams: TeamId[] = ['cyan', 'coral', 'yellow', 'blue'];
  if (['1', '2', '3', '4'].includes(event.key)) {
    selectTeam(keyTeams[Number(event.key) - 1]);
    teamButtons[Number(event.key) - 1]?.focus();
    event.preventDefault();
  } else if (event.key === 'Escape') {
    if (state.phase === 'confluence' || state.phase === 'saved') {
      backToStrategy();
      event.preventDefault();
    } else if (state.phase === 'team-selected') {
      reset();
      event.preventDefault();
    }
  }
});

function selectTeam(team: TeamId): RelaySnapshot {
  cancelAnimationFrame(state.animationFrame);
  state.selectedTeam = team;
  state.strategy = null;
  state.phase = 'team-selected';
  state.driveMode = 'manual';
  state.progress = 0;
  state.saved = false;
  state.formationSpread = 0;
  state.exchangeOverlap = 0;
  state.trails = [];
  const definition = teams[team];
  stage.style.setProperty('--active', definition.color);
  stage.dataset.team = team;
  delete stage.dataset.strategy;
  selectedRoute.setAttribute('d', definition.route.early);
  selectedRouteShadow.setAttribute('d', definition.route.early);
  teamButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.team === team)));
  currentTeamName.textContent = definition.name;
  branchChoice.hidden = false;
  outcomeTicket.hidden = true;
  saveStatus.textContent = '';
  stageInstruction.textContent = `已选择${definition.name}，请选择交棒策略。`;
  live.textContent = stageInstruction.textContent;
  updateUrl();
  renderProgress(0);
  updateDatasets();
  return snapshot();
}

function chooseStrategy(strategy: StrategyId): RelaySnapshot {
  if (!state.selectedTeam) return snapshot();
  cancelAnimationFrame(state.animationFrame);
  state.strategy = strategy;
  state.phase = 'running';
  state.driveMode = 'manual';
  state.progress = 0;
  state.saved = false;
  state.formationSpread = strategy === 'early' ? .78 : .34;
  state.exchangeOverlap = strategy === 'early' ? .74 : .36;
  state.trails = [];
  const route = teams[state.selectedTeam].route[strategy];
  selectedRoute.setAttribute('d', route);
  selectedRouteShadow.setAttribute('d', route);
  state.routeHash = hash(`${state.selectedTeam}|${strategy}|${route}`);
  stage.dataset.strategy = strategy;
  branchChoice.hidden = true;
  outcomeTicket.hidden = true;
  stageInstruction.textContent = strategy === 'early' ? '提前交棒：接力棒进入宽缓弧线。' : '压线交棒：接力棒进入紧凑折线。';
  live.textContent = stageInstruction.textContent;
  updateUrl();
  updateDatasets();
  if (reducedMotion) {
    renderProgress(1);
    finishRun();
  } else {
    state.animationStartedAt = performance.now();
    state.animationFrame = requestAnimationFrame(animateRun);
  }
  return snapshot();
}

function animateRun(now: number): void {
  const elapsed = now - state.animationStartedAt;
  const duration = state.strategy === 'line' ? 1450 : 1750;
  const raw = Math.min(1, elapsed / duration);
  const eased = 1 - (1 - raw) ** 3;
  renderProgress(eased);
  if (raw < 1) state.animationFrame = requestAnimationFrame(animateRun);
  else finishRun();
}

function finishRun(): void {
  state.phase = 'confluence';
  state.progress = 1;
  renderProgress(1);
  const team = state.selectedTeam ? teams[state.selectedTeam] : null;
  const early = state.strategy === 'early';
  outcomeTitle.textContent = early ? '提前交棒' : '压线交棒';
  outcomeCopy.textContent = early
    ? '接力棒以宽缓弧线进入交接区，四名跑者在终点保持呼吸距离。'
    : '接力棒在边界前完成急切转向，四名跑者以更紧凑的次序压向终点。';
  ticketTeamCode.textContent = team?.code || '--';
  ticketStrategyCode.textContent = early ? 'A' : 'B';
  outcomeTicket.hidden = false;
  stageInstruction.textContent = `${team?.name || '当前队伍'}的${outcomeTitle.textContent}路径已汇合。`;
  live.textContent = stageInstruction.textContent;
  updateDatasets();
  requestAnimationFrame(() => replayButton.focus());
}

function renderProgress(progress: number): void {
  state.progress = Math.max(0, Math.min(1, progress));
  const length = selectedRoute.getTotalLength();
  if (!Number.isFinite(length) || length <= 0) return;
  const point = selectedRoute.getPointAtLength(length * state.progress);
  const next = selectedRoute.getPointAtLength(Math.min(length, length * state.progress + 4));
  const angle = Math.atan2(next.y - point.y, next.x - point.x) * 180 / Math.PI;
  baton.setAttribute('transform', `translate(${round(point.x)} ${round(point.y)}) rotate(${round(angle)})`);
  renderRunners(point.x, point.y, angle);
  exchangePulse.setAttribute('rx', String(110 + state.exchangeOverlap * 92));
  exchangePulse.setAttribute('ry', String(70 + state.exchangeOverlap * 54));
  if (!fallback && state.strategy) drawTrail(point.x, point.y, teams[state.selectedTeam!].color);
}

function renderRunners(x: number, y: number, angle: number): void {
  const spread = state.strategy === 'early' ? 62 : 27;
  const progressSpread = spread * (.35 + state.progress * .65);
  const radians = angle * Math.PI / 180;
  const normalX = -Math.sin(radians);
  const normalY = Math.cos(radians);
  const offsets = [-1.5, -.5, .5, 1.5];
  runners.forEach((runner, index) => {
    const along = (index - 1.5) * (state.strategy === 'early' ? 26 : 16);
    const rx = x - Math.cos(radians) * along + normalX * offsets[index] * progressSpread;
    const ry = y - Math.sin(radians) * along + normalY * offsets[index] * progressSpread;
    runner.setAttribute('transform', `translate(${round(rx)} ${round(ry)}) rotate(${round(angle + 90)})`);
  });
}

function resizeCanvas(): void {
  const rect = stage.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  trailCanvas.width = Math.max(1, Math.round(rect.width * dpr));
  trailCanvas.height = Math.max(1, Math.round(rect.height * dpr));
  trailCanvas.style.width = `${rect.width}px`;
  trailCanvas.style.height = `${rect.height}px`;
  trailContext?.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawTrail(svgX: number, svgY: number, color: string): void {
  if (!trailContext) return;
  const rect = stage.getBoundingClientRect();
  const x = svgX / 1600 * rect.width;
  const y = svgY / 940 * rect.height;
  state.trails.push({ x, y, life: 1, color });
  if (state.trails.length > 44) state.trails.shift();
  trailContext.clearRect(0, 0, rect.width, rect.height);
  for (const trail of state.trails) {
    trail.life *= .94;
    trailContext.globalAlpha = trail.life * .52;
    trailContext.fillStyle = trail.color;
    trailContext.beginPath();
    trailContext.arc(trail.x, trail.y, 3 + trail.life * 10, 0, Math.PI * 2);
    trailContext.fill();
  }
  trailContext.globalAlpha = 1;
  state.canvasFrames += 1;
}

function replay(): RelaySnapshot {
  if (!state.strategy) return snapshot();
  outcomeTicket.hidden = true;
  state.phase = 'running';
  state.saved = false;
  state.progress = 0;
  state.trails = [];
  updateDatasets();
  if (reducedMotion) {
    renderProgress(1);
    finishRun();
  } else {
    state.animationStartedAt = performance.now();
    state.animationFrame = requestAnimationFrame(animateRun);
  }
  return snapshot();
}

function backToStrategy(): RelaySnapshot {
  if (!state.selectedTeam) return reset();
  cancelAnimationFrame(state.animationFrame);
  state.strategy = null;
  state.phase = 'team-selected';
  state.progress = 0;
  state.saved = false;
  state.formationSpread = 0;
  state.exchangeOverlap = 0;
  delete stage.dataset.strategy;
  branchChoice.hidden = false;
  outcomeTicket.hidden = true;
  saveStatus.textContent = '';
  renderProgress(0);
  updateUrl();
  updateDatasets();
  requestAnimationFrame(() => (state.lastStrategyButton || strategyButtons[0])?.focus());
  return snapshot();
}

function save(): RelaySnapshot {
  if (!state.selectedTeam || !state.strategy || state.phase !== 'confluence') return snapshot();
  const planId = `relay-${state.selectedTeam}-${state.strategy}`;
  try {
    localStorage.setItem('kage-r129-relay-plan', planId);
    state.saved = true;
    state.phase = 'saved';
    saveStatus.textContent = `已保存虚构方案 ${teams[state.selectedTeam].code}-${state.strategy === 'early' ? 'A' : 'B'}。`;
  } catch {
    state.saved = false;
    saveStatus.textContent = '当前浏览器无法保存，但本次路径仍保留在画面中。';
  }
  live.textContent = saveStatus.textContent;
  updateDatasets();
  return snapshot();
}

function reset(): RelaySnapshot {
  cancelAnimationFrame(state.animationFrame);
  state.phase = 'opening';
  state.selectedTeam = null;
  state.strategy = null;
  state.driveMode = reducedMotion ? 'paused' : 'demo';
  state.progress = 0;
  state.saved = false;
  state.routeHash = 'relay-opening';
  state.formationSpread = 0;
  state.exchangeOverlap = 0;
  state.trails = [];
  delete stage.dataset.team;
  delete stage.dataset.strategy;
  stage.style.removeProperty('--active');
  teamButtons.forEach((button) => button.setAttribute('aria-pressed', 'false'));
  branchChoice.hidden = true;
  outcomeTicket.hidden = true;
  saveStatus.textContent = '';
  selectedRoute.setAttribute('d', 'M0 0');
  selectedRouteShadow.setAttribute('d', 'M0 0');
  baton.removeAttribute('transform');
  runnerPack.removeAttribute('transform');
  exchangePulse.setAttribute('rx', '158');
  exchangePulse.setAttribute('ry', '112');
  trailContext?.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
  stageInstruction.textContent = '选择跑道上的一支队伍。';
  live.textContent = stageInstruction.textContent;
  updateUrl();
  updateDatasets();
  teamButtons[0]?.focus();
  return snapshot();
}

function snapshot(): RelaySnapshot {
  return {
    ready: state.ready,
    phase: state.phase,
    selectedTeam: state.selectedTeam,
    strategy: state.strategy,
    driveMode: state.driveMode,
    progress: round(state.progress),
    saved: state.saved,
    fallback,
    reducedMotion,
    routeHash: state.routeHash,
    routeD: selectedRoute.getAttribute('d') || '',
    formationSpread: state.formationSpread,
    exchangeOverlap: state.exchangeOverlap,
    canvasFrames: state.canvasFrames,
    runnerTransforms: runners.map((runner) => runner.getAttribute('transform') || ''),
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    revision
  };
}

function updateDatasets(): void {
  html.dataset.phase = state.phase;
  html.dataset.driveMode = state.driveMode;
  stage.dataset.phase = state.phase;
  stage.dataset.driveMode = state.driveMode;
  if (state.selectedTeam) stage.dataset.team = state.selectedTeam;
  if (state.strategy) stage.dataset.strategy = state.strategy;
  else delete stage.dataset.strategy;
}

function updateUrl(): void {
  const next = new URL(location.href);
  if (state.selectedTeam) next.searchParams.set('team', state.selectedTeam); else next.searchParams.delete('team');
  if (state.strategy) next.searchParams.set('strategy', state.strategy); else next.searchParams.delete('strategy');
  history.replaceState(null, '', next);
}

function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return `relay-${(result >>> 0).toString(16).padStart(8, '0')}`;
}

function teamId(value: string | undefined): TeamId {
  if (value && value in teams) return value as TeamId;
  throw new Error(`Unknown relay team: ${value || 'missing'}`);
}

function strategyId(value: string | undefined): StrategyId {
  if (value === 'early' || value === 'line') return value;
  throw new Error(`Unknown relay strategy: ${value || 'missing'}`);
}

function must<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing relay element: ${selector}`);
  return element;
}

function round(value: number): number { return Math.round(value * 10000) / 10000; }

window.__colorRelay = { snapshot, selectTeam, chooseStrategy, replay, backToStrategy, save, reset };
resizeCanvas();
updateDatasets();
requestAnimationFrame(() => {
  state.ready = true;
  html.dataset.relayReady = 'true';
  const initialTeam = query.get('team');
  const initialStrategy = query.get('strategy');
  if (initialTeam && initialTeam in teams) {
    selectTeam(initialTeam as TeamId);
    if (initialStrategy === 'early' || initialStrategy === 'line') chooseStrategy(initialStrategy);
  }
});

export {};
