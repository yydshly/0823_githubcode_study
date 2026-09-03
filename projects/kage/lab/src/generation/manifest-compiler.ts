import type { CreativeBrief, CreativeDirection, BriefInterpretation } from './schema.ts';
import type { CameraShot, ExperienceFlow, ExperienceManifest, ExperienceNode, SceneStateValue, TrackKeyframe } from '../experience/schema.ts';
import { assertExperienceManifest } from '../experience/validator.ts';
import { stableHash } from './stable-hash.ts';
import type { EffectSpec } from './effect-spec.ts';
import { compileComposedSceneRecipe } from './composed-scene-recipe.ts';

interface NodeDraft {
  id: string;
  nav: string;
  kicker: string;
  title: string;
  paragraph: string;
  type: ExperienceNode['type'];
  layout: ExperienceNode['layout'];
  progress: number;
  overlayValue: string;
}

const journeyRoles = [
  ['establish', '建立', 'ESTABLISH', '先建立观看坐标', '把目标、受众与第一印象放到同一个可理解的开场。'],
  ['reveal', '展开', 'REVEAL', '让核心价值逐步显现', '通过镜头靠近、状态显现和内容证据推进理解。'],
  ['evidence', '证明', 'EVIDENCE', '把视觉变化连接到证据', '效果需要对应一个可以解释、比较或验证的认知变化。'],
  ['turn', '转折', 'TURN', '改变尺度或观看关系', '候选可以改变节奏和构图，而不是只在同一画面里换颜色。'],
  ['resolve', '收束', 'RESOLVE', '以稳定构图留下结论', '最终状态应该比中段更清晰、更有记忆点，并保留可行动的信息。']
] as const;

export function compileDirectionManifest(brief: CreativeBrief, interpretation: BriefInterpretation, direction: CreativeDirection, effectSpec: EffectSpec): ExperienceManifest {
  const id = `generated-${stableHash(`${brief.text}|${brief.seed ?? 0}|${direction.id}`)}-${direction.id}`;
  const drafts = direction.structure === 'focus'
    ? focusDrafts(interpretation.subject)
    : direction.structure === 'branching'
      ? branchingDrafts(interpretation.subject)
      : journeyDrafts(interpretation.subject, direction.nodeCount);
  const nodes: Record<string, ExperienceNode> = {};
  const cameraTracks: Record<string, ExperienceManifest['cameraTracks'][string]> = {};
  const sceneTracks: Record<string, ExperienceManifest['sceneTracks'][string]> = {};

  drafts.forEach((draft, index) => {
    const cameraId = `camera:${draft.id}`;
    const sceneId = `scene:${draft.id}`;
    const shot = shotFor(direction.scenePlugin, draft.progress, draft.layout);
    const state = stateFor(direction, draft.progress);
    nodes[draft.id] = {
      id: draft.id,
      type: draft.type,
      layout: draft.layout,
      content: {
        navLabel: draft.nav,
        kicker: `${String(index + 1).padStart(2, '0')} / ${draft.kicker}`,
        title: draft.title,
        paragraphs: [draft.paragraph, `当前方向：${direction.title}。${direction.thesis}`],
        overlay: { kind: draft.type === 'choice' ? 'diagram' : draft.type === 'cta' ? 'quote' : 'metric', value: draft.overlayValue, caption: direction.tags.join(' / ') }
      },
      span: { mode: 'viewport', value: direction.structure === 'focus' ? 230 : draft.layout === 'center' ? 122 : 138 },
      tracks: { camera: cameraId, scene: sceneId },
      sceneId: 'main',
      effectIds: direction.scenePlugin === 'signal-world' ? ['signal-field'] : []
    };
    cameraTracks[cameraId] = {
      id: cameraId,
      keyframes: direction.structure === 'focus' ? focusCameraFrames(direction.scenePlugin, shot) : [{ at: 0, value: shot }]
    };
    sceneTracks[sceneId] = {
      id: sceneId,
      keyframes: direction.structure === 'focus' ? focusSceneFrames(direction, state) : [{ at: 0, value: state }]
    };
  });

  const flows = direction.structure === 'branching' ? branchingFlows() : linearFlows(drafts);
  const effectPlugins = direction.scenePlugin === 'signal-world' ? ['signal-field'] : [];
  const recipe = direction.scenePlugin === 'composed-world' ? compileComposedSceneRecipe(effectSpec) : undefined;
  const preset = direction.scenePlugin === 'chromatic-tide' ? 'generated-silk' : direction.scenePlugin === 'composed-world' ? 'effect-spec-composed' : 'generated-signal';
  return assertExperienceManifest({
    schemaVersion: 2,
    id,
    title: `${interpretation.subject} · ${direction.title}`,
    summary: direction.thesis,
    audience: interpretation.audience,
    entryNodeId: drafts[0].id,
    theme: direction.theme,
    nodes,
    flows,
    drivers: [{ id: 'scroll', type: 'scroll', primary: true }],
    scenes: { main: { id: 'main', plugin: direction.scenePlugin, preset, seed: Number.parseInt(stableHash(id).slice(0, 6), 36), effectPlugins, ...(recipe ? { recipe } : {}) } },
    cameraTracks,
    sceneTracks,
    accessibility: { fallbackMode: 'semantic-dom', reducedMotion: 'static-shot' }
  });
}

