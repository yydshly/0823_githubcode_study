import { describe, expect, it } from 'vitest';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createDirectCreativeRunFromContractV5 } from '../src/v2/direct-creative-protocol.ts';
import {
  evaluateProductDeliveryReadiness,
  type ProductDeliveryChecks
} from '../src/v2/product-delivery-readiness.ts';

const brief = '为独立创作者设计一款明亮的声音采样产品网页，用户选择一段声音、完成剪辑并保存作品，然后可以继续分享或创建下一段采样。';
const identity = { runId: 'direct-product-proof', bundleHash: 'bundle-product-proof' };

const passingChecks: ProductDeliveryChecks = {
  productIdentityClear: true,
  audienceAndValueClear: true,
  entryStateComplete: true,
  coreUseStateComplete: true,
  resultStateComplete: true,
  continuationStateComplete: true,
  primaryActionProducesMeaningfulResult: true,
  visualAssetsAreFormalOrRuntimeNativeIsJustified: true,
  interactionServesProduct: true,
  mobileJourneyComplete: true,
  truthfulClaims: true
};

describe('V5 product delivery readiness', () => {
  it('adds a four-phase product journey without restricting the creative medium', () => {
    const run = createDirectCreativeRunFromContractV5(createV2CreativeContract(brief));
    expect(run.creativeProtocolVersion).toBe(5);
    expect(run.effectSelectionReceipt).toBeNull();
    expect(run.productDeliveryPlan?.journey.map((step) => step.phase)).toEqual([
      'entry', 'use', 'result', 'continuation'
    ]);
    expect(['formal-source-assets', 'runtime-native-media', 'hybrid'])
      .toContain(run.productDeliveryPlan?.visualAssetPolicy);
  });

  it('does not promote a runnable effect when the result and continuation are only a demo state', () => {
    const plan = createDirectCreativeRunFromContractV5(
      createV2CreativeContract(brief)
    ).productDeliveryPlan!;
    const verdict = evaluateProductDeliveryReadiness(plan, {
      schemaVersion: 1,
      ...identity,
      checks: {
        ...passingChecks,
        resultStateComplete: false,
        continuationStateComplete: false,
        primaryActionProducesMeaningfulResult: false
      },
      summary: '页面能够播放视觉效果，但没有形成可使用、可保存或可继续的产品结果。',
      evidenceNotes: ['进入状态可见', '核心互动可运行', '结果只在本地切换', '没有后续产品路径']
    }, identity);

    expect(verdict.productEligible).toBe(false);
    expect(verdict.reasons.join(' ')).toContain('结果状态');
    expect(verdict.reasons.join(' ')).toContain('后续路径');
  });

  it('accepts any medium when the complete product journey and medium rationale are proven', () => {
    const plan = createDirectCreativeRunFromContractV5(
      createV2CreativeContract(brief)
    ).productDeliveryPlan!;
    const verdict = evaluateProductDeliveryReadiness(plan, {
      schemaVersion: 1,
      ...identity,
      checks: passingChecks,
      summary: '产品身份、核心使用、保存结果、分享或继续路径均在最终页面中真实可用。',
      evidenceNotes: ['产品入口可理解', '声音编辑真实联动', '保存后产生结果', '结果可继续分享或创建']
    }, identity);

    expect(verdict.productEligible).toBe(true);
  });
});

