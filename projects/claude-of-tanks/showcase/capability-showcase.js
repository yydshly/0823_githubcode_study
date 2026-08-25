const REQUIRED_EFFECT_TYPES = [
  'fire', 'muzzle_flash', 'tracer', 'impact', 'sparks', 'explosion',
  'tank_kill', 'dust', 'engine_smoke', 'burning', 'detrack',
  'firing_moment', 'explosion_moment', 'mg_burst', 'barrage',
  'armor_scar', 'exhaust',
];

const PHASES = [
  { at: 0, label: '01 / 战场与程序化载具', detail: '四辆载具、地形、植被、结构、光照与后处理建立空间尺度。' },
  { at: 2800, label: '02 / 运动与武器表现', detail: '履带运动、扬尘、排烟、机枪弹链、炮口焰、后坐与曳光弹。' },
  { at: 7200, label: '03 / 命中语言', detail: '穿透、未穿透、跳弹、ERA、间隙装甲和装甲伤痕使用同一事件系统。' },
  { at: 11800, label: '04 / 战场破坏', detail: '炮击、地表爆炸、断履带、发动机烟与持续燃烧叠加。' },
  { at: 16000, label: '05 / 击毁与最终构图', detail: '弹药架击毁、炮塔抛离、残骸、火球与烟柱进入最终英雄镜头。' },
];