function focusDrafts(subject: string): NodeDraft[] {
  return [{ id: 'hero', nav: '单镜', kicker: 'FOCUS', title: `让“${subject}”成为唯一记忆点`, paragraph: '一次连续滚动完成远观、靠近、显现和稳定停留，不用固定章节切分体验。', type: 'showcase', layout: 'center', progress: .5, overlayValue: 'ONE CONTINUOUS ARC' }];
}

function journeyDrafts(subject: string, count: number): NodeDraft[] {
  return journeyRoles.slice(0, count).map((role, index, roles) => ({
    id: role[0], nav: role[1], kicker: role[2], title: index === 0 ? `${role[3]}：${subject}` : role[3], paragraph: role[4],
    type: index === 0 ? 'hero' : index === roles.length - 1 ? 'cta' : 'story',
    layout: index === roles.length - 1 ? 'center' : index % 2 ? 'right' : 'left', progress: index / Math.max(1, roles.length - 1), overlayValue: `${index + 1}/${roles.length}`
  }));
}

function branchingDrafts(subject: string): NodeDraft[] {
  return [
    { id: 'threshold', nav: '入口', kicker: 'THRESHOLD', title: `从“${subject}”进入一个问题`, paragraph: '先建立共享背景，再把选择权交给访客。', type: 'hero', layout: 'left', progress: .08, overlayValue: 'ENTRY' },
    { id: 'choice', nav: '选择', kicker: 'CHOOSE', title: '先看证据，还是先感受价值？', paragraph: '两条流程边代表不同的信息组织方式，而不是隐藏同一套组件。', type: 'choice', layout: 'right', progress: .32, overlayValue: 'EVIDENCE / EMOTION' },
    { id: 'evidence-path', nav: '证据', kicker: 'EVIDENCE', title: '沿证据路径建立可信度', paragraph: '用结构、对比和可检查的说明推进理解。', type: 'story', layout: 'left', progress: .64, overlayValue: 'A' },
    { id: 'emotion-path', nav: '感受', kicker: 'EMOTION', title: '沿情绪路径形成记忆', paragraph: '用氛围、尺度与节奏建立感受，再回到核心价值。', type: 'story', layout: 'right', progress: .64, overlayValue: 'B' },
    { id: 'confluence', nav: '汇合', kicker: 'CONFLUENCE', title: '不同观看路径汇合到同一结论', paragraph: '最终节点共享明确结论，同时保留访客经历过的路径差异。', type: 'cta', layout: 'center', progress: 1, overlayValue: 'PATHS REJOIN' }
  ];
}

