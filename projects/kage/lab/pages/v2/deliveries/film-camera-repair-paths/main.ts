type RouteId = 'a' | 'b';
type RouteName = 'moving' | 'stuck';
type RepairPhase = 'opening' | 'fork' | 'route-a' | 'route-b' | 'confluence' | 'saved';

type RouteDefinition = {
  code: string;
  label: string;
  title: string;
  openingCopy: string;
  checks: [
    { title: string; short: string; copy: string },
    { title: string; short: string; copy: string },
  ];
  safety: string;
  routeD: [string, string];
  result: {
    code: string;
    title: string;
    copy: string;
    history: string;
    next: string;
    avoid: string;
  };
};

type FilmCameraSnapshot = {
  ready: boolean;
  phase: RepairPhase;
  routeId: RouteId | null;
  route: RouteName | null;
  step: number;
  routeHistory: RouteName[];
  checkHistory: string[];
  saved: boolean;
  reducedMotion: boolean;
  enhancementOff: boolean;
  fallback: boolean;
  routeD: string;
  pathD: string;
  routeHash: string;
  geometryHash: string;
  cameraGeometryHash: string;
  geometry: {
    advanceLeverTransform: string;
    meterNeedleTransform: string;
    shutterButtonTransform: string;
    batteryDoorTransform: string;
    shutterBladesTransform: string;
    batteryContactD: string;
  };
  partTransforms: {
    advanceLever: string;
    meterNeedle: string;
    shutterButton: string;
    batteryDoor: string;
    shutterBlades: string;
    batteryContactPath: string;
  };
  resultTitle: string;
  resultCopy: string;
  horizontalOverflow: boolean;
  revision: string;
};

declare global {
  interface Window {
    __filmCameraRepair?: {
      snapshot: () => FilmCameraSnapshot;
      begin: () => FilmCameraSnapshot;
      chooseRoute: (route: RouteId | RouteName) => FilmCameraSnapshot;
      routeA: () => FilmCameraSnapshot;
      routeB: () => FilmCameraSnapshot;
      advance: () => FilmCameraSnapshot;
      completeRoute: () => FilmCameraSnapshot;
      replay: () => FilmCameraSnapshot;
      returnToChoice: () => FilmCameraSnapshot;
      saveCard: () => FilmCameraSnapshot;
      reset: () => FilmCameraSnapshot;
    };
  }
}

const routes: Record<RouteId, RouteDefinition> = {
  a: {
    code: 'ROUTE A / 01—02',
    label: '路径 A · 快门仍有动作',
    title: '先看过片拨杆',
    openingCopy: '缓慢观察拨杆是否能完成一个行程，不要越过明显阻力。',
    checks: [
      { title: '过片拨杆', short: '观察完整行程', copy: '拨杆的行程会在机构图上展开；只记录是否顺畅，不反复试验。' },
      { title: '测光窗', short: '记录可见变化', copy: '把视线移到测光窗，只记录指针是否有可见响应，不据此判断精确故障。' },
    ],
    safety: '只做外部观察；出现阻力就停止，不拆卸顶盖。',
    routeD: [
      'M675 183C735 112 815 107 808 151C774 205 702 206 666 189',
      'M675 183C612 112 390 92 307 230',
    ],
    result: {
      code: 'A-02',
      title: '机械动作仍有回应',
      copy: '已记录到快门、过片与测光的外部回应。先做表面清洁与妥善保存，再请现场维修师确认内部状态。',
      history: '快门响应 → 过片拨杆 → 测光窗',
      next: '清洁外表，带判断卡交给维修师',
      avoid: '不要强扳拨杆或自行拆卸顶盖',
    },
  },
  b: {
    code: 'ROUTE B / 01—02',
    label: '路径 B · 快门已经卡住',
    title: '停止反复按压',
    openingCopy: '不要再对快门钮施力。把相机保持水平，先从底部电池仓的外观开始。',
    checks: [
      { title: '电池仓外观', short: '不打开泄漏仓', copy: '机构图会移出仓盖位置；现实中若见结晶、渗漏或异常气味，不要触碰。' },
      { title: '快门钮位置', short: '只看是否回弹', copy: '只观察按钮是否停在按下位置，不继续按压，也不尝试用工具撬起。' },
    ],
    safety: '发现结晶、渗漏或异味时不要触碰电池仓，直接交给维修师。',
    routeD: [
      'M676 525C614 600 520 625 424 581C349 547 283 506 225 451',
      'M676 525C789 476 824 342 770 263C735 213 702 193 670 185',
    ],
    result: {
      code: 'B-02',
      title: '停止施力，保留现场状态',
      copy: '快门卡住时，继续按压可能扩大损伤。保持相机水平、不要处理可疑电池残留，并交给现场维修师。',
      history: '快门卡住 → 电池仓外观 → 快门钮位置',
      next: '停止操作，保持原状并交给维修师',
      avoid: '不要反复按压、撬钮或接触电池残留',
    },
  },
};

