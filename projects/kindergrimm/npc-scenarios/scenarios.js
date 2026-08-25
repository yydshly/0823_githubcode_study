import * as THREE from 'three';
import {
  normalizeInput,
  buildRecipes,
  batchManifest,
  scenarioIdentity,
  verifyBatch,
  validateBatchManifest
} from '../runtime/npc-core.js';
import {
  ORIGINAL_PACK_ID,
  listContentPacks,
  getContentPack,
  isOriginalContentPack
} from '../runtime/content-packs.js';
import {
  RUNTIME_SDK_SCHEMA,
  RUNTIME_SDK_VERSION,
  createAssetCache,
  createRuntimeDiagnostics,
  createRuntimeSession,
  loadManifest
} from '../runtime-sdk/index.js';
import { createSceneAdapter } from '../runtime-sdk/three.js';

THREE.ColorManagement.enabled = false;

const MODES = {
  waystation: {
    title: '暮色旅站',
    kicker: 'SERVICE ROLES / SOCIAL SPACING',
    label: 'WAYSTATION / 8 LIVE RIGS',
    brief: '服务型 NPC 需要身份区分与可读站位',
    copy: '同一批角色被分配为守卫、商人、信使等运行时角色。Recipe 只负责视觉身份；职业和任务属于场景状态，因此换场景不必重生成美术资产。',
    points: ['适合城镇、营地、商店和任务中继站', '角色视觉身份由 fingerprint 保持稳定', '玩法身份保留在运行时，不污染 Recipe'],
    action: 'walk',
    layouts: [
      [-3.15, -.67, .61, 'idle'], [-2.25, -.54, .56, 'sit'], [-1.32, -.62, .61, 'idle'], [-.42, -.5, .56, 'idle'],
      [.52, -.64, .61, 'walk'], [1.43, -.52, .56, 'idle'], [2.32, -.64, .61, 'idle'], [3.13, -.51, .55, 'sit']
    ]
  },
  encounter: {
    title: '林缘遭遇',
    kicker: 'COMBAT READABILITY / FRONT-BACK RANK',
    label: 'ENCOUNTER / 4 + 4 FORMATION',
    brief: '战斗场景需要轮廓、阵营和纵深顺序',
    copy: '八个角色仍来自相同 fingerprint，但站位、姿态和绘制排序转为战斗语义。setDepthRank 为每个角色分配连续渲染层，避免透明部件在前后角色之间错误穿插。',
    points: ['适合遭遇战、敌人预览和波次编队', '前后排使用独立 renderOrder block', '攻击、跑动和待机来自上游 createAnimator'],
    action: 'attack',
    layouts: [
      [-2.55, .38, .49, 'idle'], [-.88, .48, .47, 'run'], [.88, .48, .47, 'idle'], [2.55, .38, .49, 'walk'],
      [-2.45, -.78, .64, 'attack'], [-.8, -.72, .62, 'idle'], [.8, -.72, .62, 'attack'], [2.45, -.78, .64, 'idle']
    ]
  },
  council: {
    title: '旧塔议事',
    kicker: 'NARRATIVE FOCUS / REACTION CIRCLE',
    label: 'COUNCIL / DIALOGUE BLOCKING',
    brief: '剧情场景需要焦点角色和反应关系',
    copy: '场景把同一批视觉资产重新编排为议事圆弧：中间角色承担叙事焦点，其他角色通过坐姿、凝视、呼吸和轻微摆动构成反应层。Recipe 无需知道台词或剧情节点。',
    points: ['适合对话、审判、队伍选择和关系事件', '叙事焦点与角色美术身份相互独立', '暂停后可作为剧情分镜和角色审查面板'],
    action: 'sit',
    layouts: [
      [-3.0, -.48, .53, 'sit'], [-2.22, .18, .49, 'idle'], [-1.25, .56, .47, 'idle'], [-.42, -.35, .64, 'idle'],
      [.42, -.35, .64, 'idle'], [1.25, .56, .47, 'idle'], [2.22, .18, .49, 'idle'], [3.0, -.48, .53, 'sit']
    ]
  }
};

