import { describe, expect, it } from 'vitest';
import { createCodexExecutionBrief, serializeCodexAuthoringBrief } from '../src/v2/codex-execution-brief.ts';
import { createV2CreativeContract, v2CreativeContractSchema } from '../src/v2/creative-contract.ts';
import {
  selectSpatialProductTopologyCapability,
  spatialProductTopologyCapability,
  staticSpatialProductTopologyDecision
} from '../src/v2/spatial-product-topology-capability.ts';
import { summarizeV2CreativeContract } from '../src/v2/workbench-contract-summary.ts';

const topologyBrief = '为一款可分体的客厅音响设计产品网页。访客可以自由旋转检查同一套音频设备，并在横置、左右分体和壁挂之间切换；箱体、扬声单元、低音腔、连接触点和挂扣必须按真实装配关系重新就位。开启剖视后，访客要能沿声音通路看清每个单元与腔体怎样连接，并试听当前组合对应的程序化声音片段。最终行动是保存这套组合并预约试听。页面中的产品、声路和试听均为概念设计演示，不代表真实产品参数。';

describe('spatial product topology capability', () => {
  it('selects only when one physical product needs persistent multi-pose topology proof', () => {
    const decision = selectSpatialProductTopologyCapability(topologyBrief);

    expect(decision).toMatchObject({
      selected: true,
      capabilityId: spatialProductTopologyCapability.id,
      score: 100,
      evidence: {
        physicalProduct: true,
        persistentIdentity: true,
        poseLabels: ['横置', '左右分体', '壁挂'],
        distinctPoseCount: 3,
        topologyRepositioning: true,
        inspectionModes: ['orbit', 'cutaway']
      },
      blockers: [],
      authoringContract: {
        stateModel: 'single-persistent-assembly-tree',
        minimumDistinctPoses: 3,
        minimumNamedPartGroups: 5,
        transitionPolicy: 'reuse-nodes-transform-only',
        rendererRoute: 'dom-three-hybrid',
        assetPolicy: 'declared-concept-author-generated'
      }
    });
    expect(decision.evidence.namedPartGroups).toEqual(expect.arrayContaining([
      '箱体', '扬声单元', '低音腔', '连接触点', '挂扣'
    ]));
  });

  it.each([
    '为一款音响产品设计说明页，用二维剖面图解释内部结构和箱体、扬声单元、低音腔，最终查看规格。',
    '为一款音响产品设计新品页，加入旋转检查动效展示外观颜色，最后购买。',
    '为一款音响产品设计新品页，主图支持自由旋转检查外观和颜色，最后购买。',
    '为维修课程制作一张静态空间拆解示意图，用编号说明步骤，最后下载讲义。',
    '为一款音响产品设计编辑页，展示一张爆炸视图并说明零件名称，最终下载说明书。',
    '为产品博客写一篇标题为 Orbit Inspection 的二维案例文章，最后订阅专栏。',
    '为音响产品制作杂志文章。同一编辑栏目比较横置、左右分体和壁挂三种图片；附内部结构图、箱体与触点说明，并介绍自由旋转展台的历史，不要求部件重新就位。',
    '为同一套模块音响设计页面，可在横置、左右分体和壁挂之间切换，箱体、连接触点和挂扣持续可见，访客可自由旋转并开启剖视，不要求部件按装配关系重新就位，只切换三张示意图。',
    '为一款音响产品设计二维说明页。不要 Three.js、WebGL 或 3D；只用 SVG 剖面图说明箱体、扬声单元和连接触点。'
  ])('does not let isolated spatial vocabulary select Three.js: %s', (brief) => {
    const contract = createV2CreativeContract(brief);
    const execution = createCodexExecutionBrief(contract);

    expect(contract.technical.spatialProductTopology.selected).toBe(false);
    expect(contract.technical.stateAssetStrategy.route).not.toBe('inspectable-model');
    expect(contract.assets.some((asset) => asset.modality === 'model-3d')).toBe(false);
    expect(contract.technical.sceneComposition.route).not.toBe('spatial-3d');
    expect(contract.direction.renderer.route).not.toBe('dom-three-hybrid');
    expect(execution.mediumDecision.preferred).not.toBe('threejs-spatial');
  });

  it('does not let a high diagnostic score compensate for one missing responsibility axis', () => {
    const decision = selectSpatialProductTopologyCapability(
      '为同一套模块音响设计产品页，可在横置、左右分体和壁挂之间切换；箱体、连接触点和挂扣持续可见，访客可自由旋转并开启剖视。页面只展示各姿态，各部件不发生相对位移。'
    );

    expect(decision.score).toBe(83);
    expect(decision.evidence).toMatchObject({
      physicalProduct: true,
      persistentIdentity: true,
      distinctPoseCount: 3,
      topologyRepositioning: false,
      inspectionModes: ['cutaway']
    });
    expect(decision.selected).toBe(false);
    expect(decision.authoringContract).toBeNull();
  });

  it('lets an explicit WebGL or flat-only constraint override a fully matched topology', () => {
    const blockedBrief = `${topologyBrief} 不支持 WebGL 或 3D，只用 SVG 同状态示意图。`;
    const decision = selectSpatialProductTopologyCapability(blockedBrief);
    const contract = createV2CreativeContract(blockedBrief);
    const execution = createCodexExecutionBrief(contract);

    expect(decision.score).toBe(100);
    expect(decision.selected).toBe(false);
    expect(decision.blockers.length).toBeGreaterThan(0);
    expect(contract.technical.spatialProductTopology.selected).toBe(false);
    expect(contract.direction.renderer.route).not.toBe('dom-three-hybrid');
    expect(execution.mediumDecision.preferred).not.toBe('threejs-spatial');
  });

  it('keeps an explicit inspectable GLB on its existing model route without mislabeling the topology capability', () => {
    const contract = createV2CreativeContract(
      '为机械计时装置设计产品网页，必须使用真实 GLB 拆解内部结构，并允许自由旋转检查，最后预约参观。'
    );
    const execution = createCodexExecutionBrief(contract);

    expect(contract.technical.spatialProductTopology.selected).toBe(false);
    expect(contract.technical.stateAssetStrategy.route).toBe('inspectable-model');
    expect(contract.technical.sceneComposition.route).toBe('spatial-3d');
    expect(execution.mediumDecision.preferred).toBe('threejs-spatial');
  });

  it('passes only the selected topology authoring contract into the compact Codex brief', () => {
    const selected = createV2CreativeContract(topologyBrief);
    const ordinary = createV2CreativeContract(
      '为一款客厅音响设计简洁新品介绍页，说明颜色、价格、配送和售后，最后订阅到货提醒。'
    );
    const selectedExecution = createCodexExecutionBrief(selected);
    const summary = summarizeV2CreativeContract(selected);
    const selectedCompact = JSON.parse(serializeCodexAuthoringBrief(selected));
    const ordinaryCompact = JSON.parse(serializeCodexAuthoringBrief(ordinary));

    expect(selectedExecution.technical.selectedCapabilities).toContain('spatial-product-topology');
    expect(summary.capabilityIds).toContain('spatial-product-topology');
    expect(summary.capabilityLabels).toContain('空间产品拓扑');
    expect(selectedExecution.technical.spatialProductTopology).toMatchObject({
      stateModel: 'single-persistent-assembly-tree',
      transitionPolicy: 'reuse-nodes-transform-only'
    });
    expect(selectedCompact.technical.spatialProductTopology).toEqual(
      selectedExecution.technical.spatialProductTopology
    );
    expect(JSON.stringify(selectedCompact.technical.spatialProductTopology))
      .not.toMatch(/sourceCaseId|rejectionRules|evidence/);
    expect(ordinaryCompact.technical).not.toHaveProperty('spatialProductTopology');
  });

  it('defaults an older stored contract to an unselected topology decision', () => {
    const current = createV2CreativeContract(
      '为社区花园开放日设计明亮网页，查看活动并完成报名。'
    );
    const legacy = structuredClone(current) as unknown as Record<string, unknown>;
    delete (legacy.technical as Record<string, unknown>).spatialProductTopology;

    const parsed = v2CreativeContractSchema.parse(legacy);
    const execution = createCodexExecutionBrief(parsed);

    expect(parsed.technical.spatialProductTopology).toEqual(staticSpatialProductTopologyDecision);
    expect(parsed.technical.spatialProductTopology.selected).toBe(false);
    expect(execution.technical.selectedCapabilities).not.toContain('spatial-product-topology');
  });
});
