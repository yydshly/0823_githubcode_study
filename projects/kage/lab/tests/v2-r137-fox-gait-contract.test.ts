import { describe, expect, it } from 'vitest';
import { assessProductExperienceQuality } from '../src/generation/product-experience-quality.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createCodexExecutionBrief } from '../src/v2/codex-execution-brief.ts';
import {
  createDirectCreativeAuthorPackage,
  directCreativeAuthorPackageSchema,
  serializeDirectCreativeAuthorPackage
} from '../src/v2/direct-creative-author-package.ts';
import { createDirectCreativeRunFromContractV3 } from '../src/v2/direct-creative-protocol.ts';
import {
  macroSkeletonSchema,
  reviewMacroStructureContentFit,
  type MacroSkeleton
} from '../src/v2/macro-skeleton-inertia.ts';
import {
  positiveReferenceLibrary,
  selectPositiveReferenceEvidence
} from '../src/v2/reference-intelligence.ts';
import { summarizeV2CreativeContract } from '../src/v2/workbench-contract-summary.ts';

export const r137FoxGaitBrief = '为自然教育馆设计一张观察赤狐动作节奏的沉浸式网页。真实可追溯的动画 Fox GLB 始终是空间主体。访客围绕同一只狐选择“侦察 / 行走 / 奔跑”，模型真实切换 Survey、Walk、Run 三套动画，镜头、足迹节距和动作说明同步变化，最终保存一张“我的狐步观察卡”。场景像清晨雪地里的自然纪录片与野外观察手册，明亮、真实，不是暗色科技工作台。页面必须说明这是模型动作演示，不是野外测量数据。';

const repeatedWorkbench = (runId: string): MacroSkeleton => ({
  runId,
  layout: 'single-stage',
  persistentControlPanel: true,
  visibleParameterControls: true,
  realtimeMetricCluster: true,
  primaryAction: 'save-configuration'
});