const SCENE = {
  map: 'desert',
  seed: 8242026,
  actors: [
    { id: 't90m', name: 'red-lead', pos: [12, -125], facingDeg: 0, turretDeg: 0, gunDeg: 2, camo: 'desert', camoSeed: 8241, state: 'intact' },
    { id: 'm1a2', name: 'blue-lead', pos: [18, -58], facingDeg: 180, turretDeg: 0, gunDeg: 1, camo: 'merdc', camoSeed: 8242, state: 'intact' },
    { id: 'm2a2_bradley', name: 'support', pos: [7, -137], facingDeg: 2, turretDeg: 0, gunDeg: 0, camo: 'digital', camoSeed: 8243, state: 'intact' },
    { id: 'tiger1', name: 'old-wreck', pos: [7, -70], facingDeg: 160, turretDeg: 30, gunDeg: -3, state: 'wrecked-burnt', stateAgeS: 180 },
  ],
  effects: [
    { id: 'fx-exhaust', type: 'exhaust', actor: 'red-lead', tMs: 300, params: { count: 22, intensity: 1, sooty: true } },
    { id: 'fx-dust-red', type: 'dust', actor: 'red-lead', tMs: 550, params: { count: 18, intensity: 1, dirDeg: 0 } },
    { id: 'fx-dust-support', type: 'dust', actor: 'support', tMs: 850, params: { count: 14, intensity: 0.85, dirDeg: 2 } },
    { id: 'fx-mg', type: 'mg_burst', actor: 'support', tMs: 2500, params: { count: 10, gapM: 5, spreadDeg: 0.75, caliberMm: 25 } },
    { id: 'fx-flash', type: 'muzzle_flash', actor: 'red-lead', tMs: 3300, params: { caliberMm: 125 } },
    { id: 'fx-fire', type: 'fire', actor: 'red-lead', tMs: 3600, params: { slot: 0, tracer: true, recoil: true } },
    { id: 'fx-tracer', type: 'tracer', from: [12, 3.2, -88], to: [18, 3.2, -66], tMs: 4100, params: { shellType: 'APFSDS', speedMps: 1200, caliberMm: 120 } },
    { id: 'fx-pen', type: 'impact', actor: 'blue-lead', hFrac: 0.56, tMs: 5200, params: { kind: 'pen', caliberMm: 125, normal: [-0.3, 0.4, -0.85] } },
    { id: 'fx-nonpen', type: 'impact', actor: 'blue-lead', hFrac: 0.68, tMs: 5750, params: { kind: 'nonpen', caliberMm: 120, normal: [-0.2, 0.6, -0.75] } },
    { id: 'fx-era', type: 'impact', actor: 'blue-lead', hFrac: 0.62, tMs: 6300, params: { kind: 'era', caliberMm: 125, normal: [-0.3, 0.5, -0.8] } },
    { id: 'fx-spaced', type: 'impact', actor: 'blue-lead', hFrac: 0.48, tMs: 6800, params: { kind: 'spaced_absorb', caliberMm: 105, normal: [-0.2, 0.4, -0.9] } },
    { id: 'fx-ricochet', type: 'sparks', actor: 'blue-lead', hFrac: 0.72, tMs: 7350, params: { caliberMm: 120 } },
    { id: 'fx-he-pen', type: 'impact', at: [20, -67], tMs: 7900, params: { kind: 'he_pen', caliberMm: 152, normal: [0, 1, 0] } },
    { id: 'fx-he-splash', type: 'impact', at: [11, -74], tMs: 8350, params: { kind: 'he_splash', caliberMm: 155, normal: [0, 1, 0] } },
    { id: 'fx-scar', type: 'armor_scar', actor: 'blue-lead', tMs: 8750, params: { count: 6, caliberMm: 120, seedDeg: 18 } },
    { id: 'fx-small-boom', type: 'explosion', at: [13, -84], tMs: 9400, params: { size: 'small' } },
    { id: 'fx-medium-boom', type: 'explosion', at: [20, -79], tMs: 10100, params: { size: 'medium', cause: 'shot' } },
    { id: 'fx-barrage', type: 'barrage', at: [15, -78], tMs: 10800, params: { count: 7, radiusM: 14, size: 'mixed', seedDeg: 41 } },
    { id: 'fx-detrack', type: 'detrack', actor: 'blue-lead', tMs: 12000, params: { side: 'L' } },
    { id: 'fx-smoke', type: 'engine_smoke', actor: 'blue-lead', tMs: 12700, params: {} },
    { id: 'fx-burning', type: 'burning', actor: 'blue-lead', tMs: 13400, params: {} },
    { id: 'fx-firing-still', type: 'firing_moment', actor: 'support', tMs: 14200, params: { ageS: 0.05, caliberMm: 25, shellType: 'AP' } },
    { id: 'fx-explosion-still', type: 'explosion_moment', at: [17, -66], tMs: 15000, params: { ageS: 0.6 } },
    { id: 'fx-large-boom', type: 'explosion', at: [19, -63], tMs: 15700, params: { size: 'large', cause: 'ammorack' } },
    { id: 'fx-kill', type: 'tank_kill', actor: 'blue-lead', tMs: 16600, params: { cause: 'ammorack', pop: true } },
  ],
  storyboard: {
    version: 1,
    durationMs: 20000,
    shots: [
      { id: 'establish', label: '战场全景', tMs: 0, pos: [15, 34, -154], lookAt: [14, 2, -88], fov: 44, transition: 'linear' },
      { id: 'advance', label: '联合推进', tMs: 2800, pos: [15, 7, -146], lookAt: [13, 2, -102], fov: 38, transition: 'linear' },
      { id: 'ballistics', label: '弹道与命中', tMs: 7200, pos: [6, 5, -88], lookAt: [18, 2.5, -66], fov: 34, transition: 'cut' },
      { id: 'destruction', label: '炮击与战损', tMs: 11800, pos: [25, 9, -92], lookAt: [15, 2, -72], fov: 40, transition: 'linear' },
      { id: 'kill', label: '击毁特写', tMs: 16000, pos: [12, 6, -47], lookAt: [18, 2.2, -62], fov: 32, transition: 'cut' },
      { id: 'hero', label: '战后英雄镜头', tMs: 18500, pos: [3, 8, -91], lookAt: [14, 2, -76], fov: 38, transition: 'linear' },
    ],
    actorTracks: [
      { actor: 'red-lead', keys: [
        { id: 'red-0', tMs: 0, pos: [12, -125], facingDeg: 0, turretDeg: 0, gunDeg: 2, transition: 'smooth' },
        { id: 'red-1', tMs: 7200, pos: [13, -94], facingDeg: 2, turretDeg: 4, gunDeg: 1, transition: 'smooth' },
        { id: 'red-2', tMs: 18500, pos: [14, -78], facingDeg: 3, turretDeg: 2, gunDeg: 0, transition: 'smooth' },
      ] },
      { actor: 'blue-lead', keys: [
        { id: 'blue-0', tMs: 0, pos: [18, -58], facingDeg: 180, turretDeg: 0, gunDeg: 1, transition: 'smooth' },
        { id: 'blue-1', tMs: 7200, pos: [17, -67], facingDeg: 180, turretDeg: 0, gunDeg: 0, transition: 'smooth' },
        { id: 'blue-2', tMs: 11800, pos: [17, -70], facingDeg: 180, turretDeg: -2, gunDeg: -1, transition: 'smooth' },
      ] },
      { actor: 'support', keys: [
        { id: 'support-0', tMs: 0, pos: [7, -137], facingDeg: 2, turretDeg: 0, gunDeg: 0, transition: 'smooth' },
        { id: 'support-1', tMs: 9000, pos: [9, -104], facingDeg: 4, turretDeg: 5, gunDeg: 2, transition: 'smooth' },
        { id: 'support-2', tMs: 18500, pos: [10, -88], facingDeg: 4, turretDeg: 3, gunDeg: 1, transition: 'smooth' },
      ] },
    ],
  },
  camera: { pos: [15, 34, -154], lookAt: [14, 2, -88], groundRel: true, fov: 44, mode: 'fly' },
  fxTime: 0,
  timeScale: 0,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForStudio(timeoutMs = 300000) {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    if (window.__GAME_READY === true && window.__STUDIO?.active === true) return window.__STUDIO;
    await sleep(250);
  }
  throw new Error('Scene Studio did not become ready within five minutes');
}

