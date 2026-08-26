export type Vec3 = readonly [number, number, number];
export type WorldPreset = 'signal-field' | 'archive-grid' | 'flow-map';
export type ChapterLayout = 'left' | 'right' | 'center';
export type TransitionKind = 'glide' | 'cut';
export type OverlayKind = 'metric' | 'quote' | 'diagram';

export interface ThemeTokens {
  deep: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
}

export interface ShotConfig {
  eye: Vec3;
  look: Vec3;
  fov: number;
  portrait?: {
    eye: Vec3;
    look: Vec3;
    fov: number;
  };
  transition?: TransitionKind;
}

export interface SceneStateConfig {
  assembly: number;
  energy: number;
  density: number;
  fog: number;
  accent: string;
  focus?: string;
}

export interface ChapterConfig {
  id: string;
  navLabel: string;
  kicker: string;
  title: string;
  paragraphs: readonly string[];
  layout: ChapterLayout;
  scrollSpanVh: number;
  shot: ShotConfig;
  sceneState: SceneStateConfig;
  overlay?: {
    kind: OverlayKind;
    value?: string;
    caption: string;
  };
}

export interface StoryConfig {
  version: 1;
  id: string;
  title: string;
  summary: string;
  audience: string;
  theme: ThemeTokens;
  world: {
    preset: WorldPreset;
    seed: number;
  };
  chapters: readonly ChapterConfig[];
}

const colorPattern = /^#[0-9a-f]{6}$/i;

function assertFiniteVec(value: Vec3, label: string): void {
  if (value.length !== 3 || value.some((item) => !Number.isFinite(item))) {
    throw new Error(`${label} 必须是三个有限数值。`);
  }
}

export function assertStoryConfig(story: StoryConfig): StoryConfig {
  if (story.version !== 1) throw new Error(`${story.id}: 不支持的配置版本。`);
  if (!/^[a-z0-9-]+$/.test(story.id)) throw new Error(`${story.id}: story id 非法。`);
  if (story.chapters.length < 2) throw new Error(`${story.id}: 至少需要两个章节。`);

  const ids = new Set<string>();
  for (const chapter of story.chapters) {
    if (!chapter.id || ids.has(chapter.id)) throw new Error(`${story.id}: 章节 id 必须唯一。`);
    ids.add(chapter.id);
    if (!Number.isFinite(chapter.scrollSpanVh) || chapter.scrollSpanVh < 70 || chapter.scrollSpanVh > 240) {
      throw new Error(`${chapter.id}: scrollSpanVh 必须位于 70–240。`);
    }
    if (chapter.paragraphs.length === 0) throw new Error(`${chapter.id}: 正文不能为空。`);
    assertFiniteVec(chapter.shot.eye, `${chapter.id}.shot.eye`);
    assertFiniteVec(chapter.shot.look, `${chapter.id}.shot.look`);
    if (chapter.shot.fov < 24 || chapter.shot.fov > 76) throw new Error(`${chapter.id}: FOV 超出 24–76。`);
    if (chapter.shot.portrait) {
      assertFiniteVec(chapter.shot.portrait.eye, `${chapter.id}.shot.portrait.eye`);
      assertFiniteVec(chapter.shot.portrait.look, `${chapter.id}.shot.portrait.look`);
      if (chapter.shot.portrait.fov < 24 || chapter.shot.portrait.fov > 76) {
        throw new Error(`${chapter.id}: portrait FOV 超出 24–76。`);
      }
    }
    for (const key of ['assembly', 'energy', 'density', 'fog'] as const) {
      const value = chapter.sceneState[key];
      if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`${chapter.id}.${key}: 必须位于 0–1。`);
    }
    if (!colorPattern.test(chapter.sceneState.accent)) throw new Error(`${chapter.id}: accent 必须是六位十六进制颜色。`);
  }

  for (const [name, value] of Object.entries(story.theme)) {
    if (!colorPattern.test(value)) throw new Error(`${story.id}.theme.${name}: 颜色格式非法。`);
  }
  return story;
}