const html = document.documentElement;
const stage = must<HTMLElement>('#repair-stage');
const controls = must<HTMLElement>('#repair-controls');
const cameraDescription = must<SVGDescElement>('#camera-description');
const diagramCaption = must<HTMLElement>('#diagram-caption');
const beginButton = must<HTMLButtonElement>('#begin-check');
const openingStartButton = must<HTMLButtonElement>('#opening-start');
const openingPanel = must<HTMLElement>('#opening-panel');
const forkPanel = must<HTMLElement>('#fork-panel');
const routePanel = must<HTMLElement>('#route-panel');
const resultCard = must<HTMLElement>('#judgement-card');
const routeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-route-choice]'));
const routeHistoryElement = must<HTMLElement>('#route-history');
const routeCode = must<HTMLElement>('#route-code');
const routeTitle = must<HTMLElement>('#route-title');
const routeCopy = must<HTMLElement>('#route-copy');
const routeSafety = must<HTMLElement>('#route-safety');
const checkItems = Array.from(document.querySelectorAll<HTMLElement>('[data-check]'));
const checkOneTitle = must<HTMLElement>('#check-one-title');
const checkOneCopy = must<HTMLElement>('#check-one-copy');
const checkTwoTitle = must<HTMLElement>('#check-two-title');
const checkTwoCopy = must<HTMLElement>('#check-two-copy');
const advanceButton = must<HTMLButtonElement>('#advance-check');
const returnButton = must<HTMLButtonElement>('#return-to-fork');
const replayButton = must<HTMLButtonElement>('#replay-route');
const compareButton = must<HTMLButtonElement>('#compare-route');
const saveButton = must<HTMLButtonElement>('#save-card');
const saveStatus = must<HTMLElement>('#save-status');
const resultCode = must<HTMLElement>('#result-code');
const resultRouteLabel = must<HTMLElement>('#result-route-label');
const resultTitle = must<HTMLElement>('#result-title');
const resultCopy = must<HTMLElement>('#result-copy');
const resultHistory = must<HTMLElement>('#result-history');
const resultNext = must<HTMLElement>('#result-next');
const resultAvoid = must<HTMLElement>('#result-avoid');
const live = must<HTMLElement>('#camera-live');

const routePath = must<SVGPathElement>('#route-path');
const routePathShadow = must<SVGPathElement>('#route-path-shadow');
const routeNodeOne = must<SVGCircleElement>('#route-node-one');
const routeNodeTwo = must<SVGCircleElement>('#route-node-two');
const advanceLever = must<SVGGElement>('#advance-lever');
const meterNeedle = must<SVGPathElement>('#meter-needle');
const shutterButton = must<SVGGElement>('#shutter-button');
const batteryDoor = must<SVGGElement>('#battery-door');
const batteryContact = must<SVGPathElement>('#battery-contact');
const shutterBlades = must<SVGGElement>('#shutter-blades');
const stampCode = must<SVGTextElement>('#state-stamp-code');
const stampLabel = must<SVGTextElement>('#state-stamp-label');

const query = new URLSearchParams(location.search);
const revision = query.get('revision') || 'r136a-live';
const fallback = ['1', 'true', 'on'].includes((query.get('fallback') || '').toLowerCase());
const enhancementOff = fallback || (query.get('enhancement') || '').toLowerCase() === 'off';
const reducedMotion = query.get('motion') === 'reduce'
  || (query.get('motion') !== 'full' && matchMedia('(prefers-reduced-motion: reduce)').matches);

const state = {
  ready: false,
  phase: 'opening' as RepairPhase,
  routeId: null as RouteId | null,
  step: 0,
  routeHistory: [] as RouteId[],
  checkHistory: [] as string[],
  saved: false,
  lastRouteButton: null as HTMLButtonElement | null,
};

