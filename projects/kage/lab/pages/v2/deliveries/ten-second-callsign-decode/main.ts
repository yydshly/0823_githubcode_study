type MorseMark = '.' | '-';
type PracticePhase = 'waiting' | 'sounding' | 'decoding' | 'checked' | 'saved';
type AudioState = 'locked' | 'ready' | 'playing' | 'muted' | 'unavailable';
type CheckStatus = 'idle' | 'incorrect' | 'correct';
type PlayingScope = 'all' | number | null;

type MorseLetter = {
  letter: string;
  pattern: readonly MorseMark[];
};

type ToneToken = {
  letterIndex: number;
  markIndex: number;
  mark: MorseMark;
  startMs: number;
  durationMs: number;
  endMs: number;
};

type LetterTiming = {
  letterIndex: number;
  startMs: number;
  endMs: number;
  tokens: readonly ToneToken[];
};

type CallsignSnapshot = {
  ready: boolean;
  phase: PracticePhase;
  audioState: AudioState;
  audioContextState: AudioContextState | 'not-created' | 'unavailable';
  audioFallback: boolean;
  playingScope: PlayingScope;
  currentLetter: number;
  currentElement: number;
  revealed: boolean[];
  revealedCount: number;
  checkStatus: CheckStatus;
  saved: boolean;
  restored: boolean;
  muted: boolean;
  volume: number;
  reducedMotion: boolean;
  horizontalOverflow: boolean;
  canonicalSequenceId: 'demo-kage-v1';
  expectedDurationMs: 10000;
  scheduledToneCount: number;
  completedPlaybackCount: number;
  revision: string;
};

declare global {
  interface Window {
    __callsignDecoder?: {
      snapshot: () => CallsignSnapshot;
      playAll: () => Promise<CallsignSnapshot>;
      playSegment: (index: number) => Promise<CallsignSnapshot>;
      stop: () => CallsignSnapshot;
      setAnswer: (value: string) => CallsignSnapshot;
      submit: () => CallsignSnapshot;
      save: () => CallsignSnapshot;
      reset: () => CallsignSnapshot;
    };
  }
}

const LETTERS: readonly MorseLetter[] = [
  { letter: 'K', pattern: ['-', '.', '-'] },
  { letter: 'A', pattern: ['.', '-'] },
  { letter: 'G', pattern: ['-', '-', '.'] },
  { letter: 'E', pattern: ['.'] }
] as const;

const UNIT_MS = 280;
const LEAD_MS = 380;
const TAIL_MS = 380;
const EXPECTED_DURATION_MS = 10_000;
const EXERCISE_ID = 'demo-kage-v1' as const;
const STORAGE_KEY = 'kage-v2-r139-callsign-card-v1';
const ANSWER = LETTERS.map((entry) => entry.letter).join('');
const query = new URLSearchParams(location.search);
const revision = query.get('revision') || 'r139-live';
const forcedAudioFallback = ['audio', '1', 'true', 'on'].includes((query.get('fallback') || '').toLowerCase())
  || ['off', '0', 'false'].includes((query.get('audio') || '').toLowerCase());
const reducedMotion = query.get('motion') === 'reduce'
  || (query.get('motion') !== 'full' && matchMedia('(prefers-reduced-motion: reduce)').matches);

const timeline = createTimeline();
if (timeline.durationMs !== EXPECTED_DURATION_MS) {
  throw new Error(`R139 canonical sequence must be exactly 10000ms; received ${timeline.durationMs}ms.`);
}

