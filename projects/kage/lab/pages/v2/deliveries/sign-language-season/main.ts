type Performance = {
  title: string;
  month: string;
  day: string;
  time: string;
  summary: string;
  caption: string;
  accessibility: readonly string[];
  ticketAction: string;
  price: string;
  scoreWord: string;
  gestureDescription: string;
  gesturePath: string;
  counterPath: string;
  nodes: readonly [number, number][];
  holdTransform: string;
  stageLabel: string;
  stageDescription: string;
  stagePath: string;
  stageOrigin: readonly [number, number];
  stageTarget: readonly [number, number];
};

type SeasonSnapshot = {
  activeIndex: number;
  activeTitle: string;
  panelLabelledBy: string | null;
  selectedTabs: number;
  accessibilityItems: number;
  ticketStatus: string;
  viewport: { width: number; height: number };
  hasHorizontalOverflow: boolean;
  reducedMotion: boolean;
  ready: boolean;
};

declare global {
  interface Window {
    __signLanguageSeasonDelivery?: {
      select: (index: number) => void;
      snapshot: () => SeasonSnapshot;
    };
  }
}

const performances: readonly Performance[] = [
  {
    title: '沿着风的边缘',
    month: 'SEP',
    day: '12',
    time: '19:30',
    summary: '双人动作剧。两种手语节奏从舞台边缘相遇，停顿成为第三位表演者。',
    caption: '“风没有声音，但它让每一只手有了方向。”',
    accessibility: ['全场中国手语演出', '开放式中文字幕', '演后提供触觉舞台导览'],
    ticketAction: '选择演示座位',
    price: '¥180 · 演示',
    scoreWord: '靠近 / 呼吸 / 展开',
    gestureDescription: '两条手势轨迹从舞台两侧靠近，在中央停顿后向上展开。',
    gesturePath: 'M100 540 C150 470 205 490 246 410 C292 319 352 384 394 292 C438 194 520 252 620 116',
    counterPath: 'M132 168 C210 205 222 292 316 300 C402 307 446 424 598 506',
    nodes: [[100, 540], [246, 410], [394, 292], [620, 116]],
    holdTransform: 'translate(0 0)',
    stageLabel: '相遇 / 上升',
    stageDescription: '两个抽象动作点从左右两侧进入，在中央交汇后向上移动。',
    stagePath: 'M34 132 C90 116 120 82 178 84 C236 86 270 50 326 32',
    stageOrigin: [34, 132],
    stageTarget: [326, 32]
  },
  {
    title: '停顿练习',
    month: 'OCT',
    day: '03',
    time: '15:00',
    summary: '独演与实时字幕。动作在每一次句号前停住，让观众看见语言尚未发生的部分。',
    caption: '“请把这一秒留白，下一句话会从肩膀开始。”',
    accessibility: ['中国手语与实时中文字幕', '提供低刺激观演区', '开演前 30 分钟开放舞台触摸'],
    ticketAction: '预约演示场次',
    price: '¥120 · 演示',
    scoreWord: '发出 / 停住 / 回应',
    gestureDescription: '主轨迹短促折返并多次停顿，副轨迹在下方形成延迟回应。',
    gesturePath: 'M112 564 C180 518 142 438 262 424 C356 412 300 306 430 294 C526 284 492 190 610 146',
    counterPath: 'M102 226 C190 250 244 232 282 326 C326 432 458 416 610 520',
    nodes: [[112, 564], [262, 424], [430, 294], [610, 146]],
    holdTransform: 'translate(40 -48)',
    stageLabel: '折返 / 停驻',
    stageDescription: '一个抽象动作点在舞台中线两侧折返，最终停在观众近侧。',
    stagePath: 'M42 86 C108 32 160 142 204 82 C246 26 278 118 326 138',
    stageOrigin: [42, 86],
    stageTarget: [326, 138]
  },
  {
    title: '向光说话',
    month: 'NOV',
    day: '16',
    time: '20:00',
    summary: '群体动作与投影字幕。六位表演者把同一句话拆成方向、速度与空间层次。',
    caption: '“当光落在手上，我们终于拥有同一片舞台。”',
    accessibility: ['中国手语、开放式字幕与简明字幕', '灯光变化提前在节目单标注', '轮椅席与陪同席可连续选择'],
    ticketAction: '查看演示席位',
    price: '¥220 · 演示',
    scoreWord: '聚集 / 交叠 / 发光',
    gestureDescription: '多段手势轨迹由低处聚集，在中央交叠后同时向三个方向发散。',
    gesturePath: 'M94 582 C188 566 206 476 302 452 C402 428 338 324 444 276 C524 240 558 178 632 92',
    counterPath: 'M94 118 C162 178 258 142 322 252 C376 346 506 346 624 454',
    nodes: [[94, 582], [302, 452], [444, 276], [632, 92]],
    holdTransform: 'translate(-52 58)',
    stageLabel: '聚集 / 发散',
    stageDescription: '多个抽象动作方向在舞台中央聚集，再向前方与两侧发散。',
    stagePath: 'M40 142 C104 136 128 102 180 84 C226 68 270 60 324 28',
    stageOrigin: [40, 142],
    stageTarget: [324, 28]
  }
];