html.dataset.enhancement = enhancementOff ? 'off' : 'on';
html.dataset.fallback = String(fallback);
html.dataset.reducedMotion = String(reducedMotion);
html.dataset.filmCameraRevision = revision;

beginButton.addEventListener('click', () => begin(true));
openingStartButton.addEventListener('click', () => begin(true));
routeButtons.forEach((button) => button.addEventListener('click', () => {
  state.lastRouteButton = button;
  chooseRoute(parseRoute(button.dataset.routeChoice), true);
}));
advanceButton.addEventListener('click', () => advance(true));
returnButton.addEventListener('click', () => returnToChoice(true));
compareButton.addEventListener('click', () => returnToChoice(true));
replayButton.addEventListener('click', () => replay(true));
saveButton.addEventListener('click', () => saveCard());

addEventListener('keydown', (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (state.phase === 'fork' && (event.key.toLowerCase() === 'a' || event.key.toLowerCase() === 'b')) {
    const route = event.key.toLowerCase() as RouteId;
    state.lastRouteButton = routeButtons.find((button) => button.dataset.routeChoice === route) || null;
    chooseRoute(route, true);
    event.preventDefault();
    return;
  }
  if ((state.phase === 'route-a' || state.phase === 'route-b') && event.key === 'Enter') {
    advance(true);
    event.preventDefault();
    return;
  }
  if (event.key === 'Escape' && state.phase !== 'opening' && state.phase !== 'fork') {
    returnToChoice(true);
    event.preventDefault();
    return;
  }
  if ((state.phase === 'confluence' || state.phase === 'saved') && event.key.toLowerCase() === 'r') {
    replay(true);
    event.preventDefault();
  } else if ((state.phase === 'confluence' || state.phase === 'saved') && event.key.toLowerCase() === 's') {
    saveCard();
    event.preventDefault();
  }
});

function begin(moveFocus = false): FilmCameraSnapshot {
  state.phase = 'fork';
  state.routeId = null;
  state.step = 0;
  state.saved = false;
  resetGeometry();
  showOnly(forkPanel);
  diagramCaption.textContent = '轻按一次快门钮，然后选择它给出的回应。';
  stampCode.textContent = 'FORK';
  stampLabel.textContent = '选择线索';
  cameraDescription.textContent = '胶片相机的快门钮等待一次外部观察，随后可进入两条安全判断路径。';
  updateRouteHistory();
  updateDatasets();
  announce('判断开始。请选择快门还能动作，或快门已经卡住。');
  updateUrl();
  if (moveFocus) {
    moveToStage();
    requestAnimationFrame(() => routeButtons[0]?.focus());
  }
  return snapshot();
}

function chooseRoute(route: RouteId, moveFocus = false): FilmCameraSnapshot {
  const definition = routes[route];
  state.routeId = route;
  state.phase = route === 'a' ? 'route-a' : 'route-b';
  state.step = 1;
  state.saved = false;
  state.checkHistory = [definition.checks[0].title];
  routeCode.textContent = definition.code;
  routeTitle.textContent = definition.title;
  routeCopy.textContent = definition.openingCopy;
  routeSafety.textContent = definition.safety;
  checkOneTitle.textContent = definition.checks[0].title;
  checkOneCopy.textContent = definition.checks[0].short;
  checkTwoTitle.textContent = definition.checks[1].title;
  checkTwoCopy.textContent = definition.checks[1].short;
  advanceButton.textContent = '记录第一处检查';
  saveStatus.textContent = '';
  showOnly(routePanel);
  setCheckState(1);
  applyGeometry(route, 1);
  diagramCaption.textContent = definition.checks[0].copy;
  cameraDescription.textContent = `${definition.label}。当前突出${definition.checks[0].title}，机构连接线已改变。`;
  updateDatasets();
  announce(`${definition.label}。第一处检查：${definition.checks[0].title}。`);
  updateUrl();
  if (moveFocus) requestAnimationFrame(() => advanceButton.focus());
  return snapshot();
}

