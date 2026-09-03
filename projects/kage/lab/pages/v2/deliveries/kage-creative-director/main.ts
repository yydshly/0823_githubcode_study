type DirectionId = 'light' | 'sound' | 'place';

type Direction = {
  id: DirectionId;
  image: string;
  imageAlt: string;
  number: string;
  medium: string;
  caption: string;
  title: string;
  description: string;
  subject: string;
  media: string;
  action: string;
  caseRoute: string;
  directionBrief: string;
};

declare global {
  interface Window {
    __kageR162?: {
      snapshot: () => {
        phase: string;
        selectedDirection: DirectionId;
        idea: string;
        assetErrors: number;
        continuationReady: boolean;
      };
      selectDirection: (id: DirectionId) => void;
    };
  }
}

const directions: Record<DirectionId, Direction> = {
  light: {
    id: 'light',
    image: '../../assets/verified-examples/prism-seed-theatre.png',
    imageAlt: '棱镜种子剧场的最终页面画面',
    number: '01',
    medium: '生成视觉 × 光谱互动',
    caption: '让主体本身成为光源',
    title: '光不是背景，<br /><em>它就是产品动作。</em>',
    description: '借用“棱镜种子剧场”的正向原理：先用高质量主体建立身份，再让指针和滚动改变光谱。页面不会退回到参数面板或通用卡片。',
    subject: '一枚展开日光的种子',
    media: '正式生成视觉 + 运行时光谱',
    action: '靠近、移动光线、保存观察',
    caseRoute: '../prism-seed-theatre/',
    directionBrief: '以高质量主题主体建立身份，让光线、滚动与指针产生连续且有意义的变化。'
  },
  sound: {
    id: 'sound',
    image: '../../assets/verified-examples/modular-room-sound.png',
    imageAlt: '模块化声音空间的最终页面画面',
    number: '02',
    medium: '真实声音 × 产品状态',
    caption: '让声音拥有可以操作的形状',
    title: '听见变化以前，<br /><em>先看见它发生。</em>',
    description: '借用“模块化声音空间”的正向原理：声音不是配乐，而是产品状态。选择、组合和播放必须同时改变画面、听感和结果说明。',
    subject: '一组会回应操作的声音对象',
    media: '正式产品视觉 + 浏览器真实音频',
    action: '选择、组合、试听并保存',
    caseRoute: '../modular-room-sound/',
    directionBrief: '让声音成为可操作的产品状态，视觉形态、真实播放和保存结果必须共享同一因果。'
  },
  place: {
    id: 'place',
    image: '../../assets/verified-examples/west-bund-meeting-points.png',
    imageAlt: '西岸集合点图卷的最终页面画面',
    number: '03',
    medium: '真实地图 × 行动路线',
    caption: '让地点本身成为浏览结构',
    title: '不是画一张地图，<br /><em>而是给出一条路。</em>',
    description: '借用“西岸集合点图卷”的正向原理：涉及地点就使用真实底图、坐标和地点证据。视觉浏览最终必须落到一条清晰行动路径。',
    subject: '一组可以抵达的真实地点',
    media: '真实地理底图 + 地点信息界面',
    action: '浏览、比较、选择并前往',
    caseRoute: '../west-bund-meeting-points/',
    directionBrief: '使用真实地点和坐标建立产品可信度，让浏览、选择与行动路线形成完整闭环。'
  }
};

const root = document.documentElement;
const form = document.querySelector<HTMLFormElement>('#idea-form');
const ideaInput = document.querySelector<HTMLTextAreaElement>('#idea-input');
const directionsPanel = document.querySelector<HTMLElement>('#directions');
const directionButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-direction]')];
const promptButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-prompt]')];
const stageImage = document.querySelector<HTMLImageElement>('#stage-image');
const stageNumber = document.querySelector<HTMLElement>('#stage-number');
const stageMedium = document.querySelector<HTMLElement>('#stage-medium');
const stageCaptionTitle = document.querySelector<HTMLElement>('#stage-caption-title');
const resultImage = document.querySelector<HTMLImageElement>('#result-image');
const resultTitle = document.querySelector<HTMLElement>('#result-title');
const resultDescription = document.querySelector<HTMLElement>('#result-description');
const resultSubject = document.querySelector<HTMLElement>('#result-subject');
const resultMediaLabel = document.querySelector<HTMLElement>('#result-media-label');
const resultAction = document.querySelector<HTMLElement>('#result-action');
const resultStatus = document.querySelector<HTMLElement>('#result-status');
const caseLink = document.querySelector<HTMLAnchorElement>('#case-link');
const continueLink = document.querySelector<HTMLAnchorElement>('#continue-link');

if (!form || !ideaInput || !directionsPanel || !stageImage || !stageNumber || !stageMedium
  || !stageCaptionTitle || !resultImage || !resultTitle || !resultDescription || !resultSubject
  || !resultMediaLabel || !resultAction || !resultStatus || !caseLink || !continueLink
  || directionButtons.length !== 3) {
  throw new Error('R162 产品页缺少必要元素');
}

let selectedDirection: DirectionId = 'light';
let assetErrors = 0;
let switchToken = 0;

