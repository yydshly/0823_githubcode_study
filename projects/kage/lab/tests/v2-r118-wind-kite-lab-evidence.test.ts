import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  createWowGateEvidenceFromBrowserObservations,
  type AdaptiveBrowserWowObservations
} from '../src/v2/adaptive-wow-evidence.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createDirectCreativeAuthorPackage } from '../src/v2/direct-creative-author-package.ts';
import {
  directCreativeRunSchema,
  isDirectCreativeRunArchiveEligible
} from '../src/v2/direct-creative-run.ts';
import { evaluateFinalCreativeEvidence } from '../src/v2/final-creative-evidence.ts';
import { evaluateWowGateEvidence } from '../src/v2/visual-ambition.ts';

const exactBrief = '为城市风筝学习者设计一座明亮的风场校准台。开场让一只手工纸鸢在近海天空中升起；调整风速、缰绳偏置和飞行高度时，同一只风筝的迎角、弯曲、尾带与风流轨迹同步改变，并给出稳定性和牵引力的演示结果。最后行动为“保存这组飞行方案”。需要具有吸引眼球的实时 3D 效果，但不要暗色科技界面；数值必须明确是概念模拟，不伪装成真实气象结论。';
const sourceContract = createV2CreativeContract(exactBrief);
const authorPackage = createDirectCreativeAuthorPackage(sourceContract);
const expectedIdentity = {
  runId: authorPackage.runSeed.id,
  bundleHash: '48b0f7afa06039ccbe1fd4c627ad3312150b47acdbfdce8d7ba435a9ec086fb3'
};
const evidencePath = new URL(
  '../docs/v2-research/evidence/r118-wind-kite-lab.direct-creative-run.json',
  import.meta.url
);
const sourceRoot = new URL('../pages/v2/deliveries/wind-kite-lab/', import.meta.url);

describe('R118 wind-kite-lab final evidence', () => {
  it('binds mixed browser evidence and the flagship WowGate to the exact frozen bundle', () => {
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));

    expect(authorPackage).toMatchObject({
      contractId: sourceContract.id,
      authoringInput: {
        contractId: sourceContract.id,
        exactBrief
      },
      runSeed: {
        id: run.id,
        contractId: sourceContract.id
      }
    });
    expect(run.goalPlayback.originalBrief).toBe(exactBrief);
    expect(run.finalCandidate).toEqual(expectedIdentity);
    expect(run.interactionRationale).toMatchObject({ mode: 'mixed', audioApplicable: false });
    expect(run.visualAmbition?.intentLevel).toBe('flagship');
    expect(run.adaptiveEvidence?.profile).toEqual({
      schemaVersion: 1,
      interactionMode: 'mixed',
      audioApplicable: false,
      requiredCheckpoints: ['opening', 'core', 'mobile', 'scroll', 'interaction']
    });
    expect(run.adaptiveEvidence?.hardGates).toEqual({
      runtimeClean: true,
      criticalAssetsLoaded: true,
      primaryActionReachable: true,
      mobileComplete: true,
      truthfulClaims: true,
      interactionVerified: true,
      audioVerified: null
    });

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
      score: 93,
      dimensions: {
        goalClarity: 94,
        creativeDistinctiveness: 95,
        craftCohesion: 91,
        assetIntegration: 91,
        interactionValue: 94,
        mobileReadiness: 91
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

  it('recomputes the final identity from the ordered frozen source bytes', () => {
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
      completedAtMs: 3_200,
      visibleChangeObserved: true,
      score: 94,
      summary: 'Hero 在 3200ms 内完成，纸鸢由低位升起并稳定在明亮近海风场。'
    },
    runtime: {
      surfaceVisible: true,
      stateChanged: true,
      visualOutputChanged: true,
      advantageOverStaticObserved: true,
      comparisonMethod: 'canvas-buffer-diff',
      score: 95,
      summary: 'Canvas 前后像素差超过 0.8%，真实输入同步改变共享状态、三维姿态和语义结果。'
    },
    theme: {
      themeSpecificMemoryObserved: true,
      score: 94,
      summary: '可复述记忆是一只朱砂红与纸白的手工纸鸢在近海天光中借风找到平衡。'
    },
    motionDepth: {
      meaningfulMotionOrDepthObserved: true,
      score: 94,
      summary: '透视、云层视差、纸面弯曲、尾带和风流共同解释风筝受力。'
    },
    assets: {
      criticalAssetsLoaded: true,
      integratedWithScene: true,
      credible: true,
      score: 92,
      summary: '纸面、竹骨、缰绳、尾带、风流和校准板自然组成同一飞行工具。'
    },
    craft: {
      cohesive: true,
      score: 91,
      summary: '色彩、空间、排版、材质、动态与控制共同服从明亮风场主题。'
    },
    interaction: {
      input: '三个 range、滚轮和指针',
      stateChanged: true,
      visualOutputChanged: true,
      semanticOutputChanged: true,
      summary: '三个 range、滚轮和指针同时改变状态、纸鸢画面、稳定性与牵引力。'
    },
    mobile: {
      viewportWidth: 390,
      noHorizontalOverflow: true,
      contentReadable: true,
      primaryActionReachable: true,
      summary: '390px reduced-motion 无横向溢出，三个控件和保存行动可达。'
    },
    fallback: {
      exercised: true,
      rendered: true,
      themePreserved: true,
      contentPreserved: true,
      primaryActionReachable: true,
      summary: '强制 fallback 后保留同一纸鸢主题、三个控件、概念结果和保存行动。'
    },
    errors: {
      pageErrors: [],
      consoleErrors: [],
      blockingResourceFailures: []
    }
  };
}
