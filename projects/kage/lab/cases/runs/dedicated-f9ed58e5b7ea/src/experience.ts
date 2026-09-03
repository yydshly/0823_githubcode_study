import { defineExperience, startExperience } from '@signal-lab/experience-sdk';
import { createSceneLayer } from './scene';
import { deriveDirection, VoiceId } from './director';

type Viewport = { width: number; height: number; dpr: number };
type Pointer = { x: number; y: number };
type Frame = { elapsed: number; delta: number; progress: number; pointer: Pointer; viewport: Viewport; reducedMotion: boolean };
type Mount = { container: HTMLElement; canvas: HTMLCanvasElement; quality: 'low' | 'balanced' | 'high'; reducedMotion: boolean; viewport: Viewport };
type AudioStateName = 'stopped' | 'playing' | 'muted' | 'unavailable';
type AudioState = { ctx: AudioContext | null; master: GainNode | null; timer: number | null; playing: boolean; muted: boolean; volume: number };

const voices: Array<{ id: VoiceId; name: string; label: string; line: string; note: string }> = [
  { id: 'whisper', name: '耳语', label: '近处', line: '“等一下，我还没有把那句话……', note: '气息贴近纸面，停顿没有被填满。' },
  { id: 'rain', name: '雨点', label: '窗外', line: '“雨把剩下的字，敲在玻璃背面。', note: '句子被雨点拉开，留下可听见的间距。' },
  { id: 'bell', name: '远钟', label: '远处', line: '“等钟声停下，我们再说完。', note: '远钟把未说出口的部分，安放到清晨前。' }
];
const visualLabels: Record<VoiceId, string> = {
  whisper: '174 Hz · 近场耳语',
  rain: '860 Hz · 窗外雨点',
  bell: '440 Hz · 远场钟声'
};

let root: HTMLElement | null = null;
let active: VoiceId = 'whisper';
let audio: AudioState = { ctx: null, master: null, timer: null, playing: false, muted: false, volume: 0.55 };
let removeKeys: (() => void) | null = null;
let latestProgress = 0;
let manualOverride = false;
let manualProgress = 0;

