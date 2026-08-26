import type { StoryConfig } from '../config/schema';
import { stories } from '../config/stories';
import type { QualityPreference } from '../runtime/quality';

export type MotionPreference = 'system' | 'full' | 'reduce';
export type RendererPreference = 'webgl' | 'none';

export interface LabPreferences {
  story: StoryConfig;
  quality: QualityPreference;
  motion: MotionPreference;
  renderer: RendererPreference;
  debug: boolean;
}

function selectControl(labelText: string, name: string, options: readonly [string, string][], selected: string): HTMLLabelElement {
  const label = document.createElement('label');
  label.className = 'control-field';
  const caption = document.createElement('span');
  caption.textContent = labelText;
  const select = document.createElement('select');
  select.name = name;
  select.setAttribute('aria-label', labelText);
  options.forEach(([value, text]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    option.selected = value === selected;
    select.append(option);
  });
  label.append(caption, select);
  return label;
}

export function renderControls(preferences: LabPreferences): void {
  const mount = document.querySelector<HTMLElement>('#lab-controls');
  const toggle = document.querySelector<HTMLButtonElement>('#controls-toggle');
  if (!mount || !toggle) throw new Error('Lab controls mount points are missing.');
  mount.replaceChildren();

  const heading = document.createElement('div');
  heading.className = 'controls-heading';
  const eyebrow = document.createElement('span');
  eyebrow.textContent = 'DIRECTOR / STATE';
  const title = document.createElement('strong');
  title.textContent = '同一运行时，不同叙事配置';
  heading.append(eyebrow, title);

  const story = selectControl('故事', 'story', stories.map((item) => [item.id, item.title] as [string, string]), preferences.story.id);
  const quality = selectControl('画质', 'quality', [['auto', '自动'], ['high', '高'], ['balanced', '平衡'], ['low', '低']], preferences.quality);
  const motion = selectControl('动效', 'motion', [['system', '跟随系统'], ['full', '完整'], ['reduce', '减弱']], preferences.motion);
  const renderer = selectControl('渲染', 'renderer', [['webgl', 'WebGL'], ['none', '语义回退']], preferences.renderer);
  const note = document.createElement('p');
  note.className = 'controls-note';
  note.textContent = '切换参数会重载确定性状态，方便截图和回归。';
  mount.append(heading, story, quality, motion, renderer, note);

  mount.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    const url = new URL(location.href);
    url.searchParams.set(target.name, target.value);
    location.assign(url);
  });

  toggle.addEventListener('click', () => {
    const open = !mount.classList.contains('is-open');
    mount.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });
}
