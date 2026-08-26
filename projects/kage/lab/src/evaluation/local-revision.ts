import { z } from 'zod';
import { assertExperienceManifest, inspectExperience } from '../experience/validator.ts';
import type { ExperienceManifest } from '../experience/schema.ts';
import { assertAssetPlan } from '../generation/asset-plan.ts';
import { assertEffectSpec } from '../generation/effect-spec.ts';
import { assertProductionPlan } from '../generation/production-plan.ts';
import type { CreativeCandidate } from '../generation/schema.ts';
import { stableHash } from '../generation/stable-hash.ts';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const localRevisionProofSchema = z.object({
  layer: z.enum(['goal', 'semantic-content', 'assets', 'camera', 'scene-plugin']),
  beforeHash: z.string().min(1),
  afterHash: z.string().min(1),
  unchanged: z.literal(true)
}).strict().superRefine((value, context) => {
  if (value.beforeHash !== value.afterHash) context.addIssue({ code: 'custom', path: ['afterHash'], message: `声明保留的 ${value.layer} 实际发生变化。` });
});

export const localRevisionResultSchema = z.object({
  schemaVersion: z.literal(1),
  id: safeId,
  instruction: z.string().min(2).max(160),
  status: z.enum(['applied', 'unsupported', 'invalid']),
  intent: z.enum(['accent-color', 'page-title', 'slower-pace']).nullable(),
  sourceCandidateId: safeId,
  revisedCandidateId: safeId.nullable(),
  changedPaths: z.array(z.string().min(2)),
  preserved: z.array(z.string().min(4)).min(1),
  unchangedProof: z.array(localRevisionProofSchema),
  summary: z.string().min(4),
  nextAction: z.string().min(4)
}).strict().superRefine((value, context) => {
  if (value.status === 'applied' && (!value.intent || !value.revisedCandidateId || !value.changedPaths.length || value.unchangedProof.length < 3)) {
    context.addIssue({ code: 'custom', path: ['status'], message: 'applied 修订必须包含意图、新候选、变更路径和保留证明。' });
  }
  if (value.status !== 'applied' && (value.revisedCandidateId || value.changedPaths.length || value.unchangedProof.length)) {
    context.addIssue({ code: 'custom', path: ['changedPaths'], message: '未应用的修订不能声称产物发生变化。' });
  }
});

export type LocalRevisionResult = z.infer<typeof localRevisionResultSchema>;
export interface CompiledLocalRevision {
  result: LocalRevisionResult;
  candidate: CreativeCandidate | null;
}

type RevisionIntent =
  | { kind: 'accent-color'; color: string }
  | { kind: 'page-title'; title: string }
  | { kind: 'slower-pace' };

export function compileLocalRevision(instruction: string, candidate: CreativeCandidate): CompiledLocalRevision {
  const normalized = instruction.trim();
  const parsed = parseInstruction(normalized);
  if ('status' in parsed) return {
    candidate: null,
    result: localRevisionResultSchema.parse({
      schemaVersion: 1,
      id: `revision-result-${stableHash(`${candidate.id}|${normalized || 'empty'}|${parsed.status}`)}`,
      instruction: normalized || '空白指令',
      status: parsed.status,
      intent: null,
      sourceCandidateId: candidate.id,
      revisedCandidateId: null,
      changedPaths: [],
      preserved: ['原候选、预览和已收集证据均保持不变。'],
      unchangedProof: [],
      summary: parsed.reason,
      nextAction: '使用明确的单一局部指令：强调色、页面标题或更慢节奏。'
    })
  };

  const revisionHash = stableHash(`${candidate.id}|${normalized}`);
  const effectSpecId = `${candidate.effectSpec.id}-rev-${revisionHash}`;
  const manifestId = `${candidate.manifest.id}-rev-${revisionHash}`;
  const before = preservationFingerprint(candidate);
  const revised = applyIntent(candidate, parsed.intent, effectSpecId, manifestId);
  const after = preservationFingerprint(revised.candidate);
  const unchangedProof = preservedLayers(parsed.intent.kind).map((layer) => ({
    layer,
    beforeHash: before[layer],
    afterHash: after[layer],
    unchanged: true as const
  }));
  const result = localRevisionResultSchema.parse({
    schemaVersion: 1,
    id: `revision-result-${revisionHash}`,
    instruction: normalized,
    status: 'applied',
    intent: parsed.intent.kind,
    sourceCandidateId: candidate.id,
    revisedCandidateId: revised.candidate.id,
    changedPaths: revised.changedPaths,
    preserved: unchangedProof.map((proof) => `保留 ${proof.layer}，哈希 ${proof.beforeHash} 未变化。`),
    unchangedProof,
    summary: revised.summary,
    nextAction: '为新候选重新采集运行证据，再打开真实预览检查预期可见差异。'
  });
  return { result, candidate: revised.candidate };
}

