import type { CreativeCandidate, CreativeStructure } from './schema.ts';
import type { V2CreativeContract } from '../v2/creative-contract.ts';
import { hasPersistentWorkbenchTaskEvidence } from '../v2/style-diversity.ts';

export type CreativeCandidateSelectionInput = Pick<CreativeCandidate, 'id'> & {
  direction: Pick<CreativeCandidate['direction'], 'structure'>;
  assetPlan?: Pick<CreativeCandidate['assetPlan'], 'status'>;
  productionPlan?: Pick<CreativeCandidate['productionPlan'], 'status'>;
  presentationStrategy?: Pick<CreativeCandidate['presentationStrategy'], 'status'>;
};

export interface CreativeCandidateSelection<T extends CreativeCandidateSelectionInput> {
  candidate: T;
  preferredStructure: CreativeStructure | null;
  matchedPreference: boolean;
  reason: string;
}

const explicitBranchingPattern = /\b(?:branch(?:ing|ed)?|choice|choose|multi-path)\b|分支|二选一|多路径|选择(?:路径|方向|路线)/i;

function isBlocked(candidate: CreativeCandidateSelectionInput): boolean {
  return candidate.assetPlan?.status === 'blocked'
    || candidate.productionPlan?.status === 'blocked'
    || candidate.presentationStrategy?.status === 'blocked';
}

function preferredStructure(contract: V2CreativeContract): CreativeStructure | null {
  const structureDirection = contract.technical.styleDiversity.structureDirection;
  const form = structureDirection.experienceForm;
  const mode = contract.experience.structure.mode;
  if (form === 'branching-confluence'
    || form === 'object-field'
    || explicitBranchingPattern.test(contract.brief)) return 'branching';
  if (
    form === 'direct-workbench'
    && structureDirection.controlVisibility === 'persistent'
    && hasPersistentWorkbenchTaskEvidence(contract.brief)
  ) return 'focus';
  if (
    form === 'continuous-stage'
    || form === 'editorial-evidence'
    || form === 'typographic-sonic-field'
    || mode === 'guided-sequence'
    || mode === 'editorial-flow'
  ) return 'journey';
  return null;
}

function structureLabel(structure: CreativeStructure): string {
  return ({ focus: 'focused', journey: 'guided', branching: 'branching' } as const)[structure];
}

export function selectCreativeCandidate<T extends CreativeCandidateSelectionInput>(
  candidates: readonly T[],
  contract: V2CreativeContract,
): CreativeCandidateSelection<T> | null {
  const available = candidates.filter((candidate) => !isBlocked(candidate));
  if (!available.length) return null;

  const preferred = preferredStructure(contract);
  const selected = preferred
    ? available.find((candidate) => candidate.direction.structure === preferred) ?? available[0]
    : available[0];
  const matchedPreference = preferred !== null && selected.direction.structure === preferred;
  const reason = preferred === null
    ? '合同未指定候选拓扑，按原序稳定选择'
    : matchedPreference
      ? `合同偏向 ${structureLabel(preferred)}，已命中`
      : `合同偏向 ${structureLabel(preferred)}，无可用命中项，按原序回退`;

  return { candidate: selected, preferredStructure: preferred, matchedPreference, reason };
}
