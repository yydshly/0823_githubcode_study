import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createDirectCreativeRunFromContractV4 } from '../src/v2/direct-creative-protocol.ts';
import {
  bindDirectCreativeEffectSelection,
  directCreativeRunSchema,
  recordDirectCreativeAttempt
} from '../src/v2/direct-creative-run.ts';
import type {
  EffectDirectionCandidate,
  EffectQualitySelectionReceipt
} from '../src/v2/effect-quality-selection.ts';

const brief = '把一场夏季雷暴变成可听、可触摸的气象剧场。用户穿过积云、上升气流、电荷分离和降雨四个状态，最终保存一段自己的雷暴合唱谱。';

describe('V2 R152 thunderhead score contract', () => {
  it('binds the highest goal-fit direction before the only asset batch and build', () => {
    const pending = createDirectCreativeRunFromContractV4(createV2CreativeContract(brief));
    const selected = bindDirectCreativeEffectSelection(pending, selectionReceipt());
    const withAsset = recordDirectCreativeAttempt(selected, 'asset-batch');
    const built = recordDirectCreativeAttempt(withAsset, 'build');

    expect(directCreativeRunSchema.parse(built)).toEqual(built);
    expect(built).toMatchObject({
      creativeProtocolVersion: 4,
      selectedDirection: { id: 'thunderhead-cross-section' },
      attemptBudget: { used: { assetBatches: 1, builds: 1 } },
      verdict: 'pending'
    });
  });

  it('uses one generated environment asset as a scene anchor, not as the whole interaction', () => {
    const manifest = JSON.parse(readFileSync(
      'pages/v2/deliveries/thunderhead-score/asset-manifest.json',
      'utf8'
    ));
    const source = readFileSync('pages/v2/deliveries/thunderhead-score/main.ts', 'utf8');

    expect(manifest).toMatchObject({
      attempts: 1,
      assets: [{ source: 'generated', required: true }]
    });
    expect(manifest.assets).toHaveLength(1);
    expect(manifest.runtimeLayers).toEqual(expect.arrayContaining([
      'Canvas wind streamlines',
      'Canvas charge paths',
      'Canvas rain field',
      'Web Audio procedural weather field'
    ]));
    expect(source).toContain("addEventListener('scroll'");
    expect(source).toContain("addEventListener('pointermove'");
    expect(source).toContain('noiseFilter.frequency.setTargetAtTime');
  });
});

function direction(
  id: string,
  title: string,
  form: string,
  phenomenon: string,
  causality: string,
  score: number
): EffectDirectionCandidate {
  return {
    id,
    title,
    experienceForm: form,
    firstFiveSeconds: `五秒内看见${phenomenon}，明确这是一场正在形成的天气。`,
    signaturePhenomenon: phenomenon,
    themeMemory: `用户会记住${phenomenon}，而不是一套通用天气组件。`,
    perceptualJourney: '从看见云体呼吸，到理解上升、电荷和降雨如何共同形成雷暴。',
    runtimeCausality: causality,
    staticEquivalentTest: '静态截图不能同时呈现高度推进、风切反馈、声场能量和保存结果。',
    actionClosure: '完成四个天气乐章后，保存一段由能量和风切决定的雷暴合唱谱。',
    axisScores: {
      'theme-specific-memory': score,
      'sensory-impact': score,
      'surprise-without-confusion': score,
      'runtime-meaning': score,
      'craft-potential': score,
      'action-closure': score
    },
    rejectionSignals: []
  };
}

function selectionReceipt(): EffectQualitySelectionReceipt {
  return {
    schemaVersion: 1,
    assessmentKind: 'relative-self-assessment-not-final-evidence',
    candidates: [
      direction(
        'thunderhead-cross-section',
        '雷暴剖面剧场',
        '持续全屏天气场，用户像进入云体内部。',
        '冷暖云层、电荷路径和雨幕在同一空间中逐步形成。',
        '滚轮改变高度和阶段，指针改变风切，声音随能量连续变化。',
        96
      ),
      direction(
        'bright-weather-atlas',
        '明亮天气图册',
        '横向编辑图册，使用大比例气象排版与折页证据。',
        '天气图层像纸张版面一样展开。',
        '滚轮推动图册，点击展开不同高度的气象证据。',
        78
      ),
      direction(
        'storm-glass-instrument',
        '风暴玻璃仪器',
        '产品微距舞台，一件玻璃仪器占据视觉中心。',
        '玻璃器皿内部形成云和结晶。',
        '拖动温度和压力改变仪器内部材质与读数。',
        73
      )
    ],
    selectedCandidateId: 'thunderhead-cross-section',
    decisionRationale: '雷暴剖面剧场最直接把尺度、运动、声音与形成过程转成可感知体验；选择来自主题适配，而不是机械追求技术数量。'
  };
}
