import type { CapabilityPlan, PlanContext } from '../capabilities/schema';
import type { CapabilityGap, CapabilityProposal } from '../capabilities/proposal';
import type { ExperienceManifest, ThemeTokens } from '../experience/schema';
import type { AssetPlan } from './asset-plan';
import type { EffectSpec } from './effect-spec';
import type { ProductionCapabilityId, ProductionCapabilityProfile } from './production-capabilities';
import type { ExperienceBlueprint } from './experience-blueprint';
import type { ProductionPlan } from './production-plan';
import type { PresentationStrategy } from './presentation-strategy';

export interface CreativeBrief {
  text: string;
  seed?: number;
}

export type CreativeProviderId = 'auto' | 'codex' | 'mimo' | 'minimax' | 'openai' | 'local';

export interface ProviderProvenance {
  requested: CreativeProviderId;
  selected: Exclude<CreativeProviderId, 'auto'>;
  model: string;
  mode: 'remote' | 'local';
  latencyMs: number;
  fallbackReason: string | null;
  cacheStatus: 'hit' | 'miss' | 'bypass';
}

export interface ProviderAvailability {
  id: Exclude<CreativeProviderId, 'auto'>;
  available: boolean;
  model: string;
  reason: string | null;
  capabilities: readonly ProductionCapabilityId[];
}

export interface ProviderStatusResponse {
  defaultProvider: CreativeProviderId;
  providers: ProviderAvailability[];
}

export type EvidenceSource = 'explicit' | 'inferred' | 'baseline-default';

export interface IntentEvidence {
  field: 'subject' | 'audience' | 'mood' | 'pace' | 'visual' | 'structure';
  source: EvidenceSource;
  excerpts: readonly string[];
  confidence: number;
  decision: string;
}

export type CreativeStructure = 'focus' | 'journey' | 'branching';

export interface CreativeDirection {
  id: string;
  title: string;
  thesis: string;
  structure: CreativeStructure;
  scenePlugin: 'signal-world' | 'chromatic-tide' | 'composed-world';
  nodeCount: number;
  pace: 'calm' | 'measured' | 'dynamic';
  theme: ThemeTokens;
  tags: readonly string[];
  rationale: readonly string[];
}

export interface BriefInterpretation {
  providerId: string;
  provenance: ProviderProvenance;
  subject: string;
  audience: string;
  intentTags: readonly string[];
  evidence: readonly IntentEvidence[];
  capabilityGaps: readonly CapabilityGap[];
  effectSpecs: readonly EffectSpec[] | null;
  experienceBlueprints: readonly ExperienceBlueprint[] | null;
  directions: readonly CreativeDirection[];
}

export interface CreativeCandidate {
  id: string;
  direction: CreativeDirection;
  manifest: ExperienceManifest;
  effectSpec: EffectSpec;
  assetPlan: AssetPlan;
  capabilityPlan: CapabilityPlan;
  experienceBlueprint: ExperienceBlueprint | null;
  productionPlan: ProductionPlan;
  presentationStrategy: PresentationStrategy;
}

export interface CreativeRun {
  id: string;
  brief: CreativeBrief;
  interpretation: BriefInterpretation;
  candidates: readonly CreativeCandidate[];
  capabilityProposals: readonly CapabilityProposal[];
  productionProfile: ProductionCapabilityProfile;
  context: PlanContext;
}

export interface BriefInterpreter {
  readonly id: string;
  interpret(brief: CreativeBrief): Promise<BriefInterpretation>;
}
