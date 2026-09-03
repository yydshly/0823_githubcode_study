import { describe, expect, it } from 'vitest';
import {
  articulatedSubjectCapability,
  selectArticulatedSubjectCapability
} from '../src/v2/articulated-subject-capability.ts';
import { createCodexExecutionBrief } from '../src/v2/codex-execution-brief.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';

const newTheme = '为一座记录潮汐方向的抽象机械罗盘设计沉浸式网页。滚动时六片陶瓷翼围绕发光核心逐层展开并完成校准，最后形成完整航向。安静、克制，不要粒子堆积。';
const negativeConstraintTheme = '为一座沿海潮汐观测所设计一枚“潮汐机械罗盘”的沉浸式网页。主视觉是一个不对应真实商品的抽象机械装置，由外环、潮汐翼片、中央浮标核心和刻度骨架组成。滚动时部件从闭合校准逐层展开，指向低潮、涨潮和满潮三个状态；相机、材质、海面反光和灯光共同响应同一进度。最后行动是“查看今晚潮汐窗口”。画面像白昼海事仪器与盐雾蚀刻图，明亮、克制、可信，不要黑金、紫色科技、随机粒子、真实产品冒充或电影式长篇章节。';

describe('procedural articulated subject capability', () => {
  it('selects the capability for a new abstract articulated theme', () => {
    const decision = selectArticulatedSubjectCapability({
      brief: newTheme,
      pattern: 'continuous-scroll'
    });
    expect(decision.selected).toBe(true);
    expect(decision.capabilityId).toBe(articulatedSubjectCapability.id);
    expect(decision.score).toBeGreaterThanOrEqual(75);
  });

  it('rejects the route when a real product asset is required', () => {
    const decision = selectArticulatedSubjectCapability({
      brief: '为真实产品耳机设计网页，使用真实 GLB 精确还原商品型号并拆解内部结构。',
      pattern: 'product-atmosphere'
    });
    expect(decision.selected).toBe(false);
    expect(decision.blockers.length).toBeGreaterThan(0);
  });

  it('compiles the capability into the V2 contract and compact Codex brief', () => {
    const contract = createV2CreativeContract(newTheme);
    const execution = createCodexExecutionBrief(contract);
    expect(contract.technical.presentationStrategy).toBe('procedural-articulated');
    expect(contract.direction.renderer.route).toBe('dom-three-hybrid');
    expect(contract.assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'articulated-subject', modality: 'procedural', required: true })
    ]));
    expect(contract.referenceEvidence[0]?.referenceId).toBe('positive-iris-articulated-reveal');
    expect(execution.technical.selectedCapabilities).toContain('procedural-articulated-subject');
    expect(execution.technical.articulatedSubject?.timeline).toBe('global-progress-to-staggered-local-progress');
    expect(contract.acceptance.some((check) => check.id === 'articulated-causality')).toBe(true);
  });

  it('does not treat a forbidden real-product style as a requested real-product asset', () => {
    const contract = createV2CreativeContract(negativeConstraintTheme);
    const execution = createCodexExecutionBrief(contract);

    expect(contract.intent.negativeConstraints.some((constraint) => constraint.includes('真实产品冒充'))).toBe(true);
    expect(contract.technical.articulatedSubject.selected).toBe(true);
    expect(contract.visualAnchor).toMatchObject({
      heroRole: 'primary-subject',
      source: 'procedural'
    });
    expect(contract.assets).toContainEqual(expect.objectContaining({
      id: 'articulated-subject',
      modality: 'procedural',
      required: true
    }));
    expect(execution.technical.selectedCapabilities).toContain('procedural-articulated-subject');
    expect(contract.intent.subject).toBe('潮汐机械罗盘');
    expect(contract.visualAnchor.subject).toContain('潮汐机械罗盘');
  });
});