function phaseAt(ms) {
  let result = PHASES[0];
  for (const phase of PHASES) if (ms >= phase.at) result = phase;
  return result;
}

function mountPanel(controller) {
  const root = document.createElement('section');
  root.id = 'cot-capability-director';
  root.innerHTML = `
    <style>
      #cot-capability-director{position:fixed;z-index:99999;left:18px;bottom:18px;width:min(430px,calc(100vw - 36px));padding:16px;border:1px solid rgba(198,255,100,.35);border-radius:14px;color:#eef5e8;background:rgba(8,13,10,.88);box-shadow:0 24px 70px rgba(0,0,0,.45);backdrop-filter:blur(16px);font:13px/1.45 Inter,system-ui,sans-serif}
      #cot-capability-director h2{margin:0 0 4px;color:#c6ff64;font-size:13px;letter-spacing:.1em}#cot-capability-director p{margin:0;color:#b8c2b3}
      #cot-capability-director .cot-phase{margin:12px 0;padding:10px;border-left:3px solid #c6ff64;background:rgba(198,255,100,.07)}#cot-capability-director .cot-phase strong{display:block;margin-bottom:3px;color:#fff}
      #cot-capability-director .cot-controls,#cot-capability-director .cot-jumps{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
      #cot-capability-director button{min-height:32px;padding:6px 9px;border:1px solid rgba(255,255,255,.2);border-radius:8px;color:#eef5e8;background:#182019;cursor:pointer}#cot-capability-director button:hover{border-color:#c6ff64}#cot-capability-director button:disabled{opacity:.45;cursor:wait}
      #cot-capability-director .cot-time{float:right;color:#ffcf86;font-variant-numeric:tabular-nums}#cot-capability-director[data-minimized=true]>*:not(h2){display:none}
      @media(max-width:560px){#cot-capability-director{left:8px;bottom:8px;width:calc(100vw - 16px);padding:11px}.cot-jumps{display:none!important}}
    </style>
    <h2>ALL-CAPABILITIES SCENE <span class="cot-time">00.0 / 20.0</span></h2>
    <p class="cot-status">等待 Scene Studio…</p>
    <div class="cot-phase"><strong>正在建立场景</strong><span>载入程序化车辆、地图和效果资源。</span></div>
    <div class="cot-controls"><button data-action="play" disabled>播放</button><button data-action="pause" disabled>暂停</button><button data-action="reset" disabled>重置</button><button data-action="capture" disabled>保存截图</button><button data-action="record" disabled>录制 20 秒</button><button data-action="minimize">收起</button></div>
    <div class="cot-jumps"></div>`;
  document.body.appendChild(root);
  const status = root.querySelector('.cot-status');
  const phase = root.querySelector('.cot-phase');
  const time = root.querySelector('.cot-time');
  const buttons = [...root.querySelectorAll('button[data-action]:not([data-action=minimize])')];
  const jumps = root.querySelector('.cot-jumps');
  PHASES.forEach((item, index) => {
    const button = document.createElement('button');
    button.textContent = `${index + 1}`;
    button.title = item.label;
    button.disabled = true;
    button.addEventListener('click', () => controller.seek(item.at));
    jumps.appendChild(button);
  });
  root.querySelector('[data-action=minimize]').addEventListener('click', (event) => {
    root.dataset.minimized = root.dataset.minimized === 'true' ? 'false' : 'true';
    event.currentTarget.textContent = root.dataset.minimized === 'true' ? '展开' : '收起';
  });
  root.querySelector('[data-action=play]').addEventListener('click', () => controller.play());
  root.querySelector('[data-action=pause]').addEventListener('click', () => controller.pause());
  root.querySelector('[data-action=reset]').addEventListener('click', () => controller.reload());
  root.querySelector('[data-action=capture]').addEventListener('click', () => controller.capture());
  root.querySelector('[data-action=record]').addEventListener('click', () => controller.record());
  controller.ui = {
    ready() { [...buttons, ...jumps.querySelectorAll('button')].forEach((button) => { button.disabled = false; }); status.textContent = '全部 17 类效果已编排 · 可播放、分段审查或录制'; },
    error(message) { status.textContent = `加载失败：${message}`; },
    tick(ms) { const active = phaseAt(ms); time.textContent = `${(ms / 1000).toFixed(1).padStart(4, '0')} / 20.0`; phase.innerHTML = `<strong>${active.label}</strong><span>${active.detail}</span>`; },
  };
  return root;
}

