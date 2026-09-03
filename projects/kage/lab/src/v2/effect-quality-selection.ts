import { z } from 'zod';
import type { V2CreativeContract } from './creative-contract.ts';

export const effectQualityAxisSchema = z.enum([
  'theme-specific-memory',
  'sensory-impact',
  'surprise-without-confusion',
  'runtime-meaning',
  'craft-potential',
  'action-closure'
]);

export type EffectQualityAxis = z.infer<typeof effectQualityAxisSchema>;

export const effectCandidateRejectionSignalSchema = z.enum([
  'theme-interchangeable',
  'static-equivalent',
  'runtime-decoration-only',
  'asset-product-mismatch',
  'template-inertia',
  'action-disconnected',
  'truth-or-safety-risk'
]);

export const effectQualitySelectionGateSchema = z.object({
  schemaVersion: z.literal(1),
  position: z.literal('before-resources-and-code'),
  goalReplay: z.object({
    subject: z.string().trim().min(2).max(200),
    audience: z.string().trim().min(2).max(300),
    desiredChange: z.string().trim().min(4).max(500),
    primaryAction: z.string().trim().min(2).max(220)
  }).strict(),
  candidateContract: z.object({
    count: z.literal(3),
    divergenceMustInclude: z.tuple([
      z.literal('experience-form'),
      z.literal('signature-phenomenon'),
      z.literal('runtime-causality')
    ]),
    requiredClaims: z.tuple([
      z.literal('first-five-seconds'),
      z.literal('theme-memory'),
      z.literal('perceptual-journey'),
      z.literal('static-equivalent-test'),
      z.literal('action-closure')
    ])
  }).strict(),
  evaluation: z.object({
    axes: z.tuple([
      z.literal('theme-specific-memory'),
      z.literal('sensory-impact'),
      z.literal('surprise-without-confusion'),
      z.literal('runtime-meaning'),
      z.literal('craft-potential'),
      z.literal('action-closure')
    ]),
    scorePolicy: z.literal('relative-ranking-not-final-quality-proof'),
    techniqueCountScored: z.literal(false),
    mediumPrestigeScored: z.literal(false),
    sourcePrestigeScored: z.literal(false),
    templateInertiaPolicy: z.literal('advisory-never-disqualifying'),
    creativeFreedomPolicy: z.literal('promise-relative'),
    staticEquivalentPolicy: z.literal('blocking-only-when-runtime-essential'),
    browserEvidenceStillRequired: z.literal(true)
  }).strict(),
  rejectionSignals: z.tuple([
    z.literal('theme-interchangeable'),
    z.literal('static-equivalent'),
    z.literal('runtime-decoration-only'),
    z.literal('asset-product-mismatch'),
    z.literal('template-inertia'),
    z.literal('action-disconnected'),
    z.literal('truth-or-safety-risk')
  ]),
  decision: z.object({
    receiptRequired: z.literal(true),
    winnerRule: z.literal('highest-relative-goal-fit-with-no-rejection'),
    noPassingCandidate: z.literal('stop-before-assets'),
    buildCountAfterSelection: z.literal(1)
  }).strict()
}).strict();

export type EffectQualitySelectionGate = z.infer<typeof effectQualitySelectionGateSchema>;

const axisScoresSchema = z.object({
  'theme-specific-memory': z.number().int().min(0).max(100),
  'sensory-impact': z.number().int().min(0).max(100),
  'surprise-without-confusion': z.number().int().min(0).max(100),
  'runtime-meaning': z.number().int().min(0).max(100),
  'craft-potential': z.number().int().min(0).max(100),
  'action-closure': z.number().int().min(0).max(100)
}).strict();

export const effectDirectionCandidateSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(2).max(160),
  experienceForm: z.string().trim().min(4).max(300),
  firstFiveSeconds: z.string().trim().min(8).max(500),
  signaturePhenomenon: z.string().trim().min(8).max(500),
  themeMemory: z.string().trim().min(8).max(500),
  perceptualJourney: z.string().trim().min(8).max(700),
  runtimeCausality: z.string().trim().min(8).max(700),
  runtimeRole: z.enum(['essential', 'supporting', 'not-applicable']).optional(),
  staticEquivalentTest: z.string().trim().min(8).max(500),
  actionClosure: z.string().trim().min(8).max(500),
  axisScores: axisScoresSchema,
  rejectionSignals: z.array(effectCandidateRejectionSignalSchema).max(7)
}).strict();

export type EffectDirectionCandidate = z.infer<typeof effectDirectionCandidateSchema>;

export const effectQualitySelectionReceiptSchema = z.object({
  schemaVersion: z.literal(1),
  assessmentKind: z.literal('relative-self-assessment-not-final-evidence'),
  candidates: z.array(effectDirectionCandidateSchema).length(3),
  selectedCandidateId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).nullable(),
  decisionRationale: z.string().trim().min(8).max(900)
}).strict();

export type EffectQualitySelectionReceipt = z.infer<typeof effectQualitySelectionReceiptSchema>;

export type EffectQualitySelectionVerdict = {
  receiptValid: boolean;
  mayProceedToResources: boolean;
  selectedCandidateId: string | null;
  relativeScores: Record<string, number>;
  advisorySignals: Record<string, EffectDirectionCandidate['rejectionSignals']>;
  reasons: string[];
};

