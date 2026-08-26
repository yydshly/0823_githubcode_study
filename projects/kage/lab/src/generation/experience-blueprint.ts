import { z } from 'zod';
import type { CameraShot, ExperienceManifest, ExperienceNode, SceneStateValue } from '../experience/schema';
import { assertExperienceManifest } from '../experience/validator';
import { compileComposedSceneRecipe } from './composed-scene-recipe';
import type { EffectSpec } from './effect-spec';
import type { BriefInterpretation, CreativeBrief, CreativeDirection } from './schema';
import { stableHash } from './stable-hash';

const kebabId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const vec3 = z.array(z.number().finite().min(-40).max(40)).length(3);

const cameraPoseSchema = z.object({
  eye: vec3,
  look: vec3,
  fov: z.number().finite().min(24).max(76)
}).strict();

const scenePoseSchema = z.object({
  assembly: z.number().min(0).max(1),
  energy: z.number().min(0).max(1),
  density: z.number().min(0).max(1),
  fog: z.number().min(0).max(1),
  accent: hexColor,
  focus: z.string().min(1).max(48)
}).strict();

const chapterSchema = z.object({
  id: kebabId,
  navLabel: z.string().min(1).max(10),
  kicker: z.string().min(1).max(28),
  title: z.string().min(2).max(48),
  paragraphs: z.array(z.string().min(8).max(140)).min(1).max(2),
  type: z.enum(['hero', 'story', 'transition', 'showcase', 'comparison', 'interaction', 'cta', 'credits']),
  layout: z.enum(['left', 'right', 'center']),
  spanVh: z.number().int().min(90).max(260),
  overlay: z.object({
    kind: z.enum(['metric', 'quote', 'diagram']),
    value: z.string().min(1).max(30),
    caption: z.string().min(2).max(60)
  }).strict(),
  camera: z.object({ from: cameraPoseSchema, to: cameraPoseSchema }).strict(),
  scene: z.object({ from: scenePoseSchema, to: scenePoseSchema }).strict()
}).strict();

/** A model-authored page plan that stays data-only until it passes the local compiler. */
export const experienceBlueprintSchema = z.object({
  schemaVersion: z.literal(1),
  id: kebabId,
  effectSpecId: kebabId,
  title: z.string().min(2).max(48),
  summary: z.string().min(8).max(160),
  scenePlugin: z.enum(['signal-world', 'chromatic-tide', 'composed-world']),
  presentation: z.object({
    brandLabel: z.string().min(1).max(24),
    footerLabel: z.string().min(1).max(30),
    footerCopy: z.string().min(4).max(100)
  }).strict(),
  chapters: z.array(chapterSchema).min(2).max(7)
}).strict();

export type ExperienceBlueprint = z.infer<typeof experienceBlueprintSchema>;

export function assertExperienceBlueprints(
  values: readonly ExperienceBlueprint[],
  rawEffectSpecIds: readonly string[]
): void {
  if (values.length !== rawEffectSpecIds.length) throw new Error('ExperienceBlueprint 与 EffectSpec 数量不一致。');
  const blueprintIds = new Set<string>();
  values.forEach((value, index) => {
    if (blueprintIds.has(value.id)) throw new Error(`模型返回了重复的 ExperienceBlueprint id：${value.id}`);
    blueprintIds.add(value.id);
    if (value.effectSpecId !== rawEffectSpecIds[index]) {
      throw new Error(`ExperienceBlueprint ${value.id} 没有对应同位置的 EffectSpec ${rawEffectSpecIds[index]}。`);
    }
    const chapterIds = value.chapters.map((chapter) => chapter.id);
    if (new Set(chapterIds).size !== chapterIds.length) throw new Error(`ExperienceBlueprint ${value.id} 包含重复章节 id。`);
    const movingChapters = value.chapters.filter((chapter) => JSON.stringify(chapter.camera.from) !== JSON.stringify(chapter.camera.to));
    if (!movingChapters.length) throw new Error(`ExperienceBlueprint ${value.id} 没有可见的镜头变化。`);
  });
}

export function materializeExperienceBlueprint(
  value: ExperienceBlueprint,
  effectSpec: EffectSpec,
  brief: CreativeBrief
): ExperienceBlueprint {
  return experienceBlueprintSchema.parse({
    ...value,
    id: `blueprint-${stableHash(`${brief.text}|${brief.seed ?? 0}|${value.id}`)}-${value.id}`,
    effectSpecId: effectSpec.id
  });
}

