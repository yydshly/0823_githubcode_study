import { describe, expect, it } from 'vitest';
import { assessProductExperienceQuality } from '../src/generation/product-experience-quality.ts';
import { createVisualReviewPlan } from '../src/generation/visual-review-plan.ts';
import { hasExplicitBranchingConfluenceIntent } from '../src/v2/branching-confluence.ts';
import { createCodexExecutionBrief } from '../src/v2/codex-execution-brief.ts';
import { buildV2AuthoringPrompt, createV2CreativeContract } from '../src/v2/creative-contract.ts';
import {
  createDirectCreativeAuthorPackage,
  serializeDirectCreativeAuthorPackage
} from '../src/v2/direct-creative-author-package.ts';
import { createDirectCreativeRunFromContractV2 } from '../src/v2/direct-creative-protocol.ts';
import {
  macroSkeletonSchema,
  reviewMacroStructureContentFit
} from '../src/v2/macro-skeleton-inertia.ts';
import { summarizeV2CreativeContract } from '../src/v2/workbench-contract-summary.ts';

export const r129BranchingConfluenceBrief = [
  '为一场虚构的城市高彩接力演练设计动态网页。',
  '四支颜色队伍从屏幕四边进入同一交接区；访客选择一支队伍，再选择“提前交棒/压线交棒”路线，同一根接力棒沿不同轨迹移动，交接区重叠、节奏和最终队形产生可见差异，随后两条路线汇合到“保存这次交接方案”。',
  '画面明亮、高彩、像运动图形海报，不要参数工作台、卡片目录、中央产品或长滚动。',
  '结果只作为视觉编排模拟，不冒充真实赛事成绩。'
].join('');