const root = document.documentElement;
const tabs = [...document.querySelectorAll<HTMLButtonElement>('[data-performance-index]')];
const panel = document.querySelector<HTMLElement>('#performance-panel');
const month = document.querySelector<HTMLElement>('[data-month]');
const day = document.querySelector<HTMLElement>('[data-day]');
const time = document.querySelector<HTMLElement>('[data-time]');
const number = document.querySelector<HTMLElement>('[data-performance-number]');
const title = document.querySelector<HTMLElement>('[data-performance-title]');
const summary = document.querySelector<HTMLElement>('[data-performance-summary]');
const caption = document.querySelector<HTMLElement>('[data-caption]');
const accessibilityList = document.querySelector<HTMLUListElement>('[data-accessibility-list]');
const ticketAction = document.querySelector<HTMLElement>('[data-ticket-action]');
const ticketPrice = document.querySelector<HTMLElement>('[data-ticket-price]');
const ticketButton = document.querySelector<HTMLButtonElement>('[data-ticket-button]');
const ticketStatus = document.querySelector<HTMLElement>('[data-ticket-status]');
const scoreCount = document.querySelector<HTMLElement>('[data-score-count]');
const scoreWord = document.querySelector<SVGTextElement>('[data-score-word]');
const gestureDescription = document.querySelector<SVGDescElement>('[data-gesture-description]');
const gesturePath = document.querySelector<SVGPathElement>('[data-gesture-path]');
const gestureShadow = document.querySelector<SVGPathElement>('[data-gesture-shadow]');
const counterPath = document.querySelector<SVGPathElement>('[data-counter-path]');
const nodes = [...document.querySelectorAll<SVGCircleElement>('[data-node]')];
const holdMark = document.querySelector<SVGGElement>('[data-hold-mark]');
const stageLabel = document.querySelector<HTMLElement>('[data-stage-label]');
const stageDescription = document.querySelector<SVGDescElement>('[data-stage-description]');
const stagePath = document.querySelector<SVGPathElement>('[data-stage-path]');
const stageOrigin = document.querySelector<SVGCircleElement>('[data-stage-origin]');
const stageTarget = document.querySelector<SVGCircleElement>('[data-stage-target]');
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

if (
  tabs.length !== performances.length || !panel || !month || !day || !time || !number || !title || !summary
  || !caption || !accessibilityList || !ticketAction || !ticketPrice || !ticketButton || !ticketStatus
  || !scoreCount || !scoreWord || !gestureDescription || !gesturePath || !gestureShadow || !counterPath
  || nodes.length !== 4 || !holdMark || !stageLabel || !stageDescription || !stagePath || !stageOrigin || !stageTarget
) {
  throw new Error('Sign-language season delivery is missing required synchronized elements.');
}