function parseInstruction(instruction: string): { status: 'unsupported' | 'invalid'; reason: string; intent: RevisionIntent | null } | { intent: RevisionIntent } {
  if (instruction.length < 2 || instruction.length > 160) return { status: 'invalid', reason: '指令长度必须为 2–160 个字符。', intent: null };
  const colorMatches = [...instruction.matchAll(/#[0-9a-f]{6}/gi)].map((match) => match[0].toLowerCase());
  if (/(强调色|主色|accent)/i.test(instruction)) {
    if (colorMatches.length !== 1) return { status: 'invalid', reason: '强调色修订必须且只能包含一个六位十六进制颜色。', intent: null };
    return { intent: { kind: 'accent-color', color: colorMatches[0] } };
  }
  const title = instruction.match(/(?:页面)?标题(?:改为|改成|换成)\s*[「“\"]([^」”\"]{2,36})[」”\"]/i)?.[1]?.trim();
  if (/(?:页面)?标题(?:改为|改成|换成)/.test(instruction)) {
    if (!title) return { status: 'invalid', reason: '标题修订需要使用引号或书名号包裹 2–36 个字符的新标题。', intent: null };
    return { intent: { kind: 'page-title', title } };
  }
  if (/(节奏|滚动)/.test(instruction) && /(更慢|慢一些|克制|舒缓)/.test(instruction)) return { intent: { kind: 'slower-pace' } };
  return { status: 'unsupported', reason: '离线修订器没有猜测这条指令；当前只支持强调色、页面标题和更慢节奏。', intent: null };
}

function applyIntent(candidate: CreativeCandidate, intent: RevisionIntent, effectSpecId: string, manifestId: string): { candidate: CreativeCandidate; changedPaths: string[]; summary: string } {
  const baseEffectSpec = { ...candidate.effectSpec, id: effectSpecId };
  const baseManifest = reidentifyManifest(candidate.manifest, manifestId, effectSpecId);
  let effectSpec = baseEffectSpec;
  let direction = candidate.direction;
  let manifest = baseManifest;
  let changedPaths: string[];
  let summary: string;

  if (intent.kind === 'accent-color') {
    effectSpec = { ...baseEffectSpec, direction: { ...baseEffectSpec.direction, palette: { ...baseEffectSpec.direction.palette, accent: intent.color } } };
    direction = { ...direction, theme: { ...direction.theme, accent: intent.color } };
    const sceneTracks = Object.fromEntries(Object.entries(baseManifest.sceneTracks).map(([id, track]) => [id, {
      ...track,
      keyframes: track.keyframes.map((keyframe) => ({
        ...keyframe,
        value: keyframe.value.accent.toLowerCase() === candidate.manifest.theme.accent.toLowerCase()
          ? { ...keyframe.value, accent: intent.color }
          : keyframe.value
      }))
    }]));
    manifest = { ...baseManifest, theme: { ...baseManifest.theme, accent: intent.color }, sceneTracks };
    changedPaths = ['effectSpec.direction.palette.accent', 'direction.theme.accent', 'manifest.theme.accent', 'manifest.sceneTracks.*.keyframes.*.value.accent'];
    summary = `强调色已局部修改为 ${intent.color}；主体、内容、素材、镜头和场景插件保持不变。`;
  } else if (intent.kind === 'page-title') {
    effectSpec = { ...baseEffectSpec, title: intent.title };
    direction = { ...direction, title: intent.title };
    manifest = { ...baseManifest, title: intent.title };
    changedPaths = ['effectSpec.title', 'direction.title', 'manifest.title'];
    summary = `页面标题已局部修改为“${intent.title}”；章节内容、空间、素材、镜头和运动保持不变。`;
  } else {
    effectSpec = { ...baseEffectSpec, motion: { ...baseEffectSpec.motion, pace: 'calm' } };
    direction = { ...direction, pace: 'calm' };
    const nodes = Object.fromEntries(Object.entries(baseManifest.nodes).map(([id, node]) => [id, node.span.mode === 'viewport'
      ? { ...node, span: { ...node.span, value: Math.min(320, Math.round((node.span.value || 120) * 1.18)) } }
      : node]));
    const flows = baseManifest.flows.map((flow) => ({ ...flow, transition: flow.transition ? { ...flow.transition, duration: Math.min(4, (flow.transition.duration || 1) * 1.2) } : flow.transition }));
    manifest = { ...baseManifest, nodes, flows };
    changedPaths = ['effectSpec.motion.pace', 'direction.pace', 'manifest.nodes.*.span.value', 'manifest.flows.*.transition.duration'];
    summary = '滚动段落和流程过渡已局部放慢；内容、素材、镜头关键帧、配色和场景插件保持不变。';
  }

  const validEffectSpec = assertEffectSpec(effectSpec);
  const validManifest = assertExperienceManifest(manifest);
  const validAssetPlan = assertAssetPlan({ ...candidate.assetPlan, effectSpecId });
  const validProductionPlan = assertProductionPlan({ ...candidate.productionPlan, effectSpecId });
  const revisedCandidate: CreativeCandidate = {
    ...candidate,
    id: manifestId,
    direction,
    effectSpec: validEffectSpec,
    manifest: validManifest,
    assetPlan: validAssetPlan,
    productionPlan: validProductionPlan,
    capabilityPlan: { ...candidate.capabilityPlan, experienceId: manifestId }
  };
  if (inspectExperience(revisedCandidate.manifest).length) throw new Error('局部修订产生了无效 Manifest。');
  return { candidate: revisedCandidate, changedPaths, summary };
}

function reidentifyManifest(manifest: ExperienceManifest, manifestId: string, effectSpecId: string): ExperienceManifest {
  const scenes = Object.fromEntries(Object.entries(manifest.scenes).map(([id, scene]) => [id, {
    ...scene,
    ...(scene.recipe ? { recipe: { ...scene.recipe, sourceEffectSpecId: effectSpecId } } : {})
  }]));
  return { ...manifest, id: manifestId, scenes };
}

function preservationFingerprint(candidate: CreativeCandidate): Record<LocalRevisionResult['unchangedProof'][number]['layer'], string> {
  const value = (input: unknown) => stableHash(JSON.stringify(input));
  return {
    goal: value(candidate.effectSpec.goal),
    'semantic-content': value({ nodes: Object.fromEntries(Object.entries(candidate.manifest.nodes).map(([id, node]) => [id, node.content])), audience: candidate.manifest.audience, summary: candidate.manifest.summary }),
    assets: value({ requirements: candidate.effectSpec.assetRequirements, plan: candidate.assetPlan.items, scenes: Object.values(candidate.manifest.scenes).map((scene) => scene.assets || []) }),
    camera: value(candidate.manifest.cameraTracks),
    'scene-plugin': value(Object.values(candidate.manifest.scenes).map((scene) => ({ plugin: scene.plugin, preset: scene.preset })))
  };
}

function preservedLayers(intent: RevisionIntent['kind']): Array<LocalRevisionResult['unchangedProof'][number]['layer']> {
  if (intent === 'page-title') return ['goal', 'semantic-content', 'assets', 'camera', 'scene-plugin'];
  if (intent === 'accent-color') return ['goal', 'semantic-content', 'assets', 'camera', 'scene-plugin'];
  return ['goal', 'semantic-content', 'assets', 'camera', 'scene-plugin'];
}