export function compileBlueprintDirection(
  blueprint: ExperienceBlueprint,
  effectSpec: EffectSpec,
  index: number
): CreativeDirection {
  return {
    id: `runtime-${effectSpec.id}`,
    title: blueprint.title,
    thesis: blueprint.summary,
    structure: 'journey',
    scenePlugin: blueprint.scenePlugin,
    nodeCount: blueprint.chapters.length,
    pace: effectSpec.motion.pace,
    theme: effectSpec.direction.palette,
    tags: effectSpec.direction.visualGrammar.slice(0, 5),
    rationale: [
      ...effectSpec.reasoning.slice(0, 2),
      `候选 ${index + 1} 的 ${blueprint.chapters.length} 个章节、镜头与场景状态由模型蓝图直接编排。`
    ]
  };
}

export function compileBlueprintManifest(
  brief: CreativeBrief,
  interpretation: BriefInterpretation,
  direction: CreativeDirection,
  effectSpec: EffectSpec,
  blueprint: ExperienceBlueprint
): ExperienceManifest {
  const id = `generated-${stableHash(`${brief.text}|${brief.seed ?? 0}|${blueprint.id}`)}-${blueprint.id}`;
  const nodes: Record<string, ExperienceNode> = {};
  const cameraTracks: ExperienceManifest['cameraTracks'] extends Readonly<Record<string, infer T>> ? Record<string, T> : never = {};
  const sceneTracks: ExperienceManifest['sceneTracks'] extends Readonly<Record<string, infer T>> ? Record<string, T> : never = {};

  blueprint.chapters.forEach((chapter, index) => {
    const cameraId = `camera:${chapter.id}`;
    const sceneId = `scene:${chapter.id}`;
    nodes[chapter.id] = {
      id: chapter.id,
      type: chapter.type,
      layout: chapter.layout,
      content: {
        navLabel: chapter.navLabel,
        kicker: `${String(index + 1).padStart(2, '0')} / ${chapter.kicker}`,
        title: chapter.title,
        paragraphs: chapter.paragraphs,
        overlay: chapter.overlay
      },
      span: { mode: 'viewport', value: chapter.spanVh },
      tracks: { camera: cameraId, scene: sceneId },
      sceneId: 'main',
      effectIds: blueprint.scenePlugin === 'signal-world' ? ['signal-field'] : []
    };
    const vector = (value: number[]): [number, number, number] => [value[0], value[1], value[2]];
    const shot = (pose: z.infer<typeof cameraPoseSchema>): CameraShot => ({
      eye: vector(pose.eye), look: vector(pose.look), fov: pose.fov,
      portrait: { eye: [pose.eye[0] * .56, pose.eye[1] + .8, pose.eye[2] + 3.8], look: vector(pose.look), fov: Math.min(76, pose.fov + 8) },
      transition: 'glide'
    });
    const state = (pose: z.infer<typeof scenePoseSchema>): SceneStateValue => ({ ...pose });
    cameraTracks[cameraId] = { id: cameraId, keyframes: [{ at: 0, value: shot(chapter.camera.from) }, { at: 1, value: shot(chapter.camera.to), easing: 'smootherstep' }] };
    sceneTracks[sceneId] = { id: sceneId, keyframes: [{ at: 0, value: state(chapter.scene.from) }, { at: 1, value: state(chapter.scene.to), easing: 'smootherstep' }] };
  });

  const flows = blueprint.chapters.slice(0, -1).map((chapter, index) => ({
    id: `flow:${chapter.id}:${blueprint.chapters[index + 1].id}`,
    from: chapter.id,
    to: blueprint.chapters[index + 1].id,
    trigger: { type: 'scroll-complete' as const },
    transition: { type: 'glide' as const, duration: 1 }
  }));
  const recipe = blueprint.scenePlugin === 'composed-world' ? compileComposedSceneRecipe(effectSpec) : undefined;
  const preset = blueprint.scenePlugin === 'chromatic-tide' ? 'generated-silk' : blueprint.scenePlugin === 'composed-world' ? 'effect-spec-composed' : 'generated-signal';
  return assertExperienceManifest({
    schemaVersion: 2,
    id,
    title: blueprint.title,
    summary: blueprint.summary,
    audience: interpretation.audience,
    entryNodeId: blueprint.chapters[0].id,
    presentation: blueprint.presentation,
    theme: direction.theme,
    nodes,
    flows,
    drivers: [{ id: 'scroll', type: 'scroll', primary: true }],
    scenes: { main: { id: 'main', plugin: blueprint.scenePlugin, preset, seed: Number.parseInt(stableHash(id).slice(0, 6), 36), effectPlugins: blueprint.scenePlugin === 'signal-world' ? ['signal-field'] : [], ...(recipe ? { recipe } : {}) } },
    cameraTracks,
    sceneTracks,
    accessibility: { fallbackMode: 'semantic-dom', reducedMotion: 'static-shot' }
  });
}