const html = document.documentElement;
const body = document.body;
const signalStrip = must<HTMLOListElement>('#signal-strip');
const segments = Array.from(signalStrip.querySelectorAll<HTMLLIElement>('[data-segment-index]'));
const segmentButtons = Array.from(signalStrip.querySelectorAll<HTMLButtonElement>('[data-play-segment]'));
const decodedLetters = Array.from(signalStrip.querySelectorAll<HTMLElement>('[data-decoded-letter]'));
const segmentActions = Array.from(signalStrip.querySelectorAll<HTMLElement>('.segment-action'));
const playAllButton = must<HTMLButtonElement>('#play-all');
const playAllLabel = must<HTMLElement>('#play-sequence-label');
const stopButton = must<HTMLButtonElement>('#stop-playback');
const muteButton = must<HTMLButtonElement>('#mute-audio');
const volumeInput = must<HTMLInputElement>('#audio-volume');
const progressLabel = must<HTMLElement>('[data-progress-label]');
const audioStatus = must<HTMLElement>('[data-audio-status]');
const audioStatusNormal = must<HTMLElement>('.audio-status__normal');
const decodeForm = must<HTMLFormElement>('#decode-form');
const decodeInput = must<HTMLInputElement>('#decode-input');
const submitButton = must<HTMLButtonElement>('#submit-decode');
const answerFeedback = must<HTMLElement>('#answer-feedback');
const decodedCallsign = must<HTMLElement>('#decoded-callsign');
const completionMarks = Array.from(document.querySelectorAll<HTMLElement>('.completion-card__signal span'));
const saveButton = must<HTMLButtonElement>('#save-card');
const resetButton = must<HTMLButtonElement>('#reset-practice');
const saveStatus = must<HTMLElement>('#save-status');
const liveStatus = must<HTMLElement>('#live-status');

if (
  segments.length !== LETTERS.length
  || segmentButtons.length !== LETTERS.length
  || decodedLetters.length !== LETTERS.length
  || segmentActions.length !== LETTERS.length
  || completionMarks.length !== LETTERS.length
) {
  throw new Error('R139 callsign delivery is missing one or more canonical sequence nodes.');
}

const state = {
  ready: false,
  phase: 'waiting' as PracticePhase,
  audioState: (forcedAudioFallback ? 'unavailable' : 'locked') as AudioState,
  playingScope: null as PlayingScope,
  currentLetter: -1,
  currentElement: -1,
  revealed: LETTERS.map(() => false),
  checkStatus: 'idle' as CheckStatus,
  saved: false,
  restored: false,
  muted: false,
  volume: Number(volumeInput.value),
  scheduledToneCount: 0,
  completedPlaybackCount: 0,
  elapsedMs: 0
};

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let activeOscillators = new Set<OscillatorNode>();
let animationFrame = 0;
let playbackVersion = 0;
let playbackResolve: ((value: CallsignSnapshot) => void) | null = null;

restoreSavedCard();
bindInteractions();
state.ready = true;
render();
window.__callsignDecoder = {
  snapshot,
  playAll,
  playSegment,
  stop: () => stopPlayback('decoding'),
  setAnswer,
  submit: submitAnswer,
  save: saveCard,
  reset: resetPractice
};

function createTimeline(): { letters: readonly LetterTiming[]; tokens: readonly ToneToken[]; durationMs: number } {
  let cursor = LEAD_MS;
  const tokens: ToneToken[] = [];
  const letters: LetterTiming[] = [];
  LETTERS.forEach((entry, letterIndex) => {
    const letterTokens: ToneToken[] = [];
    const startMs = cursor;
    entry.pattern.forEach((mark, markIndex) => {
      const durationMs = mark === '.' ? UNIT_MS : UNIT_MS * 3;
      const token = { letterIndex, markIndex, mark, startMs: cursor, durationMs, endMs: cursor + durationMs };
      tokens.push(token);
      letterTokens.push(token);
      cursor += durationMs;
      if (markIndex < entry.pattern.length - 1) cursor += UNIT_MS;
    });
    letters.push({ letterIndex, startMs, endMs: cursor, tokens: letterTokens });
    if (letterIndex < LETTERS.length - 1) cursor += UNIT_MS * 3;
  });
  return { letters, tokens, durationMs: cursor + TAIL_MS };
}

