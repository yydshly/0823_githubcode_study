import * as THREE from 'three';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isLabRoute = new URLSearchParams(location.search).get('lab') === 'layers';

function installRefinement(lab) {
  if (!lab || !isLabRoute) return;

  const base = {
    createDiagnosticGround: lab.createDiagnosticGround.bind(lab),
    setEnvironmentVisible: lab.setEnvironmentVisible.bind(lab),
    setCamera: lab.setCamera.bind(lab),
    setStage: lab.setStage.bind(lab),
    restore: lab.restore.bind(lab),
  };

  lab.r2 = {
    version: 2,
    atmosphere: new Map(),
    cameraPresets: { inspection: null, cinematic: null },
    studioDockVisible: false,
    compareBase: null,
    compareTransition: false,
    reduceMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    autoIntervalMs: 3200,
    originalDockDisplay: null,
    originalCapabilityDisplay: null,
    keyboardEvents: [],
    uiReady: false,
  };

  function heroActor() {
    return lab.actors.find((actor) => actor.name === 'red-lead') || lab.actors[0] || null;
  }

  function actorBounds(actor) {
    if (!actor?.visual?.root) return null;
    actor.visual.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(actor.visual.root);
    return {
      box,
      center: box.getCenter(new THREE.Vector3()),
      size: box.getSize(new THREE.Vector3()),
    };
  }

  function cameraFromActor(kind) {
    const actor = heroActor();
    const bounds = actorBounds(actor);
    if (!actor || !bounds) return null;
    const yaw = actor.state?.yaw || 0;
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const up = new THREE.Vector3(0, 1, 0);
    const scale = Math.max(bounds.size.z, bounds.size.x * 1.8, bounds.size.y * 2.5, 7.5);

    let pos;
    let lookAt;
    let fov;
    if (kind === 'cinematic') {
      pos = bounds.center.clone()
        .addScaledVector(right, scale * 1.32)
        .addScaledVector(forward, scale * 0.2)
        .addScaledVector(up, Math.max(2.5, bounds.size.y * 0.75));
      lookAt = bounds.center.clone()
        .addScaledVector(forward, scale * 0.52)
        .addScaledVector(up, bounds.size.y * 0.08);
      fov = 37;
    } else {
      pos = bounds.center.clone()
        .addScaledVector(right, scale * 0.82)
        .addScaledVector(forward, scale * 1.18)
        .addScaledVector(up, Math.max(2.4, bounds.size.y * 0.72));
      lookAt = bounds.center.clone().addScaledVector(up, bounds.size.y * 0.06);
      fov = 34;
    }
    return {
      pos: pos.toArray(),
      lookAt: lookAt.toArray(),
      fov,
      mode: 'fly',
    };
  }

  lab.createDiagnosticGround = function createDiagnosticGroundR2() {
    const actor = heroActor();
    const bounds = actorBounds(actor);
    if (!actor || !bounds) return;

    const group = new THREE.Group();
    group.name = 'visual-layer-lab-ground-r2';
    const y = bounds.box.min.y - 0.035;
    const centerX = bounds.center.x;
    const centerZ = bounds.center.z;

    const planeMaterial = new THREE.MeshStandardMaterial({
      color: 0x20282c,
      roughness: 0.96,
      metalness: 0,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(44, 44), planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(centerX, y, centerZ);
    plane.receiveShadow = true;
    plane.name = 'visual-layer-lab-neutral-plane';
    group.add(plane);

    const grid = new THREE.GridHelper(44, 44, 0x8aa4ae, 0x3a4a51);
    grid.position.set(centerX, y + 0.012, centerZ);
    grid.material.transparent = true;
    grid.material.opacity = 0.5;
    grid.name = 'visual-layer-lab-meter-grid';
    group.add(grid);

    this.debug.scene.add(group);
    this.diagnosticGround = group;
    this.generatedMaterials.add(planeMaterial);
  };

  function captureAtmosphere() {
    if (!lab.debug?.scene) return;
    lab.debug.scene.traverse((object) => {
      if (!object.isSky && object.name !== 'cloudLayer' && object.name !== 'cloudLayerFar') return;
      if (!lab.r2.atmosphere.has(object)) lab.r2.atmosphere.set(object, object.visible);
    });
  }

  lab.setEnvironmentVisible = function setEnvironmentVisibleR2(visible) {
    captureAtmosphere();
    base.setEnvironmentVisible(visible);
    for (const [object, originalVisible] of this.r2.atmosphere) {
      object.visible = visible ? originalVisible : false;
    }
  };

  lab.setCamera = function setCameraR2(kind) {
    const presetKey = kind === 'cinematic' ? 'cinematic' : 'inspection';
    if (!this.r2.cameraPresets[presetKey]) {
      this.r2.cameraPresets[presetKey] = cameraFromActor(presetKey);
    }
    const preset = this.r2.cameraPresets[presetKey];
    if (preset) this.studio.setCamera(preset);
  };

  function updateCompareButton() {
    const button = document.querySelector('#cot-visual-layer-lab [data-action=compare]');
    if (!button) return;
    const comparing = lab.r2.compareBase !== null;
    button.disabled = lab.stageIndex === 0 && !comparing;
    button.textContent = comparing ? '返回当前' : '对比上一层';
    button.setAttribute('aria-pressed', String(comparing));
  }

  lab.setStage = async function setStageR2(index) {
    const next = Math.max(0, Math.min(6, Number(index) || 0));
    if (!this.r2.compareTransition) this.r2.compareBase = null;

    // A direct jump to FX still derives its camera from the camera-layer pose.
    if (next === 6 && !this.r2.cameraPresets.cinematic) {
      this.studio.pause();
      this.studio.seek(11800);
      await sleep(100);
      this.r2.cameraPresets.cinematic = cameraFromActor('cinematic');
    }

    const result = await base.setStage(next);
    updateCompareButton();
    this.r2.lastAudit = this.audit();
    return result;
  };

  lab.toggleCompare = async function toggleCompare() {
    if (this.stageIndex === 0 && this.r2.compareBase === null) return this.audit();
    this.r2.compareTransition = true;
    try {
      if (this.r2.compareBase === null) {
        this.r2.compareBase = this.stageIndex;
        await this.setStage(this.stageIndex - 1);
      } else {
        const target = this.r2.compareBase;
        this.r2.compareBase = null;
        await this.setStage(target);
      }
    } finally {
      this.r2.compareTransition = false;
      updateCompareButton();
    }
    return this.audit();
  };

  function updateAutoButton() {
    const button = document.querySelector('#cot-visual-layer-lab [data-action=auto]');
    if (!button) return;
    button.textContent = lab.autoPlaying ? '停止对比' : '自动轮播';
    button.setAttribute('aria-pressed', String(lab.autoPlaying));
  }

  lab.toggleAuto = function toggleAutoR2() {
    this.autoPlaying = !this.autoPlaying;
    clearInterval(this.autoTimer);
    this.r2.autoIntervalMs = this.r2.reduceMotion ? 5200 : 3200;
    if (this.autoPlaying) {
      this.autoTimer = setInterval(() => this.next(), this.r2.autoIntervalMs);
    }
    updateAutoButton();
    return this.autoPlaying;
  };

  lab.setStudioDockVisible = function setStudioDockVisible(visible) {
    const dock = document.querySelector('.cot-studio .dock');
    if (!dock) return false;
    if (this.r2.originalDockDisplay === null) this.r2.originalDockDisplay = dock.style.display || '';
    this.r2.studioDockVisible = !!visible;
    dock.style.display = visible ? this.r2.originalDockDisplay : 'none';
    const root = document.querySelector('#cot-visual-layer-lab');
    if (root) root.dataset.toolsOpen = String(!!visible);
    const button = root?.querySelector('[data-action=studio-tools]');
    if (button) {
      button.textContent = visible ? '隐藏 Studio' : 'Studio 工具';
      button.setAttribute('aria-pressed', String(!!visible));
    }
    return true;
  };

  function hideCompetingUi() {
    const director = document.querySelector('#cot-capability-director');
    if (director) {
      if (lab.r2.originalCapabilityDisplay === null) {
        lab.r2.originalCapabilityDisplay = director.style.display || '';
      }
      director.style.display = 'none';
    }
    lab.setStudioDockVisible(false);
  }

  function refinePanel() {
    const root = document.querySelector('#cot-visual-layer-lab');
    if (!root || lab.r2.uiReady) return;
    lab.r2.uiReady = true;
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', '3D 效果分层实验室');

    const style = document.createElement('style');
    style.id = 'cot-visual-layer-lab-r2-style';
    style.textContent = `
      #cot-visual-layer-lab{width:min(360px,calc(100vw - 28px));right:14px;top:14px;border-radius:13px;background:linear-gradient(160deg,rgba(8,15,19,.94),rgba(5,9,12,.9));}
      #cot-visual-layer-lab[data-tools-open=true]{right:404px}
      #cot-visual-layer-lab .vl-head{position:relative;padding:13px 14px 10px}
      #cot-visual-layer-lab .vl-head-actions{float:right;display:flex;gap:5px;margin:-4px -4px 0 8px}
      #cot-visual-layer-lab .vl-head-actions button{min-height:27px;padding:4px 7px;border:1px solid rgba(255,255,255,.14);border-radius:6px;color:#aab9bc;background:rgba(255,255,255,.045);font:700 10px/1 Inter,system-ui,sans-serif;cursor:pointer}
      #cot-visual-layer-lab .vl-head-actions button[aria-pressed=true]{color:#071014;background:var(--accent);border-color:var(--accent)}
      #cot-visual-layer-lab .vl-toggle{position:static;float:none}
      #cot-visual-layer-lab .vl-stage{padding:11px 14px 10px}
      #cot-visual-layer-lab .vl-stage strong{font-size:15px}
      #cot-visual-layer-lab .vl-add{margin-top:7px;padding:7px 9px}
      #cot-visual-layer-lab .vl-observe{margin-top:7px}
      #cot-visual-layer-lab .vl-steps{padding:0 14px 10px;gap:3px}
      #cot-visual-layer-lab .vl-step{height:32px}
      #cot-visual-layer-lab .vl-controls{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px;padding:10px 14px 12px}
      #cot-visual-layer-lab .vl-controls button{min-width:0;min-height:34px;padding:5px 4px;font-size:10px;white-space:nowrap}
      #cot-visual-layer-lab .vl-controls [data-action=auto]{margin-left:0}
      #cot-visual-layer-lab .vl-status{padding:0 14px 10px}
      #cot-visual-layer-lab button:focus-visible{outline:2px solid #fff;outline-offset:2px}
      @media(max-width:900px){#cot-visual-layer-lab[data-tools-open=true]{right:14px}}
      @media(max-width:720px){
        #cot-visual-layer-lab{top:auto;right:8px;bottom:8px;width:calc(100vw - 16px);max-height:48vh;border-radius:14px}
        #cot-visual-layer-lab .vl-head{padding:10px 11px 8px}
        #cot-visual-layer-lab .vl-head h2{font-size:11px}
        #cot-visual-layer-lab .vl-sub{display:none}
        #cot-visual-layer-lab .vl-stage{padding:8px 11px 7px}
        #cot-visual-layer-lab .vl-stage strong{font-size:13px}
        #cot-visual-layer-lab .vl-add{margin-top:5px;padding:5px 7px;font-size:11px}
        #cot-visual-layer-lab .vl-steps{padding:0 11px 7px}
        #cot-visual-layer-lab .vl-step{height:30px;font-size:10px}
        #cot-visual-layer-lab .vl-controls{padding:7px 11px 9px;gap:4px}
        #cot-visual-layer-lab .vl-controls button{min-height:32px;font-size:9px}
        #cot-visual-layer-lab .vl-status{display:none}
        #cot-visual-layer-lab .vl-head-actions [data-action=studio-tools]{display:none}
      }
      @media(prefers-reduced-motion:reduce){#cot-visual-layer-lab{backdrop-filter:none}}
    `;
    document.head.appendChild(style);

    const oldToggle = root.querySelector('[data-action=minimize]');
    const actions = document.createElement('div');
    actions.className = 'vl-head-actions';
    const tools = document.createElement('button');
    tools.type = 'button';
    tools.dataset.action = 'studio-tools';
    tools.textContent = 'Studio 工具';
    tools.setAttribute('aria-pressed', 'false');
    tools.addEventListener('click', () => lab.setStudioDockVisible(!lab.r2.studioDockVisible));
    actions.append(tools);
    if (oldToggle) actions.append(oldToggle);
    root.querySelector('.vl-head')?.prepend(actions);

    const compare = document.createElement('button');
    compare.type = 'button';
    compare.dataset.action = 'compare';
    compare.textContent = '对比上一层';
    compare.setAttribute('aria-pressed', 'false');
    compare.addEventListener('click', () => lab.toggleCompare());
    const controls = root.querySelector('.vl-controls');
    controls?.insertBefore(compare, controls.querySelector('[data-action=auto]'));

    const stage = root.querySelector('.vl-stage');
    stage?.setAttribute('aria-live', 'polite');
    [...root.querySelectorAll('.vl-step')].forEach((button, index) => {
      button.setAttribute('aria-label', `切换到第 ${index + 1} 层`);
      button.setAttribute('aria-pressed', String(index === lab.stageIndex));
    });
    const baseRender = lab.ui?.render?.bind(lab.ui);
    if (baseRender) {
      lab.ui.render = (index) => {
        baseRender(index);
        [...root.querySelectorAll('.vl-step')].forEach((button, buttonIndex) => {
          button.setAttribute('aria-pressed', String(buttonIndex === index));
        });
        updateCompareButton();
      };
      lab.ui.render(lab.stageIndex);
    }
    updateAutoButton();
    updateCompareButton();
  }

  const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');
  reduceQuery.addEventListener?.('change', (event) => {
    lab.r2.reduceMotion = event.matches;
    if (lab.autoPlaying) {
      lab.autoPlaying = false;
      lab.toggleAuto();
    }
  });

  window.addEventListener('keydown', (event) => {
    const interactive = event.target?.closest?.('input,textarea,select,button,a,[contenteditable=true]');
    if (interactive) return;
    const handled = ['ArrowLeft', 'ArrowRight', 'Space', 'KeyB'].includes(event.code);
    if (!handled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    lab.r2.keyboardEvents.push(event.code);
    if (event.code === 'ArrowLeft') lab.previous();
    if (event.code === 'ArrowRight') lab.next();
    if (event.code === 'Space') lab.toggleAuto();
    if (event.code === 'KeyB') lab.toggleCompare();
  }, { capture: true });

  lab.restore = function restoreR2() {
    const ground = this.diagnosticGround;
    if (ground?.isGroup) {
      ground.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else if (object.material) object.material.dispose();
      });
      this.debug?.scene?.remove(ground);
      this.diagnosticGround = null;
    }
    for (const [object, visible] of this.r2.atmosphere) object.visible = visible;
    const dock = document.querySelector('.cot-studio .dock');
    if (dock && this.r2.originalDockDisplay !== null) dock.style.display = this.r2.originalDockDisplay;
    const director = document.querySelector('#cot-capability-director');
    if (director && this.r2.originalCapabilityDisplay !== null) {
      director.style.display = this.r2.originalCapabilityDisplay;
    }
    base.restore();
  };

  refinePanel();
  const uiPoll = setInterval(() => {
    refinePanel();
    hideCompetingUi();
    if (lab.status === 'ready' || lab.status === 'error') clearInterval(uiPoll);
  }, 120);
  hideCompetingUi();
}

installRefinement(window.__COT_VISUAL_LAYER_LAB);

export const VISUAL_LAYER_LAB_REFINEMENT_VERSION = 2;
