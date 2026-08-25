import * as THREE from 'three';

const STAGES = [
  {
    id: 'geometry', label: '01 / 几何与轮廓', short: '几何',
    adds: '程序化 Mesh、部件层级、比例和轮廓',
    observe: '忽略颜色，观察车体斜面、炮塔体积、炮管长度、负重轮节奏和部件穿插。',
    materialMode: 'normal', world: false, shadows: false, post: false, fx: false,
    timeMs: 0, camera: 'inspection',
  },
  {
    id: 'materials', label: '02 / 颜色与材质语义', short: '材质',
    adds: '涂装、颜色、贴图、透明与部件材质分类',
    observe: '观察金属、橡胶、玻璃和涂装是否已经分开；此层仍使用不受灯光影响的基础材质。',
    materialMode: 'basic', world: false, shadows: false, post: false, fx: false,
    timeMs: 0, camera: 'inspection',
  },
  {
    id: 'lighting', label: '03 / PBR、光照与阴影', short: '光影',
    adds: '原始 PBR 材质、太阳光、表面明暗和投射阴影',
    observe: '观察装甲斜面如何被光线解释，以及车体是否从“彩色零件”变成有重量的物体。',
    materialMode: 'original', world: false, shadows: true, post: false, fx: false,
    timeMs: 0, camera: 'inspection',
  },
  {
    id: 'environment', label: '04 / 地图与空间尺度', short: '环境',
    adds: '地形、植被、结构、天空、雾和空间参照物',
    observe: '观察环境如何提供真实尺寸、前中后景和空气透视；模型本身没有改变。',
    materialMode: 'original', world: true, shadows: true, post: false, fx: false,
    timeMs: 0, camera: 'inspection',
  },
  {
    id: 'post', label: '05 / 后期与画面统一', short: '后期',
    adds: '色调映射、抗锯齿、环境遮蔽、雾化和输出调色',
    observe: '比较轮廓边缘、暗部接触、远景层次和整体色彩是否更统一；不要只看“更亮”。',
    materialMode: 'original', world: true, shadows: true, post: true, fx: false,
    timeMs: 0, camera: 'inspection',
  },
  {
    id: 'camera', label: '06 / 镜头与导演构图', short: '镜头',
    adds: '叙事机位、焦距、主体关系和时间线姿态',
    observe: '观察同样的资产如何通过低机位、聚焦方向和前后景关系获得力量感。',
    materialMode: 'original', world: true, shadows: true, post: true, fx: false,
    timeMs: 11800, camera: 'cinematic',
  },
  {
    id: 'fx', label: '07 / 动态特效与战斗反馈', short: '特效',
    adds: '炮口焰、曳光、命中、烟尘、燃烧、爆炸和战损状态',
    observe: '观察特效是否解释了速度、力量、命中位置和事件结果，而不是只增加画面噪声。',
    materialMode: 'original', world: true, shadows: true, post: true, fx: true,
    timeMs: 15000, camera: 'cinematic',
  },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForRuntime(timeoutMs = 300000) {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    if (
      window.__GAME_READY === true
      && window.__STUDIO?.active === true
      && window.__COT_CAPABILITY_SHOWCASE?.status === 'ready'
      && window.__DEBUG?.scene
      && window.__DEBUG?.post
    ) return;
    await sleep(250);
  }
  throw new Error('Visual layer lab could not acquire the Studio renderer');
}

function mapMaterials(material, mapper) {
  return Array.isArray(material) ? material.map(mapper) : mapper(material);
}