function bindInteractions(): void {
  playAllButton.addEventListener('click', () => {
    if (state.playingScope !== null) stopPlayback('decoding');
    else void playAll();
  });
  stopButton.addEventListener('click', () => stopPlayback('decoding'));
  segmentButtons.forEach((button, index) => button.addEventListener('click', () => void playSegment(index)));
  muteButton.addEventListener('click', toggleMuted);
  volumeInput.addEventListener('input', () => {
    state.volume = clamp(Number(volumeInput.value), 0, 1);
    applyMasterLevel();
    render();
  });
  decodeInput.addEventListener('input', () => {
    decodeInput.value = normalizeAnswer(decodeInput.value);
    if (state.checkStatus === 'incorrect') {
      state.checkStatus = 'idle';
      state.phase = 'decoding';
      answerFeedback.textContent = '已更新输入；可以再次提交。';
    }
    render();
  });
  decodeForm.addEventListener('submit', (event) => {
    event.preventDefault();
    submitAnswer();
  });
  saveButton.addEventListener('click', saveCard);
  resetButton.addEventListener('click', resetPractice);
  addEventListener('keydown', (event) => {
    if (event.code !== 'Space' || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target;
    if (target instanceof HTMLElement && (
      target.matches('input, textarea, select, button') || target.isContentEditable
    )) return;
    event.preventDefault();
    if (state.playingScope !== null) stopPlayback('decoding');
    else void playAll();
  });
  addEventListener('pagehide', disposeAudio, { once: true });
}

async function playAll(): Promise<CallsignSnapshot> {
  state.revealed = LETTERS.map(() => false);
  state.checkStatus = 'idle';
  state.saved = false;
  state.restored = false;
  decodeInput.value = '';
  answerFeedback.textContent = '';
  saveStatus.textContent = '';
  decodedCallsign.textContent = '— — — —';
  completionMarks.forEach((node) => { node.textContent = '—'; });
  return beginPlayback({ scope: 'all', durationMs: timeline.durationMs, offsetMs: 0, tokens: timeline.tokens });
}

async function playSegment(index: number): Promise<CallsignSnapshot> {
  const timing = timeline.letters[index];
  if (!timing) return snapshot();
  const lead = 120;
  const tokens = timing.tokens.map((token) => ({
    ...token,
    startMs: token.startMs - timing.startMs + lead,
    endMs: token.endMs - timing.startMs + lead
  }));
  const durationMs = timing.endMs - timing.startMs + lead + 180;
  state.checkStatus = state.checkStatus === 'correct' ? 'correct' : 'idle';
  return beginPlayback({ scope: index, durationMs, offsetMs: timing.startMs - lead, tokens });
}

async function beginPlayback(input: {
  scope: 'all' | number;
  durationMs: number;
  offsetMs: number;
  tokens: readonly ToneToken[];
}): Promise<CallsignSnapshot> {
  cancelPlayback(true);
  const version = playbackVersion;
  const audioReady = await ensureAudioContext();
  if (version !== playbackVersion) return snapshot();

  state.phase = 'sounding';
  state.playingScope = input.scope;
  state.currentLetter = -1;
  state.currentElement = -1;
  state.elapsedMs = 0;
  state.scheduledToneCount = 0;
  if (audioReady) scheduleTones(input.tokens);
  state.audioState = audioReady ? (state.muted ? 'muted' : 'playing') : 'unavailable';
  render();

  const startedAt = performance.now();
  return new Promise<CallsignSnapshot>((resolve) => {
    playbackResolve = resolve;
    const frame = (now: number) => {
      if (version !== playbackVersion) return;
      const elapsed = Math.min(input.durationMs, Math.max(0, now - startedAt));
      state.elapsedMs = input.scope === 'all' ? elapsed : Math.min(EXPECTED_DURATION_MS, elapsed + input.offsetMs);
      const active = input.tokens.find((token) => elapsed >= token.startMs && elapsed < token.endMs);
      state.currentLetter = active?.letterIndex ?? -1;
      state.currentElement = active?.markIndex ?? -1;

      if (input.scope === 'all') {
        timeline.letters.forEach((letter) => {
          if (elapsed >= letter.endMs) state.revealed[letter.letterIndex] = true;
        });
      } else if (elapsed >= input.durationMs - 180) {
        state.revealed[input.scope] = true;
      }
      render();
      if (elapsed < input.durationMs) {
        animationFrame = requestAnimationFrame(frame);
        return;
      }
      finishPlayback(version);
    };
    animationFrame = requestAnimationFrame(frame);
  });
}

function finishPlayback(version: number): void {
  if (version !== playbackVersion) return;
  stopActiveOscillators();
  cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  state.currentLetter = -1;
  state.currentElement = -1;
  state.playingScope = null;
  state.phase = 'decoding';
  state.completedPlaybackCount += 1;
  state.audioState = forcedAudioFallback || !audioContext ? 'unavailable' : state.muted ? 'muted' : 'ready';
  announce(state.revealed.every(Boolean) ? '十秒播放完成。现在输入你听到的四位练习代码。' : '这一段播放完成。可以继续试听或输入答案。');
  const resolve = playbackResolve;
  playbackResolve = null;
  render();
  resolve?.(snapshot());
}

function stopPlayback(nextPhase: PracticePhase): CallsignSnapshot {
  const wasPlaying = state.playingScope !== null;
  cancelPlayback(true);
  state.playingScope = null;
  state.currentLetter = -1;
  state.currentElement = -1;
  state.phase = nextPhase;
  state.audioState = forcedAudioFallback || !audioContext ? 'unavailable' : state.muted ? 'muted' : 'ready';
  if (wasPlaying) announce('播放已停止；已完成的声段仍保留。');
  render();
  return snapshot();
}

function cancelPlayback(resolvePending: boolean): void {
  playbackVersion += 1;
  cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  stopActiveOscillators();
  const resolve = playbackResolve;
  playbackResolve = null;
  if (resolvePending) resolve?.(snapshot());
}

async function ensureAudioContext(): Promise<boolean> {
  if (forcedAudioFallback) {
    state.audioState = 'unavailable';
    return false;
  }
  try {
    const AudioCtor = window.AudioContext
      || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) {
      state.audioState = 'unavailable';
      return false;
    }
    if (!audioContext || audioContext.state === 'closed') {
      audioContext = new AudioCtor();
      masterGain = audioContext.createGain();
      masterGain.connect(audioContext.destination);
    }
    if (audioContext.state === 'suspended') await audioContext.resume();
    applyMasterLevel();
    state.audioState = state.muted ? 'muted' : 'ready';
    return audioContext.state === 'running';
  } catch {
    state.audioState = 'unavailable';
    return false;
  }
}

