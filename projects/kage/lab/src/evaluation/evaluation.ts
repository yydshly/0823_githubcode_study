import { z } from 'zod';
import type { CreativeCandidate } from '../generation/schema.ts';
import { stableHash } from '../generation/stable-hash.ts';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const evaluationCheckStatusSchema = z.enum(['pass', 'warn', 'fail', 'manual-required']);
export const evaluationCheckSchema = z.object({
  id: safeId,
  category: z.enum(['goal', 'composition', 'runtime', 'asset', 'accessibility', 'performance', 'provenance']),
  label: z.string().min(2),
  status: evaluationCheckStatusSchema,
  severity: z.enum(['info', 'important', 'blocking']),
  evidenceSource: z.enum([
    'effect-spec', 'manifest', 'asset-plan', 'production-plan', 'capability-plan',
    'runtime-snapshot', 'browser-screenshot', 'manual-review'
  ]),
  evidence: z.array(z.string().min(2)).min(1),
  observation: z.string().min(4),
  nextAction: z.string().min(4).nullable()
}).strict();

export const evaluationReportSchema = z.object({
  schemaVersion: z.literal(1),
  id: safeId,
  candidateId: safeId,
  effectSpecId: safeId,
  manifestId: safeId,
  evaluator: z.object({
    mode: z.literal('offline-deterministic'),
    adapter: z.literal('offline-evaluator-v1'),
    visionUsed: z.literal(false)
  }).strict(),
  status: z.enum(['pass', 'needs-review', 'revision-required', 'blocked']),
  checks: z.array(evaluationCheckSchema).min(1),
  blockingCheckIds: z.array(safeId),
  manualCheckIds: z.array(safeId),
  summary: z.string().min(4),
  nextAction: z.string().min(4)
}).strict().superRefine((value, context) => {
  const checkIds = new Set(value.checks.map((check) => check.id));
  value.blockingCheckIds.forEach((id, index) => {
    const check = value.checks.find((item) => item.id === id);
    if (!checkIds.has(id) || check?.status !== 'fail' || check.severity !== 'blocking') {
      context.addIssue({ code: 'custom', path: ['blockingCheckIds', index], message: '阻断 ID 必须指向 blocking / fail 检查。' });
    }
  });
  value.manualCheckIds.forEach((id, index) => {
    if (value.checks.find((item) => item.id === id)?.status !== 'manual-required') {
      context.addIssue({ code: 'custom', path: ['manualCheckIds', index], message: '人工检查 ID 必须指向 manual-required 检查。' });
    }
  });
  const expected = value.blockingCheckIds.length
    ? 'blocked'
    : value.checks.some((check) => check.status === 'fail')
      ? 'revision-required'
      : value.manualCheckIds.length
        ? 'needs-review'
        : 'pass';
  if (value.status !== expected) context.addIssue({ code: 'custom', path: ['status'], message: `评审状态应为 ${expected}。` });
});

export const revisionItemSchema = z.object({
  id: safeId,
  sourceCheckId: safeId,
  targetArtifact: z.enum([
    'effect-spec', 'asset-plan', 'production-plan', 'experience-manifest',
    'scene-plugin', 'browser-evidence'
  ]),
  targetLayer: z.enum(['goal', 'dom', 'webgl', 'asset', 'motion', 'camera', 'fallback', 'evaluation']),
  action: z.string().min(4),
  expectedVisibleDifference: z.string().min(4),
  regeneration: z.enum(['none', 'partial', 'full'])
}).strict();

