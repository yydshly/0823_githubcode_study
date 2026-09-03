import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  defineExperience,
  selectGeneratedLifecycle,
  startExperience,
  type GeneratedExperience,
  type GeneratedMountedLifecycle,
} from '../src/generated-sdk/index.ts';

function installSuccessfulRuntimeHarness() {
  const removed = vi.fn();
  const appended: Array<{ className?: string }> = [];
  const container = {
    prepend: vi.fn(),
    append: (node: { className?: string }) => appended.push(node),
    querySelector: () => ({ remove: removed }),
  };
  const body = { dataset: {} as Record<string, string> };
  const documentElement = {
    scrollHeight: 1800,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  const handlers = new Map<string, EventListenerOrEventListenerObject>();
  const animationFrames = new Map<number, FrameRequestCallback>();
  let nextFrameId = 0;

  vi.stubGlobal('document', {
    body,
    documentElement,
    querySelector: () => container,
    createElement: () => ({ className: '', innerHTML: '', setAttribute: vi.fn() }),
  });
  vi.stubGlobal('location', { search: '' });
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  vi.stubGlobal('innerWidth', 1440);
  vi.stubGlobal('innerHeight', 900);
  vi.stubGlobal('devicePixelRatio', 1);
  vi.stubGlobal('scrollY', 0);
  vi.stubGlobal('addEventListener', vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
    handlers.set(type, listener);
  }));
  vi.stubGlobal('removeEventListener', vi.fn((type: string) => {
    handlers.delete(type);
  }));
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    nextFrameId += 1;
    animationFrames.set(nextFrameId, callback);
    return nextFrameId;
  }));
  const cancelAnimationFrame = vi.fn((id: number) => animationFrames.delete(id));
  vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame);

  return { appended, body, handlers, animationFrames, cancelAnimationFrame };
}

function dispatchStoredHandler(handler: EventListenerOrEventListenerObject | undefined): void {
  if (!handler) throw new Error('Expected a stored event handler.');
  const event = { type: 'pagehide' } as Event;
  if (typeof handler === 'function') handler(event);
  else handler.handleEvent(event);
}

describe('generated experience mount failure', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('turns a synchronous WebGL mount error into an explicit fallback state', async () => {
    const removed = vi.fn();
    const prepended: unknown[] = [];
    const appended: Array<{ className?: string }> = [];
    const container = {
      prepend: (node: unknown) => prepended.push(node),
      append: (node: { className?: string }) => appended.push(node),
      querySelector: () => ({ remove: removed })
    };
    const body = { dataset: {} as Record<string, string> };
    const documentElement = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
    vi.stubGlobal('document', {
      body,
      documentElement,
      querySelector: () => container,
      createElement: () => ({ className: '', innerHTML: '', setAttribute: vi.fn() })
    });
    vi.stubGlobal('location', { search: '' });
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    vi.stubGlobal('innerWidth', 1440);
    vi.stubGlobal('innerHeight', 900);
    vi.stubGlobal('devicePixelRatio', 1);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    startExperience(defineExperience({
      mount() { throw new Error('WebGL unavailable'); },
      update() {},
      resize() {},
      dispose() {}
    }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(prepended).toHaveLength(1);
    expect(body.dataset.generatedReady).toBe('error');
    expect(removed).toHaveBeenCalled();
    expect(appended).toContainEqual(expect.objectContaining({ className: 'generated-runtime-error' }));
    consoleError.mockRestore();
  });
});

describe('generated experience returned lifecycle', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('selects a complete mounted lifecycle as one group and disposes it once', async () => {
    const harness = installSuccessfulRuntimeHarness();
    const mounted: GeneratedMountedLifecycle = {
      update: vi.fn(),
      resize: vi.fn(),
      dispose: vi.fn(),
    };
    const topLevel = {
      update: vi.fn(),
      resize: vi.fn(),
      dispose: vi.fn(),
    };

    startExperience(defineExperience({
      mount: () => mounted,
      ...topLevel,
    }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(harness.body.dataset.generatedReady).toBe('true');
    expect(mounted.resize).toHaveBeenCalledTimes(1);
    expect(topLevel.resize).not.toHaveBeenCalled();
    const firstFrame = harness.animationFrames.values().next().value as FrameRequestCallback | undefined;
    expect(firstFrame).toBeTypeOf('function');
    firstFrame?.(performance.now() + 16);
    expect(mounted.update).toHaveBeenCalledTimes(1);
    expect(topLevel.update).not.toHaveBeenCalled();

    const pagehide = harness.handlers.get('pagehide');
    dispatchStoredHandler(pagehide);
    dispatchStoredHandler(pagehide);
    expect(mounted.dispose).toHaveBeenCalledTimes(1);
    expect(topLevel.dispose).not.toHaveBeenCalled();
    expect(harness.cancelAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it('falls back to the top-level lifecycle when mount returns void', async () => {
    const harness = installSuccessfulRuntimeHarness();
    const topLevel = {
      update: vi.fn(),
      resize: vi.fn(),
      dispose: vi.fn(),
    };

    startExperience(defineExperience({
      mount: () => undefined,
      ...topLevel,
    }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(topLevel.resize).toHaveBeenCalledTimes(1);
    const firstFrame = harness.animationFrames.values().next().value as FrameRequestCallback | undefined;
    firstFrame?.(performance.now() + 16);
    expect(topLevel.update).toHaveBeenCalledTimes(1);
    const pagehide = harness.handlers.get('pagehide');
    dispatchStoredHandler(pagehide);
    dispatchStoredHandler(pagehide);
    expect(topLevel.dispose).toHaveBeenCalledTimes(1);
  });

  it('rejects a partial mounted lifecycle before listeners or animation start', async () => {
    const harness = installSuccessfulRuntimeHarness();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const experience = {
      mount: () => ({ update: vi.fn() }),
      update: vi.fn(),
      resize: vi.fn(),
      dispose: vi.fn(),
    } as unknown as GeneratedExperience;

    startExperience(experience);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(harness.body.dataset.generatedReady).toBe('error');
    expect(harness.appended).toContainEqual(expect.objectContaining({ className: 'generated-runtime-error' }));
    expect(harness.animationFrames.size).toBe(0);
    expect(harness.handlers.has('pagehide')).toBe(false);
    expect(experience.resize).not.toHaveBeenCalled();
    expect(experience.update).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('rejects partial lifecycle objects in the selector', () => {
    const experience = defineExperience({
      mount() {},
      update() {},
      resize() {},
      dispose() {},
    });
    expect(() => selectGeneratedLifecycle(
      experience,
      { update() {} } as unknown as GeneratedMountedLifecycle,
    )).toThrow('complete update/resize/dispose lifecycle');
  });
});
