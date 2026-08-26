import type { StoryConfig, ThemeTokens } from '../config/schema';

interface StoryDom {
  sections: HTMLElement[];
  navLinks: HTMLAnchorElement[];
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

export function renderStory(story: StoryConfig): StoryDom {
  const main = document.querySelector<HTMLElement>('#story');
  const nav = document.querySelector<HTMLElement>('#chapter-nav');
  if (!main || !nav) throw new Error('Story DOM mount points are missing.');
  main.replaceChildren();
  nav.replaceChildren();
  applyTheme(story.theme);
  document.title = `${story.title} — Signal Story Lab`;

  const intro = element('div', 'story-intro');
  intro.append(element('p', 'story-audience', story.audience), element('h1', 'story-title', story.title), element('p', 'story-summary', story.summary));
  main.append(intro);

  const sections: HTMLElement[] = [];
  const navLinks: HTMLAnchorElement[] = [];
  story.chapters.forEach((chapter, index) => {
    const link = element('a', 'chapter-nav-link', chapter.navLabel);
    link.href = `#${chapter.id}`;
    link.dataset.chapterIndex = String(index);
    nav.append(link);
    navLinks.push(link);

    const section = element('section', `chapter chapter-${chapter.layout}`);
    section.id = chapter.id;
    section.dataset.chapterIndex = String(index);
    section.style.setProperty('--chapter-span', `${chapter.scrollSpanVh}vh`);

    const card = element('article', 'chapter-card');
    const marker = element('div', 'chapter-marker');
    marker.append(element('span', 'chapter-dot'), element('span', 'chapter-index', String(index + 1).padStart(2, '0')));
    const kicker = element('p', 'chapter-kicker', chapter.kicker);
    const title = element('h2', 'chapter-title', chapter.title);
    const copy = element('div', 'chapter-copy');
    chapter.paragraphs.forEach((paragraph) => copy.append(element('p', '', paragraph)));
    card.append(marker, kicker, title, copy);

    if (chapter.overlay) {
      const overlay = element('aside', `chapter-overlay overlay-${chapter.overlay.kind}`);
      if (chapter.overlay.value) overlay.append(element('strong', 'overlay-value', chapter.overlay.value));
      overlay.append(element('span', 'overlay-caption', chapter.overlay.caption));
      card.append(overlay);
    }

    section.append(card);
    main.append(section);
    sections.push(section);
  });

  const footer = element('footer', 'story-footer');
  footer.append(element('p', 'story-footer-label', 'SIGNAL STORY LAB / CLEAN-ROOM RESEARCH PROTOTYPE'), element('p', '', '内容、场景和运行时均为本项目原创实现；上游 Kage 仅作为本地研究对象。'));
  main.append(footer);
  return { sections, navLinks };
}

export function updateActiveChapter(sections: readonly HTMLElement[], navLinks: readonly HTMLAnchorElement[], active: number): void {
  sections.forEach((section, index) => section.classList.toggle('is-active', index === active));
  navLinks.forEach((link, index) => {
    if (index === active) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });
  document.body.dataset.chapter = String(active);
}
