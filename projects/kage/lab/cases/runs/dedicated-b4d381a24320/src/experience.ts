import { defineExperience, startExperience } from '@signal-lab/experience-sdk';
import { createSoundboardAudio, mapSoundboardTone, type SoundboardAudioProfile } from './audio';
import { direct, type TuningState } from './director';
import { createSoundboardScene } from './scene';

type DriveMode = 'scroll' | 'manual';

const SAFE_MIN = 2.62;
const SAFE_MAX = 3.16;
const BASELINE = 2.95;

function simulatedDeflection(state: TuningState) {
  return state.localDeflectionMm;
}

startExperience(defineExperience({
  mount(context) {
    const root = document.createElement('main');
    root.className = `soundboard-page${context.reducedMotion ? ' reduce' : ''}`;
    root.dataset.driveMode = 'scroll';
    root.setAttribute('data-signal-shared-driver', 'soundboard-thickness');
    root.innerHTML = `
      <section class="workspace" aria-labelledby="soundboard-title">
        <header class="topline">
          <span>洛木工坊 · 音板调校记录</span>
          <span>教学模拟 / 02</span>
        </header>

        <div class="workspace-grid">
          <section class="visual-stage" data-signal-visual-anchor aria-label="同一块云杉音板的测量视图">
            <div class="canvas-frame"></div>
            <div class="visual-shade" aria-hidden="true"></div>
            <div class="board-identity">
              <span>SPRUCE 02 · SAME BOARD</span>
              <strong>欧洲云杉 / 径切 / 480 × 365 mm</strong>
            </div>
            <div class="measurement-pin pin-node" aria-hidden="true"><i></i><span>N1</span></div>
            <div class="measurement-pin pin-antinode" aria-hidden="true"><i></i><span>A1</span></div>
            <div class="mode-legend" aria-label="模态图例">
              <span><i class="node-mark"></i>节点 · 位移接近零</span>
              <span><i class="antinode-mark"></i>腹部 · 局部挠度最大</span>
            </div>
            <p class="visual-caption">敲击模态 / 一阶弯曲 · 覆层只表示模拟测量，不改变木材照片</p>
          </section>

          <aside class="record-panel" aria-label="音板测量记录台">
            <div class="record-heading">
              <p class="eyebrow">LUTHIER MEASUREMENT NOTE / 02</p>
              <h1 id="soundboard-title">同一音板，<br>看见调校响应</h1>
              <p>只改变中心厚度，比较频率、局部挠度与结构风险。滚动先演示；触碰滑杆后由你接管。</p>
            </div>

            <div class="driver-status" aria-live="polite">
              <span class="driver-dot" aria-hidden="true"></span>
              <strong class="driver-label">滚轮演示中</strong>
              <span class="driver-copy">向下滚动观察音板逐步薄化</span>
              <i class="driver-progress" data-signal-driver-progress="soundboard-thickness" data-progress="0" aria-hidden="true"></i>
            </div>

            <section class="measurement-block" aria-labelledby="thickness-label">
              <div class="compare-row">
                <div><span>基准</span><strong>${BASELINE.toFixed(2)} mm</strong></div>
                <div><span>当前</span><strong class="current">${BASELINE.toFixed(2)} mm</strong></div>
                <div><span>差值</span><strong class="delta">±0.00 mm</strong></div>
              </div>

              <label class="control-label" id="thickness-label" for="thickness">
                <span>中心厚度</span>
                <output for="thickness">${BASELINE.toFixed(2)} mm</output>
              </label>
              <input data-signal-primary-control id="thickness" type="range" min="2.35" max="3.35" step="0.01" value="${BASELINE.toFixed(2)}" aria-describedby="safe-range simulation-boundary">
              <div class="range-scale" aria-hidden="true"><span>2.35</span><span>2.62</span><span>3.16</span><span>3.35 mm</span></div>
              <p class="safe-range" id="safe-range"><span></span>建议复核区间 <strong>${SAFE_MIN.toFixed(2)}–${SAFE_MAX.toFixed(2)} mm</strong></p>
            </section>

            <section class="result-grid" data-signal-primary-result aria-label="当前模拟结果" aria-live="polite">
              <div class="metric"><span>敲击基频</span><strong class="frequency">213 Hz</strong><small>同一测点 / Mode I</small></div>
              <div class="metric"><span>局部挠度</span><strong class="deflection">0.42 mm</strong><small>A1 腹部 / 1 N 模拟载荷</small></div>
            </section>

            <section class="audio-lab" data-signal-audio-feedback aria-labelledby="audio-title">
              <div class="audio-heading">
                <div>
                  <p class="audio-kicker">TAP-TONE COMPARISON</p>
                  <h2 id="audio-title">不只看见，也听见响应</h2>
                </div>
                <button class="audio-mute" type="button" aria-pressed="false" aria-label="静音敲击模拟">声音开启</button>
              </div>
              <div class="audio-actions" role="group" aria-label="音板敲击声音对比">
                <button class="audio-hit audio-reference" type="button">
                  <span>A · 基准音板</span><strong>${BASELINE.toFixed(2)} mm</strong>
                </button>
                <button class="audio-hit audio-current" type="button">
                  <span>B · 当前音板</span><strong class="audio-current-value">等待调校</strong>
                </button>
                <button class="audio-hit audio-compare" type="button">
                  <span>A → B · 连续对比</span><strong>先听基准，再听当前</strong>
                </button>
              </div>
              <p class="audio-contrast">当前听感差异正在计算</p>
              <div class="audio-monitor">
                <span class="audio-state" aria-live="polite">点击 A / B 敲击，比较同一音板的模拟响应</span>
                <span class="audio-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
                <label class="audio-volume-label" for="audio-volume">音量</label>
                <input class="audio-volume" id="audio-volume" type="range" min="0" max="100" step="5" value="72" aria-label="敲击模拟音量">
              </div>
              <p class="audio-boundary">程序化教学模拟声：为普通设备可辨，音高、余振与泛音差异经过有界感知放大；只表示调校方向，不代表真实录音或声学检测。</p>
            </section>

            <div class="risk-card">
              <span>结构判断</span>
              <strong class="risk">厚度区间稳定：可继续复核敲击感</strong>
              <p class="risk-explanation">当前落在建议复核区间；仍需以实物敲击、含水率与支撑结构共同判断。</p>
            </div>

            <p class="simulation-boundary" id="simulation-boundary"><strong>教学模拟边界</strong>　频率、挠度和风险用于比较调校方向，不替代卡尺、挠度计与实物敲击测量。</p>

            <button class="save" data-signal-primary-action type="button">保存本次调校方案</button>
            <article class="saved-record" aria-live="polite" aria-label="已保存的调校方案">
              <div><span>WORKSHOP NOTE</span><strong>方案已保存</strong></div>
              <p class="saved-summary"></p>
            </article>
          </aside>
        </div>
      </section>`;

    context.container.appendChild(root);

    const canvasFrame = root.querySelector('.canvas-frame');
    const slider = root.querySelector('#thickness');
    const current = root.querySelector('.current');
    const output = root.querySelector('output');
    const delta = root.querySelector('.delta');
    const frequency = root.querySelector('.frequency');
    const deflection = root.querySelector('.deflection');
    const audioReference = root.querySelector('.audio-reference');
    const audioCurrent = root.querySelector('.audio-current');
    const audioCompare = root.querySelector('.audio-compare');
    const audioCurrentValue = root.querySelector('.audio-current-value');
    const audioContrast = root.querySelector('.audio-contrast');
    const audioMute = root.querySelector('.audio-mute');
    const audioVolume = root.querySelector('.audio-volume');
    const audioState = root.querySelector('.audio-state');
    const risk = root.querySelector('.risk');
    const riskExplanation = root.querySelector('.risk-explanation');
    const driverLabel = root.querySelector('.driver-label');
    const driverCopy = root.querySelector('.driver-copy');
    const driverProgress = root.querySelector('.driver-progress');
    const save = root.querySelector('.save');
    const savedRecord = root.querySelector('.saved-record');
    const savedSummary = root.querySelector('.saved-summary');

    if (!(canvasFrame instanceof HTMLElement)
      || !(slider instanceof HTMLInputElement)
      || !(current instanceof HTMLElement)
      || !(output instanceof HTMLOutputElement)
      || !(delta instanceof HTMLElement)
      || !(frequency instanceof HTMLElement)
      || !(deflection instanceof HTMLElement)
      || !(audioReference instanceof HTMLButtonElement)
      || !(audioCurrent instanceof HTMLButtonElement)
      || !(audioCompare instanceof HTMLButtonElement)
      || !(audioCurrentValue instanceof HTMLElement)
      || !(audioContrast instanceof HTMLElement)
      || !(audioMute instanceof HTMLButtonElement)
      || !(audioVolume instanceof HTMLInputElement)
      || !(audioState instanceof HTMLElement)
      || !(risk instanceof HTMLElement)
      || !(riskExplanation instanceof HTMLElement)
      || !(driverLabel instanceof HTMLElement)
      || !(driverCopy instanceof HTMLElement)
      || !(driverProgress instanceof HTMLElement)
      || !(save instanceof HTMLButtonElement)
      || !(savedRecord instanceof HTMLElement)
      || !(savedSummary instanceof HTMLElement)) {
      throw new Error('Soundboard measurement UI unavailable');
    }

    context.canvas.classList.add('soundboard-canvas');
    context.canvas.setAttribute('aria-label', '同一块云杉音板的敲击模态与局部挠度模拟');
    context.canvas.setAttribute('role', 'img');
    canvasFrame.appendChild(context.canvas);

    const scene = createSoundboardScene(context.canvas);
    let sceneDpr = context.viewport.dpr;
    const resizeScene = () => {
      const bounds = canvasFrame.getBoundingClientRect();
      scene.resize(Math.max(1, bounds.width), Math.max(1, bounds.height), sceneDpr);
    };
    const stageObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(resizeScene);
    stageObserver?.observe(canvasFrame);
    let driveMode: DriveMode = 'scroll';
    let manualThickness = BASELINE;
    let latestState = direct(0, BASELINE, 0, context.reducedMotion);
    let latestDeflection = simulatedDeflection(latestState);
    let previousUiSignature = '';
    let audioResetTimer = 0;
    let comparisonTimer = 0;
    const audio = createSoundboardAudio();
    const referenceState = direct(0, BASELINE, 0, true, {
      manual: true,
      manualThickness: BASELINE,
    });

    const audioProfile = (state: TuningState): SoundboardAudioProfile => ({
      thickness: state.thickness,
      frequency: state.frequency,
      deflection: state.localDeflectionMm,
    });

    const contrastDescription = (state: TuningState) => {
      const currentTone = mapSoundboardTone(audioProfile(state));
      const pitchDifference = Math.abs(currentTone.semitoneDelta);
      if (pitchDifference < 0.18) return '当前接近基准厚度 · 两次敲击应当接近';
      const pitchDirection = currentTone.semitoneDelta < 0 ? '更低' : '更高';
      const decayDirection = currentTone.decaySeconds > 1.04 ? '余振更长' : '余振更短';
      const brightnessDirection = currentTone.brightnessHz > 3500 ? '泛音更亮' : '泛音更收敛';
      return `相对基准约 ${pitchDifference.toFixed(1)} 半音${pitchDirection} · ${decayDirection} · ${brightnessDirection}`;
    };

    const cancelComparison = () => {
      window.clearTimeout(comparisonTimer);
      audioCompare.classList.remove('is-playing');
    };

    const playTone = async (state: TuningState, label: string, button: HTMLButtonElement) => {
      window.clearTimeout(audioResetTimer);
      const played = await audio.play(audioProfile(state));
      if (!played) {
        root.dataset.audioState = audio.isMuted() ? 'muted' : 'unsupported';
        audioState.textContent = audio.isMuted()
          ? '声音已静音；仍可继续观察视觉与数值变化'
          : '当前浏览器未能启用声音；视觉与数值比较仍可使用';
        return;
      }
      root.dataset.audioState = 'playing';
      audioReference.classList.toggle('is-playing', button === audioReference);
      audioCurrent.classList.toggle('is-playing', button === audioCurrent);
      audioState.textContent = `${label} · ${Math.round(state.frequency)} Hz 模拟敲击正在衰减`;
      audioResetTimer = window.setTimeout(() => {
        audioReference.classList.remove('is-playing');
        audioCurrent.classList.remove('is-playing');
        root.dataset.audioState = 'ready';
        audioState.textContent = '可继续 A / B 对比；滑杆松开时会试听当前状态';
      }, 1650);
    };

    const setUnsaved = () => {
      savedRecord.classList.remove('show');
      save.textContent = '保存本次调校方案';
    };

    const takeManualControl = () => {
      if (driveMode === 'manual') return;
      driveMode = 'manual';
      root.dataset.driveMode = driveMode;
      driverLabel.textContent = '已人工接管';
      driverCopy.textContent = '滑杆正在直接控制同一块音板';
    };

    const onInput = () => {
      takeManualControl();
      manualThickness = Number(slider.value);
      setUnsaved();
    };

    const onCommit = () => {
      cancelComparison();
      const committedState = direct(0, manualThickness, 0, context.reducedMotion, {
        manual: true,
        manualThickness,
      });
      void playTone(committedState, '当前音板', audioCurrent);
    };

    const onReferenceTone = () => {
      cancelComparison();
      void playTone(referenceState, '基准音板', audioReference);
    };
    const onCurrentTone = () => {
      cancelComparison();
      void playTone(latestState, '当前音板', audioCurrent);
    };
    const onCompareTone = () => {
      cancelComparison();
      audioCompare.classList.add('is-playing');
      void playTone(referenceState, 'A · 基准音板', audioReference).then(() => {
        if (root.dataset.audioState !== 'playing') {
          audioCompare.classList.remove('is-playing');
          return;
        }
        comparisonTimer = window.setTimeout(() => {
          void playTone(latestState, 'B · 当前音板', audioCurrent);
          audioCompare.classList.remove('is-playing');
        }, 1080);
      });
    };
    const onMute = () => {
      const nextMuted = !audio.isMuted();
      audio.setMuted(nextMuted);
      audioMute.setAttribute('aria-pressed', String(nextMuted));
      audioMute.textContent = nextMuted ? '声音静音' : '声音开启';
      root.dataset.audioState = nextMuted ? 'muted' : 'ready';
      audioState.textContent = nextMuted
        ? '声音已静音；视觉和数值反馈不受影响'
        : '声音已开启；点击 A / B 进行比较';
    };
    const onVolume = () => { audio.setVolume(Number(audioVolume.value) / 100); };

    const onSave = () => {
      const riskText = latestState.risk.replace(/[。.]$/, '');
      savedSummary.textContent = `${latestState.thickness.toFixed(2)} mm · ${Math.round(latestState.frequency)} Hz · 局部挠度 ${latestDeflection.toFixed(2)} mm · ${riskText}`;
      savedRecord.classList.add('show');
      save.textContent = '已保存 · 可继续调整';
    };

    slider.addEventListener('input', onInput);
    slider.addEventListener('change', onCommit);
    audioReference.addEventListener('click', onReferenceTone);
    audioCurrent.addEventListener('click', onCurrentTone);
    audioCompare.addEventListener('click', onCompareTone);
    audioMute.addEventListener('click', onMute);
    audioVolume.addEventListener('input', onVolume);
    save.addEventListener('click', onSave);
    resizeScene();

    return {
      update(frame) {
        latestState = direct(frame.progress, manualThickness, frame.elapsed, frame.reducedMotion, {
          manual: driveMode === 'manual',
          manualThickness,
        });
        if (driveMode === 'scroll') slider.value = latestState.thickness.toFixed(2);
        latestDeflection = simulatedDeflection(latestState);
        scene.render(latestState, frame.progress);

        const progress = Math.min(1, Math.max(0, frame.progress));
        driverProgress.dataset.progress = progress.toFixed(3);
        driverProgress.style.setProperty('--driver-progress', `${(progress * 100).toFixed(1)}%`);
        root.style.setProperty('--tuning-progress', `${((latestState.thickness - 2.35) / 1).toFixed(3)}`);
        root.style.setProperty('--deflection-level', `${Math.min(1, latestDeflection / 1.13).toFixed(3)}`);

        const uiSignature = `${latestState.thickness.toFixed(2)}|${Math.round(latestState.frequency)}|${latestDeflection.toFixed(2)}|${latestState.risk}|${driveMode}`;
        if (uiSignature === previousUiSignature) return;
        previousUiSignature = uiSignature;

        const mm = `${latestState.thickness.toFixed(2)} mm`;
        const difference = latestState.thickness - BASELINE;
        current.textContent = mm;
        output.textContent = mm;
        delta.textContent = `${difference >= 0 ? '+' : '−'}${Math.abs(difference).toFixed(2)} mm`;
        frequency.textContent = `${Math.round(latestState.frequency)} Hz`;
        deflection.textContent = `${latestDeflection.toFixed(2)} mm`;
        audioCurrentValue.textContent = `${latestState.thickness.toFixed(2)} mm · ${Math.round(latestState.frequency)} Hz`;
        audioContrast.textContent = contrastDescription(latestState);
        risk.textContent = latestState.risk;
        root.dataset.range = latestState.thickness < SAFE_MIN ? 'thin' : latestState.thickness > SAFE_MAX ? 'thick' : 'safe';
        riskExplanation.textContent = latestState.thickness < SAFE_MIN
          ? '薄区响应更活跃，但边缘支撑余量下降；先停刀并复核外圈与含水率。'
          : latestState.thickness > SAFE_MAX
            ? '厚区刚度更高、局部挠度更小；若追求开放响应，需要重新评估去料位置。'
            : '当前落在建议复核区间；仍需以实物敲击、含水率与支撑结构共同判断。';
      },
      resize(viewport) {
        sceneDpr = viewport.dpr;
        resizeScene();
      },
      dispose() {
        stageObserver?.disconnect();
        window.clearTimeout(audioResetTimer);
        cancelComparison();
        slider.removeEventListener('input', onInput);
        slider.removeEventListener('change', onCommit);
        audioReference.removeEventListener('click', onReferenceTone);
        audioCurrent.removeEventListener('click', onCurrentTone);
        audioCompare.removeEventListener('click', onCompareTone);
        audioMute.removeEventListener('click', onMute);
        audioVolume.removeEventListener('input', onVolume);
        save.removeEventListener('click', onSave);
        audio.dispose();
        scene.dispose();
        root.remove();
      }
    };
  },
  update() {},
  resize() {},
  dispose() {}
}));