export const revisionPlanSchema = z.object({
  schemaVersion: z.literal(1),
  id: safeId,
  evaluationReportId: safeId,
  candidateId: safeId,
  status: z.enum(['ready', 'review-required', 'blocked', 'no-change']),
  preserve: z.array(z.string().min(4)).min(1),
  revisions: z.array(revisionItemSchema),
  nextEvidence: z.array(z.string().min(4)).min(1),
  summary: z.string().min(4)
}).strict().superRefine((value, context) => {
  if (value.status === 'no-change' && value.revisions.length) {
    context.addIssue({ code: 'custom', path: ['revisions'], message: 'no-change 计划不能包含修订项。' });
  }
  if (value.status !== 'no-change' && !value.revisions.length) {
    context.addIssue({ code: 'custom', path: ['revisions'], message: '需要处理的计划必须包含有来源的修订项。' });
  }
});

export type EvaluationCheck = z.infer<typeof evaluationCheckSchema>;
export type EvaluationReport = z.infer<typeof evaluationReportSchema>;
export type RevisionPlan = z.infer<typeof revisionPlanSchema>;

export interface RuntimeEvaluationEvidence {
  lifecycle: string;
  renderer: string;
  viewport: { width: number; height: number };
  quality: string;
  drawCalls: number;
  scenePluginId: string;
  semanticFallbackVerified: boolean;
  reducedMotionVerified: boolean;
  horizontalOverflow: boolean;
  samples?: string[];
}

export interface ManualVisualObservation {
  checkId: 'visual-composition' | 'signature-moment' | 'material-credibility';
  status: 'pass' | 'warn' | 'fail';
  observation: string;
  evidence: string[];
}

export interface EvaluationEvidence {
  runtime?: RuntimeEvaluationEvidence;
  screenshots?: ReadonlyArray<{ id: string; path: string; width: number; height: number }>;
  manualVisual?: ReadonlyArray<ManualVisualObservation>;
}

export function assertEvaluationReport(value: unknown): EvaluationReport {
  return evaluationReportSchema.parse(value);
}

export function assertRevisionPlan(value: unknown): RevisionPlan {
  return revisionPlanSchema.parse(value);
}