function mountPanel(lab) {
  const root = document.createElement('section');
  root.id = 'cot-visual-layer-lab';
  root.innerHTML = `
    <style>
      #cot-visual-layer-lab{--accent:#8ee7ff;position:fixed;z-index:100001;right:18px;top:18px;width:min(420px,calc(100vw - 36px));overflow:hidden;border:1px solid rgba(142,231,255,.34);border-radius:16px;color:#edf7f8;background:linear-gradient(155deg,rgba(10,18,22,.94),rgba(6,10,13,.88));box-shadow:0 26px 80px rgba(0,0,0,.5);backdrop-filter:blur(18px);font:13px/1.45 Inter,system-ui,sans-serif}
      #cot-visual-layer-lab *{box-sizing:border-box}#cot-visual-layer-lab .vl-head{padding:15px 16px 11px;border-bottom:1px solid rgba(255,255,255,.09)}
      #cot-visual-layer-lab h2{margin:0;color:var(--accent);font-size:13px;letter-spacing:.12em}#cot-visual-layer-lab .vl-sub{margin:4px 0 0;color:#99aaad}
      #cot-visual-layer-lab .vl-stage{padding:13px 16px 12px}#cot-visual-layer-lab .vl-stage strong{display:block;color:#fff;font-size:16px}#cot-visual-layer-lab .vl-add{margin:8px 0 0;padding:8px 10px;border-left:3px solid var(--accent);background:rgba(142,231,255,.07);color:#c8f4ff}#cot-visual-layer-lab .vl-observe{margin:8px 0 0;color:#b8c5c7}
      #cot-visual-layer-lab .vl-steps{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;padding:0 16px 12px}#cot-visual-layer-lab .vl-step{height:34px;padding:0;border:1px solid rgba(255,255,255,.12);border-radius:7px;color:#849296;background:rgba(255,255,255,.035);cursor:pointer;font-size:11px}#cot-visual-layer-lab .vl-step[data-on=true]{border-color:rgba(142,231,255,.42);color:#d8f9ff;background:rgba(142,231,255,.12)}#cot-visual-layer-lab .vl-step[data-active=true]{outline:2px solid var(--accent);outline-offset:1px;color:#081014;background:var(--accent)}
      #cot-visual-layer-lab .vl-controls{display:flex;gap:6px;padding:12px 16px 15px;border-top:1px solid rgba(255,255,255,.08)}#cot-visual-layer-lab .vl-controls button{min-height:34px;padding:6px 10px;border:1px solid rgba(255,255,255,.16);border-radius:8px;color:#e9f3f4;background:#142027;cursor:pointer}#cot-visual-layer-lab .vl-controls button:hover{border-color:var(--accent)}#cot-visual-layer-lab .vl-controls [data-action=auto]{margin-left:auto;color:#081014;background:var(--accent);font-weight:700}
      #cot-visual-layer-lab .vl-status{padding:0 16px 12px;color:#789095;font-size:11px}#cot-visual-layer-lab[data-minimized=true]>*:not(.vl-head){display:none}#cot-visual-layer-lab .vl-toggle{float:right;border:0;color:#9fb0b3;background:transparent;cursor:pointer}
      @media(max-width:720px){#cot-visual-layer-lab{right:8px;top:8px;width:calc(100vw - 16px)}#cot-visual-layer-lab .vl-stage{padding-top:10px}.vl-observe{display:none}}
    </style>
    <div class="vl-head"><button class="vl-toggle" data-action="minimize">收起</button><h2>3D VISUAL LAYER LAB</h2><p class="vl-sub">固定同一套运行时，逐层观察画质从哪里产生。</p></div>
    <div class="vl-stage"><strong>正在连接渲染器…</strong><p class="vl-add">准备可逆视觉开关</p><p class="vl-observe">实验只改变表现层，不修改模拟和上游资产。</p></div>
    <div class="vl-steps"></div>
    <div class="vl-controls"><button data-action="prev">上一层</button><button data-action="next">下一层</button><button data-action="capture">截图</button><button data-action="auto">自动对比</button></div>
    <div class="vl-status">快捷键：←/→ 切层，空格自动播放 · 每层只新增一个主要变量</div>`;
  document.body.appendChild(root);

  const stage = root.querySelector('.vl-stage');
  const steps = root.querySelector('.vl-steps');
  for (const [index, item] of STAGES.entries()) {
    const button = document.createElement('button');
    button.className = 'vl-step';
    button.textContent = item.short;
    button.title = item.label;
    button.addEventListener('click', () => lab.setStage(index));
    steps.appendChild(button);
  }

  root.querySelector('[data-action=prev]').addEventListener('click', () => lab.previous());
  root.querySelector('[data-action=next]').addEventListener('click', () => lab.next());
  root.querySelector('[data-action=capture]').addEventListener('click', () => lab.capture());
  root.querySelector('[data-action=auto]').addEventListener('click', (event) => {
    lab.toggleAuto();
    event.currentTarget.textContent = lab.autoPlaying ? '停止对比' : '自动对比';
  });
  root.querySelector('[data-action=minimize]').addEventListener('click', (event) => {
    root.dataset.minimized = root.dataset.minimized === 'true' ? 'false' : 'true';
    event.currentTarget.textContent = root.dataset.minimized === 'true' ? '展开' : '收起';
  });

  lab.ui = {
    render(index) {
      const item = STAGES[index];
      stage.innerHTML = `<strong>${item.label}</strong><p class="vl-add">本层新增：${item.adds}</p><p class="vl-observe">观察方法：${item.observe}</p>`;
      [...steps.children].forEach((button, buttonIndex) => {
        button.dataset.on = String(buttonIndex <= index);
        button.dataset.active = String(buttonIndex === index);
      });
    },
    error(message) {
      stage.innerHTML = `<strong>实验室启动失败</strong><p class="vl-add">${message}</p>`;
    },
  };
}

