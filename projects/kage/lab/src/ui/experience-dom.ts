import type { FlowPlan } from '../experience/flow-plan';
import type { ExperienceManifest, ThemeTokens } from '../experience/schema';

export interface ExperienceDom {
  sections: ReadonlyMap<string, HTMLElement>;
  navLinks: ReadonlyMap<string, HTMLAnchorElement>;
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function applyTheme(theme: ThemeTokens): void {
  const root = document.documentElement;
  root.style.setProperty('--deep', theme.deep);
  root.style.setProperty('--surface', theme.surface);
  root.style.setProperty('--text', theme.text);
  root.style.setProperty('--muted', theme.muted);
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--accent-soft', theme.accentSoft);
}

function applyFallbackAsset(experience: ExperienceManifest): void {
  const root = document.documentElement;
  const hero = Object.values(experience.scenes)
    .flatMap((scene) => scene.assets ?? [])
    .find((asset) => asset.role === 'hero-color' && asset.modality === 'image');
  if (!hero) { root.style.removeProperty('--fallback-hero-image'); return; }
  root.style.setProperty('--fallback-hero-image', `url(${JSON.stringify(hero.uri)})`);
}

export function renderExperience(experience: ExperienceManifest, plan: FlowPlan): ExperienceDom {
  const main = document.querySelector<HTMLElement>('#story');
  const nav = document.querySelector<HTMLElement>('#chapter-nav');
  if (!main || !nav) throw new Error('Experience DOM mount points are missing.');
  main.replaceChildren(); nav.replaceChildren(); applyTheme(experience.theme); applyFallbackAsset(experience);
  document.title = `${experience.title} — Signal Experience Lab`;
  const brandLabel = document.querySelector<HTMLElement>('.brand span:last-child');
  if (brandLabel) brandLabel.textContent = experience.presentation?.brandLabel ?? 'SIGNAL / LAB';
  document.querySelector<HTMLAnchorElement>('.brand')?.setAttribute('aria-label', `${experience.title} 首页`);

  const intro = element('div', 'story-intro');
  intro.append(element('p', 'story-audience', experience.audience), element('h1', 'story-title', experience.title), element('p', 'story-summary', experience.summary));
  main.append(intro);

  const sections = new Map<string, HTMLElement>();
  const navLinks = new Map<string, HTMLAnchorElement>();
  plan.nodes.forEach((node, index) => {
    const link = element('a', 'chapter-nav-link', node.content.navLabel ?? String(index + 1));
    link.href = `#${node.id}`;
    link.dataset.nodeId = node.id;
    nav.append(link); navLinks.set(node.id, link);

    const section = element('section', `chapter chapter-${node.layout}`);
    section.id = node.id;
    section.dataset.nodeId = node.id;
    section.dataset.nodeType = node.type;
    const span = node.span.mode === 'viewport' ? `${node.span.value ?? 120}vh` : '120vh';
    section.style.setProperty('--chapter-span', span);
    const card = element('article', 'chapter-card');
    const marker = element('div', 'chapter-marker');
    marker.append(element('span', 'chapter-dot'), element('span', 'chapter-index', String(index + 1).padStart(2, '0')));
    card.append(marker);
    if (node.content.kicker) card.append(element('p', 'chapter-kicker', node.content.kicker));
    card.append(element('h2', 'chapter-title', node.content.title));
    const copy = element('div', 'chapter-copy');
    node.content.paragraphs.forEach((paragraph) => copy.append(element('p', '', paragraph)));
    card.append(copy);
    if (node.content.overlay) {
      const overlay = element('aside', `chapter-overlay overlay-${node.content.overlay.kind}`);
      if (node.content.overlay.value) overlay.append(element('strong', 'overlay-value', node.content.overlay.value));
      overlay.append(element('span', 'overlay-caption', node.content.overlay.caption));
      card.append(overlay);
    }
    section.append(card); main.append(section); sections.set(node.id, section);
  });

  const footer = element('footer', 'story-footer');
  footer.append(
    element('p', 'story-footer-label', experience.presentation?.footerLabel ?? 'SIGNAL EXPERIENCE LAB / VARIABLE EXPERIENCE GRAPH'),
    element('p', '', experience.presentation?.footerCopy ?? '内容、流程、轨道和场景插件均可独立扩展；上游 Kage 仅作为本地研究对象。')
  );
  main.append(footer);
  return { sections, navLinks };
}

export function updateActiveNode(dom: ExperienceDom, activeId: string): void {
  dom.sections.forEach((section, id) => section.classList.toggle('is-active', id === activeId));
  dom.navLinks.forEach((link, id) => id === activeId ? link.setAttribute('aria-current', 'true') : link.removeAttribute('aria-current'));
  document.body.dataset.node = activeId;
}