const dom = {
  form: document.querySelector('#scene-form'),
  seed: document.querySelector('#scene-seed'),
  rebuild: document.querySelector('#rebuild-scene'),
  pack: document.querySelector('#scene-pack'),
  packCard: document.querySelector('#scene-pack-card'),
  packStatus: document.querySelector('#scene-pack-status'),
  packName: document.querySelector('#scene-pack-name'),
  packCopy: document.querySelector('#scene-pack-copy'),
  packFingerprint: document.querySelector('#scene-pack-fingerprint'),
  sceneRenderer: document.querySelector('#scene-renderer'),
  sceneKitSummary: document.querySelector('#scene-kit-summary'),
  modeButtons: [...document.querySelectorAll('[data-mode]')],
  pause: document.querySelector('#pause-scene'),
  stage: document.querySelector('.stage-wrap'),
  canvas: document.querySelector('#runtime-canvas'),
  fallback: document.querySelector('#scene-fallback'),
  title: document.querySelector('#stage-title'),
  kicker: document.querySelector('#stage-kicker'),
  modeLabel: document.querySelector('#scene-mode-label'),
  status: document.querySelector('#scene-status'),
  recipes: document.querySelector('#metric-recipes'),
  parts: document.querySelector('#metric-parts'),
  build: document.querySelector('#metric-build'),
  draws: document.querySelector('#metric-draws'),
  briefTitle: document.querySelector('#brief-title'),
  briefCopy: document.querySelector('#brief-copy'),
  briefPoints: document.querySelector('#brief-points'),
  roster: document.querySelector('#roster-list'),
  selectedName: document.querySelector('#selected-name'),
  selectedRole: document.querySelector('#selected-role'),
  selectedSpecies: document.querySelector('#selected-species'),
  selectedMedia: document.querySelector('#selected-media'),
  selectedFingerprint: document.querySelector('#selected-fingerprint'),
  selectedVisualFingerprint: document.querySelector('#selected-visual-fingerprint'),
  selectedVisualParts: document.querySelector('#selected-visual-parts'),
  selectedAdvice: document.querySelector('#selected-advice'),
  manifestFile: document.querySelector('#manifest-file'),
  restoreSeed: document.querySelector('#restore-seed'),
  importStatus: document.querySelector('#import-status'),
  runtimeSource: document.querySelector('#runtime-source'),
  runtimePack: document.querySelector('#runtime-pack'),
  runtimePackFingerprint: document.querySelector('#runtime-pack-fingerprint'),
  runtimeRenderer: document.querySelector('#runtime-renderer'),
  runtimeRendererFingerprint: document.querySelector('#runtime-renderer-fingerprint'),
  runtimeKitParts: document.querySelector('#runtime-kit-parts'),
  runtimeCoverage: document.querySelector('#runtime-coverage')
};

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const state = {
  input: null,
  items: [],
  actors: [],
  mode: 'waystation',
  selected: 0,
  paused: reducedMotion.matches,
  building: false,
  renderer: null,
  scene: null,
  camera: null,
  marker: null,
  decor: [],
  buildMs: 0,
  lastNow: performance.now(),
  source: 'seed',
  importName: null,
  importedManifest: null,
  pack: getContentPack(ORIGINAL_PACK_ID),
  adapter: null,
  assetCache: createAssetCache({ maxEntries: 64 }),
  runtimeSession: createRuntimeSession(),
  diagnostics: createRuntimeDiagnostics()
};

function setStatus(message) {
  dom.status.textContent = message;
}

function setImportStatus(kind, label, message) {
  dom.importStatus.dataset.state = kind;
  dom.importStatus.querySelector('strong').textContent = label;
  dom.importStatus.querySelector('span').textContent = message;
}