function voice(): typeof voices[number] { return voices.find((item) => item.id === active) ?? voices[0]; }
function setText(selector: string, value: string): void { const node = root?.querySelector<HTMLElement>(selector); if (node) node.textContent = value; }
function audioMessage(): string { return `音量 ${Math.round(audio.volume * 100)}% · 合成声音预览，不是真人录音。`; }
function setAudioState(state: AudioStateName, message = audioMessage()): void {
  root?.setAttribute('data-audio-state', state);
  const feedback = root?.querySelector<HTMLElement>('[data-signal-audio-feedback]');
  feedback?.setAttribute('data-audio-state', state);
  setText('[data-audio-status]', message);
  const play = root?.querySelector<HTMLButtonElement>('.play');
  play?.setAttribute('aria-pressed', String(state === 'playing' || (state === 'muted' && audio.playing)));
}
function updatePrimaryControl(): void {
  const index = voices.findIndex((item) => item.id === active);
  const next = voices[(index + 1) % voices.length].id;
  root?.querySelectorAll<HTMLButtonElement>('[data-voice-button]').forEach((button) => {
    if (button.dataset.voiceButton === next) button.setAttribute('data-signal-primary-control', '');
    else button.removeAttribute('data-signal-primary-control');
  });
}
function setVoice(id: VoiceId, manual: boolean): void {
  active = id;
  if (manual) { manualOverride = true; manualProgress = latestProgress; }
  const item = voice();
  root?.setAttribute('data-voice', id);
  root?.querySelector<HTMLElement>('[data-signal-visual-anchor]')?.setAttribute('data-voice-visual', id);
  root?.querySelector<HTMLElement>('[data-signal-audio-feedback]')?.setAttribute('data-audio-voice', id);
  root?.querySelectorAll<HTMLButtonElement>('[data-voice-button]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.voiceButton === id)));
  setText('[data-chapter]', `${String(voices.findIndex((entry) => entry.id === id) + 1).padStart(2, '0')} / 03 · ${item.name}`);
  setText('[data-line]', item.line);
  setText('[data-note]', item.note);
  setText('[data-visual-label]', visualLabels[id]);
  setText('[data-result]', `现在保存的是「${item.name}」声部：${item.label}的这一句夜话。`);
  updatePrimaryControl();
  if (manual && audio.playing) void playSound();
}
function tone(ctx: AudioContext, at: number, freq: number, duration: number, gain: number, type: OscillatorType): void {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + 0.025);
  env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(env).connect(audio.master as GainNode);
  osc.start(at);
  osc.stop(at + duration + 0.03);
}
function markAudioUnavailable(): void {
  audio.playing = false;
  if (audio.timer !== null) window.clearTimeout(audio.timer);
  audio.timer = null;
  setText('[data-play-label]', '试听这一段');
  setAudioState('unavailable', '声音暂不可用；文字选择与保存仍可使用。');
}
async function playSound(): Promise<void> {
  try {
    if (!audio.ctx || audio.ctx.state === 'closed') {
      const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) { markAudioUnavailable(); return; }
      audio.ctx = new AudioCtor();
      audio.master = audio.ctx.createGain();
      audio.master.connect(audio.ctx.destination);
    }
    if (audio.ctx.state === 'suspended') await audio.ctx.resume();
  } catch {
    markAudioUnavailable();
    return;
  }
  const ctx = audio.ctx;
  const master = audio.master;
  if (!ctx || !master) { markAudioUnavailable(); return; }
  if (audio.timer !== null) window.clearTimeout(audio.timer);
  master.gain.setTargetAtTime(audio.muted ? 0 : audio.volume, ctx.currentTime, 0.02);
  audio.playing = true;
  const item = active;
  const cycle = (): void => {
    if (!audio.playing) return;
    try {
      const now = ctx.currentTime;
      if (item === 'whisper') { tone(ctx, now, 174, 0.42, 0.08, 'sine'); tone(ctx, now + 0.29, 232, 0.28, 0.045, 'triangle'); }
      if (item === 'rain') { for (let i = 0; i < 9; i += 1) tone(ctx, now + i * 0.12, 700 + (i % 3) * 170, 0.035, 0.018, 'sine'); }
      if (item === 'bell') { tone(ctx, now, 440, 1.45, 0.1, 'sine'); tone(ctx, now + 0.02, 660, 1.15, 0.035, 'sine'); }
      audio.timer = window.setTimeout(cycle, item === 'rain' ? 1080 : item === 'bell' ? 2100 : 1250);
    } catch { markAudioUnavailable(); }
  };
  cycle();
  setText('[data-play-label]', '停止试听');
  setAudioState(audio.muted ? 'muted' : 'playing');
}
function stopSound(): void {
  audio.playing = false;
  if (audio.timer !== null) window.clearTimeout(audio.timer);
  audio.timer = null;
  setText('[data-play-label]', '试听这一段');
  setAudioState(audio.muted ? 'muted' : 'stopped');
}
function mount(context: Mount): void {
  root = context.container;
  root.className = `night-radio${context.reducedMotion ? ' reduce-motion' : ''}`;
  createSceneLayer(context.canvas);
  root.innerHTML = `<div class="sonic-field" data-signal-visual-anchor data-voice-visual="whisper" aria-hidden="true"><b data-visual-label>174 Hz · 近场耳语</b><em>LIVE FIELD / 00:17</em><i></i><i></i><i></i></div><main><section class="hero" aria-label="未读完的台词与停顿"><p class="kicker">午夜电台短篇 · 00:17</p><div class="stage"><p class="speaker">第七码头的来信</p><h1 class="line" data-line>“等一下，我还没有把那句话……</h1><div class="pause" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><p class="caption">一句没有读完的台词。停顿仍在这里。</p></div><div class="listen" data-signal-audio-feedback data-audio-state="stopped" data-audio-voice="whisper"><button class="play" type="button" data-signal-audio-control aria-pressed="false"><span data-play-label>试听这一段</span></button><button class="mute" type="button" data-signal-audio-control aria-pressed="false">静音</button><label>音量 <input class="volume" data-signal-audio-control aria-label="音量" type="range" min="0" max="1" step="0.05" value="0.55"></label><small data-audio-status data-audio-fallback aria-live="polite">音量 55% · 合成声音预览，不是真人录音。</small></div></section><section class="field"><div class="field-head"><p>滚动、方向键或选择声部，让同一句夜话改变距离。</p><p class="chapter" data-chapter>01 / 03 · 耳语</p></div><nav aria-label="叙事声部">${voices.map((item) => `<button type="button" data-voice-button="${item.id}" data-state="${item.id}" aria-pressed="${item.id === active}"><b>${item.name}</b><span>${item.label}</span></button>`).join('')}</nav><article><p class="eyebrow">正在收听</p><h2 class="statement">让停顿，<br>有一处可以落下。</h2><p class="note" data-note>气息贴近纸面，停顿没有被填满。</p><div class="proof" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div></article></section><section class="resolve"><p class="eyebrow">夜话归档</p><p class="result" data-signal-primary-result data-result>现在保存的是「耳语」声部：近处的这一句夜话。</p><button class="save" type="button" data-signal-primary-action>保存这一段夜话</button><p class="saved" aria-live="polite"></p></section></main>`;
  root.querySelector<HTMLButtonElement>('.play')?.addEventListener('click', () => audio.playing ? stopSound() : void playSound());
  root.querySelector<HTMLButtonElement>('.mute')?.addEventListener('click', (event) => {
    audio.muted = !audio.muted;
    const button = event.currentTarget as HTMLButtonElement;
    button.setAttribute('aria-pressed', String(audio.muted));
    button.textContent = audio.muted ? '取消静音' : '静音';
    if (audio.master && audio.ctx) audio.master.gain.setTargetAtTime(audio.muted ? 0 : audio.volume, audio.ctx.currentTime, 0.02);
    setAudioState(audio.muted ? 'muted' : audio.playing ? 'playing' : 'stopped');
  });
  root.querySelector<HTMLInputElement>('.volume')?.addEventListener('input', (event) => {
    audio.volume = Number((event.currentTarget as HTMLInputElement).value);
    if (audio.master && audio.ctx && !audio.muted) audio.master.gain.setTargetAtTime(audio.volume, audio.ctx.currentTime, 0.02);
    setAudioState(audio.muted ? 'muted' : audio.playing ? 'playing' : 'stopped');
  });
  root.querySelectorAll<HTMLButtonElement>('[data-voice-button]').forEach((button) => button.addEventListener('click', () => setVoice(button.dataset.voiceButton as VoiceId, true)));
  root.querySelector<HTMLButtonElement>('.save')?.addEventListener('click', () => { const node = root?.querySelector<HTMLElement>('.saved'); if (node) node.textContent = '已保存。它会在清晨之前，安静地留在这里。'; });
  const onKey = (event: KeyboardEvent): void => {
    if (!['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(event.key)) return;
    event.preventDefault();
    const index = voices.findIndex((item) => item.id === active);
    const forward = event.key === 'ArrowDown' || event.key === 'ArrowRight';
    setVoice(voices[(index + (forward ? 1 : voices.length - 1)) % voices.length].id, true);
  };
  window.addEventListener('keydown', onKey);
  removeKeys = () => window.removeEventListener('keydown', onKey);
  setVoice('whisper', false);
  setAudioState('stopped');
}
function update(frame: Frame): void {
  if (!root) return;
  latestProgress = frame.progress;
  const direction = deriveDirection(frame.progress, frame.pointer, frame.elapsed, frame.reducedMotion);
  root.style.setProperty('--scroll-light', direction.light.toFixed(3));
  root.style.setProperty('--field-shift', `${direction.shift}px`);
  root.setAttribute('data-phase', frame.progress >= 0.82 ? 'resolve' : 'story');
  if (manualOverride && Math.abs(frame.progress - manualProgress) >= 0.06) manualOverride = false;
  if (!frame.reducedMotion && !manualOverride && direction.chapter !== voices.findIndex((item) => item.id === active)) setVoice(voices[direction.chapter].id, false);
}
function resize(_viewport: Viewport): void {}
function dispose(): void {
  stopSound();
  removeKeys?.();
  if (audio.ctx) void audio.ctx.close();
  audio = { ctx: null, master: null, timer: null, playing: false, muted: false, volume: 0.55 };
  manualOverride = false;
  latestProgress = 0;
  root = null;
}

startExperience(defineExperience({ mount, update, resize, dispose }));