function advance(moveFocus = false): FilmCameraSnapshot {
  if (!state.routeId) return snapshot();
  if (state.step >= 2) return completeRoute(moveFocus);
  const definition = routes[state.routeId];
  state.step = 2;
  state.checkHistory = [definition.checks[0].title, definition.checks[1].title];
  routeTitle.textContent = `再看${definition.checks[1].title}`;
  routeCopy.textContent = definition.checks[1].copy;
  advanceButton.textContent = '形成初步维修判断';
  setCheckState(2);
  applyGeometry(state.routeId, 2);
  diagramCaption.textContent = definition.checks[1].copy;
  cameraDescription.textContent = `${definition.label}。连接线现在从${definition.checks[0].title}进入${definition.checks[1].title}。`;
  updateDatasets();
  announce(`第二处检查：${definition.checks[1].title}。${definition.checks[1].short}。`);
  if (moveFocus) requestAnimationFrame(() => advanceButton.focus());
  return snapshot();
}

function completeRoute(moveFocus = false): FilmCameraSnapshot {
  if (!state.routeId) return snapshot();
  const definition = routes[state.routeId];
  if (!state.routeHistory.includes(state.routeId)) state.routeHistory.push(state.routeId);
  state.phase = 'confluence';
  state.step = 2;
  state.saved = false;
  resultCode.textContent = definition.result.code;
  resultRouteLabel.textContent = definition.label;
  resultTitle.textContent = definition.result.title;
  resultCopy.textContent = definition.result.copy;
  resultHistory.textContent = definition.result.history;
  resultNext.textContent = definition.result.next;
  resultAvoid.textContent = definition.result.avoid;
  saveStatus.textContent = '';
  showOnly(resultCard);
  applyGeometry(state.routeId, 3);
  stampCode.textContent = definition.result.code;
  stampLabel.textContent = '判断汇合';
  diagramCaption.textContent = `${definition.result.title}。两处外部线索已汇入同一张判断卡。`;
  cameraDescription.textContent = `${definition.label}完成，${definition.checks[0].title}与${definition.checks[1].title}的观察汇入初步维修判断卡。`;
  updateDatasets();
  announce(`${definition.result.title}。可以重放、比较另一条路径，或保存判断卡。`);
  updateUrl();
  if (moveFocus) requestAnimationFrame(() => resultTitle.focus());
  return snapshot();
}

function replay(moveFocus = false): FilmCameraSnapshot {
  if (!state.routeId) return snapshot();
  return chooseRoute(state.routeId, moveFocus);
}

function returnToChoice(moveFocus = false): FilmCameraSnapshot {
  state.phase = 'fork';
  state.routeId = null;
  state.step = 0;
  state.saved = false;
  state.checkHistory = [];
  resetGeometry();
  showOnly(forkPanel);
  diagramCaption.textContent = state.routeHistory.length
    ? '上一条判断已保留。现在可以选择另一条快门线索。'
    : '轻按一次快门钮，然后选择它给出的回应。';
  stampCode.textContent = 'FORK';
  stampLabel.textContent = state.routeHistory.length ? '可比较路径' : '选择线索';
  cameraDescription.textContent = '胶片相机回到快门状态选择，已经完成的判断路径仍保留在记录中。';
  updateRouteHistory();
  updateDatasets();
  announce(diagramCaption.textContent || '已返回路径选择。');
  updateUrl();
  if (moveFocus) requestAnimationFrame(() => (state.lastRouteButton || routeButtons[0])?.focus());
  return snapshot();
}

function saveCard(): FilmCameraSnapshot {
  if (!state.routeId || (state.phase !== 'confluence' && state.phase !== 'saved')) return snapshot();
  const definition = routes[state.routeId];
  const record = {
    routeId: state.routeId,
    code: definition.result.code,
    checks: [...state.checkHistory],
    recommendation: definition.result.next,
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem('kage-r136a-film-camera-repair-card', JSON.stringify(record));
    state.saved = true;
    state.phase = 'saved';
    saveStatus.textContent = `判断卡 ${definition.result.code} 已保存在此浏览器。带它去找现场维修师。`;
  } catch {
    state.saved = false;
    state.phase = 'confluence';
    saveStatus.textContent = '当前浏览器无法保存；判断内容仍保留在页面中，可交给现场维修师查看。';
  }
  announce(saveStatus.textContent || '保存状态已更新。');
  updateDatasets();
  return snapshot();
}