function updatePackUi() {
  const pack = state.pack;
  let option = [...dom.pack.options].find(candidate => candidate.value === pack.id);
  if (!option) {
    option = document.createElement('option');
    option.value = pack.id;
    option.textContent = `${pack.presentation.name} · imported`;
    option.dataset.imported = 'true';
    dom.pack.appendChild(option);
  }
  dom.pack.value = pack.id;
  dom.pack.disabled = state.building;
  dom.packCard.dataset.pack = pack.id;
  dom.packStatus.textContent = pack.status.replaceAll('-', ' ').toUpperCase();
  dom.packName.textContent = pack.presentation.name;
  dom.packCopy.textContent = pack.presentation.summary;
  dom.packFingerprint.textContent = `${pack.id} / #${pack.fingerprint}`;
  dom.sceneRenderer.textContent = pack.visual
    ? `${pack.visual.id} / #${pack.visual.fingerprint}`
    : 'kindergrimm-drawn-2d / base only';
  dom.sceneKitSummary.textContent = pack.visual
    ? `${pack.visual.features.length} PARTS / ${Object.keys(pack.visual.coverage ?? {}).length} COVERAGE GROUPS`
    : '0 PARTS / BASE COVERAGE';
  dom.runtimePack.textContent = pack.presentation.shortName;
  dom.runtimePackFingerprint.textContent = pack.fingerprint;
  dom.runtimeRenderer.textContent = pack.visual?.id ?? 'BASE';
  dom.runtimeRendererFingerprint.textContent = pack.visual?.fingerprint ?? '—';
  dom.runtimeKitParts.textContent = String(pack.visual?.features.length ?? 0);
  dom.runtimeCoverage.textContent = pack.visual?.coverage ? Object.keys(pack.visual.coverage).join(' / ') : 'BASE';
}
function updateSourceUi() {
  dom.runtimeSource.textContent = state.source === 'imported' ? 'Imported JSON' : 'Seed Recipe';
  dom.restoreSeed.disabled = state.source !== 'imported' || state.building;
  updatePackUi();
}

function initRenderer() {
  if (new URLSearchParams(location.search).get('webgl') === 'off') {
    dom.canvas.hidden = true;
    dom.fallback.hidden = false;
    setStatus('WebGL 已关闭；Recipe roster 保持可用');
    return;
  }
  try {
    const renderer = new THREE.WebGLRenderer({ canvas: dom.canvas, alpha: true, antialias: true });
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.setPixelRatio(Math.min(1.5, devicePixelRatio || 1));
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-4.2, 4.2, 2.4, -2.4, .1, 100);
    camera.position.set(0, 0, 10);

    const marker = new THREE.Mesh(
      new THREE.RingGeometry(.28, .36, 40),
      new THREE.MeshBasicMaterial({ color: 0xc76043, transparent: true, opacity: .9, depthTest: false })
    );
    marker.renderOrder = 1000;
    marker.position.z = .5;
    scene.add(marker);

    state.renderer = renderer;
    state.scene = scene;
    state.camera = camera;
    state.marker = marker;
    state.adapter = createSceneAdapter({ scene });
    onResize();
    addEventListener('resize', onResize);
    renderer.setAnimationLoop(animate);
  } catch (error) {
    dom.canvas.hidden = true;
    dom.fallback.hidden = false;
    setStatus(`WebGL 不可用：${error.message}`);
  }
}

function onResize() {
  if (!state.renderer) return;
  const rect = dom.stage.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const aspect = width / height;
  const halfWidth = 4.2;
  const halfHeight = halfWidth / aspect;
  state.camera.left = -halfWidth;
  state.camera.right = halfWidth;
  state.camera.top = halfHeight;
  state.camera.bottom = -halfHeight;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize(width, height, false);
}

function disposeObject(object) {
  object.geometry?.dispose();
  if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
  else object.material?.dispose();
}

function clearActors() {
  state.adapter?.dispose();
  state.actors = [];
}

function clearDecor() {
  for (const object of state.decor) {
    state.scene?.remove(object);
    disposeObject(object);
  }
  state.decor = [];
}

function addFloorLine(y, width = 7.5, opacity = .2) {
  if (!state.scene) return;
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-width / 2, y, -.5),
    new THREE.Vector3(width / 2, y, -.5)
  ]);
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x493f34, transparent: true, opacity, depthTest: false }));
  line.renderOrder = -100;
  state.scene.add(line);
  state.decor.push(line);
}

function renderDecor() {
  clearDecor();
  if (state.mode === 'encounter') {
    addFloorLine(.27, 6.8, .13);
    addFloorLine(-.9, 7.5, .3);
  } else if (state.mode === 'council') {
    addFloorLine(-.56, 7.2, .24);
  } else {
    addFloorLine(-.78, 7.7, .26);
  }
}

function currentLayout(index) {
  const [x, y, scale, pose] = MODES[state.mode].layouts[index];
  return { x, y, scale, pose };
}