export function deriveEffectQualitySelectionGate(
  contract: V2CreativeContract
): EffectQualitySelectionGate {
  return effectQualitySelectionGateSchema.parse({
    schemaVersion: 1,
    position: 'before-resources-and-code',
    goalReplay: {
      subject: contract.intent.subject,
      audience: contract.intent.audience,
      desiredChange: contract.intent.narrativeChange,
      primaryAction: contract.intent.primaryAction
    },
    candidateContract: {
      count: 3,
      divergenceMustInclude: [
        'experience-form',
        'signature-phenomenon',
        'runtime-causality'
      ],
      requiredClaims: [
        'first-five-seconds',
        'theme-memory',
        'perceptual-journey',
        'static-equivalent-test',
        'action-closure'
      ]
    },
    evaluation: {
      axes: [
        'theme-specific-memory',
        'sensory-impact',
        'surprise-without-confusion',
        'runtime-meaning',
        'craft-potential',
        'action-closure'
      ],
      scorePolicy: 'relative-ranking-not-final-quality-proof',
      techniqueCountScored: false,
      mediumPrestigeScored: false,
      sourcePrestigeScored: false,
      templateInertiaPolicy: 'advisory-never-disqualifying',
      creativeFreedomPolicy: 'promise-relative',
      staticEquivalentPolicy: 'blocking-only-when-runtime-essential',
      browserEvidenceStillRequired: true
    },
    rejectionSignals: [
      'theme-interchangeable',
      'static-equivalent',
      'runtime-decoration-only',
      'asset-product-mismatch',
      'template-inertia',
      'action-disconnected',
      'truth-or-safety-risk'
    ],
    decision: {
      receiptRequired: true,
      winnerRule: 'highest-relative-goal-fit-with-no-rejection',
      noPassingCandidate: 'stop-before-assets',
      buildCountAfterSelection: 1
    }
  });
}

export function evaluateEffectQualitySelection(
  input: EffectQualitySelectionReceipt
): EffectQualitySelectionVerdict {
  const receipt = effectQualitySelectionReceiptSchema.parse(input);
  const reasons: string[] = [];
  const ids = receipt.candidates.map((candidate) => candidate.id);
  if (new Set(ids).size !== 3) reasons.push('三个效果候选必须具有不同 id。');

  for (const key of ['experienceForm', 'signaturePhenomenon', 'runtimeCausality'] as const) {
    const values = receipt.candidates.map((candidate) => normalize(candidate[key]));
    if (new Set(values).size !== 3) {
      reasons.push(`三个效果候选必须具有不同的 ${key}。`);
    }
  }

  const relativeScores = Object.fromEntries(receipt.candidates.map((candidate) => [
    candidate.id,
    Math.round(Object.values(candidate.axisScores).reduce((sum, value) => sum + value, 0) / 6)
  ]));
  const advisorySignals = Object.fromEntries(receipt.candidates.map((candidate) => [
    candidate.id,
    candidate.rejectionSignals.filter((signal) => !blockingSignals(candidate).includes(signal))
  ]));
  const eligible = receipt.candidates.filter((candidate) => blockingSignals(candidate).length === 0);

  if (eligible.length === 0) {
    if (receipt.selectedCandidateId !== null) {
      reasons.push('所有候选触发拒绝信号时必须在素材前停止，不能选择候选。');
    }
    return {
      receiptValid: reasons.length === 0,
      mayProceedToResources: false,
      selectedCandidateId: null,
      relativeScores,
      advisorySignals,
      reasons
    };
  }

  if (receipt.selectedCandidateId === null) {
    reasons.push('仍有可用候选时必须选择相对目标适配度最高的一项。');
  } else {
    const selected = receipt.candidates.find((candidate) => candidate.id === receipt.selectedCandidateId);
    if (!selected) {
      reasons.push('选择结果必须属于当前三个候选。');
    } else if (blockingSignals(selected).length > 0) {
      reasons.push('触发质量拒绝信号的候选不能进入资源选择。');
    } else {
      const bestScore = Math.max(...eligible.map((candidate) => relativeScores[candidate.id]!));
      if (relativeScores[selected.id] !== bestScore) {
        reasons.push('所选方向不是无拒绝候选中的最高相对目标适配结果。');
      }
    }
  }

  return {
    receiptValid: reasons.length === 0,
    mayProceedToResources: reasons.length === 0 && receipt.selectedCandidateId !== null,
    selectedCandidateId: receipt.selectedCandidateId,
    relativeScores,
    advisorySignals,
    reasons
  };
}

function blockingSignals(candidate: EffectDirectionCandidate): EffectDirectionCandidate['rejectionSignals'] {
  const alwaysBlocking = new Set<EffectDirectionCandidate['rejectionSignals'][number]>([
    'theme-interchangeable',
    'asset-product-mismatch',
    'action-disconnected',
    'truth-or-safety-risk'
  ]);
  const runtimeEssential = (candidate.runtimeRole ?? 'essential') === 'essential';
  return candidate.rejectionSignals.filter((signal) => (
    alwaysBlocking.has(signal)
    || (runtimeEssential && (signal === 'static-equivalent' || signal === 'runtime-decoration-only'))
  ));
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('zh-CN').replace(/\s+/g, ' ');
}