function reset(): FilmCameraSnapshot {
  state.phase = 'opening';
  state.routeId = null;
  state.step = 0;
  state.routeHistory = [];
  state.checkHistory = [];
  state.saved = false;
  resetGeometry();
  showOnly(openingPanel);
  stampCode.textContent = 'WAIT';
  stampLabel.textContent = '等待判断';
  diagramCaption.textContent = '先确认快门给出的第一条线索。';
  cameraDescription.textContent = '正面的机身、镜头、取景器、快门钮、过片拨杆、测光窗与底部电池仓。';
  updateRouteHistory();
  updateDatasets();
  announce('维修判断已重置。');
  updateUrl();
  return snapshot();
}

function showOnly(panel: HTMLElement): void {
  [openingPanel, forkPanel, routePanel, resultCard].forEach((candidate) => {
    candidate.hidden = candidate !== panel;
  });
}

function setCheckState(step: number): void {
  checkItems.forEach((item, index) => {
    const itemStep = index + 1;
    if (itemStep === step) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
    if (itemStep < step) item.dataset.complete = 'true';
    else delete item.dataset.complete;
  });
}

function applyGeometry(route: RouteId, step: number): void {
  const definition = routes[route];
  const pathIndex = step <= 1 ? 0 : 1;
  const routeD = definition.routeD[pathIndex];
  routePath.setAttribute('d', routeD);
  routePathShadow.setAttribute('d', routeD);
  if (route === 'a') {
    advanceLever.setAttribute('transform', `rotate(${step === 1 ? -24 : step === 2 ? 18 : 8} 708 170)`);
    meterNeedle.setAttribute('transform', `rotate(${step === 1 ? -18 : step === 2 ? 31 : 22} 307 265)`);
    shutterButton.setAttribute('transform', 'translate(0 3)');
    batteryDoor.setAttribute('transform', 'translate(0 0)');
    batteryContact.setAttribute('d', 'M644 518H663M689 518H709');
    shutterBlades.setAttribute('transform', `rotate(${step === 1 ? 10 : 24} 492 379) scale(${step === 1 ? .94 : .88})`);
    routeNodeOne.setAttribute('cx', '708');
    routeNodeOne.setAttribute('cy', '170');
    routeNodeTwo.setAttribute('cx', '307');
    routeNodeTwo.setAttribute('cy', '230');
    stampCode.textContent = step >= 3 ? 'A-02' : `A-0${step}`;
    stampLabel.textContent = step === 1 ? '检查拨杆' : step === 2 ? '检查测光' : '判断汇合';
  } else {
    advanceLever.setAttribute('transform', 'rotate(0 708 170)');
    meterNeedle.setAttribute('transform', 'rotate(-34 307 265)');
    shutterButton.setAttribute('transform', `translate(0 ${step === 1 ? 8 : 15})`);
    batteryDoor.setAttribute('transform', `translate(0 ${step === 1 ? 28 : 43})`);
    batteryContact.setAttribute('d', step === 1 ? 'M641 518L661 526M691 526L712 514' : 'M641 522L660 534M692 534L712 511');
    shutterBlades.setAttribute('transform', 'rotate(-12 492 379) scale(.82)');
    routeNodeOne.setAttribute('cx', '676');
    routeNodeOne.setAttribute('cy', String(step === 1 ? 553 : 568));
    routeNodeTwo.setAttribute('cx', '670');
    routeNodeTwo.setAttribute('cy', '198');
    stampCode.textContent = step >= 3 ? 'B-02' : `B-0${step}`;
    stampLabel.textContent = step === 1 ? '查看电池仓' : step === 2 ? '查看快门钮' : '判断汇合';
  }
}

function resetGeometry(): void {
  const initialD = 'M670 185C610 105 389 87 307 230';
  routePath.setAttribute('d', initialD);
  routePathShadow.setAttribute('d', initialD);
  routeNodeOne.setAttribute('cx', '670');
  routeNodeOne.setAttribute('cy', '185');
  routeNodeTwo.setAttribute('cx', '307');
  routeNodeTwo.setAttribute('cy', '230');
  advanceLever.setAttribute('transform', 'rotate(0 708 170)');
  meterNeedle.setAttribute('transform', 'rotate(0 307 265)');
  shutterButton.setAttribute('transform', 'translate(0 0)');
  batteryDoor.setAttribute('transform', 'translate(0 0)');
  batteryContact.setAttribute('d', 'M644 518H663M689 518H709');
  shutterBlades.setAttribute('transform', 'rotate(0 492 379) scale(1)');
}