function applyActorLayouts() {
  state.adapter?.applyLayouts(MODES[state.mode].layouts);
  updateMarker();
}

function updateMarker() {
  if (!state.marker || !state.items.length) return;
  const layout = currentLayout(state.selected);
  state.marker.visible = true;
  state.marker.position.set(layout.x, layout.y - .06, .5);
  state.marker.scale.setScalar(.82 + layout.scale * .5);
}

function identityFor(index) {
  return scenarioIdentity(state.items[index], state.pack);
}

function adviceFor(identity) {
  const mode = state.mode;
  if (mode === 'encounter') return `${identity.name} 在该构图中承担 ${identity.role} 槽位；碰撞、生命值和阵营应绑定 runtime entity，不写入视觉 Recipe。`;
  if (mode === 'council') return `${identity.name} 的视觉 fingerprint 保持不变；台词、关系和当前发言权属于 council 场景状态。`;
  return `${identity.name} 可作为 ${identity.role} 服务节点；交互范围与任务状态由场景控制，角色美术可跨关卡复用。`;
}

function renderRoster() {
  dom.roster.innerHTML = state.items.map((item, index) => {
    const identity = scenarioIdentity(item, state.pack);
    const selected = index === state.selected;
    return `<button class="roster-card" type="button" data-index="${index}" aria-pressed="${selected}">
      <strong>${identity.name}</strong>
      <small>${identity.role} · ${item.recipe.species}</small>
      <small>#${item.fingerprint}${item.visual ? ` · V#${item.visual.fingerprint}` : ``}</small>
    </button>`;
  }).join('');
  dom.roster.querySelectorAll('[data-index]').forEach(button => {
    button.addEventListener('click', () => selectActor(Number(button.dataset.index)));
  });
}

function updateInspector() {
  const item = state.items[state.selected];
  if (!item) return;
  const identity = identityFor(state.selected);
  dom.selectedName.textContent = identity.name;
  dom.selectedRole.textContent = identity.role;
  dom.selectedSpecies.textContent = item.recipe.species;
  dom.selectedMedia.textContent = item.recipe.media;
  dom.selectedFingerprint.textContent = item.fingerprint;
  dom.selectedVisualFingerprint.textContent = item.visual?.fingerprint ?? '—';
  dom.selectedVisualParts.textContent = String(item.visual?.addedParts.length ?? 0);
  dom.selectedAdvice.textContent = item.visual
    ? state.pack.visual?.kind === 'procedural-2d-core'
      ? `${adviceFor(identity)} 当前角色由 ${item.visual.rendererId} 独立生成 ${item.visual.addedParts.length} 类核心部件。`
      : `${adviceFor(identity)} 当前角色叠加 ${item.visual.addedParts.length} 个 ${item.visual.rendererId} 程序化部件。`
    : adviceFor(identity);
}

function selectActor(index, announce = true) {
  if (!state.items.length) return;
  state.selected = (index + state.items.length) % state.items.length;
  state.runtimeSession.select(state.selected);
  renderRoster();
  updateInspector();
  updateMarker();
  if (announce) setStatus(`已选择 ${identityFor(state.selected).name} · #${state.items[state.selected].fingerprint}`);
}

function applyMode(mode, announce = true) {
  if (!MODES[mode]) return;
  state.mode = mode;
  state.runtimeSession.setMode(mode);
  const config = MODES[mode];
  dom.stage.dataset.mode = mode;
  dom.title.textContent = config.title;
  dom.kicker.textContent = config.kicker;
  dom.modeLabel.textContent = `${config.label} / ${state.pack.presentation.shortName} / ${state.source.toUpperCase()}`;
  dom.briefTitle.textContent = config.brief;
  dom.briefCopy.textContent = config.copy;
  dom.briefPoints.innerHTML = config.points.map(point => `<li>${point}</li>`).join('');
  dom.modeButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
  renderDecor();
  applyActorLayouts();
  renderRoster();
  updateInspector();
  if (announce) setStatus(`已切换到${config.title}：同一批 Recipe，新的运行时构图`);
}

function triggerSelected() {
  const actor = state.actors[state.selected];
  if (!actor) return;
  const action = MODES[state.mode].action;
  const current = actor.animator.pose();
  state.adapter?.trigger(state.selected, current === action && action !== 'attack' ? 'idle' : action, 'selected');
  setStatus(`${identityFor(state.selected).name} 执行动作：${action}`);
}

function updateMetrics() {
  dom.recipes.textContent = String(state.items.length);
  const allPlanes = state.actors.reduce((sum, actor) => sum + actor.face.entries.length, 0);
  const authoredPlanes = state.actors.reduce((sum, actor) => sum + actor.face.entries.filter(entry => entry.authoredBy).length, 0);
  dom.parts.textContent = `${allPlanes} / ${authoredPlanes}`;
  dom.build.textContent = state.buildMs ? `${Math.round(state.buildMs)}ms` : '—';
  dom.draws.textContent = state.renderer ? String(state.renderer.info.render.calls) : 'N/A';
}

async function buildScene(options = {}) {
  if (state.building) return false;
  const imported = Array.isArray(options.items);
  const nextPack = imported
    ? getContentPack(options.pack || options.manifest?.contentPack || ORIGINAL_PACK_ID)
    : getContentPack(dom.pack.value);
  const nextInput = imported
    ? { ...normalizeInput(options.input), count: 8 }
    : normalizeInput({ seed: Number(dom.seed.value), count: 8, species: 'all', media: 'all', color: 'auto' });
  const nextItems = imported
    ? options.items.slice(0, 8).map((item, index) => ({ ...item, index }))
    : buildRecipes(nextInput, nextPack);

  state.building = true;
  dom.rebuild.disabled = true;
  dom.manifestFile.disabled = true;
  dom.pack.disabled = true;
  state.input = nextInput;
  state.pack = nextPack;
  state.source = imported ? 'imported' : 'seed';
  state.importName = imported ? (options.importName || 'manifest.json') : null;
  state.importedManifest = imported ? options.manifest : null;
  dom.seed.value = String(state.input.seed);
  const packQuery = isOriginalContentPack(state.pack) ? '' : `&pack=${encodeURIComponent(state.pack.id)}`;
  history.replaceState(null, '', `${location.pathname}?seed=${state.input.seed}${packQuery}${state.renderer ? '' : '&webgl=off'}`);
  updateSourceUi();
  setStatus(imported
    ? `正在从 ${state.importName} 装配 ${state.pack.presentation.shortName} 前 8 个角色…`
    : `正在从 ${state.pack.presentation.shortName} 内容包构建 8 个角色…`);

  try {
    const started = performance.now();
    clearActors();
    state.items = nextItems;
    for (const item of state.items) {
      await state.assetCache.resolve({
        packFingerprint: state.pack.fingerprint,
        rendererFingerprint: state.pack.visual?.fingerprint ?? null,
        assetFingerprint: item.fingerprint,
        visualFingerprint: item.visual?.fingerprint ?? null
      }, () => Object.freeze({ item, packId: state.pack.id }));
    }
    state.selected = 0;
    renderRoster();
    updateInspector();

    if (state.renderer) {
      const stopMount = state.diagnostics.start('mount');
      await state.adapter.mount(state.items, state.pack, {
        resolution: 92,
        frames: 2,
        animatorOptions: (item, index) => ({
          blink: true,
          gaze: true,
          talk: index === 3,
          sway: true,
          breath: true,
          boil: true,
          boilSpeed: .55,
          phase: index * 1.71,
          amp: 1.2
        }),
        onProgress: (current, total) => setStatus(`正在装配角色 ${current} / ${total}`)
      });
      state.actors = state.adapter.actors();
      stopMount({ actors: state.actors.length, packId: state.pack.id });
    }

    state.buildMs = performance.now() - started;
    state.runtimeSession.replace({
      source: imported ? 'imported' : 'seed',
      importName: state.importName,
      input: state.input,
      pack: state.pack,
      items: state.items
    });
    applyMode(state.mode, false);
    selectActor(0, false);
    updateMetrics();
    const deterministic = imported
      ? validateBatchManifest(options.manifest, { minAssets: 8, maxAssets: 24 }).ok
      : verifyBatch(state.items, state.input, state.pack);
    setStatus(state.renderer
      ? `${imported ? '导入' : 'Seed'}角色已运行 · ${state.pack.presentation.shortName}${state.pack.visual ? ` · ${state.pack.visual.id}` : ``} · 校验 ${deterministic ? '通过' : '失败'} · ${Math.round(state.buildMs)}ms`
      : `${imported ? '导入' : 'Seed'} Recipe 已就绪 · ${state.pack.presentation.shortName} · WebGL 不可用`);
    if (imported) {
      setImportStatus('imported', 'IMPORTED', `${state.importName} · ${options.items.length} assets · ${state.pack.id} · 当前展示 8`);
    } else {
      setImportStatus('seed', 'SEED', `当前场景由 ${state.pack.id} + Master Seed 驱动`);
    }
    return true;
  } finally {
    state.building = false;
    dom.rebuild.disabled = false;
    dom.manifestFile.disabled = false;
    updateSourceUi();
  }
}
async function importManifestObject(manifest, importName = 'manifest.json') {
  setImportStatus('validating', 'CHECK', `正在校验 ${importName}…`);
  const result = loadManifest(manifest, {
    minAssets: 8,
    maxAssets: 24,
    validate: validateBatchManifest,
    resolvePack: pack => getContentPack(pack?.id ?? pack)
  });
  if (!result.ok) {
    const reason = result.errors.slice(0, 2).join(' · ');
    setImportStatus('error', 'REJECTED', reason);
    setStatus('Manifest 被拒绝；当前场景保持不变');
    return { ok: false, errors: result.errors, warnings: result.warnings };
  }
  await buildScene({
    items: result.value.items,
    input: result.value.input,
    manifest,
    importName,
    pack: result.value.pack
  });
  return { ok: true, count: result.value.items.length, packId: result.value.pack.id, warnings: result.warnings };
}

async function handleManifestFile(file) {
  if (!file || state.building) return;
  try {
    const manifest = JSON.parse(await file.text());
    await importManifestObject(manifest, file.name);
  } catch (error) {
    setImportStatus('error', 'REJECTED', `${file.name} · ${error.message}`);
    setStatus('Manifest 无法读取；当前场景保持不变');
  } finally {
    dom.manifestFile.value = '';
  }
}

async function restoreSeedSource() {
  if (state.building || state.source !== 'imported') return;
  await buildScene();
}

function togglePause(force) {
  state.paused = typeof force === 'boolean' ? force : !state.paused;
  dom.pause.setAttribute('aria-pressed', String(state.paused));
  dom.pause.textContent = state.paused ? '继续动画' : '暂停动画';
  setStatus(state.paused ? '动画已暂停；角色选择和用途切换仍可使用' : '动画继续运行');
}

function animate(now) {
  if (!state.renderer) return;
  state.adapter?.update(now, { paused: state.paused, reducedMotion: reducedMotion.matches });
  state.renderer.render(state.scene, state.camera);
  dom.draws.textContent = String(state.renderer.info.render.calls);
}

function selectFromPointer(event) {
  if (!state.items.length || !state.camera) return;
  const rect = dom.canvas.getBoundingClientRect();
  const pointer = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
  const ray = new THREE.Raycaster();
  ray.setFromCamera(pointer, state.camera);
  const x = ray.ray.origin.x;
  const y = ray.ray.origin.y;
  let best = 0;
  let distance = Infinity;
  for (let index = 0; index < state.items.length; index++) {
    const layout = currentLayout(index);
    const candidate = Math.hypot(x - layout.x, (y - layout.y) * .85);
    if (candidate < distance) {
      distance = candidate;
      best = index;
    }
  }
  if (distance < 1.05) selectActor(best);
}

dom.form.addEventListener('submit', event => {
  event.preventDefault();
  buildScene();
});
dom.pack.addEventListener('change', () => buildScene());
dom.manifestFile.addEventListener('change', () => handleManifestFile(dom.manifestFile.files[0]));
dom.restoreSeed.addEventListener('click', restoreSeedSource);
dom.modeButtons.forEach(button => button.addEventListener('click', () => applyMode(button.dataset.mode)));
dom.pause.addEventListener('click', () => togglePause());
dom.canvas.addEventListener('pointerdown', selectFromPointer);
dom.canvas.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight') { event.preventDefault(); selectActor(state.selected + 1); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); selectActor(state.selected - 1); }
  if (event.key === 'Home') { event.preventDefault(); selectActor(0); }
  if (event.key === 'End') { event.preventDefault(); selectActor(state.items.length - 1); }
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); triggerSelected(); }
});
reducedMotion.addEventListener?.('change', event => {
  if (event.matches) togglePause(true);
});