function scheduleTones(tokens: readonly ToneToken[]): void {
  if (!audioContext || !masterGain) return;
  const origin = audioContext.currentTime + 0.025;
  tokens.forEach((token) => {
    const oscillator = audioContext!.createOscillator();
    const envelope = audioContext!.createGain();
    const start = origin + token.startMs / 1000;
    const end = start + token.durationMs / 1000;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(660, start);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(0.26, start + 0.008);
    envelope.gain.setValueAtTime(0.26, Math.max(start + 0.009, end - 0.016));
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(envelope).connect(masterGain!);
    oscillator.addEventListener('ended', () => {
      activeOscillators.delete(oscillator);
      oscillator.disconnect();
      envelope.disconnect();
    }, { once: true });
    activeOscillators.add(oscillator);
    oscillator.start(start);
    oscillator.stop(end + 0.025);
    state.scheduledToneCount += 1;
  });
}

function stopActiveOscillators(): void {
  activeOscillators.forEach((oscillator) => {
    try { oscillator.stop(); } catch { /* already stopped */ }
    oscillator.disconnect();
  });
  activeOscillators.clear();
}

function toggleMuted(): void {
  state.muted = !state.muted;
  applyMasterLevel();
  if (state.audioState !== 'unavailable') {
    state.audioState = state.muted ? 'muted' : state.playingScope !== null ? 'playing' : audioContext ? 'ready' : 'locked';
  }
  announce(state.muted ? '已静音；视觉时序仍会继续。' : '已取消静音。');
  render();
}

function applyMasterLevel(): void {
  if (!audioContext || !masterGain) return;
  masterGain.gain.cancelScheduledValues(audioContext.currentTime);
  masterGain.gain.setTargetAtTime(state.muted ? 0 : state.volume, audioContext.currentTime, 0.015);
}

