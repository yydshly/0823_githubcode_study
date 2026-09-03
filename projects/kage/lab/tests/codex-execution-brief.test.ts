import { describe, expect, it } from 'vitest';
import { createCodexExecutionBrief, serializeCodexAuthoringBrief } from '../src/v2/codex-execution-brief.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';

const brief = '为一款帮助人记录梦境的产品设计网页。开场像刚醒来的模糊房间，滚动时记忆碎片逐渐形成可探索空间，最后收束为记录今晚的梦。安静、真实，不要紫色科技风和随机粒子。';
const clockBrief = '为一座城市公共钟表修复档案设计交互网页。开场是一张明亮的修复工作台总览；滚动或拖动时间轴时，同一枚机械钟表从锈蚀、拆解、校准到重新走时连续变化，文字同步解释修复证据，最后行动为预约开放工作日。真实、温暖、编辑档案感，不要暗色科技风、巨型标题或随机粒子。';

describe('Codex execution brief', () => {
  it('preserves execution-critical creative and acceptance boundaries', () => {
    const contract = createV2CreativeContract(brief);
    const execution = createCodexExecutionBrief(contract);

    expect(execution.contractId).toBe(contract.id);
    expect(execution.goal.subject).toBe(contract.intent.subject);
    expect(execution.goal.action).toBe(contract.intent.primaryAction);
    expect(execution.visualAmbition).toMatchObject({
      intentLevel: 'immersive',
      heroMoment: { appearsWithinSeconds: 5 }
    });
    expect(execution.creativeDirection).toMatchObject({
      sourcePolicy: 'open-best-fit',
      noGlobalStyleRules: true,
      selectionRule: 'one-direction-lead-plus-purposeful-support'
    });
    expect(execution.instructions.hard.every((instruction) => (
      instruction.source === 'user' || instruction.source === 'quality'
    ))).toBe(true);
    expect(execution.instructions.advisory).toContainEqual(expect.objectContaining({
      source: 'reference',
      strength: 'advisory'
    }));
    expect(execution.story.beats).toHaveLength(contract.experience.beats.length);
    expect(execution.story.structure).toEqual(contract.experience.structure);
    expect(execution.story.continuity).toBe(contract.experience.continuityRule);
    expect(execution.direction.renderer.route).toBe(contract.direction.renderer.route);
    expect(execution.references[0]).toMatchObject({
      id: 'positive-dream-room-memory',
      category: 'continuous-asset-story',
      borrow: execution.references[0]?.positiveBorrowPrinciples
    });
    expect(execution.references[0]?.evidenceArtifacts[0]?.verified).toBe(true);
    expect(execution.references[0]).not.toHaveProperty('avoid');
    expect(execution.references[0]?.advisoryRisks.length).toBeGreaterThan(0);
    expect(execution.assets[0]?.responsibility).toBe(contract.assets[0]?.visualResponsibility);
    expect(execution.acceptance.some((check) => check.priority === 'blocker')).toBe(true);
    expect(execution.story.visualAnchor.relationshipToBrief).toContain(execution.goal.subject);
    expect(execution.story.visualAnchor.fallback).toContain('通用网格');
    expect(execution.limits.authoringPasses).toBe(1);
    expect(execution.technical.selectedCapabilities).toContain('media-scroll-scrub');
  });

  it('removes research payload and materially reduces the Codex input', () => {
    const contract = createV2CreativeContract(brief);
    const full = JSON.stringify(contract);
    const compact = serializeCodexAuthoringBrief(contract);

    expect(compact).not.toContain('sourceCaseIds');
    expect(compact).not.toContain('sourceUrl');
    expect(compact).not.toContain('evaluatedCapability');
    expect(compact.length).toBeLessThan(full.length * 0.85);
    expect(new TextEncoder().encode(compact).byteLength).toBeLessThan(24 * 1024);
  });

  it('passes place truth and creative-freedom boundaries to Codex only when geography matters', () => {
    const mapContract = createV2CreativeContract(
      '为城市公共饮水点设计地图，选择站点时更新水质、距离和开放状态，找到最近的饮水点。'
    );
    const mapExecution = createCodexExecutionBrief(mapContract);
    const productExecution = createCodexExecutionBrief(createV2CreativeContract(
      '为独立创作者的声音记录产品设计安静、真实的发布网页。'
    ));

    expect(mapExecution.technical.selectedCapabilities).toContain('place-grounded-experience');
    expect(mapExecution.technical.placeGrounding).toMatchObject({
      strategy: 'real-geography-evidence',
      geography: 'real-grounded',
      map: 'required'
    });
    expect(mapExecution.technical.placeGrounding?.dataTruth).toContain('模型不得虚构为事实');
    expect(productExecution.technical.placeGrounding).toBeNull();
  });

  it('passes the shared-state driver only for an explicitly multi-source interaction', () => {
    const driven = createCodexExecutionBrief(createV2CreativeContract(
      '为候鸟风洞设计教学模拟网页，提供自动演示，鼠标滚轮与三个参数滑块驱动同一飞行状态，手动操作停止演示，最后保存观察。'
    ));
    const ordinary = createCodexExecutionBrief(createV2CreativeContract(
      '为梦境记录产品设计连续滚动网页，同一房间逐渐清晰，最后开始记录。'
    ));

    expect(driven.technical.selectedCapabilities).toContain('shared-state-interaction-driver');
    expect(driven.technical.interactionDriver).toMatchObject({
      modes: ['manual', 'scroll', 'demo'],
      demoControl: 'bounded-play-pause-reset',
      scrollMapping: 'real-scroll-range-to-shared-state'
    });
    expect(ordinary.technical.selectedCapabilities).not.toContain('shared-state-interaction-driver');
    expect(ordinary.technical.interactionDriver).toBeNull();
  });

  it('passes required audio feedback only when listening is part of the product task', () => {
    const soundboard = createCodexExecutionBrief(createV2CreativeContract(
      '为制琴师设计云杉音板调音台，调整厚度时同步更新频率、共振与敲击听感，并提供 A/B 声音对比，最后保存方案。'
    ));
    const garden = createCodexExecutionBrief(createV2CreativeContract(
      '为社区花园开放日设计明亮网页，查看活动并完成报名。'
    ));

    expect(soundboard.technical.selectedCapabilities).toContain('product-semantic-audio-feedback');
    expect(soundboard.technical.productSemanticFeedback).toMatchObject({
      route: 'synthesized-web-audio',
      stateBinding: 'same-causal-state-as-visual-result',
      comparison: 'a-b-or-before-after'
    });
    expect(garden.technical.selectedCapabilities).not.toContain('product-semantic-audio-feedback');
    expect(garden.technical.productSemanticFeedback).toBeNull();
  });

  it('compiles a complete causal journey for a scroll page even without semantic-interaction routing', () => {
    const contract = createV2CreativeContract(clockBrief);
    const execution = createCodexExecutionBrief(contract);
    const compact = JSON.parse(serializeCodexAuthoringBrief(contract));

    expect(contract.intent.subject).toBe('机械钟表');
    expect(contract.technical.semanticInteraction.selected).toBe(false);
    expect(execution.authoring.primaryJourney).toMatchObject({
      input: 'scroll',
      stateBinding: 'single-causal-state',
      finalAction: '预约开放工作日',
      markers: {
        visualAnchor: 'data-signal-visual-anchor',
        control: 'data-signal-primary-control',
        result: 'data-signal-primary-result',
        action: 'data-signal-primary-action'
      }
    });
    expect(execution.authoring.primaryJourney.operation).toContain('滚动或拖动时间轴');
    expect(execution.authoring.primaryJourney.visibleSubjectDelta).toContain('重新走时');
    expect(execution.authoring.primaryJourney.businessResult).toContain('修复证据');
    expect(execution.authoring.subjectContinuity.identityInvariant).toContain('同一对象身份');
    expect(execution.authoring.subjectContinuity.framingRule).toContain('规范化主体框');
    expect(execution.authoring.subjectContinuity.framingRule).toContain('安全裁切');
    expect(execution.authoring.subjectContinuity.forbiddenSubstitutes).toContain('crop-jump');
    expect(compact.authoring).toEqual(execution.authoring);
    expect(compact.visualAmbition).toMatchObject({
      intentLevel: execution.visualAmbition.intentLevel,
      hero: {
        title: execution.visualAmbition.heroMoment.title,
        withinSeconds: execution.visualAmbition.heroMoment.appearsWithinSeconds
      },
      rendering: {
        primary: execution.visualAmbition.rendering.primary
      },
      depth: {
        mode: execution.visualAmbition.spatialDepth.mode
      },
      interactions: execution.visualAmbition.interactionToScene.map((mapping) => ({
        input: mapping.input,
        response: mapping.sceneResponse
      }))
    });
    expect(compact.visualAmbition).not.toHaveProperty('intentRationale');
    expect(compact.visualAmbition).not.toHaveProperty('motionArc');
    expect(compact).not.toHaveProperty('acceptance');
  });

  it('sends the bounded authoring packet with one authoritative medium decision', () => {
    const contract = createV2CreativeContract(
      '为候鸟风洞设计教学模拟网页，提供自动演示，鼠标滚轮与三个参数滑块驱动同一飞行状态，手动操作停止演示，最后保存观察。'
    );
    const compact = JSON.parse(serializeCodexAuthoringBrief(contract));
    const serialized = JSON.stringify(compact);

    expect(Object.keys(compact)).toEqual([
      'schemaVersion', 'contractId', 'exactBrief', 'goal', 'mediumDecision', 'visualAmbition', 'creativeDirection', 'instructions', 'authoring', 'story', 'direction', 'assets', 'references', 'technical', 'limits'
    ]);
    expect(compact.exactBrief).toBe(contract.brief);
    expect(compact.instructions.hard.every((instruction: { source: string }) => (
      instruction.source === 'user' || instruction.source === 'quality'
    ))).toBe(true);
    expect(compact.mediumDecision).toEqual(createCodexExecutionBrief(contract).mediumDecision);
    expect(Object.keys(compact.story)).toEqual(['structure', 'visualAnchor', 'beats']);
    expect(Object.keys(compact.direction)).toEqual([
      'visualRole', 'renderer', 'mechanisms', 'interaction', 'rejected'
    ]);
    expect(compact.technical.styleDiversity).toEqual({
      structureDirection: contract.technical.styleDiversity.structureDirection,
      mustDifferOn: contract.technical.styleDiversity.mustDifferOn
    });
    expect(compact.technical.selectedCapabilities).toEqual(expect.arrayContaining([
      'shared-state-interaction-driver'
    ]));
    expect(compact.technical.interactionDriver).toBeTruthy();
    expect(compact.references).toHaveLength(1);
    expect(compact.references[0]).toMatchObject({
      id: 'positive-semantic-direct-interaction',
      positiveBorrowPrinciples: expect.any(Array),
      advisoryRisks: expect.any(Array)
    });
    expect(compact.references[0]).not.toHaveProperty('avoid');
    expect(compact.technical).not.toHaveProperty('articulatedSubject');
    expect(compact.technical).not.toHaveProperty('productSemanticFeedback');
    expect(compact.technical).not.toHaveProperty('placeGrounding');
    expect(compact.goal).toBeTruthy();
    expect(Array.isArray(compact.assets)).toBe(true);
    expect(serialized).not.toContain('targetFrameTimeMs');
    expect(serialized).not.toContain('maxInitialAssetBytes');
  });

  it('does not invent a direct control marker for a native-scroll-only journey', () => {
    const execution = createCodexExecutionBrief(createV2CreativeContract(
      '为季节性湿地设计连续滚动网页，同一片芦苇荡随滚动从晨雾逐渐显露迁徙路径，最后行动为查看观测记录。'
    ));

    expect(execution.authoring.primaryJourney.input).toBe('scroll');
    expect(execution.authoring.primaryJourney.markers.control).toBeNull();
    expect(execution.authoring.primaryJourney.markers.result).toBe('data-signal-primary-result');
    expect(execution.authoring.primaryJourney.markers.action).toBe('data-signal-primary-action');
  });
});