function updateRouteHistory(): void {
  if (state.routeHistory.length === 0) {
    routeHistoryElement.textContent = '尚未走过判断路径。';
    return;
  }
  routeHistoryElement.textContent = `已保留：${state.routeHistory.map((route) => routes[route].label).join('；')}。`;
}

function updateDatasets(): void {
  html.dataset.filmCameraPhase = state.phase;
  html.dataset.filmCameraRoute = state.routeId || 'none';
  html.dataset.phase = state.phase;
  html.dataset.route = routeName(state.routeId) || 'none';
  stage.dataset.phase = state.phase;
  stage.dataset.route = state.routeId || 'none';
  stage.dataset.step = String(state.step);
  stage.dataset.saved = String(state.saved);
}

function moveToStage(): void {
  stage.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
}

function announce(message: string): void {
  live.textContent = message;
}

function updateUrl(): void {
  const next = new URL(location.href);
  if (state.routeId) next.searchParams.set('route', state.routeId);
  else next.searchParams.delete('route');
  history.replaceState(null, '', next);
}

function snapshot(): FilmCameraSnapshot {
  const geometry = {
    advanceLeverTransform: advanceLever.getAttribute('transform') || '',
    meterNeedleTransform: meterNeedle.getAttribute('transform') || '',
    shutterButtonTransform: shutterButton.getAttribute('transform') || '',
    batteryDoorTransform: batteryDoor.getAttribute('transform') || '',
    shutterBladesTransform: shutterBlades.getAttribute('transform') || '',
    batteryContactD: batteryContact.getAttribute('d') || '',
  };
  const routeD = routePath.getAttribute('d') || '';
  const semanticRoute = routeName(state.routeId);
  const partTransforms = {
    advanceLever: geometry.advanceLeverTransform,
    meterNeedle: geometry.meterNeedleTransform,
    shutterButton: geometry.shutterButtonTransform,
    batteryDoor: geometry.batteryDoorTransform,
    shutterBlades: geometry.shutterBladesTransform,
    batteryContactPath: geometry.batteryContactD,
  };
  const cameraGeometryHash = hash(JSON.stringify(partTransforms));
  return {
    ready: state.ready,
    phase: state.phase,
    routeId: state.routeId,
    route: semanticRoute,
    step: state.step,
    routeHistory: state.routeHistory.map((route) => routeName(route)!),
    checkHistory: [...state.checkHistory],
    saved: state.saved,
    reducedMotion,
    enhancementOff,
    fallback,
    routeD,
    pathD: routeD,
    routeHash: hash(`${state.routeId || 'none'}|${state.step}|${routeD}`),
    geometryHash: cameraGeometryHash,
    cameraGeometryHash,
    geometry,
    partTransforms,
    resultTitle: state.routeId && (state.phase === 'confluence' || state.phase === 'saved') ? routes[state.routeId].result.title : '',
    resultCopy: state.routeId && (state.phase === 'confluence' || state.phase === 'saved') ? routes[state.routeId].result.copy : '',
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    revision,
  };
}

function parseRoute(value: string | undefined): RouteId {
  if (value === 'a' || value === 'b') return value;
  throw new Error(`Unknown film camera repair route: ${value || 'missing'}`);
}

function routeName(route: RouteId | null): RouteName | null {
  if (route === 'a') return 'moving';
  if (route === 'b') return 'stuck';
  return null;
}

function routeId(route: RouteId | RouteName): RouteId {
  if (route === 'a' || route === 'moving') return 'a';
  return 'b';
}

function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return `film-camera-${(result >>> 0).toString(16).padStart(8, '0')}`;
}

function must<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing film camera repair element: ${selector}`);
  return element;
}

window.__filmCameraRepair = {
  snapshot,
  begin: () => begin(false),
  chooseRoute: (route) => chooseRoute(routeId(route), false),
  routeA: () => chooseRoute('a', false),
  routeB: () => chooseRoute('b', false),
  advance: () => advance(false),
  completeRoute: () => completeRoute(false),
  replay: () => replay(false),
  returnToChoice: () => returnToChoice(false),
  saveCard,
  reset,
};

showOnly(openingPanel);
resetGeometry();
updateDatasets();

requestAnimationFrame(() => {
  state.ready = true;
  html.dataset.filmCameraReady = 'true';
  html.dataset.cameraReady = 'true';
  const initialRoute = query.get('route');
  if (initialRoute === 'a' || initialRoute === 'b') chooseRoute(initialRoute, false);
});

export {};
