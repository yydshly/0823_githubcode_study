import { describe, expect, it } from 'vitest';
import {
  selectCreativeCandidate,
  type CreativeCandidateSelectionInput,
} from '../src/generation/creative-candidate-selection.ts';
import type { CreativeStructure } from '../src/generation/schema.ts';
import { createV2CreativeContract, type V2CreativeContract } from '../src/v2/creative-contract.ts';

type ExperienceForm = V2CreativeContract['technical']['styleDiversity']['structureDirection']['experienceForm'];
type StructureMode = V2CreativeContract['experience']['structure']['mode'];
type ControlVisibility = V2CreativeContract['technical']['styleDiversity']['structureDirection']['controlVisibility'];

const baseContract = createV2CreativeContract(
  '为一个安静的材料故事设计具有清晰视觉主体和行动入口的网页体验。',
);

function contractWith(
  form: ExperienceForm,
  mode: StructureMode,
  brief = baseContract.brief,
  controlVisibility: ControlVisibility = baseContract.technical.styleDiversity.structureDirection.controlVisibility,
): V2CreativeContract {
  return {
    ...baseContract,
    brief,
    experience: {
      ...baseContract.experience,
      structure: { ...baseContract.experience.structure, mode },
    },
    technical: {
      ...baseContract.technical,
      styleDiversity: {
        ...baseContract.technical.styleDiversity,
        structureDirection: {
          ...baseContract.technical.styleDiversity.structureDirection,
          experienceForm: form,
          controlVisibility,
        },
      },
    },
  };
}

function candidate(
  id: string,
  structure: CreativeStructure,
  blockedAt?: 'assetPlan' | 'productionPlan' | 'presentationStrategy',
): CreativeCandidateSelectionInput {
  return {
    id,
    direction: { structure },
    assetPlan: { status: blockedAt === 'assetPlan' ? 'blocked' : 'ready' },
    productionPlan: { status: blockedAt === 'productionPlan' ? 'blocked' : 'ready' },
    presentationStrategy: { status: blockedAt === 'presentationStrategy' ? 'blocked' : 'ready' },
  };
}

const candidates = [
  candidate('focused', 'focus'),
  candidate('guided', 'journey'),
  candidate('branched', 'branching'),
];

describe('contract-aware creative candidate selection', () => {
  it('prefers focused only for a persistent direct workbench with grounded concurrent task evidence', () => {
    const selection = selectCreativeCandidate(candidates, contractWith(
      'direct-workbench',
      'interactive-field',
      '为投影安装设计校准工作台，同时调整距离、安装高度和偏角；画面尺寸、梯形与亮度实时同步更新，最后保存当前摆放方案。',
      'persistent',
    ));

    expect(selection?.candidate.id).toBe('focused');
    expect(selection?.preferredStructure).toBe('focus');
  });

  it.each(['continuous-canvas', 'interactive-field', 'task-flow'] as const)(
    'does not treat %s as focused without grounded persistent-workbench evidence',
    (mode) => {
      const selection = selectCreativeCandidate([
        candidate('guided-first', 'journey'),
        candidate('focused-second', 'focus'),
      ], contractWith(
        'direct-workbench',
        mode,
        '为社区活动设计一个可操作页面，查看内容后完成报名。',
        'persistent',
      ));

      expect(selection?.candidate.id).toBe('guided-first');
      expect(selection?.preferredStructure).toBeNull();
    },
  );

  it('does not prefer focus when strong task evidence has only contextual controls', () => {
    const selection = selectCreativeCandidate([
      candidate('guided-first', 'journey'),
      candidate('focused-second', 'focus'),
    ], contractWith(
      'direct-workbench',
      'interactive-field',
      '为投影安装设计校准工作台，同时调整距离、安装高度和偏角；画面尺寸、梯形与亮度实时同步更新，最后保存当前摆放方案。',
      'contextual',
    ));

    expect(selection?.candidate.id).toBe('guided-first');
    expect(selection?.preferredStructure).toBeNull();
  });

  it('does not automatically focus a spatial inspection surface', () => {
    const selection = selectCreativeCandidate([
      candidate('guided-first', 'journey'),
      candidate('focused-second', 'focus'),
    ], contractWith(
      'spatial-inspection',
      'continuous-canvas',
      '检查一件真实 GLB 展品，自由旋转并查看内部结构。',
      'contextual',
    ));

    expect(selection?.candidate.id).toBe('guided-first');
    expect(selection?.preferredStructure).toBeNull();
  });

  it.each([
    ['continuous-stage', 'single-scene'],
    ['spatial-atlas', 'guided-sequence'],
    ['editorial-evidence', 'single-scene'],
    ['typographic-sonic-field', 'single-scene'],
    ['spatial-atlas', 'editorial-flow'],
  ] as const)('prefers guided for %s / %s', (form, mode) => {
    const selection = selectCreativeCandidate(candidates, contractWith(form, mode));
    expect(selection?.candidate.id).toBe('guided');
    expect(selection?.preferredStructure).toBe('journey');
  });

  it('lets explicit branching or an object field override a focused mode', () => {
    const objectField = selectCreativeCandidate(candidates, contractWith('object-field', 'interactive-field'));
    const explicitChoice = selectCreativeCandidate(candidates, contractWith(
      'direct-workbench',
      'task-flow',
      'Create a branching choice experience with two paths that reunite at the final action.',
      'persistent',
    ));

    expect(objectField?.candidate.id).toBe('branched');
    expect(explicitChoice?.candidate.id).toBe('branched');
  });

  it.each(['assetPlan', 'productionPlan', 'presentationStrategy'] as const)(
    'never selects a candidate blocked by %s',
    (blockedAt) => {
      const selection = selectCreativeCandidate([
        candidate('blocked-guided', 'journey', blockedAt),
        candidate('available-focused', 'focus'),
      ], contractWith('continuous-stage', 'guided-sequence'));

      expect(selection?.candidate.id).toBe('available-focused');
      expect(selection?.matchedPreference).toBe(false);
    },
  );

  it('returns null when every candidate is blocked', () => {
    expect(selectCreativeCandidate([
      candidate('blocked-one', 'focus', 'assetPlan'),
      candidate('blocked-two', 'journey', 'productionPlan'),
    ], contractWith('direct-workbench', 'task-flow'))).toBeNull();
  });

  it('preserves original order as a stable tie-break', () => {
    const tied = [candidate('first', 'focus'), candidate('second', 'branching')];
    const contract = contractWith('spatial-atlas', 'single-scene');

    expect(selectCreativeCandidate(tied, contract)?.candidate.id).toBe('first');
    expect(selectCreativeCandidate(tied, contract)?.candidate.id).toBe('first');
  });
});