describe('R137 animated model spatial-inspection contract', () => {
  it('routes the exact brief to one L3 Three.js model inspection instead of a technology workbench', () => {
    const contract = createV2CreativeContract(r137FoxGaitBrief);
    const execution = createCodexExecutionBrief(contract);
    const summary = summarizeV2CreativeContract(contract);
    const productQuality = assessProductExperienceQuality(contract);

    expect(contract.intent.subject).toBe('真实可追溯的动画 Fox GLB');
    expect(contract.intent.primaryAction).toBe('保存一张我的狐步观察卡');
    expect(JSON.stringify(contract)).not.toContain('“保存一张“');
    expect(contract.intent.negativeConstraints.join('')).toContain('不是暗色科技工作台');
    expect(contract.intent.negativeConstraints.join('')).toContain('不是野外测量数据');
    expect(contract.experience).toMatchObject({
      pattern: 'spatial-exploration',
      structure: {
        mode: 'spatial-inspection',
        segmentPolicy: 'content-derived'
      }
    });
    expect(contract.experience.beats.map((beat) => beat.id)).toEqual([
      'inspection-opening',
      'inspection-choice',
      'inspection-evidence',
      'inspection-action'
    ]);
    expect(contract.technical.styleDiversity).toMatchObject({
      fingerprint: {
        palette: 'daylight-neutral',
        motion: 'spatial-inspection',
        media: 'real-3d'
      },
      structureDirection: {
        experienceForm: 'spatial-inspection',
        workbenchPolicy: 'forbidden',
        controlVisibility: 'contextual'
      }
    });
    expect(contract.technical.spatialProductTopology).toMatchObject({
      selected: false,
      capabilityId: null,
      authoringContract: null,
    });
    expect(execution.technical.spatialProductTopology).toBeNull();
    expect(execution.technical.selectedCapabilities).not.toContain('spatial-product-topology');
    expect(contract.assets).toEqual([
      expect.objectContaining({
        id: 'animated-spatial-model',
        role: 'subject',
        modality: 'model-3d',
        required: true,
        minimumQuality: 'L3-presentable',
        fallback: 'block'
      })
    ]);
    expect(contract.visualAnchor.source).toBe('sourced-asset');
    expect(contract.acceptance).toContainEqual(expect.objectContaining({
      id: 'spatial-animation-evidence',
      priority: 'blocker',
      assertion: expect.stringMatching(/animations.*Survey.*Walk.*Run.*clip.*模型动作演示.*野外测量/)
    }));
    expect(contract.technical.stateAssetStrategy).toMatchObject({
      required: true,
      route: 'inspectable-model',
      acceptedModalities: ['model-3d'],
      minimumDistinctStates: 3,
      failurePolicy: 'block-authoring'
    });
    expect(contract.technical.sceneComposition).toMatchObject({
      route: 'spatial-3d',
      required: true,
      failurePolicy: 'block-authoring',
      fallbackRoute: 'block'
    });
    expect(contract.direction).toMatchObject({
      visualRole: 'spatial-object',
      renderer: { route: 'dom-three-hybrid' },
      interaction: {
        primaryInput: 'direct-navigation',
        semanticAction: expect.stringContaining('真实命名动作剪辑')
      }
    });
    expect(execution.mediumDecision).toMatchObject({
      preferred: 'threejs-spatial',
      assetResponsibilities: [expect.objectContaining({
        id: 'animated-spatial-model',
        source: 'model-3d',
        required: true
      })]
    });
    expect(execution.mediumDecision.truthBoundary).toMatch(/模型中实际存在|野外测量/);
    expect(execution.visualAmbition.rendering.primary).toBe('threejs-3d');
    expect(summary).toMatchObject({
      structureMode: 'spatial-inspection',
      rendererRoute: 'dom-three-hybrid',
      stateAssetRoute: 'inspectable-model',
      sceneCompositionRoute: 'spatial-3d',
      sceneCompositionRequired: true,
      storyBeatCount: 4
    });
    expect(productQuality).toMatchObject({
      status: 'pending',
      structureMode: 'spatial-inspection',
      expectedStateCount: 4
    });
  });

  it('selects one narrowly bounded positive pack and borrows only asset, clip, DOM and mobile fallback principles', () => {
    const selected = selectPositiveReferenceEvidence(r137FoxGaitBrief, 'spatial-exploration');

    expect(selected.map((pack) => pack.id)).toEqual([
      'positive-khronos-fox-animation-clips'
    ]);
    expect(selected[0]).toMatchObject({
      category: 'anchored-product-causality',
      macroStructureCategory: 'spatial-inspection',
      source: {
        kind: 'github-source',
        evidenceLevel: 'source-and-runtime-verified'
      }
    });
    const principles = selected[0]!.positiveBorrowPrinciples;
    expect(principles).toHaveLength(4);
    expect(principles[0]).toMatch(/GLB.*来源.*许可.*L3/);
    expect(principles[1]).toMatch(/animations.*clip.*动画混合器/);
    expect(principles[2]).toMatch(/语义 DOM.*Canvas/);
    expect(principles[3]).toMatch(/移动端.*WebGL.*fallback/);
    expect(principles.join('')).not.toMatch(/赤狐|狐步|雪地|清晨|橙色|低多边形/);
    expect(selected.every((pack) => pack.relevanceReason.includes('命中'))).toBe(true);
  });

  it.each([
    '为自然教育馆设计明亮的赤狐科普报名页，介绍栖息地并保存参观预约。',
    '为工业设计馆制作静态产品 GLB 查看器，允许旋转检查材质并预约参观。',
    '为田野课程设计步态记录表，填写观察时间与距离后导出记录。'
  ])('does not inject the animated-clip pack into a low-relevance brief: %s', (brief) => {
    const selected = selectPositiveReferenceEvidence(brief, 'spatial-exploration');
    expect(selected.map((pack) => pack.id)).not.toContain('positive-khronos-fox-animation-clips');
  });

  it('generalizes the spatial-inspection skeleton without embedding fox vocabulary in reusable contracts', () => {
    const contract = createV2CreativeContract(
      '为航空教育馆设计飞行动作检查网页。使用可追溯的动画 GLB，访客选择 Hover / Glide 两个真实命名动作剪辑，模型切换动画，镜头、翼展标注和动作说明同步更新，最后保存观察记录。'
    );

    expect(contract.experience.structure.mode).toBe('spatial-inspection');
    expect(contract.technical.styleDiversity.structureDirection.experienceForm).toBe('spatial-inspection');
    expect(contract.technical.stateAssetStrategy.minimumDistinctStates).toBe(2);
    expect(contract.assets).toContainEqual(expect.objectContaining({
      modality: 'model-3d',
      minimumQuality: 'L3-presentable'
    }));
    expect(JSON.stringify({
      experience: contract.experience,
      assets: contract.assets,
      style: contract.technical.styleDiversity.structureDirection
    })).not.toMatch(/Fox|赤狐|狐步|Survey|Walk|Run/);
  });

  it('accepts spatial-inspection as a non-workbench macro skeleton', () => {
    const candidate = macroSkeletonSchema.parse({
      runId: 'direct-r137-spatial-inspection',
      layout: 'spatial-inspection',
      persistentControlPanel: false,
      visibleParameterControls: false,
      realtimeMetricCluster: false,
      primaryAction: 'record-or-contribute'
    });
    const review = reviewMacroStructureContentFit({
      candidate,
      recent: [
        repeatedWorkbench('direct-r134'),
        repeatedWorkbench('direct-r135'),
        repeatedWorkbench('direct-r136')
      ],
      contentEvidence: {
        concurrentParameterCount: 0,
        realtimeFeedbackRequired: true,
        primaryActionDependsOnCurrentState: true,
        persistentControlsExplicitlyRequested: false,
        rationale: '离散动作选择服务同一模型观察，不需要持久参数面板或指标簇。'
      }
    });

    expect(review).toMatchObject({
      verdict: 'pass',
      persistentWorkbench: false,
      contentJustified: true,
      findingCode: null
    });
  });

  it('carries the exact route and reference boundary into the bounded V3 author package', () => {
    const contract = createV2CreativeContract(r137FoxGaitBrief);
    const execution = createCodexExecutionBrief(contract);
    const run = createDirectCreativeRunFromContractV3(contract);
    const authorPackage = createDirectCreativeAuthorPackage(contract);
    const serialized = serializeDirectCreativeAuthorPackage(authorPackage);

    expect(authorPackage).toMatchObject({
      contractId: contract.id,
      authoringInput: {
        exactBrief: r137FoxGaitBrief,
        mediumDecision: execution.mediumDecision,
        story: {
          structure: { mode: 'spatial-inspection' }
        },
        assets: [expect.objectContaining({
          id: 'animated-spatial-model',
          modality: 'model-3d',
          quality: 'L3-presentable',
          required: true
        })],
        references: [expect.objectContaining({
          id: 'positive-khronos-fox-animation-clips',
          positiveBorrowPrinciples: expect.arrayContaining([
            expect.stringContaining('语义 DOM'),
            expect.stringContaining('移动端')
          ])
        })]
      },
      runSeed: {
        id: run.id,
        creativeProtocolVersion: 3,
        assetStrategy: 'licensed',
        interaction: { mode: 'direct' }
      },
      evidenceRequirements: {
        identityBinding: 'runId+bundleHash',
        macroStructureReview: 'content-fit-required'
      }
    });
    expect(authorPackage.evidenceRequirements.profile.requiredCheckpoints).toContain('interaction');
    expect(serialized).toContain('story.structure.mode=spatial-inspection');
    expect(serialized).toContain('不是野外测量数据');
    expect(serialized).not.toContain('“保存一张“');
    expect(directCreativeAuthorPackageSchema.parse(JSON.parse(
      serialized.slice(serialized.indexOf('{'))
    ))).toEqual(authorPackage);
    expect(positiveReferenceLibrary.some((pack) => (
      pack.id === 'positive-khronos-fox-animation-clips'
      && pack.macroStructureCategory === 'spatial-inspection'
    ))).toBe(true);
  });

  it('does not infer scroll interaction from an explicitly negated scroll clause', () => {
    const contract = createV2CreativeContract(
      `${r137FoxGaitBrief}直接选择动作，不是滚动切换。`
    );
    const run = createDirectCreativeRunFromContractV3(contract);

    expect(run.interactionRationale.mode).toBe('direct');
  });
});
