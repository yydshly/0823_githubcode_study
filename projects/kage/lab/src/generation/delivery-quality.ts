import { z } from 'zod';
import type { V2CreativeContract } from '../v2/creative-contract.ts';
import { evaluateAssetQualityGate, type AssetQualityCandidate } from './asset-quality-gate.ts';
import { visualAcceptanceSchema, type VisualAcceptance } from './visual-acceptance.ts';
import { assessProductExperienceQuality, productExperienceQualitySchema, type ProductExperienceEvidence } from './product-experience-quality.ts';

const requiredQualitySchema = z.enum(['not-applicable', 'L2-inspectable', 'L3-presentable', 'L4-cinematic']);
const achievedQualitySchema = z.enum(['not-applicable', 'L0-missing', 'L1-placeholder', 'L2-inspectable', 'L3-presentable', 'L4-cinematic']);

export const deliveryQualityAssessmentSchema = z.object({
  schemaVersion: z.literal(1),
  renderQuality: z.enum(['high', 'balanced', 'low']),
  targetAssetQuality: requiredQualitySchema,
  achievedAssetQuality: achievedQualitySchema,
  assetMode: z.enum(['not-applicable', 'procedural', 'external', 'hybrid']),
  status: z.enum(['provisional', 'prototype-only', 'final-eligible']),
  finalEligible: z.boolean(),
  experience: productExperienceQualitySchema.default({
    schemaVersion: 1,
    status: 'pending',
    score: null,
    structureMode: null,
    expectedStateCount: 0,
    reviewedStateCount: 0,
    stateCoverage: 0,
    modelJudgment: 'pending',
    archiveEligible: false,
    dimensions: null,
    summary: '等待 V2 产品结构、浏览器证据与 Codex 最终视觉判断。',
    issues: []
  }),
  summary: z.string().min(8).max(500),
  evidence: z.array(z.string().min(3).max(240)).max(8)
}).strict();

export type DeliveryQualityAssessment = z.infer<typeof deliveryQualityAssessmentSchema>;