let activeIndex = 0;
let transitionTimer = 0;

const boundedIndex = (index: number) => ((index % performances.length) + performances.length) % performances.length;

function setCirclePosition(circle: SVGCircleElement, position: readonly [number, number]) {
  circle.setAttribute('cx', String(position[0]));
  circle.setAttribute('cy', String(position[1]));
}

function select(index: number, focus = false) {
  activeIndex = boundedIndex(index);
  const performance = performances[activeIndex];
  const activeTab = tabs[activeIndex];

  tabs.forEach((tab, tabIndex) => {
    const selected = tabIndex === activeIndex;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  panel.setAttribute('aria-labelledby', activeTab.id);
  root.dataset.performance = String(activeIndex + 1);

  month.textContent = performance.month;
  day.textContent = performance.day;
  time.textContent = performance.time;
  number.textContent = `作品 0${activeIndex + 1}`;
  title.textContent = performance.title;
  summary.textContent = performance.summary;
  caption.textContent = performance.caption;
  accessibilityList.replaceChildren(...performance.accessibility.map((item) => {
    const entry = document.createElement('li');
    entry.textContent = item;
    return entry;
  }));
  ticketAction.textContent = performance.ticketAction;
  ticketPrice.textContent = performance.price;
  ticketStatus.textContent = '此页面不连接真实票务系统。';

  scoreCount.textContent = `0${activeIndex + 1} / 03`;
  scoreWord.textContent = performance.scoreWord;
  gestureDescription.textContent = performance.gestureDescription;
  gesturePath.setAttribute('d', performance.gesturePath);
  gestureShadow.setAttribute('d', performance.gesturePath);
  counterPath.setAttribute('d', performance.counterPath);
  nodes.forEach((node, nodeIndex) => setCirclePosition(node, performance.nodes[nodeIndex] ?? performance.nodes[0]));
  holdMark.setAttribute('transform', performance.holdTransform);

  stageLabel.textContent = performance.stageLabel;
  stageDescription.textContent = performance.stageDescription;
  stagePath.setAttribute('d', performance.stagePath);
  setCirclePosition(stageOrigin, performance.stageOrigin);
  setCirclePosition(stageTarget, performance.stageTarget);

  window.clearTimeout(transitionTimer);
  if (!reducedMotionQuery.matches) {
    root.dataset.changing = 'true';
    transitionTimer = window.setTimeout(() => delete root.dataset.changing, 90);
  }
  if (focus) activeTab.focus();
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => select(Number(tab.dataset.performanceIndex)));
  tab.addEventListener('keydown', (event) => {
    const current = Number(tab.dataset.performanceIndex);
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      select(current + 1, true);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      select(current - 1, true);
    } else if (event.key === 'Home') {
      event.preventDefault();
      select(0, true);
    } else if (event.key === 'End') {
      event.preventDefault();
      select(performances.length - 1, true);
    }
  });
});

ticketButton.addEventListener('click', () => {
  ticketStatus.textContent = `已选择演示场次“${performances[activeIndex].title}”；不会创建订单或产生费用。`;
});

function snapshot(): SeasonSnapshot {
  return {
    activeIndex,
    activeTitle: title.textContent ?? '',
    panelLabelledBy: panel.getAttribute('aria-labelledby'),
    selectedTabs: tabs.filter((tab) => tab.getAttribute('aria-selected') === 'true').length,
    accessibilityItems: accessibilityList.children.length,
    ticketStatus: ticketStatus.textContent ?? '',
    viewport: { width: window.innerWidth, height: window.innerHeight },
    hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    reducedMotion: reducedMotionQuery.matches,
    ready: root.dataset.signLanguageSeasonReady === 'true'
  };
}

select(0);
root.dataset.signLanguageSeasonReady = 'true';
window.__signLanguageSeasonDelivery = { select, snapshot };

export {};
