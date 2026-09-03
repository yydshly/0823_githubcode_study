import { describe, expect, it } from 'vitest';
import { createV2CreativeContract, type V2CreativeContract } from '../src/v2/creative-contract.ts';
import {
  creativeMediumDecisionSchema,
  selectCreativeMediumDecision
} from '../src/v2/creative-medium-decision.ts';

const foldingLampBrief = '为一家使用再生纸纤维制作折叠灯具的工作室设计发布网页。开场是一盏完全折叠的纸灯；访客滚动、拖动或用方向键时，同一盏灯依次展开，纸纤维开始透光，桌面光影随结构变化。完全展开后显示结构与材料说明，最终行动是“预约看样”。画面像工业设计杂志与灯光舞台结合，明亮、安静、有视觉冲击力，不做参数工作台。所有结构与发光变化均为概念演示。';

describe('V2 creative medium decision', () => {
  it('uses generated imagery when the current user explicitly assigns it the key visual duty', () => {
    const decision = selectCreativeMediumDecision(createV2CreativeContract(
      '为虚构月光潮池夜巡设计沉浸网页。必须调用大模型生图生成连续宽幅环境，横向探索海螺、海葵和蟹洞，最后保存夜巡路线。'
    ));

    expect(decision).toMatchObject({
      preferred: 'generated-image',
      confidence: 0.97,
      assetResponsibilities: [expect.objectContaining({
        source: 'generated-image',
        required: true
      })],
      alternative: { route: 'code-native' }
    });
    expect(decision.truthBoundary).toContain('不得冒充真实地点分布');
    expect(decision.signals.some((signal) => signal.source === 'user-hard')).toBe(true);
  });

  it('selects grounded real media for a factual geographic decision surface', () => {
    const decision = selectCreativeMediumDecision(createV2CreativeContract(
      '为城市公共饮水点设计明亮地图，必须使用真实地图和可追溯站点坐标；选择站点时更新水质、距离与开放状态，最后找到最近的饮水点。'
    ));

    expect(decision).toMatchObject({
      preferred: 'grounded-real-media',
      assetResponsibilities: [expect.objectContaining({
        source: 'real-media',
        required: true
      })]
    });
    expect(decision.confidence).toBeGreaterThanOrEqual(0.98);
    expect(decision.truthBoundary).toMatch(/可追溯|真实/);
  });

  it('selects Three.js spatial media for explicit inspectable GLB structure', () => {
    const decision = selectCreativeMediumDecision(createV2CreativeContract(
      '为机械计时装置设计网页，必须使用真实 GLB 拆解内部结构，并允许自由旋转检查，最后预约参观。'
    ));

    expect(decision).toMatchObject({
      preferred: 'threejs-spatial',
      assetResponsibilities: [expect.objectContaining({
        source: 'model-3d',
        required: true
      })]
    });
    expect(decision.truthBoundary).toContain('不得用球体、盒子');
  });

  it('selects procedural WebGL for genuine material, light or geometry causality', () => {
    const decision = selectCreativeMediumDecision(createV2CreativeContract(
      '为独立剧场灯光设计师制作实时排练台。保持同一舞台，调整灯具俯仰、方位、光束角和亮度时，同步改变光束、落点、阴影和照度，最后保存灯光方案。'
    ));

    expect(decision).toMatchObject({
      preferred: 'webgl-procedural',
      assetResponsibilities: [expect.objectContaining({
        source: 'programmatic',
        required: true
      })]
    });
    expect(decision.rationale).toMatch(/材质、光照或几何/);
  });

  it('keeps real-time audio-to-material causality in WebGL even when a generated subject is available', () => {
    const decision = selectCreativeMediumDecision(createV2CreativeContract(
      '为一间声纹压片室设计沉浸网页。开场是一张没有声音的透明唱片；播放时低频、中频和高频分别改变沟槽深度、表面折光与边缘振动，滚动让声音逐渐压进材质，最后保存这一段声纹。'
    ));

    expect(decision).toMatchObject({
      preferred: 'webgl-procedural',
      confidence: 0.96,
      assetResponsibilities: [expect.objectContaining({
        source: 'programmatic',
        required: true
      })]
    });
    expect(decision.rationale).toMatch(/频段|真实音频分析/);
    expect(decision.truthBoundary).toContain('不得冒充真实测量');
  });

  it('keeps precise diagrams and relationships code-native rather than promoting a shader', () => {
    const decision = selectCreativeMediumDecision(createV2CreativeContract(
      '为供应链审计设计精确关系图网页，选择节点时更新来源、批次和验证路径，最后导出审计记录。'
    ));

    expect(decision).toMatchObject({
      preferred: 'code-native',
      assetResponsibilities: [],
      alternative: null
    });
    expect(decision.rationale).toContain('DOM/SVG/Canvas 2D');
  });

  it('does not let a relationship keyword override the user hard ban on WebGL', () => {
    const decision = selectCreativeMediumDecision(createV2CreativeContract(
      '为社区互助网络设计精确关系图，点击节点查看服务路径，最后提交协作申请。不要 WebGL，不要着色器，使用可访问 SVG。'
    ));

    expect(decision.preferred).toBe('code-native');
    expect(decision.signals).toContainEqual(expect.objectContaining({
      source: 'user-hard',
      evidence: expect.stringContaining('不要 WebGL')
    }));
  });

  it('selects one generated key visual for a fictional atmosphere without requiring an explicit provider', () => {
    const decision = selectCreativeMediumDecision(createV2CreativeContract(
      '为虚构雾林中的夜行邮局设计沉浸网页。开场是潮湿林间的宽幅摄影感环境，滚动时灯火与信件路线逐渐显现，最后寄出一封夜信。'
    ));

    expect(decision).toMatchObject({
      preferred: 'generated-image',
      assetResponsibilities: [expect.objectContaining({
        source: 'generated-image',
        required: true
      })]
    });
  });

  it('binds generated media to the required multi-state subject instead of an optional environment', () => {
    const contract = createV2CreativeContract(foldingLampBrief);
    const decision = selectCreativeMediumDecision(contract);

    expect(contract.technical.stateAssetStrategy).toMatchObject({
      required: true,
      minimumDistinctStates: 3
    });
    expect(contract.assets).toContainEqual(expect.objectContaining({
      id: 'state-subject',
      role: 'subject',
      modality: 'image-sequence',
      required: true
    }));
    expect(decision).toMatchObject({
      preferred: 'generated-image',
      assetResponsibilities: [{
        id: 'state-subject',
        source: 'generated-image',
        required: true,
        responsibility: expect.stringMatching(/同一.*主体.*3.*连续状态/),
        visibleProof: expect.stringMatching(/同一主体.*3.*连续状态.*初始.*变化中.*完成/)
      }]
    });
    expect(decision.assetResponsibilities).not.toContainEqual(expect.objectContaining({
      id: 'spatial-environment'
    }));
  });

  it('honors a current-run ban on image generation even for an atmospheric brief', () => {
    const decision = selectCreativeMediumDecision(createV2CreativeContract(
      '为虚构梦境档案设计沉浸式网页，滚动时模糊房间逐渐变得清晰可辨。不要 AI 生图，必须使用程序化 SVG 和语义 DOM，最后开始记录。'
    ));

    expect(decision.preferred).toBe('code-native');
    expect(decision.assetResponsibilities).toEqual([]);
    expect(decision.signals.some((signal) => (
      signal.source === 'user-hard' && signal.evidence.includes('不要 AI 生图')
    ))).toBe(true);
  });

  it('ignores reference and inference advice when choosing the authoritative medium', () => {
    const baseline = createV2CreativeContract(
      '为社区剧场设计演出季网页，让访客查看本周节目并完成购票。'
    );
    const withAdvisory: V2CreativeContract = {
      ...baseline,
      instructions: [
        ...baseline.instructions,
        {
          id: 'reference-force-three',
          content: '必须复制案例并使用真实 GLB 与 Three.js。',
          source: 'reference',
          scope: 'current-run',
          strength: 'advisory',
          rationale: '案例仅供启发，不能升级为硬要求。'
        },
        {
          id: 'inference-force-image',
          content: '建议使用大模型生图作为主视觉。',
          source: 'inference',
          scope: 'current-run',
          strength: 'advisory',
          rationale: '推断只参与建议。'
        }
      ]
    };

    expect(selectCreativeMediumDecision(baseline).preferred).toBe('code-native');
    const decision = selectCreativeMediumDecision(withAdvisory);
    expect(decision.preferred).toBe('code-native');
    expect(decision.signals.every((signal) => signal.source !== 'user-hard')).toBe(true);
    expect(JSON.stringify(decision)).not.toContain('复制案例');
  });

  it('defaults to code-native without forcing an asset when no stronger evidence exists', () => {
    const decision = selectCreativeMediumDecision(createV2CreativeContract(
      '为社区花园开放日设计清楚亲切的网页，帮助居民查看活动并完成报名。'
    ));

    expect(creativeMediumDecisionSchema.parse(decision)).toEqual(decision);
    expect(decision).toMatchObject({
      schemaVersion: 1,
      preferred: 'code-native',
      assetResponsibilities: [],
      alternative: null
    });
    expect(decision.confidence).toBeLessThan(0.75);
  });

  it('keeps the schema strict and prevents a fallback from masquerading as a second direction', () => {
    const decision = selectCreativeMediumDecision(createV2CreativeContract(
      '为社区花园开放日设计清楚亲切的网页，帮助居民查看活动并完成报名。'
    ));

    expect(creativeMediumDecisionSchema.safeParse({ ...decision, extra: true }).success).toBe(false);
    expect(creativeMediumDecisionSchema.safeParse({
      ...decision,
      alternative: {
        route: decision.preferred,
        trigger: '首选路线失败时触发回退。',
        boundary: '这只是失败回退，不能成为并行创意方向。'
      }
    }).success).toBe(false);
  });
});