function resolveRecommendation(idea: string): DirectionId {
  const normalized = idea.toLowerCase();
  if (/声音|音乐|听|音频|演奏|播客|sound|music|audio/.test(normalized)) return 'sound';
  if (/城市|地点|地图|路线|公共|旅行|展览|街区|map|city|place/.test(normalized)) return 'place';
  return 'light';
}

function buildContinuationUrl(direction: Direction) {
  const url = new URL('../../../../workbench.html', window.location.href);
  const idea = ideaInput.value.trim();
  url.searchParams.set('provider', 'auto');
  url.searchParams.set('quality', 'high');
  url.searchParams.set('brief', `${idea}\n\n创意方向：${direction.directionBrief}`);
  url.searchParams.set('source', 'r162-product-direction');
  return url.toString();
}

function updateLinks(direction: Direction) {
  caseLink.href = direction.caseRoute;
  continueLink.href = buildContinuationUrl(direction);
}

function persistState() {
  try {
    window.localStorage.setItem('kage-r162-product-state', JSON.stringify({
      idea: ideaInput.value.trim(),
      selectedDirection,
      savedAt: new Date().toISOString()
    }));
  } catch {
    // Storage is optional. The product journey remains usable without it.
  }
}

function updateDirectionButtons(id: DirectionId) {
  directionButtons.forEach((button) => {
    const active = button.dataset.direction === id;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function updateDirectionContent(direction: Direction) {
  stageImage.src = direction.image;
  stageImage.alt = direction.imageAlt;
  stageNumber.textContent = direction.number;
  stageMedium.textContent = direction.medium;
  stageCaptionTitle.textContent = direction.caption;
  resultImage.src = direction.image;
  resultImage.alt = direction.imageAlt;
  resultTitle.innerHTML = direction.title;
  resultDescription.textContent = direction.description;
  resultSubject.textContent = direction.subject;
  resultMediaLabel.textContent = direction.media;
  resultAction.textContent = direction.action;
  resultStatus.textContent = `方向 ${direction.number} 已准备好 · 结果来自真实已验证案例`;
  updateLinks(direction);
}

function selectDirection(id: DirectionId, options: { scroll?: boolean; announce?: string } = {}) {
  const direction = directions[id];
  if (!direction) return;
  selectedDirection = id;
  updateDirectionButtons(id);
  const token = ++switchToken;
  root.dataset.switching = 'true';
  window.setTimeout(() => {
    if (token !== switchToken) return;
    updateDirectionContent(direction);
    root.dataset.switching = 'false';
    root.dataset.phase = 'direction-selected';
    persistState();
    if (options.announce) resultStatus.textContent = options.announce;
    if (options.scroll) {
      document.querySelector('#result')?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start'
      });
      root.dataset.phase = 'result';
    }
  }, 150);
}

function handleCompose(event: SubmitEvent) {
  event.preventDefault();
  const idea = ideaInput.value.trim();
  if (idea.length < 8) {
    ideaInput.setCustomValidity('请至少描述一个主体、感受或想发生的变化。');
    ideaInput.reportValidity();
    return;
  }
  ideaInput.setCustomValidity('');
  root.dataset.phase = 'composing';
  const recommended = resolveRecommendation(idea);
  const recommendation = directions[recommended];
  selectDirection(recommended, {
    announce: `根据这段想法，优先推荐方向 ${recommendation.number}：${recommendation.caption}`
  });
  directionsPanel.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'center'
  });
}

function handleAssetError() {
  assetErrors += 1;
  root.dataset.assetError = 'true';
}

form.addEventListener('submit', handleCompose);

ideaInput.addEventListener('input', () => {
  ideaInput.setCustomValidity('');
  updateLinks(directions[selectedDirection]);
});

promptButtons.forEach((button) => {
  button.addEventListener('click', () => {
    ideaInput.value = button.dataset.prompt ?? '';
    ideaInput.focus();
    updateLinks(directions[selectedDirection]);
  });
});

directionButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const id = button.dataset.direction as DirectionId;
    selectDirection(id, { scroll: true });
  });
});

caseLink.addEventListener('click', () => {
  root.dataset.phase = 'continued';
  persistState();
});

continueLink.addEventListener('click', () => {
  root.dataset.phase = 'continued';
  persistState();
});

document.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
  image.addEventListener('error', handleAssetError, { once: true });
});

window.addEventListener('pointermove', (event) => {
  const x = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
  const y = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2;
  root.style.setProperty('--pointer-x', x.toFixed(3));
  root.style.setProperty('--pointer-y', y.toFixed(3));
}, { passive: true });

updateDirectionContent(directions.light);
root.dataset.r162Ready = 'true';
root.dataset.assetPolicy = 'formal-source-assets';
root.dataset.productJourney = 'entry-use-result-continuation';

window.__kageR162 = {
  snapshot: () => ({
    phase: root.dataset.phase ?? 'entry',
    selectedDirection,
    idea: ideaInput.value.trim(),
    assetErrors,
    continuationReady: Boolean(continueLink.href && caseLink.href)
  }),
  selectDirection: (id) => selectDirection(id)
};

export {};
