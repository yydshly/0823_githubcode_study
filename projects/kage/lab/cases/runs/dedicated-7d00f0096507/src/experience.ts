import { defineExperience, startExperience } from '@signal-lab/experience-sdk';
import { direct } from './director';
import { createLibraryScene, type LibraryScene } from './scene';

let scene: LibraryScene | null = null;
let root: HTMLElement | null = null;
let selectedZone = 3;
let onClick: ((event: Event) => void) | null = null;
let onChange: ((event: Event) => void) | null = null;
let updateTimer: number | null = null;

const floorLabels = ['一层 · 交流阅览', '二层 · 安静阅览', '三层 · 地方文献'];
const timeLabels = ['09:00—10:00', '14:00—15:00', '18:30—19:30'];
const floorZoneLabels = [
  ['北侧报刊角', '中央共享桌', '中庭连廊', '沿街长桌区'],
  ['北侧书架区', '中央检索区', '中庭内侧', '临窗阅读区 B'],
  ['地方志书库', '数字查阅区', '采光井内侧', '独立研究席'],
];

function template(): string {
  return `
    <main class="observatory" aria-labelledby="page-title">
      <header class="site-header">
        <a class="wordmark" href="#overview" aria-label="榆岸社区图书馆首页">榆岸社区图书馆 <span>YUAAN / 02</span></a>
        <nav aria-label="页面导航"><a href="#observe">观察台</a><a href="#reserve">预约</a></nav>
      </header>

      <section class="hero" id="overview">
        <div class="hero-copy">
          <p class="eyebrow">公共阅览空间 · 今日观察</p>
          <h1 id="page-title">安静座位<br>观察台</h1>
          <p class="dek">先看光线与声音，再决定坐在哪里。楼层、时段与环境指标会共同指向平面图中的一处座位区。</p>
          <a class="text-link" href="#observe">开始查看 <span aria-hidden="true">↓</span></a>
        </div>
        <aside class="library-card" aria-label="观察台说明">
          <span class="card-index">借阅卡 / SEAT NOTE 047</span>
          <strong>适合专注阅读的<br>一小时</strong>
          <dl><div><dt>开放</dt><dd>08:30—20:30</dd></div><div><dt>更新</dt><dd>每 15 分钟</dd></div></dl>
          <p>页面数值均为演示数据，预约前请以馆内实际状态为准。</p>
        </aside>
      </section>

      <section class="workbench" id="observe" aria-labelledby="observe-title">
        <div class="plan-panel">
          <div class="plan-heading">
            <div><p class="eyebrow" data-plan-floor>日光平面 / 2F</p><h2 id="observe-title">选择一段安静时间</h2></div>
            <div class="plan-coordinate"><span class="north">N ↑</span><span data-plan-time>14:00 / 西向漫射光</span></div>
          </div>
          <ol class="plan-index" aria-label="当前楼层区域">
            <li data-plan-zone="0"><span>01</span><b>北侧书架区</b></li>
            <li data-plan-zone="3" class="is-active"><span>02</span><b>临窗阅读区 B</b></li>
            <li data-plan-zone="2"><span>03</span><b>中庭内侧</b></li>
          </ol>
          <p class="plan-caption" data-plan-caption><span class="key"></span> 当前建议：二层临窗阅读区 B</p>
        </div>

        <form class="control-card" aria-label="座位观察条件">
          <div class="control-intro"><span>SEAT OBSERVATION</span><b>用条件校准平面，而不是只看空位。</b></div>
          <div class="control-row"><label for="floor">楼层</label><select id="floor" name="floor"><option value="1">一层 · 交流阅览</option><option value="2" selected>二层 · 安静阅览</option><option value="3">三层 · 地方文献</option></select></div>
          <div class="control-row"><label for="time">时段</label><select id="time" name="time"><option>09:00—10:00</option><option selected>14:00—15:00</option><option>18:30—19:30</option></select></div>
          <div class="metrics" aria-label="演示环境数据" aria-live="polite">
            <article data-metric="light"><span>采光</span><strong>柔和</strong><small>西侧漫射光</small></article>
            <article data-metric="noise"><span>噪声</span><strong>32 dB</strong><small>演示估算</small></article>
            <article data-metric="availability"><span>可用率</span><strong>68%</strong><small>17 / 25 席</small></article>
            <article data-metric="power"><span>插座</span><strong>可用</strong><small>桌侧 8 处</small></article>
          </div>
          <fieldset><legend>建议区域</legend><div class="zone-options"><button type="button" data-zone="0">北侧书架区</button><button type="button" data-zone="3" class="is-active">临窗阅读区 B</button><button type="button" data-zone="2">中庭内侧</button></div></fieldset>
          <p class="demo-note">演示数据 · 非实时馆内信息</p>
        </form>
      </section>

      <section class="resolution" id="reserve" aria-labelledby="reserve-title">
        <div class="seat-stamp" aria-hidden="true"><span data-stamp-floor>2F</span><b data-stamp-seat>B—14</b><i data-stamp-feature>WINDOW / POWER</i></div>
        <div class="resolution-copy" aria-live="polite"><p class="eyebrow">选择已核对</p><h2 id="reserve-title" data-reservation-title>二层 · 安静阅览 · 临窗阅读区 B</h2><p data-reservation-detail>14:00—15:00　建议座位 B—14<br>柔和采光 · 33 dB · 桌侧插座 8 处</p><button class="primary-action" type="button">预约这个座位 <span aria-hidden="true">→</span></button><small>提交后仍可在 10 分钟内取消。</small></div>
      </section>

      <footer><span>榆岸社区图书馆</span><span>环境数据为界面演示</span></footer>
    </main>`;
}