export function assessDeliveryQuality(
  renderQuality: 'high' | 'balanced' | 'low',
  contract: V2CreativeContract | null | undefined,
  assets: readonly AssetQualityCandidate[],
  visualAcceptance?: VisualAcceptance | null,
  productEvidence: Omit<ProductExperienceEvidence, 'visual'> = {},
): DeliveryQualityAssessment {
  const required = contract?.assets.filter((asset) => asset.required) || [];
  const procedural = required.filter((asset) => asset.modality === 'procedural');
  const external = required.filter((asset) => asset.modality !== 'procedural');
  const assetMode = !required.length
    ? 'not-applicable' as const
    : procedural.length && external.length
      ? 'hybrid' as const
      : procedural.length
        ? 'procedural' as const
        : 'external' as const;
  const targetAssetQuality: z.infer<typeof requiredQualitySchema> = required.length
    ? required.map((asset) => asset.minimumQuality).sort((a, b) => requiredRank(b) - requiredRank(a))[0] ?? 'not-applicable'
    : 'not-applicable';
  const declaredLevels: z.infer<typeof achievedQualitySchema>[] = [
    ...assets.map(candidateQuality),
    ...(procedural.length ? ['L2-inspectable' as const] : []),
  ];
  let achievedAssetQuality: z.infer<typeof achievedQualitySchema> = required.length
    ? declaredLevels.length
      ? declaredLevels.sort((a, b) => achievedRank(a) - achievedRank(b))[0]
      : external.length
        ? 'L0-missing'
        : 'L2-inspectable'
    : 'not-applicable';
  const rawAchievedAssetQuality = achievedAssetQuality;

  const visual = visualAcceptance ? visualAcceptanceSchema.parse(visualAcceptance) : null;
  const experience = assessProductExperienceQuality(contract, { ...productEvidence, visual });
  const visualPromotesProcedural = Boolean(
    visual
    && visual.verdict === 'pass'
    && visual.score >= 90
    && (visual.assetRole === 'dominant' || visual.assetRole === 'integrated')
    && !visual.findings.some((finding) => finding.severity === 'major' || finding.code === 'placeholder-dominant')
  );
  if ((assetMode === 'procedural' || assetMode === 'hybrid') && visualPromotesProcedural && achievedRank(achievedAssetQuality) < achievedRank('L3-presentable')) {
    achievedAssetQuality = 'L3-presentable';
  }

  const assetGate = contract ? evaluateAssetQualityGate(contract, assets) : null;
  const stateReady = !assetGate || assetGate.decision === 'ready';
  // External packages can legitimately mix L3 presentation layers with an L2
  // depth/inspection layer. The per-responsibility gate is the source of truth:
  // it verifies each asset against its own minimum instead of comparing the
  // package-wide maximum requirement with the package-wide minimum candidate.
  if (assetMode === 'external'
    && stateReady
    && targetAssetQuality !== 'not-applicable'
    && achievedRank(achievedAssetQuality) < requiredRank(targetAssetQuality)) {
    achievedAssetQuality = targetAssetQuality;
  }

  const targetMet = targetAssetQuality === 'not-applicable'
    || achievedRank(achievedAssetQuality) >= requiredRank(targetAssetQuality);
  const visualPassed = Boolean(visual && visual.verdict === 'pass' && !visual.findings.some((finding) => finding.severity === 'major'));
  const finalEligible = targetMet && visualPassed && stateReady && (!contract || experience.archiveEligible);
  const status = finalEligible ? 'final-eligible' : visual ? 'prototype-only' : targetMet ? 'provisional' : 'prototype-only';
  const evidence = [
    `render=${renderQuality}`,
    `asset-mode=${assetMode}`,
    `target=${targetAssetQuality}`,
    `achieved=${achievedAssetQuality}`,
    ...(assetMode === 'external' && rawAchievedAssetQuality !== achievedAssetQuality
      ? [`asset-floor=${rawAchievedAssetQuality}`]
      : []),
    visual ? `visual=${visual.verdict}/${visual.score}/${visual.assetRole}` : 'visual=pending',
    assetGate ? `asset-gate=${assetGate.decision}` : 'asset-gate=not-applicable',
    `experience=${experience.status}/${experience.score ?? 'pending'}/${experience.reviewedStateCount}-${experience.expectedStateCount}`
  ];
  const summary = finalEligible
    ? `渲染质量为 ${renderQuality}，素材达到 ${achievedAssetQuality}，且 ${experience.reviewedStateCount} 个代表性桌面检查点已覆盖 ${experience.expectedStateCount} 个产品状态，可以作为最终结果。`
    : targetAssetQuality === 'not-applicable'
      ? `渲染质量为 ${renderQuality}；当前不依赖关键外部素材，但仍需独立视觉验收后才能成为最终结果。`
      : !targetMet
        ? `渲染质量为 ${renderQuality}，但素材当前仅达到 ${achievedAssetQuality}，目标是 ${targetAssetQuality}；只能作为原型或待定稿结果。`
        : !visual
          ? `素材已达到 ${achievedAssetQuality}，等待独立视觉验收与产品状态检查后再决定是否交付。`
          : !visualPassed
            ? `素材已达到 ${achievedAssetQuality}，但当前页面视觉验收未通过：${visual.summary}`
            : !stateReady
              ? `基础素材和页面视觉已通过，但状态资产门禁未通过：${assetGate?.summary ?? '缺少可验证的状态素材。'}`
            : `素材和基础视觉已通过，但产品体验仍需修订：${experience.summary}`;

  return deliveryQualityAssessmentSchema.parse({
    schemaVersion: 1,
    renderQuality,
    targetAssetQuality,
    achievedAssetQuality,
    assetMode,
    status,
    finalEligible,
    experience,
    summary,
    evidence
  });
}

function candidateQuality(candidate: AssetQualityCandidate): z.infer<typeof achievedQualitySchema> {
  return candidate.qualityLevel || 'L2-inspectable';
}

function requiredRank(value: z.infer<typeof requiredQualitySchema>): number {
  return value === 'L4-cinematic' ? 4 : value === 'L3-presentable' ? 3 : value === 'L2-inspectable' ? 2 : 0;
}

function achievedRank(value: z.infer<typeof achievedQualitySchema>): number {
  return value === 'L4-cinematic' ? 4 : value === 'L3-presentable' ? 3 : value === 'L2-inspectable' ? 2 : value === 'L1-placeholder' ? 1 : 0;
}
