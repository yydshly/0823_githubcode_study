import type { DirectedState } from './director';

const SOURCE = '/creative-assets/r64-collapsible-lantern-four-state-v1.png';

export class LanternScene {
  private frames: HTMLElement[] = [];
  private glow: HTMLElement;
  private fallback: HTMLElement;
  private imageLoaded = false;
  private disposed = false;

  constructor(private host: HTMLElement, private canvas: HTMLCanvasElement) {
    this.canvas.classList.add('ambient-canvas');
    for (let index = 0; index < 4; index += 1) {
      const frame = document.createElement('div');
      frame.className = `product-frame frame-${index}`;
      frame.style.backgroundImage = `url(${SOURCE})`;
      this.host.appendChild(frame);
      this.frames.push(frame);
    }
    const probe = new Image();
    probe.src = SOURCE;
    probe.decoding = 'async';
    probe.addEventListener('load', () => { this.imageLoaded = true; this.host.classList.add('asset-ready'); }, { once: true });
    probe.addEventListener('error', () => this.host.classList.add('asset-failed'), { once: true });
    this.glow = document.createElement('div');
    this.glow.className = 'warm-field';
    this.host.appendChild(this.glow);
    this.fallback = document.createElement('div');
    this.fallback.className = 'lantern-fallback';
    this.fallback.innerHTML = '<span class="handle"></span><span class="shade"></span><span class="base"></span>';
    this.host.appendChild(this.fallback);
  }

  update(state: DirectedState): void {
    if (this.disposed) return;
    this.frames.forEach((frame, index) => {
      frame.style.opacity = String(state.weights[index]);
      frame.style.setProperty('--lift', `${state.lift[index]}px`);
    });
    this.glow.style.opacity = String(state.light);
    this.host.style.setProperty('--observe-x', `${state.observeX}px`);
    this.host.dataset.stage = String(state.stage);
    if (!this.imageLoaded) this.fallback.style.setProperty('--open', String(state.open));
  }

  resize(width: number, height: number, dpr: number): void {
    this.canvas.width = Math.max(1, Math.round(width * Math.min(dpr, 2)));
    this.canvas.height = Math.max(1, Math.round(height * Math.min(dpr, 2)));
  }

  dispose(): void {
    this.disposed = true;
    this.frames.forEach((frame) => frame.remove());
    this.glow.remove();
    this.fallback.remove();
    this.canvas.classList.remove('ambient-canvas');
    this.frames = [];
  }
}