interface SeatSnapshot {
  floorLabel: string;
  timeLabel: string;
  zoneLabel: string;
  light: string;
  lightNote: string;
  noise: number;
  free: number;
  total: number;
  power: number;
  seat: string;
}

function recommendZone(floor: number, timeIndex: number): number {
  if (timeIndex === 2) return 0;
  if (floor === 3) return 2;
  return 3;
}

function createSnapshot(floor: number, timeIndex: number, zone: number): SeatSnapshot {
  const total = [22, 25, 18][floor - 1] ?? 22;
  const free = Math.max(4, total - 3 - floor * 2 - timeIndex * 4 - zone);
  const light = timeIndex === 0 ? '明亮' : timeIndex === 1 ? '柔和' : '低照度';
  const timeDirection = ['东向晨光', '西侧漫射光', '室内阅读灯'][timeIndex] ?? '均匀天光';
  const zoneDirection = zone === 3 ? '临窗' : zone === 0 ? '北侧' : zone === 2 ? '中庭反射' : '内部均匀';
  const noise = 24 + floor * 2 + timeIndex * 5 + (zone === 1 ? 4 : zone === 2 ? 2 : 0);
  const power = zone === 3 ? 8 : zone === 2 ? 5 : zone === 0 ? 3 : 2;
  const prefix = ['N', 'E', 'C', 'B'][zone] ?? 'N';
  const seat = `${prefix}—${String(7 + floor * 3 + timeIndex * 2).padStart(2, '0')}`;
  return {
    floorLabel: floorLabels[floor - 1] ?? floorLabels[0]!,
    timeLabel: timeLabels[timeIndex] ?? timeLabels[0]!,
    zoneLabel: floorZoneLabels[floor - 1]?.[zone] ?? floorZoneLabels[0]![0]!,
    light,
    lightNote: `${timeDirection} · ${zoneDirection}`,
    noise,
    free,
    total,
    power,
    seat,
  };
}

function setText(selector: string, value: string): void {
  const node = root?.querySelector<HTMLElement>(selector);
  if (node) node.textContent = value;
}

