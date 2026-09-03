import { describe, expect, it } from 'vitest';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createCodexExecutionBrief } from '../src/v2/codex-execution-brief.ts';
import { creativeDirectionSpecSchema } from '../src/v2/creative-direction-spec.ts';
import {
  CREATIVE_FREEDOM_POLICY,
  assessCreativePromise
} from '../src/v2/creative-freedom-policy.ts';
import {
  evaluateEffectQualitySelection,
  type EffectDirectionCandidate
} from '../src/v2/effect-quality-selection.ts';
import {
  createDirectCreativeAuthorPackageV5,
  serializeDirectCreativeAuthorPackage
} from '../src/v2/direct-creative-author-package.ts';

const brief = '为一间海边旧书店设计网页，让读者找到一本适合雨天阅读的书并保存今晚的选择。画面温暖、安静，可以大胆决定最合适的表达方法。';

function candidate(
  id: string,
  score: number,
  runtimeRole: EffectDirectionCandidate['runtimeRole'],
  rejectionSignals: EffectDirectionCandidate['rejectionSignals'] = []
): EffectDirectionCandidate {
  return {
    id,
    title: `方向 ${id}`,
    experienceForm: `${id} 建立一种不可互换的书店体验角色。`,
    firstFiveSeconds: `五秒内看见 ${id} 如何让海风、旧书与雨夜形成同一世界。`,
    signaturePhenomenon: `${id} 形成一段能被读者复述的主题专属记忆。`,
    themeMemory: `读者会记住 ${id} 如何帮助自己找到今晚的书。`,
    perceptualJourney: `从走入雨夜书店，到理解选择依据并保存一本适合今晚阅读的书。`,
    runtimeCausality: runtimeRole === 'not-applicable'
      ? `${id} 明确选择编辑式静态构图，运行时变化不承担创意承诺。`
      : `用户选择会改变 ${id} 的空间、书页关系和最终推荐结果。`,
    runtimeRole,
    staticEquivalentTest: runtimeRole === 'not-applicable'
      ? `${id} 的价值来自一幅经过精确编排、静态也成立的编辑画面。`
      : `静态截图无法表达 ${id} 的选择过程与空间变化。`,
    actionClosure: `${id} 最终让读者保存一本与今晚情绪相符的书。`,
    axisScores: {
      'theme-specific-memory': score,
      'sensory-impact': score,
      'surprise-without-confusion': score,
      'runtime-meaning': score,
      'craft-potential': score,
      'action-closure': score
    },
    rejectionSignals
  };
}

describe('V2 creative freedom protection', () => {
  it('keeps methods open beyond the known project catalog', () => {
    const direction = createCodexExecutionBrief(createV2CreativeContract(brief)).creativeDirection;
    const openDirection = creativeDirectionSpecSchema.parse({
      ...direction,
      leadMedium: {
        ...direction.leadMedium,
        medium: 'refracted-paper-shadow-theatre'
      },
      supportingMedia: [{
        medium: 'spatial-ink-diffusion',
        responsibility: '让书页边缘与海风方向形成主题专属的扩散关系。',
        relationshipToLead: '只强化同一个雨夜选书承诺，不建立第二套视觉主题。',
        planningRole: 'optional-effect-support'
      }]
    });

    expect(openDirection.leadMedium.medium).toBe('refracted-paper-shadow-theatre');
    expect(openDirection.supportingMedia[0]?.medium).toBe('spatial-ink-diffusion');
    expect(openDirection.creativeFreedom).toEqual(CREATIVE_FREEDOM_POLICY);
  });

  it('allows an excellent static editorial promise without penalizing the absence of runtime spectacle', () => {
    const assessment = assessCreativePromise({
      promise: {
        schemaVersion: 1,
        thesis: '把海边旧书店编排成一封可以进入的雨夜编辑信。',
        signatureMoment: '潮湿书页、窗边灯光与推荐短句形成一幅不可互换的封面。',
        expressionStrategy: '以高质量摄影、编辑排版和克制纸张材质承担完整体验。',
        runtimeRole: 'not-applicable',
        chosenMethods: ['editorial-photography', 'asymmetric-type-composition'],
        methodRationale: '产品需要的是可停留阅读的封面感，而不是为了动态而动态。'
      },
      observation: {
        promiseVisible: true,
        signatureMomentDelivered: true,
        productActionConnected: true,
        visualLanguageCohesive: true,
        runtimeChangeObservable: null,
        summary: '最终浏览器画面兑现了静态编辑承诺，选择和保存行动仍然清楚。'
      }
    });

    expect(assessment.passed).toBe(true);
    expect(assessment.reasons).toEqual([]);
  });

  it('treats static equivalence as advisory for a declared static direction', () => {
    const candidates = [
      candidate('editorial-cover', 96, 'not-applicable', ['static-equivalent']),
      candidate('moving-shelves', 89, 'essential'),
      candidate('audio-corridor', 86, 'supporting')
    ] as const;
    const result = evaluateEffectQualitySelection({
      schemaVersion: 1,
      assessmentKind: 'relative-self-assessment-not-final-evidence',
      candidates: [...candidates],
      selectedCandidateId: 'editorial-cover',
      decisionRationale: '静态编辑封面最符合这次产品承诺，技术数量和动态声望不参与评价。'
    });

    expect(result).toMatchObject({
      receiptValid: true,
      mayProceedToResources: true,
      selectedCandidateId: 'editorial-cover'
    });
    expect(result.advisorySignals['editorial-cover']).toEqual(['static-equivalent']);
  });

  it('serializes creative freedom as a project capability rather than a suggestion', () => {
    const authorPackage = createDirectCreativeAuthorPackageV5(createV2CreativeContract(brief));
    const serialized = serializeDirectCreativeAuthorPackage(authorPackage);

    expect(authorPackage.authoringInput.creativeDirection.creativeFreedom).toEqual(CREATIVE_FREEDOM_POLICY);
    expect(authorPackage.evidenceRequirements.creativePromiseReview).toBe('declared-promise-relative');
    expect(serialized).toContain('静态表达本身不扣分');
    expect(serialized).toContain('案例和推断必须可放弃');
    expect(serialized).toContain('可以采用未列出的技术');
  });
});