export function evaluateCandidate(candidate: CreativeCandidate, supplied: EvaluationEvidence = {}): EvaluationReport {
  const { effectSpec, assetPlan, manifest, capabilityPlan, productionPlan } = candidate;
  const checks: EvaluationCheck[] = [];
  const identityReady = candidate.id === manifest.id
    && assetPlan.effectSpecId === effectSpec.id
    && productionPlan.effectSpecId === effectSpec.id
    && capabilityPlan.experienceId === manifest.id;
  checks.push(check(
    'artifact-identity', 'provenance', '生成产物身份一致性', identityReady ? 'pass' : 'fail', identityReady ? 'important' : 'blocking', 'effect-spec',
    [`candidate=${candidate.id}`, `manifest=${manifest.id}`, `effect=${effectSpec.id}`, `assetEffect=${assetPlan.effectSpecId}`, `productionEffect=${productionPlan.effectSpecId}`],
    identityReady ? '候选、效果、素材、生产与运行清单属于同一个生成方向。' : '生成产物存在交叉引用错位，不能把当前预览视为该效果目标的证据。',
    identityReady ? null : '重新编译候选并只替换引用错位的生成产物。'
  ));

  const semanticReady = manifest.accessibility.fallbackMode === 'semantic-dom'
    && effectSpec.composition.domRole.trim().length >= 8
    && effectSpec.composition.webglRole.trim().length >= 8
    && effectSpec.composition.layers.some((layer) => layer.techniques.includes('dom-layout'));
  checks.push(check(
    'semantic-boundary', 'accessibility', 'DOM 与 WebGL 职责边界', semanticReady ? 'pass' : 'fail', semanticReady ? 'important' : 'blocking', 'manifest',
    [effectSpec.composition.domRole, effectSpec.composition.webglRole, `fallback=${manifest.accessibility.fallbackMode}`],
    semanticReady ? '可阅读内容由语义 DOM 保留，WebGL 负责空间记忆和视觉表达。' : '语义内容或无 WebGL 回退没有被明确保留。',
    semanticReady ? null : '修复 EffectSpec 的职责声明和 Manifest 的 semantic-dom 回退。'
  ));

  const scenes = Object.values(manifest.scenes);
  const sceneReady = scenes.length > 0 && scenes.every((scene) => Boolean(scene.plugin))
    && scenes.every((scene) => !scene.recipe || scene.recipe.sourceEffectSpecId === effectSpec.id);
  checks.push(check(
    'scene-binding', 'runtime', 'EffectSpec 与场景绑定', sceneReady ? 'pass' : 'fail', sceneReady ? 'important' : 'blocking', 'manifest',
    scenes.length ? scenes.map((scene) => `${scene.id}:${scene.plugin}:${scene.recipe?.sourceEffectSpecId || 'registered-preset'}`) : ['manifest 不包含场景'],
    sceneReady ? '每个运行场景均绑定已注册插件，组合配方可追溯到当前 EffectSpec。' : '场景缺失、插件未声明或组合配方指向其他 EffectSpec。',
    sceneReady ? null : '重新编译 ExperienceManifest 的场景绑定。'
  ));

  const requiredIds = new Set(effectSpec.assetRequirements.filter((item) => item.required).map((item) => item.id));
  const blockingAssets = assetPlan.items.filter((item) => requiredIds.has(item.requirementId) && item.status !== 'ready' && item.fallback === 'block');
  const adaptedAssets = assetPlan.items.filter((item) => item.status !== 'ready' && item.fallback !== 'block');
  const assetsStatus: EvaluationCheck['status'] = blockingAssets.length ? 'fail' : adaptedAssets.length ? 'warn' : 'pass';
  checks.push(check(
    'asset-readiness', 'asset', '素材成熟度与可发布性', assetsStatus, blockingAssets.length ? 'blocking' : 'important', 'asset-plan',
    assetPlan.items.length
      ? assetPlan.items.map((item) => `${item.requirementId}:${item.status}:${item.qualityLevel}:${item.source}:${item.payloadBytes}B`)
      : ['EffectSpec 未声明外部素材依赖'],
    blockingAssets.length
      ? `${blockingAssets.length} 个必需素材仍缺失或不达标，且不允许替代。`
      : adaptedAssets.length
        ? `${adaptedAssets.length} 个素材依赖将使用 EffectSpec 允许的诚实回退。`
        : '外部素材已通过门禁，或当前方向可完全由已注册程序化能力构建。',
    blockingAssets.length ? '生成、升级或提供有许可的真实素材候选，再重新评审。' : adaptedAssets.length ? '在真实页面确认回退没有破坏主体识别与氛围目标。' : null
  ));

  const productionStatus: EvaluationCheck['status'] = productionPlan.status === 'blocked' ? 'fail' : productionPlan.status === 'adapted' ? 'warn' : 'pass';
  checks.push(check(
    'production-readiness', 'runtime', '生产能力与适配', productionStatus, productionPlan.status === 'blocked' ? 'blocking' : 'important', 'production-plan',
    [`status=${productionPlan.status}`, `strategy=${productionPlan.strategy}`, `missing=${productionPlan.missingCapabilities.join(',') || 'none'}`, ...productionPlan.adaptations.map((item) => `${item.from}->${item.to}`)],
    productionPlan.status === 'blocked'
      ? '生产计划包含不能诚实替代的阻断任务。'
      : productionPlan.status === 'adapted'
        ? '当前计划记录了能力适配；视觉评审仍需确认适配后的可见影响。'
        : '所需生产能力已集成，计划可按依赖执行。',
    productionPlan.status === 'blocked' ? productionPlan.nextAction : productionPlan.status === 'adapted' ? '逐项检查 adaptation.effectImpact，并在预览中确认。' : null
  ));

  const capabilityReady = capabilityPlan.status === 'fit' && capabilityPlan.missing.length === 0
    && capabilityPlan.estimated.drawCalls <= capabilityPlan.budget.maxDrawCalls;
  checks.push(check(
    'capability-budget', 'performance', '运行能力与 Draw Call 预算', capabilityReady ? 'pass' : capabilityPlan.fallback ? 'warn' : 'fail', capabilityPlan.fallback ? 'important' : capabilityReady ? 'info' : 'blocking', 'capability-plan',
    [`status=${capabilityPlan.status}`, `drawCalls=${capabilityPlan.estimated.drawCalls}/${capabilityPlan.budget.maxDrawCalls}`, `missing=${capabilityPlan.missing.join(',') || 'none'}`, `fallback=${capabilityPlan.fallback || 'none'}`],
    capabilityReady ? '静态能力规划在当前画质预算内。' : capabilityPlan.fallback ? '运行能力超出目标预算，已声明语义回退。' : '运行能力缺失或超出预算且没有可接受回退。',
    capabilityReady ? null : '缩减对应场景层或补齐已注册运行能力，然后重新规划。'
  ));

  const payloadReady = assetPlan.metrics.totalPayloadBytes <= effectSpec.constraints.maxInitialAssetBytes;
  checks.push(check(
    'asset-budget', 'performance', '首屏素材负载预算', payloadReady ? 'pass' : 'fail', payloadReady ? 'info' : 'important', 'asset-plan',
    [`payload=${assetPlan.metrics.totalPayloadBytes}B`, `budget=${effectSpec.constraints.maxInitialAssetBytes}B`],
    payloadReady ? '已知素材负载没有超过 EffectSpec 首屏预算。' : '已知素材负载超过 EffectSpec 首屏预算。',
    payloadReady ? null : '压缩、延迟加载或替换超预算素材，并保持主体质量。'
  ));

  checks.push(runtimeCheck(candidate, supplied.runtime));
  checks.push(visualCheck('visual-composition', '构图、焦点与遮挡', supplied, 'composition'));
  checks.push(visualCheck('signature-moment', '核心记忆点是否成立', supplied, 'goal'));
  checks.push(visualCheck('material-credibility', '材质、品味与品牌匹配', supplied, 'composition'));

  const blockingCheckIds = checks.filter((item) => item.status === 'fail' && item.severity === 'blocking').map((item) => item.id);
  const manualCheckIds = checks.filter((item) => item.status === 'manual-required').map((item) => item.id);
  const reportStatus: EvaluationReport['status'] = blockingCheckIds.length
    ? 'blocked'
    : checks.some((item) => item.status === 'fail')
      ? 'revision-required'
      : manualCheckIds.length
        ? 'needs-review'
        : 'pass';
  const passed = checks.filter((item) => item.status === 'pass').length;
  const warned = checks.filter((item) => item.status === 'warn').length;
  const failed = checks.filter((item) => item.status === 'fail').length;
  return assertEvaluationReport({
    schemaVersion: 1,
    id: `evaluation-${stableHash(`${candidate.id}|${checks.map((item) => `${item.id}:${item.status}`).join('|')}`)}`,
    candidateId: candidate.id,
    effectSpecId: effectSpec.id,
    manifestId: manifest.id,
    evaluator: { mode: 'offline-deterministic', adapter: 'offline-evaluator-v1', visionUsed: false },
    status: reportStatus,
    checks,
    blockingCheckIds,
    manualCheckIds,
    summary: `${passed} 项通过，${warned} 项需关注，${failed} 项失败，${manualCheckIds.length} 项需要真实画面判断。`,
    nextAction: reportStatus === 'blocked'
      ? '先解决阻断项；保持已验证层不变，再重新生成受影响产物。'
      : reportStatus === 'revision-required'
        ? '执行局部修订并重新收集相同视口证据。'
        : reportStatus === 'needs-review'
          ? '打开真实 Three.js 预览，按未决检查收集桌面与移动端截图。'
          : '当前证据通过；可以进入发布前回归。'
  });
}