function synchronizeSelection(selectRecommendation = false): void {
  if (!root) return;
  const floorSelect = root.querySelector<HTMLSelectElement>('#floor');
  const timeSelect = root.querySelector<HTMLSelectElement>('#time');
  if (!floorSelect || !timeSelect) return;
  const floor = Number(floorSelect.value);
  const timeIndex = timeSelect.selectedIndex;
  if (selectRecommendation) selectedZone = recommendZone(floor, timeIndex);
  const snapshot = createSnapshot(floor, timeIndex, selectedZone);
  const availability = Math.round((snapshot.free / snapshot.total) * 100);
  const visibleZoneIds = [0, 3, 2];
  root.dataset.selection = `${floor}-${timeIndex}-${selectedZone}`;
  root.dataset.floor = String(floor);
  root.dataset.time = String(timeIndex);
  root.querySelectorAll<HTMLElement>('[data-zone]').forEach((node) => {
    const zone = Number(node.dataset.zone);
    node.classList.toggle('is-active', zone === selectedZone);
    const label = floorZoneLabels[floor - 1]?.[zone];
    if (label) node.textContent = label;
  });
  root.querySelectorAll<HTMLElement>('[data-plan-zone]').forEach((node, index) => {
    const zone = visibleZoneIds[index] ?? 0;
    node.classList.toggle('is-active', zone === selectedZone);
    const label = floorZoneLabels[floor - 1]?.[zone];
    const textNode = node.querySelector<HTMLElement>('b');
    if (label && textNode) textNode.textContent = label;
  });
  scene?.setContext(floor, timeIndex, selectedZone);
  setText('[data-plan-floor]', `日光平面 / ${floor}F · ${snapshot.floorLabel.split(' · ')[1]}`);
  setText('[data-plan-time]', `${snapshot.timeLabel.slice(0, 5)} / ${snapshot.lightNote.split(' · ')[0]}`);
  const caption = root.querySelector<HTMLElement>('[data-plan-caption]');
  if (caption) caption.innerHTML = `<span class="key"></span> 当前建议：${snapshot.floorLabel.split(' · ')[0]} · ${snapshot.zoneLabel}`;
  setText('[data-metric="light"] strong', snapshot.light);
  setText('[data-metric="light"] small', snapshot.lightNote);
  setText('[data-metric="noise"] strong', `${snapshot.noise} dB`);
  setText('[data-metric="noise"] small', `${snapshot.timeLabel} · 演示估算`);
  setText('[data-metric="availability"] strong', `${availability}%`);
  setText('[data-metric="availability"] small', `${snapshot.free} / ${snapshot.total} 席`);
  setText('[data-metric="power"] strong', snapshot.power > 3 ? '充足' : '有限');
  setText('[data-metric="power"] small', `桌侧 ${snapshot.power} 处`);
  setText('[data-stamp-floor]', `${floor}F`);
  setText('[data-stamp-seat]', snapshot.seat);
  setText('[data-stamp-feature]', snapshot.power > 3 ? 'LIGHT / POWER' : 'QUIET / READING');
  setText('[data-reservation-title]', `${snapshot.floorLabel} · ${snapshot.zoneLabel}`);
  const detail = root.querySelector<HTMLElement>('[data-reservation-detail]');
  if (detail) detail.innerHTML = `${snapshot.timeLabel}　建议座位 ${snapshot.seat}<br>${snapshot.light}采光 · ${snapshot.noise} dB · 桌侧插座 ${snapshot.power} 处`;
}

startExperience(defineExperience({
  mount(context): void {
    root = document.createElement('div');
    root.className = 'quiet-library-page';
    root.innerHTML = template();
    context.container.appendChild(root);

    try {
      scene = createLibraryScene(context.canvas, context.quality);
      scene.resize(context.viewport.width, context.viewport.height, context.viewport.dpr);
      synchronizeSelection(true);
    } catch {
      context.canvas.classList.add('canvas-unavailable');
      scene = null;
      synchronizeSelection(true);
    }

    onClick = (event: Event): void => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const zoneButton = target.closest<HTMLButtonElement>('[data-zone]');
      if (zoneButton) {
        const value = Number(zoneButton.dataset.zone);
        if (Number.isFinite(value)) {
          selectedZone = value;
          synchronizeSelection(false);
        }
      }
      const action = target.closest('.primary-action');
      if (action instanceof HTMLButtonElement) {
        action.textContent = '已保留演示席位 ✓';
        action.classList.add('is-confirmed');
      }
    };
    onChange = (event: Event): void => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement)) return;
      synchronizeSelection(true);
      root?.classList.add('selection-updated');
      if (updateTimer !== null) window.clearTimeout(updateTimer);
      updateTimer = window.setTimeout(() => root?.classList.remove('selection-updated'), 320);
    };
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
  },
  update(frame): void {
    const state = direct({
      progress: frame.progress,
      elapsed: frame.elapsed,
      pointerX: frame.pointer.x,
      pointerY: frame.pointer.y,
      reducedMotion: frame.reducedMotion,
    });
    scene?.update(state);
    root?.style.setProperty('--story-progress', state.resolve.toFixed(3));
  },
  resize(viewport): void {
    scene?.resize(viewport.width, viewport.height, viewport.dpr);
  },
  dispose(): void {
    if (root && onClick) root.removeEventListener('click', onClick);
    if (root && onChange) root.removeEventListener('change', onChange);
    if (updateTimer !== null) window.clearTimeout(updateTimer);
    updateTimer = null;
    scene?.dispose();
    scene = null;
    root?.remove();
    root = null;
    onClick = null;
    onChange = null;
  },
}));