window.__npcScenarios = {
  state: () => ({
    count: state.items.length,
    fingerprints: state.items.map(item => item.fingerprint),
    unique: new Set(state.items.map(item => item.fingerprint)).size,
    mode: state.mode,
    source: state.source,
    importName: state.importName,
    importState: dom.importStatus.dataset.state,
    packId: state.pack.id,
    packFingerprint: state.pack.fingerprint,
    packStatus: state.pack.status,
    rendererId: state.pack.visual?.id ?? 'kindergrimm-drawn-2d',
    rendererFingerprint: state.pack.visual?.fingerprint ?? null,
    visualPartCount: state.pack.visual?.features.length ?? 0,
    coverageGroups: Object.keys(state.pack.visual?.coverage ?? {}).length,
    visualFingerprints: state.items.map(item => item.visual?.fingerprint ?? null),
    selected: state.items[state.selected]?.fingerprint ?? null,
    selectedVisual: state.items[state.selected]?.visual?.fingerprint ?? null,
    paused: state.paused,
    reducedMotion: reducedMotion.matches,
    webgl: Boolean(state.renderer),
    actors: state.actors.length,
    partPlanes: state.actors.reduce((sum, actor) => sum + actor.face.entries.length, 0),
    authoredPartPlanes: state.actors.reduce((sum, actor) => sum + actor.face.entries.filter(entry => entry.authoredBy).length, 0),
    upstreamVisiblePartPlanes: state.actors.reduce((sum, actor) => sum + (actor.face.rendererAudit?.upstreamVisiblePartPlanes ?? actor.face.entries.filter(entry => !entry.authoredBy).length), 0),
    independentActors: state.actors.filter(actor => actor.face.rendererAudit?.independent).length,
    rendererAudits: state.actors.map(actor => actor.face.rendererAudit ?? null),
    buildMs: Math.round(state.buildMs),
    drawCalls: state.renderer?.info.render.calls ?? 0,
    sdkSchema: RUNTIME_SDK_SCHEMA,
    sdkVersion: RUNTIME_SDK_VERSION,
    runtimeSession: state.runtimeSession.snapshot(),
    assetCache: state.assetCache.snapshot(),
    sceneAdapter: state.adapter?.snapshot() ?? null,
    diagnostics: state.diagnostics.snapshot()
  }),
  manifest: () => state.source === 'imported'
    ? state.importedManifest
    : (state.items.length ? batchManifest(state.items, state.input, undefined, state.pack) : null),
  verifyDeterminism: () => state.source === 'imported'
    ? validateBatchManifest(state.importedManifest, { minAssets: 8, maxAssets: 24 }).ok
    : (state.items.length ? verifyBatch(state.items, state.input, state.pack) : false),
  validateManifest: manifest => validateBatchManifest(manifest, { minAssets: 8, maxAssets: 24 }),
  importManifest: (manifest, name = 'debug.json') => importManifestObject(manifest, name),
  restoreSeed: () => restoreSeedSource(),
  packs: () => listContentPacks(),
  selectPack: async id => {
    dom.pack.value = id;
    await buildScene();
    return window.__npcScenarios.state();
  },
  switchMode: mode => applyMode(mode),
  select: index => selectActor(index),
  sdk: () => ({
    schemaVersion: RUNTIME_SDK_SCHEMA,
    version: RUNTIME_SDK_VERSION,
    session: state.runtimeSession.snapshot(),
    cache: state.assetCache.snapshot(),
    adapter: state.adapter?.snapshot() ?? null,
    diagnostics: state.diagnostics.snapshot()
  })
};

const params = new URLSearchParams(location.search);
const packOptions = listContentPacks().map(pack => {
  const option = document.createElement('option');
  option.value = pack.id;
  option.textContent = `${pack.presentation.name} · ${pack.presentation.label}`;
  return option;
});
dom.pack.replaceChildren(...packOptions);
if (params.has('seed')) dom.seed.value = params.get('seed');
if (params.has('pack')) dom.pack.value = params.get('pack');
initRenderer();
togglePause(state.paused);
buildScene();
