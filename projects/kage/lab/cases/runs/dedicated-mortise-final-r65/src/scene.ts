import type { JourneyState } from './director';

export interface SceneController {
  apply(state: JourneyState): void;
  resize(width: number, height: number, dpr: number): void;
  dispose(): void;
}

const stateAsset = '/creative-assets/r65-mortise-tenon-four-state-v2.png';

export function createScene(root: HTMLElement, canvas: HTMLCanvasElement, quality: string): SceneController {
  canvas.hidden = true;
  const media = document.createElement('div');
  media.className = 'environment';
  media.setAttribute('data-signal-visual-anchor', '');
  media.setAttribute('role', 'img');
  media.setAttribute('aria-label', '同一组旧木榫卯从分离、对齐、半插入到完全咬合的连续状态');

  const base = document.createElement('img');
  base.className = 'environment-base';
  base.src = '/creative-assets/r59-mortise-tenon-environment-v1.png';
  base.alt = '';
  base.decoding = 'async';
  base.fetchPriority = 'high';

  const sequence = document.createElement('div');
  sequence.className = 'state-sequence';
  for (let index = 0; index < 4; index += 1) {
    const frame = document.createElement('div');
    frame.className = `state-frame state-frame-${index}`;
    frame.style.backgroundImage = `url(${stateAsset})`;
    sequence.append(frame);
  }

  const shade = document.createElement('div');
  shade.className = 'light-shade';
  media.append(base, sequence, shade);
  root.prepend(media);
  base.addEventListener('error', () => media.classList.add('image-failed'), { once: true });
  root.dataset.quality = quality;

  return {
    apply(state) {
      root.style.setProperty('--p', state.progress.toFixed(4));
      root.style.setProperty('--align', state.alignment.toFixed(4));
      root.style.setProperty('--force', state.force.toFixed(4));
      root.style.setProperty('--inspect-x', `${state.inspectX.toFixed(2)}px`);
      const position = state.alignment * 3;
      for (let index = 0; index < 4; index += 1) {
        const weight = Math.max(0, 1 - Math.abs(position - index));
        root.style.setProperty(`--state-${index}`, weight.toFixed(4));
      }
      root.dataset.phase = String(state.phase);
      root.querySelectorAll<HTMLElement>('[data-stop]').forEach((element) => {
        element.classList.toggle('active', Number(element.dataset.stop) <= state.progress + 0.06);
      });
    },
    resize(width, height, dpr) {
      root.style.setProperty('--vh', `${height}px`);
      root.style.setProperty('--dpr', String(dpr));
      root.classList.toggle('is-portrait', height > width);
    },
    dispose() {
      media.remove();
      canvas.hidden = false;
    }
  };
}