const controller = {
  status: 'booting', scene: SCENE, phases: PHASES, requiredEffectTypes: REQUIRED_EFFECT_TYPES, studio: null, ui: null,
  groundStoryboard() {
    const board = structuredClone(SCENE.storyboard);
    const toWorld = (point) => {
      this.studio.setCamera({ pos: point, groundRel: true });
      return this.studio.getCamera().pos;
    };
    for (const shot of board.shots) {
      shot.pos = toWorld(shot.pos);
      shot.lookAt = toWorld(shot.lookAt);
    }
    return board;
  },
  async reload() {
    this.status = 'loading';
    await this.studio.load(SCENE);
    this.studio.setStoryboard(this.groundStoryboard());
    this.studio.setRailVisible(false);
    this.studio.seek(0);
    this.status = 'ready';
    this.ui?.ready();
    return this.audit();
  },
  play() { if (this.studio.fxTimeMs >= this.studio.durationMs - 1) this.studio.stop(); this.studio.play(); },
  pause() { this.studio.pause(); },
  seek(ms) { this.studio.pause(); this.studio.seek(ms); },
  capture() { return this.studio.capture({ width: 2560, download: true, name: 'claude-of-tanks-all-capabilities' }); },
  async record() { return this.studio.recordVideo({ fps: 60, videoBitsPerSecond: 12000000, download: true, name: 'claude-of-tanks-all-capabilities' }); },
  audit() {
    const effects = this.studio.listEffects();
    const present = new Set(effects.map((effect) => effect.type));
    return { status: this.status, map: this.studio.mapId, actors: this.studio.listActors().length, effects: effects.length, missingEffectTypes: REQUIRED_EFFECT_TYPES.filter((type) => !present.has(type)), storyboard: this.studio.getStoryboard(), performance: this.studio.performance() };
  },
};

window.__COT_CAPABILITY_SHOWCASE = controller;

if (new URLSearchParams(location.search).get('showcase') === 'capabilities') {
  mountPanel(controller);
  (async () => {
    try {
      controller.studio = await waitForStudio();
      await controller.reload();
      await sleep(700);
      controller.play();
    } catch (error) {
      controller.status = 'error';
      controller.error = String(error?.stack || error);
      controller.ui?.error(error?.message || String(error));
      console.error('[capability-showcase]', error);
    }
  })();
  const update = () => { if (controller.studio) controller.ui?.tick(controller.studio.fxTimeMs || 0); requestAnimationFrame(update); };
  requestAnimationFrame(update);
}

export { SCENE as CAPABILITY_SHOWCASE_SCENE, PHASES as CAPABILITY_SHOWCASE_PHASES, REQUIRED_EFFECT_TYPES };