function submitAnswer(): CallsignSnapshot {
  if (!state.revealed.every(Boolean)) {
    state.phase = 'decoding';
    state.checkStatus = 'idle';
    answerFeedback.textContent = '请先试听完四段。声音不可用时，视觉时值仍会完整播放。';
    announce(answerFeedback.textContent);
    render();
    return snapshot();
  }
  const value = normalizeAnswer(decodeInput.value);
  decodeInput.value = value;
  state.phase = 'checked';
  if (value !== ANSWER) {
    state.checkStatus = 'incorrect';
    decodeInput.setAttribute('aria-invalid', 'true');
    answerFeedback.textContent = '还差一点。答案没有被提前展开；请重听最不确定的一段再提交。';
    announce(answerFeedback.textContent);
    render();
    return snapshot();
  }

  state.checkStatus = 'correct';
  decodeInput.removeAttribute('aria-invalid');
  answerFeedback.textContent = '解码正确。四段点划现在收束为同一张练习卡。';
  decodedCallsign.textContent = ANSWER;
  completionMarks.forEach((node, index) => { node.textContent = LETTERS[index].pattern.join(' '); });
  announce(answerFeedback.textContent);
  render();
  saveButton.focus({ preventScroll: true });
  return snapshot();
}

function saveCard(): CallsignSnapshot {
  if (state.checkStatus !== 'correct') {
    answerFeedback.textContent = '正确解码后才能保存练习卡。';
    announce(answerFeedback.textContent);
    render();
    return snapshot();
  }
  state.phase = 'saved';
  state.saved = true;
  let persisted = false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, exerciseId: EXERCISE_ID, savedAt: new Date().toISOString() }));
    persisted = true;
  } catch {
    persisted = false;
  }
  saveStatus.textContent = persisted
    ? '已保存到本机。刷新页面后仍可恢复这张练习卡。'
    : '当前会话已保存，但浏览器未允许写入本机。';
  announce(saveStatus.textContent);
  render();
  return snapshot();
}

function restoreSavedCard(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const record = JSON.parse(raw) as { version?: unknown; exerciseId?: unknown };
    if (record.version !== 1 || record.exerciseId !== EXERCISE_ID) return;
    state.phase = 'saved';
    state.revealed = LETTERS.map(() => true);
    state.checkStatus = 'correct';
    state.saved = true;
    state.restored = true;
    decodedCallsign.textContent = ANSWER;
    completionMarks.forEach((node, index) => { node.textContent = LETTERS[index].pattern.join(' '); });
    saveStatus.textContent = '已恢复上次保存在本机的练习卡。';
  } catch {
    // Corrupt or unavailable storage never blocks the current exercise.
  }
}

function resetPractice(): CallsignSnapshot {
  cancelPlayback(true);
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* current session remains usable */ }
  state.phase = 'waiting';
  state.playingScope = null;
  state.currentLetter = -1;
  state.currentElement = -1;
  state.revealed = LETTERS.map(() => false);
  state.checkStatus = 'idle';
  state.saved = false;
  state.restored = false;
  state.elapsedMs = 0;
  decodeInput.value = '';
  decodeInput.removeAttribute('aria-invalid');
  answerFeedback.textContent = '';
  saveStatus.textContent = '';
  decodedCallsign.textContent = '— — — —';
  completionMarks.forEach((node) => { node.textContent = '—'; });
  state.audioState = forcedAudioFallback ? 'unavailable' : state.muted ? 'muted' : audioContext ? 'ready' : 'locked';
  announce('练习已重置。');
  render();
  playAllButton.focus({ preventScroll: true });
  return snapshot();
}

function setAnswer(value: string): CallsignSnapshot {
  decodeInput.value = normalizeAnswer(value);
  decodeInput.dispatchEvent(new Event('input', { bubbles: true }));
  return snapshot();
}