function linearFlows(drafts: readonly NodeDraft[]): ExperienceFlow[] {
  return drafts.slice(0, -1).map((draft, index) => ({ id: `flow:${draft.id}:${drafts[index + 1].id}`, from: draft.id, to: drafts[index + 1].id, trigger: { type: 'scroll-complete' }, transition: { type: 'glide', duration: 1 } }));
}

function branchingFlows(): ExperienceFlow[] {
  return [
    { id: 'flow:threshold:choice', from: 'threshold', to: 'choice', trigger: { type: 'scroll-complete' } },
    { id: 'flow:choice:evidence', from: 'choice', to: 'evidence-path', trigger: { type: 'choice', value: 'evidence', isDefault: true } },
    { id: 'flow:choice:emotion', from: 'choice', to: 'emotion-path', trigger: { type: 'choice', value: 'emotion' } },
    { id: 'flow:evidence:confluence', from: 'evidence-path', to: 'confluence', trigger: { type: 'scroll-complete' } },
    { id: 'flow:emotion:confluence', from: 'emotion-path', to: 'confluence', trigger: { type: 'scroll-complete' } }
  ];
}

function shotFor(plugin: CreativeDirection['scenePlugin'], progress: number, layout: ExperienceNode['layout']): CameraShot {
  const side = layout === 'right' ? 1 : layout === 'left' ? -1 : 0;
  const eye: CameraShot['eye'] = plugin === 'chromatic-tide'
    ? [side * (6.6 - progress * 2.1), 2.5 + progress * 4.3, 11.4 - progress * 2.2]
    : [side * (8.2 - progress * 2.8), 3.3 + progress * 5.1, 12.6 - progress * 2.4];
  const look: CameraShot['look'] = plugin === 'chromatic-tide' ? [.4, .7, -1.2] : [0, .8, 0];
  return { eye, look, fov: layout === 'center' ? 48 : 43, portrait: { eye: [eye[0] * .58, eye[1] + .9, eye[2] + 4.2], look, fov: 55 }, transition: 'glide' };
}

function stateFor(direction: CreativeDirection, progress: number): SceneStateValue {
  return { assembly: .12 + progress * .88, energy: .18 + progress * .78, density: .26 + progress * .7, fog: .68 - progress * .54, accent: progress < .58 ? direction.theme.accent : direction.theme.accentSoft, focus: `${direction.id}:${Math.round(progress * 100)}` };
}

function focusCameraFrames(plugin: CreativeDirection['scenePlugin'], base: CameraShot): TrackKeyframe<CameraShot>[] {
  const middleEye: CameraShot['eye'] = plugin === 'chromatic-tide' ? [-3.8, 4.8, 7.2] : [-4.5, 5.2, 7.6];
  const finalEye: CameraShot['eye'] = plugin === 'chromatic-tide' ? [0, 6.2, 10.2] : [0, 7.4, 12.2];
  return [{ at: 0, value: { ...base, eye: [0, 2.6, 15] } }, { at: .52, value: { ...base, eye: middleEye, fov: 44 }, easing: 'smoothstep' }, { at: 1, value: { ...base, eye: finalEye, fov: 48 }, easing: 'smootherstep' }];
}

function focusSceneFrames(direction: CreativeDirection, base: SceneStateValue): TrackKeyframe<SceneStateValue>[] {
  return [{ at: 0, value: { ...base, assembly: .08, energy: .12, density: .2, fog: .72 } }, { at: .5, value: { ...base, assembly: .58, energy: .68, density: .7, fog: .3 }, easing: 'smoothstep' }, { at: 1, value: { ...base, assembly: 1, energy: .94, density: 1, fog: .12, accent: direction.theme.accentSoft }, easing: 'smootherstep' }];
}
