import { describe, expect, it } from 'vitest';
import { evaluateAssetQualityGate } from '../src/generation/asset-quality-gate.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';

describe('asset quality gate', () => {
  it('allows a procedural experience to enter Codex authoring immediately', () => {
    const contract = createV2CreativeContract('为一组抽象时间信号设计连续滚动网页，最后进入研究记录。');
    const gate = evaluateAssetQualityGate(contract, []);

    expect(gate).toMatchObject({ decision: 'ready', risk: 'low', requests: [] });
  });

  it('accepts explicit presentable quality evidence for a product subject', () => {
    const contract = createV2CreativeContract('为一款智能声音产品设计安静、真实的发布网页，最后预约体验。');
    const gate = evaluateAssetQualityGate(contract, [{
      id: 'trusted-product', kind: 'image', source: 'chatgpt-generated', qualityLevel: 'L3-presentable', role: 'product hero',
      description: 'A transparent image of the same acoustic product.',
      features: { alpha: 'soft', depth: 'none' }
    }]);

    expect(gate.decision).toBe('ready');
    expect(gate.acceptedAssetIds).toContain('trusted-product');
  });

  it('stops a critical subject when its candidate lacks explicit L3 evidence', () => {
    const contract = createV2CreativeContract('为一款智能声音产品设计安静、真实的发布网页，最后预约体验。');
    const gate = evaluateAssetQualityGate(contract, [{
      id: 'minimax-candidate', kind: 'image', source: 'model-generated', role: 'product hero',
      description: 'A MiniMax candidate product image.',
      features: { alpha: 'binary', depth: 'none' }
    }]);

    expect(gate.decision).toBe('needs-codex-assets');
    expect(gate.requests[0]).toMatchObject({
      requirementId: 'hero-product',
      recommendedSource: 'chatgpt-imagegen',
      minimumQuality: 'L3-presentable'
    });
    expect(gate.requests[0]?.reason).toContain('来源中立');
    expect(gate.requests[0]?.reason).toContain('L2-inspectable');
  });

  it('gives every source the same result for the same quality evidence', () => {
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

    expect(sources.map((source) => evaluateAssetQualityGate(contract, [candidate(source)]).decision))
      .toEqual(sources.map(() => 'needs-codex-assets'));
    expect(sources.map((source) => evaluateAssetQualityGate(contract, [candidate(source, 'L3-presentable')]).decision))
      .toEqual(sources.map(() => 'ready'));
  });

  it('does not promote an unreviewed user upload from L2 to L3 by source alone', () => {
    const contract = createV2CreativeContract('为一款智能声音产品设计安静、真实的发布网页，最后预约体验。');
    const candidate = {
      id: 'uploaded-product', kind: 'image' as const, source: 'user-provided' as const,
      role: 'product hero', description: 'A user uploaded product image.',
      features: { alpha: 'binary' as const, depth: 'none' as const }
    };

    expect(evaluateAssetQualityGate(contract, [candidate]).decision).toBe('needs-codex-assets');
    expect(evaluateAssetQualityGate(contract, [{ ...candidate, qualityLevel: 'L2-inspectable' }]).decision).toBe('needs-codex-assets');
    expect(evaluateAssetQualityGate(contract, [{ ...candidate, qualityLevel: 'L3-presentable' }]).decision).toBe('ready');
  });

  it('does not accept a presentable alpha-subject claim when decoded pixels are opaque', () => {
    const contract = createV2CreativeContract('为一款智能声音产品设计安静、真实的发布网页，最后预约体验。');
    const gate = evaluateAssetQualityGate(contract, [{
      id: 'opaque-product', kind: 'image', source: 'chatgpt-generated', qualityLevel: 'L3-presentable',
      role: 'product hero', description: 'Opaque pixels with a claimed transparent subject role.',
      features: { alpha: 'none', depth: 'none' }
    }]);

    expect(gate.decision).toBe('needs-codex-assets');
    expect(gate.acceptedAssetIds).not.toContain('opaque-product');
  });

  it('requires a user or licensed source for a real 3D model', () => {
    const contract = createV2CreativeContract('为声学设备设计网页，必须使用真实 GLB 拆解内部结构，并允许自由旋转检查。');
    const gate = evaluateAssetQualityGate(contract, []);

    expect(gate.decision).toBe('needs-codex-assets');
    expect(gate.requests[0]?.recommendedSource).toBe('user-or-licensed');
  });

  it('exposes at most four stable critical requests instead of expanding the recovery batch', () => {
    const base = createV2CreativeContract('为一款智能声音产品设计安静、真实的发布网页，最后预约体验。');
    const seed = base.assets.find((asset) => asset.required && asset.modality !== 'procedural');
    expect(seed).toBeTruthy();
    const contract = {
      ...base,
      assets: [
        { ...seed!, id: 'atmosphere-layer-a', role: 'atmosphere' as const },
        { ...seed!, id: 'atmosphere-layer-z', role: 'atmosphere' as const },
        { ...seed!, id: 'environment-layer', role: 'environment' as const },
        { ...seed!, id: 'information-layer', role: 'information' as const },
        { ...seed!, id: 'subject-layer', role: 'subject' as const },
      ]
    };

    const gate = evaluateAssetQualityGate(contract, []);

    expect(gate.requests).toHaveLength(4);
    expect(gate.requests.map((request) => request.requirementId)).toEqual([
      'subject-layer', 'environment-layer', 'information-layer', 'atmosphere-layer-a'
    ]);
    expect(gate.summary).toContain('不会循环扩展素材批次');
  });

  it('does not treat an undeclared trusted source as cinematic L4 evidence', () => {
    const contract = createV2CreativeContract('为声学设备设计网页，必须使用真实 GLB 拆解内部结构，并允许自由旋转检查。');
    const candidate = {
      id: 'acoustic-glb', kind: 'model-3d' as const, source: 'licensed' as const,
      role: 'product hero', description: 'A licensed acoustic product model.'
    };

    expect(evaluateAssetQualityGate(contract, [candidate]).decision).toBe('needs-codex-assets');
    expect(evaluateAssetQualityGate(contract, [{ ...candidate, qualityLevel: 'L4-cinematic' }]).decision).toBe('needs-codex-assets');
    expect(evaluateAssetQualityGate(contract, [{
      ...candidate,
      qualityLevel: 'L4-cinematic',
      experience: {
        integration: 'spatial-object',
        stateEvidence: {
          mode: 'model-parts', distinctStates: 3, partGroups: 6,
          proof: 'GLB 包含六个可分离部件和装配、爆炸、闭合三个可检查状态。'
        }
      }
    }]).decision).toBe('ready');
  });

  it('blocks the single L3 joinery environment before Codex authoring', () => {
    const contract = createV2CreativeContract(
      '为普通访客设计古建筑榫卯互动学习网页，真实旧木构件逐步对齐并咬合，随后展示受力路径和修复档案，最后预约拆解课。'
    );
    const gate = evaluateAssetQualityGate(contract, [{
      id: 'joinery-static', kind: 'environment', source: 'chatgpt-generated',
      qualityLevel: 'L3-presentable', role: '榫卯修复工作台', description: '真实旧木构件环境图。',
      experience: {
        integration: 'full-bleed-environment',
        stateEvidence: {
          mode: 'static', distinctStates: 1, partGroups: 0,
          proof: '只证明一张稳定环境图。'
        }
      }
    }]);

    expect(gate.decision).toBe('needs-codex-assets');
    expect(gate.requests[0]?.requirementId).toBe('state-subject');
    expect(gate.requests[0]?.reason).toContain('至少 3 个连续状态');
    expect(gate.requests[0]?.reason).toContain('单张静态图');
  });

  it('accepts a continuous three-state joinery asset with a shared continuity key', () => {
    const contract = createV2CreativeContract(
      '为普通访客设计古建筑榫卯互动学习网页，真实旧木构件逐步对齐并咬合，随后展示受力路径和修复档案，最后预约拆解课。'
    );
    const gate = evaluateAssetQualityGate(contract, [{
      id: 'joinery-sequence', kind: 'video', source: 'user-provided',
      qualityLevel: 'L3-presentable', role: '榫卯连续装配', description: '同机位的分离、进入和闭合状态。',
      experience: {
        integration: 'full-bleed-environment',
        stateEvidence: {
          mode: 'sequence', distinctStates: 3, partGroups: 2, continuityKey: 'joinery-camera-a',
          proof: '分离、进入、闭合三个状态保持同一构件、机位与光线。'
        }
      }
    }]);

    expect(gate.decision).toBe('ready');
    expect(gate.summary).toContain('状态门禁通过');
  });
});