export function compileRevisionPlan(report: EvaluationReport, candidate: CreativeCandidate): RevisionPlan {
  const actionable = report.checks.filter((item) => item.status === 'fail' || item.status === 'manual-required' || (item.status === 'warn' && report.status !== 'pass'));
  const revisions: RevisionPlan['revisions'] = actionable.map((item, index) => revisionFor(item, index));
  const status: RevisionPlan['status'] = report.status === 'blocked'
    ? 'blocked'
    : report.status === 'needs-review'
      ? 'review-required'
      : report.status === 'revision-required'
        ? 'ready'
        : 'no-change';
  const preserve = [
    `保留目标主体：${candidate.effectSpec.goal.subject}。`,
    `保留目标受众：${candidate.effectSpec.goal.audience}。`,
    `保留体验论点：${candidate.effectSpec.thesis}。`,
    `保留语义 DOM 的内容与行动路径：${candidate.effectSpec.composition.domRole}`,
    `保留核心记忆点，除非视觉证据明确证明其不成立：${candidate.effectSpec.direction.signatureMoment}`
  ];
  const nextEvidence = report.manualCheckIds.length
    ? ['1440×900 主路径截图与运行快照。', '390×844 主路径截图、横向溢出和语义回退证据。', '逐项记录构图、核心记忆点与材质判断，不使用无证据审美分数。']
    : report.status === 'pass'
      ? ['保留构建、单元测试与浏览器回归结果。']
      : ['在相同 brief、候选 ID 和视口下重新运行离线评审。'];
  return assertRevisionPlan({
    schemaVersion: 1,
    id: `revision-${stableHash(`${report.id}|${revisions.map((item) => item.id).join('|') || 'none'}`)}`,
    evaluationReportId: report.id,
    candidateId: report.candidateId,
    status,
    preserve,
    revisions,
    nextEvidence,
    summary: status === 'no-change'
      ? '没有发现需要修改的产物；保留当前决策并进入发布证据归档。'
      : `只处理 ${revisions.length} 个有证据来源的局部事项；其他已验证决策保持不变。`
  });
}

