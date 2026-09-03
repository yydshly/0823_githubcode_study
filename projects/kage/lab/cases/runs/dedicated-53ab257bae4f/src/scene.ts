import type { FermentationState } from './director';

export class FermentationScene {
  private frames: HTMLElement[];
  private root: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
    this.frames = Array.from(root.querySelectorAll<HTMLElement>('.jar-frame'));
  }

  render(state: FermentationState): void {
    const p = state.maturity;
    const clamp = (value: number) => Math.max(0, Math.min(1, value));
    const early = clamp((.38 - p) / .16);
    const mature = clamp((p - .54) / .16);
    const weights = [early, clamp(1 - early - mature), mature];
    const total = weights.reduce((sum, value) => sum + value, 0) || 1;
    const activeIndex = state.phase === 'early' ? 0 : state.phase === 'active' ? 1 : 2;
    this.frames.forEach((frame, index) => {
      frame.style.opacity = String(weights[index] / total);
      frame.setAttribute('aria-hidden', index === activeIndex ? 'false' : 'true');
    });
    this.root.dataset.phase = state.phase;
    this.root.style.setProperty('--maturity', state.maturity.toFixed(3));
    this.root.style.setProperty('--warmth', state.warmth.toFixed(3));
    const workspace = this.root.closest<HTMLElement>('.fermentation-workspace');
    workspace?.style.setProperty('--maturity', state.maturity.toFixed(3));
    workspace?.style.setProperty('--warmth', state.warmth.toFixed(3));
  }

  dispose(): void {
    this.frames.forEach((frame) => frame.removeAttribute('style'));
    this.frames = [];
  }
}