const lab = {
  status: 'booting', stageIndex: 0, ui: null, autoPlaying: false, autoTimer: 0,
  originalMaterials: new Map(), diagnosticMaterials: new Map(),
  generatedMaterials: new Set(), diagnosticGround: null,
  originalPostRender: null, originalShadowEnabled: true, originalBackground: null,
  originalEnvironment: null, originalFog: null, originalWorldVisible: true,
  originalFxVisible: true,

  get studio() { return window.__STUDIO; },
  get debug() { return window.__DEBUG; },
  get actors() { return this.studio?._internal?.actors || []; },

  rememberMaterials() {
    for (const actor of this.actors) {
      actor.visual?.root?.traverse((object) => {
        if (object.isMesh && object.material && !this.originalMaterials.has(object)) {
          this.originalMaterials.set(object, object.material);
        }
      });
    }
  },

  makeNormalMaterial(source) {
    const material = new THREE.MeshNormalMaterial({
      flatShading: false, side: source?.side ?? THREE.FrontSide,
      transparent: !!source?.transparent, opacity: source?.opacity ?? 1,
      alphaTest: source?.alphaTest ?? 0,
    });
    material.name = 'visual-lab-normal';
    this.generatedMaterials.add(material);
    return material;
  },

  makeBasicMaterial(source) {
    const material = new THREE.MeshBasicMaterial({
      color: source?.color?.clone?.() || new THREE.Color(0x9ca6a4),
      map: source?.map || null, alphaMap: source?.alphaMap || null,
      side: source?.side ?? THREE.FrontSide, transparent: !!source?.transparent,
      opacity: source?.opacity ?? 1, alphaTest: source?.alphaTest ?? 0,
      vertexColors: !!source?.vertexColors,
    });
    material.name = 'visual-lab-basic';
    this.generatedMaterials.add(material);
    return material;
  },

  getDiagnosticMaterial(object, original, mode) {
    let cached = this.diagnosticMaterials.get(object);
    if (!cached) {
      cached = {};
      this.diagnosticMaterials.set(object, cached);
    }
    if (!cached[mode]) {
      const factory = mode === 'normal'
        ? (source) => this.makeNormalMaterial(source)
        : (source) => this.makeBasicMaterial(source);
      cached[mode] = mapMaterials(original, factory);
    }
    return cached[mode];
  },

  applyMaterialMode(mode) {
    this.rememberMaterials();
    for (const [object, original] of this.originalMaterials) {
      if (!object.parent) continue;
      object.material = mode === 'original'
        ? original
        : this.getDiagnosticMaterial(object, original, mode);
      mapMaterials(object.material, (material) => {
        material.needsUpdate = true;
        return material;
      });
    }
  },

  setPostEnabled(enabled) {
    const { post, renderer, scene, camera } = this.debug;
    if (!this.originalPostRender) this.originalPostRender = post.render.bind(post);
    post.render = enabled ? this.originalPostRender : () => {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    };
  },

  setEnvironmentVisible(visible) {
    const { scene, world } = this.debug;
    if (world?.group) world.group.visible = visible;
    scene.background = visible ? this.originalBackground : new THREE.Color(0x0c1114);
    scene.environment = visible ? this.originalEnvironment : null;
    scene.fog = visible ? this.originalFog : null;
    if (this.diagnosticGround) this.diagnosticGround.visible = !visible;
  },

  setShadowsEnabled(enabled) {
    this.debug.renderer.shadowMap.enabled = enabled;
    for (const material of this.generatedMaterials) material.needsUpdate = true;
    for (const original of this.originalMaterials.values()) {
      mapMaterials(original, (material) => {
        material.needsUpdate = true;
        return material;
      });
    }
  },

  setFxVisible(visible) {
    if (this.debug.fx?.group) this.debug.fx.group.visible = visible;
  },

  groundedPoint(point) {
    this.studio.setCamera({ pos: point, groundRel: true });
    return this.studio.getCamera().pos;
  },

  setCamera(kind) {
    const inspection = { pos: [24, 5.2, -139], lookAt: [12, 2.1, -124], fov: 36 };
    const cinematic = { pos: [25, 8.5, -92], lookAt: [16, 2.3, -72], fov: 38 };
    const pose = kind === 'cinematic' ? cinematic : inspection;
    const pos = this.groundedPoint(pose.pos);
    const lookAt = this.groundedPoint(pose.lookAt);
    this.studio.setCamera({ pos, lookAt, fov: pose.fov, mode: 'fly' });
  },

  createDiagnosticGround() {
    const hero = this.actors.find((actor) => actor.name === 'red-lead') || this.actors[0];
    if (!hero?.visual?.root) return;
    hero.visual.root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(hero.visual.root);
    const material = new THREE.MeshStandardMaterial({ color: 0x30383a, roughness: 0.95, metalness: 0 });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(52, 52), material);
    plane.name = 'visual-layer-lab-ground';
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(hero.state.pos.x, bounds.min.y - 0.025, hero.state.pos.z);
    plane.receiveShadow = true;
    this.debug.scene.add(plane);
    this.diagnosticGround = plane;
    this.generatedMaterials.add(material);
  },

  async init() {
    await waitForRuntime();
    this.studio.pause();
    this.originalPostRender = this.debug.post.render.bind(this.debug.post);
    this.originalShadowEnabled = this.debug.renderer.shadowMap.enabled;
    this.originalBackground = this.debug.scene.background;
    this.originalEnvironment = this.debug.scene.environment;
    this.originalFog = this.debug.scene.fog;
    this.originalWorldVisible = this.debug.world?.group?.visible ?? true;
    this.originalFxVisible = this.debug.fx?.group?.visible ?? true;
    this.rememberMaterials();
    this.createDiagnosticGround();
    await this.setStage(0);
    this.status = 'ready';
  },

  async setStage(index) {
    const next = Math.max(0, Math.min(STAGES.length - 1, Number(index) || 0));
    const stage = STAGES[next];
    this.studio.pause();
    this.studio.seek(stage.timeMs);
    await sleep(80);
    this.applyMaterialMode(stage.materialMode);
    this.setEnvironmentVisible(stage.world);
    this.setShadowsEnabled(stage.shadows);
    this.setPostEnabled(stage.post);
    this.setFxVisible(stage.fx);
    this.setCamera(stage.camera);
    this.stageIndex = next;
    this.ui?.render(next);
    this.debug.renderer.domElement.dataset.visualLabStage = stage.id;
    return this.audit();
  },

  previous() { return this.setStage(this.stageIndex - 1); },
  next() { return this.setStage((this.stageIndex + 1) % STAGES.length); },

  toggleAuto() {
    this.autoPlaying = !this.autoPlaying;
    clearInterval(this.autoTimer);
    if (this.autoPlaying) this.autoTimer = setInterval(() => this.next(), 3200);
    return this.autoPlaying;
  },

  capture() {
    const stage = STAGES[this.stageIndex];
    return this.studio.capture({
      width: 2560, download: true,
      name: `claude-of-tanks-layer-${String(this.stageIndex + 1).padStart(2, '0')}-${stage.id}`,
    });
  },

  audit() {
    const stage = STAGES[this.stageIndex];
    const hero = this.actors.find((actor) => actor.name === 'red-lead') || this.actors[0];
    let meshCount = 0;
    const materialKinds = new Set();
    hero?.visual?.root?.traverse((object) => {
      if (!object.isMesh) return;
      meshCount++;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) materialKinds.add(material?.type || 'unknown');
    });
    return {
      status: this.status, stageIndex: this.stageIndex, stageId: stage.id,
      activeLayers: STAGES.slice(0, this.stageIndex + 1).map((item) => item.id),
      materialMode: stage.materialMode, materialKinds: [...materialKinds].sort(),
      heroMeshCount: meshCount, worldVisible: this.debug.world?.group?.visible ?? null,
      shadowsEnabled: this.debug.renderer.shadowMap.enabled,
      postEnabled: this.debug.post.render === this.originalPostRender,
      fxVisible: this.debug.fx?.group?.visible ?? null,
      camera: this.studio.getCamera(), timeMs: this.studio.fxTimeMs,
    };
  },

  restore() {
    clearInterval(this.autoTimer);
    this.autoPlaying = false;
    this.applyMaterialMode('original');
    this.setPostEnabled(true);
    this.debug.renderer.shadowMap.enabled = this.originalShadowEnabled;
    if (this.debug.world?.group) this.debug.world.group.visible = this.originalWorldVisible;
    if (this.debug.fx?.group) this.debug.fx.group.visible = this.originalFxVisible;
    this.debug.scene.background = this.originalBackground;
    this.debug.scene.environment = this.originalEnvironment;
    this.debug.scene.fog = this.originalFog;
    if (this.diagnosticGround) {
      this.debug.scene.remove(this.diagnosticGround);
      this.diagnosticGround.geometry.dispose();
      this.diagnosticGround = null;
    }
    for (const material of this.generatedMaterials) material.dispose();
    this.generatedMaterials.clear();
  },
};

window.__COT_VISUAL_LAYER_LAB = lab;

if (new URLSearchParams(location.search).get('lab') === 'layers') {
  mountPanel(lab);
  lab.init().catch((error) => {
    lab.status = 'error';
    lab.error = String(error?.stack || error);
    lab.ui?.error(error?.message || String(error));
    console.error('[visual-layer-lab]', error);
  });
  window.addEventListener('keydown', (event) => {
    if (event.target?.matches?.('input,textarea,select')) return;
    if (event.key === 'ArrowLeft') lab.previous();
    if (event.key === 'ArrowRight') lab.next();
    if (event.code === 'Space') {
      event.preventDefault();
      lab.toggleAuto();
    }
  });
  window.addEventListener('beforeunload', () => lab.restore(), { once: true });
}

export { STAGES as VISUAL_LAYER_STAGES };