describe('R129 branching-confluence product routing', () => {
  it('routes the explicit choice, two paths and confluence before map or direct-workbench fallbacks', () => {
    const contract = createV2CreativeContract(r129BranchingConfluenceBrief);

    expect(contract.intent.primaryAction).toBe('保存这次交接方案');
    expect(contract.experience).toMatchObject({
      pattern: 'editorial-field',
      structure: {
        mode: 'branching-confluence',
        segmentPolicy: 'content-derived'
      }
    });
    expect(contract.experience.beats.map((beat) => beat.id)).toEqual([
      'confluence-field',
      'branch-subject-choice',
      'branch-route-choice',
      'branch-visible-consequence',
      'branch-confluence-action'
    ]);
    expect(contract.experience.structure.layoutRule).toMatch(/两条路线可独立重放.*汇合到同一最终行动/);
    expect(contract.experience.structure.layoutRule).toMatch(/不生成持久参数工作台、卡片目录或长滚动章节/);
    expect(contract.experience.beats[3]?.visibleState).toMatch(/轨迹、关系、节奏和最终构图/);
    expect(contract.experience.beats[4]?.visibleState).toMatch(/保留当前对象、所选路线及其可见后果/);
    expect(contract.assets).toContainEqual(expect.objectContaining({
      id: 'branching-confluence-field',
      role: 'subject',
      modality: 'procedural',
      required: true,
      integration: 'native-procedural'
    }));
  });

  it('keeps the branch as contextual direct navigation with a shared visible subject', () => {
    const contract = createV2CreativeContract(r129BranchingConfluenceBrief);

    expect(contract.technical.styleDiversity).toMatchObject({
      fingerprint: {
        composition: 'typographic-canvas',
        motion: 'state-switch',
        spatial: 'flat-editorial',
        typography: 'display-condensed'
      },
      structureDirection: {
        experienceForm: 'branching-confluence',
        workbenchPolicy: 'forbidden',
        surfaceArchetype: 'playful-exploration',
        controlVisibility: 'contextual',
        interactionStyle: 'direct-control'
      }
    });
    expect(contract.direction.interaction).toMatchObject({
      primaryInput: 'direct-navigation',
      pointerRole: 'primary',
      semanticAction: expect.stringMatching(/两条.*路线.*共同汇合行动/)
    });
    expect(contract.direction.renderer).toMatchObject({
      route: 'dom-only',
      enhancement: 'none'
    });
    expect(contract.technical.placeGrounding).toMatchObject({
      selected: false,
      strategy: 'none',
      requirements: { map: 'avoid' }
    });
    expect(contract.technical.semanticInteraction.selected).toBe(true);
    expect(contract.acceptance.find((item) => item.id === 'semantic-state-consistent')?.assertion)
      .toMatch(/两条路线都可返回重放.*汇合到同一行动/);
  });

  it('propagates branching-confluence through execution, authoring, protocol, summary and product quality', () => {
    const contract = createV2CreativeContract(r129BranchingConfluenceBrief);
    const execution = createCodexExecutionBrief(contract);
    const authorPackage = createDirectCreativeAuthorPackage(contract);
    const run = createDirectCreativeRunFromContractV2(contract);
    const summary = summarizeV2CreativeContract(contract);
    const quality = assessProductExperienceQuality(contract);
    const reviewPlan = createVisualReviewPlan(contract);
    const serializedPackage = serializeDirectCreativeAuthorPackage(authorPackage);

    expect(execution.story.structure.mode).toBe('branching-confluence');
    expect(execution.authoring.primaryJourney).toMatchObject({
      input: 'direct-navigation',
      stateBinding: 'branching-confluence-state',
      markers: { control: 'data-signal-primary-control' }
    });
    expect(run).toMatchObject({
      creativeProtocolVersion: 2,
      selectedDirection: { experienceForm: 'branching-confluence' },
      interactionRationale: { mode: 'direct' }
    });
    expect(authorPackage.runSeed.interaction.mode).toBe('direct');
    expect(authorPackage.evidenceRequirements.profile.requiredCheckpoints).toEqual([
      'opening', 'core', 'mobile', 'interaction'
    ]);
    expect(summary).toMatchObject({
      structureMode: 'branching-confluence',
      storyBeatCount: 5
    });
    expect(summary.styleDifference).toContain('分支汇合场');
    expect(quality).toMatchObject({
      status: 'pending',
      structureMode: 'branching-confluence',
      expectedStateCount: 5
    });
    expect(quality.summary).toContain('分支汇合');
    expect(reviewPlan).toMatchObject({
      source: 'creative-contract',
      journeyMode: 'direct-state',
      rendererRoute: 'dom-only'
    });
    expect(execution.visualAmbition).toMatchObject({
      rendering: { primary: 'svg' },
      spatialDepth: { mode: 'layered-2d' },
      assetCredibility: { level: 'conceptual-coherent' }
    });
    expect(reviewPlan.checkpoints.some((checkpoint) => checkpoint.action === 'semantic-probe')).toBe(true);
    expect(serializedPackage).toContain('story.structure.mode=branching-confluence');
    expect(buildV2AuthoringPrompt(contract)).toContain('两条可独立重放且具有主题专属可见后果的路线');
  });

  it('accepts branching-confluence as a non-workbench macro skeleton', () => {
    const candidate = macroSkeletonSchema.parse({
      runId: 'direct-r129-relay-confluence',
      layout: 'branching-confluence',
      persistentControlPanel: false,
      visibleParameterControls: false,
      realtimeMetricCluster: false,
      primaryAction: 'save-configuration'
    });
    const review = reviewMacroStructureContentFit({
      candidate,
      recent: [],
      contentEvidence: {
        concurrentParameterCount: 0,
        realtimeFeedbackRequired: false,
        primaryActionDependsOnCurrentState: true,
        persistentControlsExplicitlyRequested: false,
        rationale: '两个上下文选择决定路线后果并汇合到保存行动，不需要并发参数或持久面板。'
      }
    });

    expect(review).toMatchObject({
      persistentWorkbench: false,
      contentJustified: true,
      verdict: 'pass',
      findingCode: null
    });
  });

  it.each([
    '为城市饮水点设计地图，选择站点后查看一条步行路线，最后找到最近的饮水点。',
    '为青年雕塑家的两件作品设计页面，选择一件查看详情并预约参观。',
    '为社区活动设计普通网页，不要分支、两条路径或汇合叙事。',
    '展示两条路线最终汇合到终点，但访客不需要作出选择。',
    '选择一种明信片版式并保存当前结果。'
  ])('does not infer branching-confluence without all three explicit semantics: %s', (brief) => {
    expect(hasExplicitBranchingConfluenceIntent(brief)).toBe(false);
    expect(createV2CreativeContract(brief).experience.structure.mode).not.toBe('branching-confluence');
  });

  it('does not disturb R128 catalog, R125/R127 spatial journeys or legacy direct interaction', () => {
    const catalog = createV2CreativeContract(
      '为夜间骑行装备学习者设计反光材料样本馆。八件材料同时出现，按用途筛选，选择两件并排比较，最后收藏这组材料。不要中央产品或持久参数面板。'
    );
    const iceCore = createV2CreativeContract(
      '为普通访客设计冰芯来信网页。向下滚动依次穿过同一冰芯的气泡、火山灰与花粉层，形成有深度的空间旅程，最后写一封给未来的信。'
    );
    const roofWater = createV2CreativeContract(
      '为住户设计一滴水的屋顶路线网页。滚动让同一滴水从屋檐进入天沟、蓄水箱和花园，持续建筑剖面保持可见，最后规划我的屋顶路线。'
    );
    const direct = createV2CreativeContract(
      '为陶艺创作者设计釉色实验网页。调整氧化铁、长石和灰釉比例并选择温度时，同一器物的颜色、光泽和裂纹同步变化，最后保存当前配方。'
    );

    expect(catalog.experience.structure.mode).toBe('catalog');
    expect(iceCore.experience.structure.mode).not.toBe('branching-confluence');
    expect(roofWater.experience.structure.mode).not.toBe('branching-confluence');
    expect(roofWater.direction.interaction.primaryInput).toBe('scroll');
    expect(direct.experience.structure.mode).toBe('interactive-field');
    expect(direct.technical.styleDiversity.structureDirection.experienceForm).toBe('direct-workbench');
  });
});
