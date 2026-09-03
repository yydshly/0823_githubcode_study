import { describe, expect, it } from 'vitest';
import { assessDeliveryQuality } from '../src/generation/delivery-quality.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createVisualReviewPlan } from '../src/generation/visual-review-plan.ts';

const woodblockBrief = '为一间日光木版套印工坊设计沉浸式预约网页。开场是一张悬浮在木桌上、尚未落墨的和纸；滚动时木版纹理、靛蓝墨层与朱红套色依次压下，纸张纤维、压痕和轻微错版逐步显现，最后形成一幅完整的海浪与飞鸟版画，并收束为“预约一次亲手套印”。画面明亮、温暖、手工、具有真实纸墨触感；主体必须是同一张纸上连续发生的套印过程。';

describe('delivery quality assessment', () => {
  it('separates high renderer settings from final asset quality', () => {
    const result = assessDeliveryQuality('high', createV2CreativeContract(woodblockBrief), []);

    expect(result.renderQuality).toBe('high');
    expect(result.achievedAssetQuality).toBe('L2-inspectable');
    expect(result.status).toBe('prototype-only');
    expect(result.finalEligible).toBe(false);
  });

  it('derives external asset quality from explicit evidence rather than source names', () => {
    const contract = createV2CreativeContract('为一款智能声音产品设计安静、真实的发布网页，最后预约体验。');
    const sources = ['chatgpt-generated', 'model-generated', 'user-provided', 'licensed'] as const;
    const candidate = (source: typeof sources[number], qualityLevel?: 'L3-presentable') => ({
      id: `product-${source}`,
      kind: 'image' as const,
      source,
      ...(qualityLevel ? { qualityLevel } : {}),
      role: 'product hero',
      description: 'The same decoded product evidence.',
      features: { alpha: 'soft' as const, depth: 'none' as const }
    });

    const undeclared = sources.map((source) => assessDeliveryQuality('high', contract, [candidate(source)]));
    const declared = sources.map((source) => assessDeliveryQuality('high', contract, [candidate(source, 'L3-presentable')]));

    expect(undeclared.map((result) => result.achievedAssetQuality)).toEqual(sources.map(() => 'L2-inspectable'));
    expect(undeclared.map((result) => result.evidence.includes('asset-gate=needs-codex-assets'))).toEqual(sources.map(() => true));
    expect(declared.map((result) => result.achievedAssetQuality)).toEqual(sources.map(() => 'L3-presentable'));
    expect(declared.map((result) => result.evidence.includes('asset-gate=ready'))).toEqual(sources.map(() => true));
  });

  it('accepts a mixed external package when every asset meets its own contract duty', () => {
    const contract = createV2CreativeContract(
      '为经常短途出行的人设计“登机箱装箱桌”网页。主视觉和持续整理区是一只从斜上方拍摄、摊开在真实木桌上的软壳登机箱；衣物、相机、药盒和水杯是可独立拖动的真实摄影式物件，桌面环境、箱体和近景物件保持相同机位与自然日光的独立分层。用户用鼠标或触摸拖动物品放入、移位或取出，直接改变同一箱内的占用关系；调整装入状态时，重量、安检提醒和装箱单结果同步更新。最终行动是“生成装箱单”。真实桌面摄影质感与旅行杂志式排版；不要暗色科技、孤立中央产品、巨型标题、随机粒子、固定三屏或仪表盘。不限制素材来源，以最终视觉质量和同一行李箱状态连续性为准。'
    );
    const assets = [
      {
        id: 'packing-environment', kind: 'environment' as const, source: 'chatgpt-generated' as const,
        qualityLevel: 'L3-presentable' as const, role: 'packing environment', description: 'Full-bleed oak packing table.',
        experience: { integration: 'full-bleed-environment' as const }
      },
      {
        id: 'packing-suitcase', kind: 'image' as const, source: 'chatgpt-generated' as const,
        qualityLevel: 'L3-presentable' as const, role: 'open suitcase', description: 'Transparent open carry-on suitcase.',
        features: { alpha: 'soft' as const, depth: 'none' as const },
        experience: { integration: 'alpha-subject' as const }
      },
      {
        id: 'packing-foreground', kind: 'image' as const, source: 'chatgpt-generated' as const,
        qualityLevel: 'L3-presentable' as const, role: 'foreground textile', description: 'Transparent foreground textile.',
        features: { alpha: 'soft' as const, depth: 'none' as const },
        experience: { integration: 'alpha-subject' as const }
      },
      {
        id: 'packing-depth', kind: 'texture' as const, source: 'model-generated' as const,
        qualityLevel: 'L2-inspectable' as const, role: 'depth field', description: 'Inspectable aligned depth field.',
        experience: { integration: 'seamless-field' as const }
      }
    ];
    const result = assessDeliveryQuality('high', contract, assets, {
      schemaVersion: 1,
      verdict: 'pass',
      score: 92,
      assetRole: 'integrated',
      summary: '同一装箱桌、行李箱与交互结果在各状态保持连续且清晰。',
      findings: []
    }, {
      mechanical: {
        schemaVersion: 1,
        verdict: 'pass',
        score: 100,
        summary: '结构与交互检查通过。',
        findings: [],
        observations: []
      },
      plan: createVisualReviewPlan(contract)
    });

    expect(result.evidence).toContain('asset-gate=ready');
    expect(result.evidence).toContain('asset-floor=L2-inspectable');
    expect(result.achievedAssetQuality).toBe('L3-presentable');
    expect(result.finalEligible).toBe(true);

    const downgraded = assessDeliveryQuality('high', contract, assets.map((asset) => (
      asset.id === 'packing-suitcase' ? { ...asset, qualityLevel: 'L2-inspectable' as const } : asset
    )));
    expect(downgraded.evidence).toContain('asset-gate=needs-codex-assets');
    expect(downgraded.achievedAssetQuality).toBe('L2-inspectable');
    expect(downgraded.finalEligible).toBe(false);
  });

  it('promotes a procedural subject only after strong visual evidence', () => {
    const contract = createV2CreativeContract(woodblockBrief);
    const result = assessDeliveryQuality('high', contract, [], {
      schemaVersion: 1,
      verdict: 'pass',
      score: 93,
      assetRole: 'integrated',
      summary: '同一张纸贯穿工艺过程，材质细节和套印因果清晰。',
      findings: [],
    }, {
      mechanical: {
        schemaVersion: 1,
        verdict: 'pass',
        score: 100,
        summary: '结构检查通过。',
        findings: [],
        observations: []
      },
      plan: createVisualReviewPlan(contract)
    });

    expect(result.achievedAssetQuality).toBe('L3-presentable');
    expect(result.status).toBe('final-eligible');
    expect(result.finalEligible).toBe(true);
    expect(result.experience).toMatchObject({ status: 'pass', expectedStateCount: 5, reviewedStateCount: 4, archiveEligible: true });
  });

  it('reports visual failure instead of incorrectly blaming an asset that met its target', () => {
    const baseContract = createV2CreativeContract(
      '为普通访客设计古建筑榫卯互动学习网页，使用一张真实木构件摄影照片建立连续空间，最终预约线上拆解课。'
    );
    const contract: ReturnType<typeof createV2CreativeContract> = {
      ...baseContract,
      assets: [{
        id: 'spatial-environment',
        role: 'environment',
        modality: 'image-sequence',
        required: true,
        minimumQuality: 'L3-presentable',
        sourcePriority: ['primary-image-model', 'curated-library'],
        visualResponsibility: '建立可辨认的榫卯修复空间。',
        continuityRule: '木构件、机位和光向保持一致。',
        integration: 'full-bleed-environment',
        visibleProof: '关键状态共享同一木构件与观察方向。',
        fallback: 'dom-only'
      }]
    };
    const result = assessDeliveryQuality('high', contract, [{
      id: 'mortise-tenon-environment',
      kind: 'environment',
      source: 'chatgpt-generated',
      qualityLevel: 'L3-presentable',
      role: '榫卯修复环境',
      description: '真实木构件持续承担结构解释。'
    }], {
      schemaVersion: 1,
      verdict: 'revise',
      score: 68,
      assetRole: 'integrated',
      summary: '低精度程序化几何遮挡了真实木构件。',
      findings: [{ code: 'asset-subordinate', severity: 'major', frameId: 'opening', message: '主素材被几何体压制。' }]
    });

    expect(result.achievedAssetQuality).toBe('L3-presentable');
    expect(result.finalEligible).toBe(false);
    expect(result.summary).toContain('页面视觉验收未通过');
    expect(result.summary).not.toContain('素材当前仅达到');
  });

  it('does not archive a visually accepted assembly when its only evidence is one static image', () => {
    const contract = createV2CreativeContract(
      '为普通访客设计古建筑榫卯互动学习网页，真实旧木构件逐步对齐并咬合，随后展示受力路径和修复档案。'
    );
    const result = assessDeliveryQuality('high', contract, [{
      id: 'joinery-static',
      kind: 'environment',
      source: 'chatgpt-generated',
      qualityLevel: 'L3-presentable',
      role: '榫卯修复环境',
      description: '同一张静态木构件环境图。',
      experience: {
        integration: 'full-bleed-environment',
        stateEvidence: {
          mode: 'static',
          distinctStates: 1,
          partGroups: 0,
          proof: '只证明一张稳定环境图。'
        }
      }
    }], {
      schemaVersion: 1,
      verdict: 'pass',
      score: 94,
      assetRole: 'integrated',
      summary: '页面构图与素材融合通过。',
      findings: []
    }, {
      mechanical: {
        schemaVersion: 1,
        verdict: 'pass',
        score: 100,
        summary: '结构检查通过。',
        findings: [],
        observations: []
      },
      plan: createVisualReviewPlan(contract)
    });

    expect(result.achievedAssetQuality).toBe('L3-presentable');
    expect(result.finalEligible).toBe(false);
    expect(result.evidence).toContain('asset-gate=needs-codex-assets');
    expect(result.summary).toContain('状态资产门禁未通过');
  });
});