function check(
  id: string,
  category: EvaluationCheck['category'],
  label: string,
  status: EvaluationCheck['status'],
  severity: EvaluationCheck['severity'],
  evidenceSource: EvaluationCheck['evidenceSource'],
  evidence: string[],
  observation: string,
  nextAction: string | null
): EvaluationCheck {
  return evaluationCheckSchema.parse({ id, category, label, status, severity, evidenceSource, evidence, observation, nextAction });
}

function runtimeCheck(candidate: CreativeCandidate, runtime?: RuntimeEvaluationEvidence): EvaluationCheck {
  if (!runtime) return check(
    'runtime-evidence', 'runtime', '真实浏览器运行证据', 'manual-required', 'important', 'manual-review',
    ['工作台只持有生成产物，尚未附加实际预览的运行快照。'],
    '尚不能证明当前候选在目标设备中完成渲染、回退和降级运动。',
    '打开预览并采集桌面、移动端、语义回退与 reduced-motion 运行证据。'
  );
  const sceneIds = new Set(Object.values(candidate.manifest.scenes).map((scene) => scene.plugin));
  const ready = runtime.lifecycle === 'running'
    && runtime.renderer === 'webgl'
    && sceneIds.has(runtime.scenePluginId)
    && runtime.drawCalls <= candidate.capabilityPlan.budget.maxDrawCalls
    && runtime.semanticFallbackVerified
    && runtime.reducedMotionVerified
    && !runtime.horizontalOverflow;
  return check(
    'runtime-evidence', 'runtime', '真实浏览器运行证据', ready ? 'pass' : 'fail', ready ? 'important' : 'blocking', 'runtime-snapshot',
    [`lifecycle=${runtime.lifecycle}`, `renderer=${runtime.renderer}`, `viewport=${runtime.viewport.width}x${runtime.viewport.height}`, `quality=${runtime.quality}`, `drawCalls=${runtime.drawCalls}`, `scene=${runtime.scenePluginId}`, `semanticFallback=${runtime.semanticFallbackVerified}`, `reducedMotion=${runtime.reducedMotionVerified}`, `horizontalOverflow=${runtime.horizontalOverflow}`, ...(runtime.samples || [])],
    ready ? '实际浏览器运行、场景绑定、预算、回退和移动端布局证据均通过。' : '至少一项真实运行、预算、回退或布局证据失败。',
    ready ? null : '修复失败的运行层；不要改动已通过的 EffectSpec 目标。'
  );
}

