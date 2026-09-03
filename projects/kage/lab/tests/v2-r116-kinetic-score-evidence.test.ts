import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  createWowGateEvidenceFromBrowserObservations,
  type AdaptiveBrowserWowObservations
} from '../src/v2/adaptive-wow-evidence.ts';
import {
  directCreativeRunSchema,
  isDirectCreativeRunArchiveEligible
} from '../src/v2/direct-creative-run.ts';
import { evaluateFinalCreativeEvidence } from '../src/v2/final-creative-evidence.ts';
import { evaluateWowGateEvidence } from '../src/v2/visual-ambition.ts';

const expectedIdentity = {
  runId: 'direct-kinetic-score-r116',
  bundleHash: 'f9704462453865a29f0d2c902ebf6e72fb7b595e667ab2cc467924b9c66f3040'
};
const evidencePath = new URL(
  '../docs/v2-research/evidence/r116-kinetic-score.direct-creative-run.json',
  import.meta.url
);
const sourceRoot = new URL('../pages/v2/deliveries/kinetic-score/', import.meta.url);

describe('R116 kinetic-score final evidence', () => {
  it('rebuilds browser Wow evidence for the exact final bundle and remains archive eligible', () => {
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));

    expect(run.finalCandidate).toEqual(expectedIdentity);
    expect(run.visualAmbition?.intentLevel).toBe('flagship');
    expect(run.referencePrinciples).toHaveLength(2);
    expect(run.referencePrinciples.every((reference) => [
      'positive-semantic-direct-interaction',
      'sports-ai-subject-field'
    ].includes(reference.referenceId))).toBe(true);

    const rebuiltWowEvidence = createWowGateEvidenceFromBrowserObservations({
      identity: expectedIdentity,
      contract: run.visualAmbition!,
      observations: browserObservations()
    });
    expect(rebuiltWowEvidence).toEqual(run.wowEvidence);
    expect(rebuiltWowEvidence.assessment).toMatchObject({ verdict: 'pass', score: 93 });
    expect(evaluateWowGateEvidence(
      run.wowEvidence,
      expectedIdentity,
      run.visualAmbition!
    )).toMatchObject({ identityValid: true, intentValid: true, passed: true });

    expect(run.adaptiveEvidence?.visualQuality).toMatchObject({
      verdict: 'pass',
      score: 92,
      dimensions: {
        goalClarity: 91,
        creativeDistinctiveness: 95,
        craftCohesion: 90,
        assetIntegration: 91,
        interactionValue: 94,
        mobileReadiness: 89
      }
    });
    expect(evaluateFinalCreativeEvidence(
      run.adaptiveEvidence,
      expectedIdentity
    )).toMatchObject({
      identityValid: true,
      checkpointsPassed: true,
      hardGatesPassed: true,
      qualityPassed: true,
      archiveEligible: true
    });
    expect(run.adaptiveEvidence?.checkpoints.every((checkpoint) =>
      checkpoint.runId === expectedIdentity.runId
      && checkpoint.bundleHash === expectedIdentity.bundleHash
    )).toBe(true);
    expect(isDirectCreativeRunArchiveEligible(run)).toBe(true);
  });

  it('recomputes the fixed identity from the ordered final source bytes', () => {
    const hash = createHash('sha256');
    for (const fileName of ['index.html', 'style.css', 'main.ts']) {
      hash.update(fileName);
      hash.update(Buffer.from([0]));
      hash.update(readFileSync(new URL(fileName, sourceRoot)));
    }

    expect(hash.digest('hex')).toBe(expectedIdentity.bundleHash);
  });
});

function browserObservations(): AdaptiveBrowserWowObservations {
  return {
    hero: {
      observed: true,
      completedAtMs: 820,
      visibleChangeObserved: true,
      score: 93,
      summary: '首个绘制状态在 820ms 内完成，明亮图纸出现完整四拍动作记谱。'
    },
    runtime: {
      surfaceVisible: true,
      stateChanged: true,
      visualOutputChanged: true,
      advantageOverStaticObserved: true,
      comparisonMethod: 'canvas-buffer-diff',
      score: 95,
      summary: 'Canvas 前后帧像素差超过 1%，真实输入同步改变共享状态和视觉输出。'
    },
    theme: {
      themeSpecificMemoryObserved: true,
      score: 94,
      summary: '可复述记忆是身体动作被写成橙、蓝、黑与酸绿色的四拍句法。'
    },
    motionDepth: {
      meaningfulMotionOrDepthObserved: true,
      score: 93,
      summary: '轨迹层次、身体姿态和节拍位移共同解释动作方向、能量与时值。'
    },
    assets: {
      criticalAssetsLoaded: true,
      integratedWithScene: true,
      credible: true,
      score: 90,
      summary: 'Canvas 动态主体、SVG 回退和 DOM 控件使用同一高对比动作图纸语言。'
    },
    craft: {
      cohesive: true,
      score: 90,
      summary: '字体、线条、色彩、留白和控制区共同服从动作记谱主题。'
    },
    interaction: {
      input: '滚轮、指针、滑块与键盘',
      stateChanged: true,
      visualOutputChanged: true,
      semanticOutputChanged: true,
      summary: '滚轮、指针、滑块与键盘同时改变状态、Canvas 画面和语义数值。'
    },
    mobile: {
      viewportWidth: 390,
      noHorizontalOverflow: true,
      contentReadable: true,
      primaryActionReachable: true,
      summary: '390px reduced-motion 无横向溢出，内容与保存行动可达。'
    },
    fallback: {
      exercised: true,
      rendered: true,
      themePreserved: true,
      contentPreserved: true,
      primaryActionReachable: true,
      summary: '强制 fallback 后 SVG/CSS 保留主题、四拍内容、编辑控件和保存行动。'
    },
    errors: {
      pageErrors: [],
      consoleErrors: [],
      blockingResourceFailures: []
    }
  };
}