function render(): void {
  const revealedCount = state.revealed.filter(Boolean).length;
  html.dataset.callsignReady = String(state.ready);
  html.dataset.callsignPhase = state.phase;
  html.dataset.callsignAudio = state.audioState;
  html.dataset.callsignSaved = String(state.saved);
  html.dataset.audioFallback = String(state.audioState === 'unavailable');
  html.dataset.callsignRevision = revision;
  html.dataset.callsignCheck = state.checkStatus;
  html.dataset.callsignRevealed = String(revealedCount);
  html.dataset.reducedMotion = String(reducedMotion);
  body.dataset.phase = state.phase;
  body.dataset.audioState = state.audioState;
  body.dataset.activeSegment = String(state.currentLetter);
  body.dataset.answerState = state.checkStatus;
  body.dataset.saved = String(state.saved);

  segments.forEach((segment, index) => {
    const segmentState = state.currentLetter === index
      ? 'sounding'
      : state.revealed[index]
        ? state.checkStatus === 'correct' ? 'checked' : 'revealed'
        : 'waiting';
    segment.dataset.state = segmentState;
    segment.setAttribute('data-segment-state', segmentState);
    decodedLetters[index].textContent = state.revealed[index] ? LETTERS[index].letter : '';
    decodedLetters[index].setAttribute('aria-hidden', String(!state.revealed[index]));
    segmentActions[index].textContent = segmentState === 'sounding'
      ? '正在发声'
      : state.revealed[index]
        ? '已完成'
        : '点击试听';
  });

  const playing = state.playingScope !== null;
  playAllButton.setAttribute('aria-pressed', String(state.playingScope === 'all'));
  playAllLabel.textContent = state.playingScope === 'all' ? '停止十秒电文' : '试听十秒电文';
  stopButton.disabled = !playing;
  muteButton.setAttribute('aria-pressed', String(state.muted));
  muteButton.textContent = state.muted ? '取消静音' : '静音';
  submitButton.disabled = revealedCount < LETTERS.length;
  saveButton.disabled = state.checkStatus !== 'correct';
  progressLabel.textContent = `${formatTime(state.elapsedMs)} / 00:10`;
  audioStatus.setAttribute('data-audio-state', state.audioState);
  audioStatus.setAttribute('data-signal-audio-feedback', '');
  audioStatus.setAttribute('aria-label', audioStatusMessage());
  audioStatusNormal.textContent = audioStatusMessage();
}

function audioStatusMessage(): string {
  if (state.audioState === 'unavailable') return '合成音暂不可用；视觉点划仍按同一时值播放，练习可以继续。';
  if (state.audioState === 'playing') return `正在播放合成音，音量 ${Math.round(state.volume * 100)}%。`;
  if (state.audioState === 'muted') return '当前已静音；视觉点划仍按同一时值播放。';
  if (state.audioState === 'ready') return `合成音已就绪，音量 ${Math.round(state.volume * 100)}%。`;
  return '声音只会在你主动播放后开始。';
}

function snapshot(): CallsignSnapshot {
  return {
    ready: state.ready,
    phase: state.phase,
    audioState: state.audioState,
    audioContextState: forcedAudioFallback ? 'unavailable' : audioContext?.state ?? 'not-created',
    audioFallback: state.audioState === 'unavailable',
    playingScope: state.playingScope,
    currentLetter: state.currentLetter,
    currentElement: state.currentElement,
    revealed: [...state.revealed],
    revealedCount: state.revealed.filter(Boolean).length,
    checkStatus: state.checkStatus,
    saved: state.saved,
    restored: state.restored,
    muted: state.muted,
    volume: state.volume,
    reducedMotion,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    canonicalSequenceId: EXERCISE_ID,
    expectedDurationMs: EXPECTED_DURATION_MS,
    scheduledToneCount: state.scheduledToneCount,
    completedPlaybackCount: state.completedPlaybackCount,
    revision
  };
}

function announce(message: string): void {
  liveStatus.textContent = '';
  requestAnimationFrame(() => { liveStatus.textContent = message; });
}

function normalizeAnswer(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, LETTERS.length);
}

function formatTime(milliseconds: number): string {
  const seconds = Math.min(10, Math.max(0, Math.floor(milliseconds / 1000)));
  return `00:${String(seconds).padStart(2, '0')}`;
}

function disposeAudio(): void {
  cancelPlayback(true);
  masterGain?.disconnect();
  masterGain = null;
  if (audioContext && audioContext.state !== 'closed') void audioContext.close();
  audioContext = null;
}

function must<T extends Element>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`R139 delivery missing required element: ${selector}`);
  return node;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export {};