function visualCheck(
  id: ManualVisualObservation['checkId'],
  label: string,
  supplied: EvaluationEvidence,
  category: EvaluationCheck['category']
): EvaluationCheck {
  const manual = supplied.manualVisual?.find((item) => item.checkId === id);
  const screenshots = supplied.screenshots || [];
  if (!manual) return check(
    id, category, label, 'manual-required', 'important', screenshots.length ? 'browser-screenshot' : 'manual-review',
    screenshots.length ? screenshots.map((item) => `${item.id}:${item.width}x${item.height}:${item.path}`) : ['未提供由人或开发期多模态会话检查过的截图。'],
    '离线静态规则无法可靠判断这一视觉问题，因此没有生成审美分数。',
    '在真实页面检查并记录可见事实、判断和对应截图。'
  );
  return check(
    id, category, label, manual.status, manual.status === 'fail' ? 'important' : 'info', 'manual-review',
    manual.evidence,
    manual.observation,
    manual.status === 'pass' ? null : '把观察转换为单一视觉层的局部修改，再使用相同视口复查。'
  );
}

function revisionFor(item: EvaluationCheck, index: number): RevisionPlan['revisions'][number] {
  const id = `revision-${item.id}-${index + 1}`;
  if (item.status === 'manual-required') return {
    id, sourceCheckId: item.id, targetArtifact: 'browser-evidence', targetLayer: 'evaluation',
    action: item.nextAction || '收集并人工检查真实浏览器证据。',
    expectedVisibleDifference: '不改变当前效果；先获得足以决定是否需要修改的真实视觉证据。', regeneration: 'none'
  };
  if (item.id === 'asset-readiness' || item.id === 'asset-budget') return {
    id, sourceCheckId: item.id, targetArtifact: 'asset-plan', targetLayer: 'asset',
    action: item.nextAction || '调整素材计划并重新验证质量与负载。',
    expectedVisibleDifference: item.id === 'asset-budget' ? '首屏保持主体质量但更快进入稳定画面。' : '必需主体以达到目标质量且可发布的真实素材出现。', regeneration: 'partial'
  };
  if (item.id === 'production-readiness') return {
    id, sourceCheckId: item.id, targetArtifact: 'production-plan', targetLayer: 'fallback',
    action: item.nextAction || '解决生产能力缺口或明确可接受的诚实回退。',
    expectedVisibleDifference: '预览不再以能力缺失造成的低保真替代冒充最终效果。', regeneration: 'partial'
  };
  if (item.id === 'capability-budget' || item.id === 'runtime-evidence') return {
    id, sourceCheckId: item.id, targetArtifact: 'scene-plugin', targetLayer: 'webgl',
    action: item.nextAction || '局部修复运行层并重新采集快照。',
    expectedVisibleDifference: '相同构图在目标设备上稳定渲染并保留语义回退。', regeneration: 'partial'
  };
  return {
    id, sourceCheckId: item.id, targetArtifact: item.id === 'artifact-identity' ? 'experience-manifest' : 'effect-spec', targetLayer: item.id === 'semantic-boundary' ? 'dom' : 'goal',
    action: item.nextAction || '修复交叉产物约束并重新编译。',
    expectedVisibleDifference: '预览与当前目标重新一致，已验证内容保持不变。', regeneration: item.id === 'artifact-identity' ? 'full' : 'partial'
  };
}
