import { experiences } from '../experience/fixtures';
import type { ExperienceManifest } from '../experience/schema';
import type { QualityPreference } from '../runtime/quality';

export type MotionPreference = 'system' | 'full' | 'reduce';
export type RendererPreference = 'webgl' | 'none';

export interface LabPreferences {
  experience: ExperienceManifest;
  quality: QualityPreference;
  motion: MotionPreference;
  renderer: RendererPreference;
  debug: boolean;
}

function selectControl(labelText: string, name: string, options: readonly [string, string][], selected: string): HTMLLabelElement {
  const label = document.createElement('label'); label.className = 'control-field';
  const caption = document.createElement('span'); caption.textContent = labelText;
  const select = document.createElement('select'); select.name = name; select.setAttribute('aria-label', labelText);
  options.forEach(([value, text]) => { const option = document.createElement('option'); option.value = value; option.textContent = text; option.selected = value === selected; select.append(option); });
  label.append(caption, select); return label;
}

export function renderExperienceControls(preferences: LabPreferences): void {
  const mount = document.querySelector<HTMLElement>('#lab-controls');
  const toggle = document.querySelector<HTMLButtonElement>('#controls-toggle');
  if (!mount || !toggle) throw new Error('Lab controls mount points are missing.');
  mount.replaceChildren();
  const heading = document.createElement('div'); heading.className = 'controls-heading';
  const eyebrow = document.createElement('span'); eyebrow.textContent = 'EXPERIENCE / STATE';
  const title = document.createElement('strong'); title.textContent = '同一运行时，可变结构与视觉插件';
  heading.append(eyebrow, title);
  const experienceOptions: [string, string][] = experiences.map((item) => [item.id, item.title]);
  if (!experienceOptions.some(([id]) => id === preferences.experience.id)) experienceOptions.unshift([preferences.experience.id, `生成：${preferences.experience.title}`]);
  const experience = selectControl('体验', 'experience', experienceOptions, preferences.experience.id);
  const quality = selectControl('画质', 'quality', [['auto', '自动'], ['high', '高'], ['balanced', '平衡'], ['low', '低']], preferences.quality);
  const motion = selectControl('动效', 'motion', [['system', '跟随系统'], ['full', '完整'], ['reduce', '减弱']], preferences.motion);
  const renderer = selectControl('渲染', 'renderer', [['webgl', 'WebGL'], ['none', '语义回退']], preferences.renderer);
  const scenePlugin = Object.values(preferences.experience.scenes)[0]?.plugin ?? 'none';
  const workbench = document.createElement('a'); workbench.className = 'controls-workbench'; workbench.href = './workbench.html'; workbench.textContent = '用自然语言生成新体验 ↗';
  const note = document.createElement('p'); note.className = 'controls-note'; note.textContent = `场景能力：${scenePlugin}。体验、分支和运行参数都可由 URL 稳定重放。`;
  mount.append(heading, experience, quality, motion, renderer, workbench, note);
  mount.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    const url = new URL(location.href); url.searchParams.set(target.name, target.value);
    if (target.name === 'experience') { url.searchParams.delete('generated'); url.searchParams.delete('story'); url.searchParams.delete('node'); url.searchParams.delete('chapter'); }
    location.assign(url);
  });
  toggle.addEventListener('click', () => { const open = !mount.classList.contains('is-open'); mount.classList.toggle('is-open', open); toggle.setAttribute('aria-expanded', String(open)); });
}
