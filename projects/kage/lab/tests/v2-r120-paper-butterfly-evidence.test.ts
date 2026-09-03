import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  createWowGateEvidenceFromBrowserObservations,
  type AdaptiveBrowserWowObservations
} from '../src/v2/adaptive-wow-evidence.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createDirectCreativeRunFromContract } from '../src/v2/direct-creative-protocol.ts';
import {
  attachDirectCreativeEvidence,
  attachDirectCreativeWowEvidence,
  directCreativeRunSchema,
  finalizeDirectCreativeRun,
  isDirectCreativeRunArchiveEligible,
  recordDirectCreativeAttempt,
  setDirectCreativeFinalCandidate,
  type DirectCreativeRun
} from '../src/v2/direct-creative-run.ts';
import {
  assessDirectVisualQuality,
  createFinalCreativeEvidence,
  evaluateFinalCreativeEvidence
} from '../src/v2/final-creative-evidence.ts';
import { evaluateWowGateEvidence } from '../src/v2/visual-ambition.ts';

export const r120PaperButterflyBrief = [
  '为希望探索文化活动、展览和对象系列的访客设计一座明亮、会呼吸的纸蝶日光空间游园。',
  '六只纸蝶在同一空间中形成不同深度与队形，使用主题专属 3D 纸蝶和 Three.js。',
  '指针或触摸改变队形与局部反光；点击、键盘或触摸选择对象。',
  '每只纸蝶的颜色、纸材和巡游故事只在选择后于对象附近展开，未选择时保持场景主导。',
  '最终行动为“选择一只加入巡游”。',
  '页面不是工作台、卡片目录或长滚动文章；不要持久侧栏、滑杆或指标簇。'
].join('');

export const r120PaperButterflyIdentity = {
  runId: 'direct-pdqxba',
  bundleHash: 'b88dd7c92230fc5044b835eb5fa860fa31509c40c6ff42081cb38d677f80dbf2'
} as const;

const evidencePath = new URL(
  '../docs/v2-research/evidence/r120-paper-butterfly-garden.direct-creative-run.json',
  import.meta.url
);
const sourceRoot = new URL('../pages/v2/deliveries/paper-butterfly-garden/', import.meta.url);

export function r120BrowserObservations(): AdaptiveBrowserWowObservations {
  return {
    hero: {
      observed: true,
      completedAtMs: 2_250,
      visibleChangeObserved: true,
      score: 92,
      summary: 'Hero 在 2250ms 内由入场折叠态展开为六只纸蝶占据明亮温室的完整对象场。'
    },
    runtime: {
      surfaceVisible: true,
      stateChanged: true,
      visualOutputChanged: true,
      advantageOverStaticObserved: true,
      comparisonMethod: 'semantic-state-plus-visual',
      score: 93,
      summary: '浏览器快照与状态截图共同证明指针编队、对象选择和加入巡游会改变 Three.js 场景，而非只替换文字。'
    },
    theme: {
      themeSpecificMemoryObserved: true,
      score: 94,
      summary: '可复述记忆是六种纸材的彩色纸蝶在屋顶温室晨光中被访客重新编队。'
    },
    motionDepth: {
      meaningfulMotionOrDepthObserved: true,
      score: 91,
      summary: '纸蝶的前后深度、翅面折叠、透光、指针聚散与加入队列共同解释空间游园主题。'
    },
    assets: {
      criticalAssetsLoaded: true,
      integratedWithScene: true,
      credible: true,
      score: 88,
      summary: '真实加载的日光温室环境承担尺度与光线，程序化纸蝶承担可交互主体；页面明确披露其概念演示属性。'
    },
    craft: {
      cohesive: true,
      score: 90,
      summary: '纸材色彩、温室晨光、编辑排版、对象标记与上下文故事形成统一的明亮游园语言。'
    },
    interaction: {
      input: '指针、对象按钮、键盘与加入行动',
      stateChanged: true,
      visualOutputChanged: true,
      semanticOutputChanged: true,
      summary: '真实指针改变六只纸蝶队形；点击或键盘选择同一对象并展开对应纸材故事，加入行动再形成共同队列。'
    },
    mobile: {
      viewportWidth: 390,
      noHorizontalOverflow: true,
      contentReadable: true,
      primaryActionReachable: true,
      summary: '390px reduced-motion 状态无横向溢出，六个语义对象、故事与加入行动均可达。'
    },
    fallback: {
      exercised: true,
      rendered: true,
      themePreserved: true,
      contentPreserved: true,
      primaryActionReachable: true,
      summary: '强制 WebGL fallback 后保留六只纸蝶、对象选择、纸材故事和加入巡游的完整旅程。'
    },
    errors: {
      pageErrors: [],
      consoleErrors: [],
      blockingResourceFailures: []
    }
  };
}

export function buildR120PaperButterflyRun(): DirectCreativeRun {
  const contract = createV2CreativeContract(r120PaperButterflyBrief);
  let run = createDirectCreativeRunFromContract(contract);
  run = directCreativeRunSchema.parse({
    ...run,
    assetPlan: {
      batchId: run.assetPlan.batchId,
      strategy: 'mixed',
      rationale: '同一素材批次复用已生成的屋顶温室环境，并以程序化 Three.js 构造六只纸蝶；两者都必须在最终页面承担声明的视觉职责。',
      assets: [
        {
          id: 'rooftop-greenhouse-environment-v1',
          role: '提供屋顶温室的真实空间尺度、自然日光与植物环境',
          source: 'generated',
          required: true
        },
        ...run.assetPlan.assets
      ]
    }
  });
  run = recordDirectCreativeAttempt(run, 'asset-batch');
  run = recordDirectCreativeAttempt(run, 'build');
  run = recordDirectCreativeAttempt(run, 'deterministic-repair');
  run = setDirectCreativeFinalCandidate(run, r120PaperButterflyIdentity);

  const visualQuality = assessDirectVisualQuality({
    dimensions: {
      goalClarity: 92,
      creativeDistinctiveness: 94,
      craftCohesion: 90,
      assetIntegration: 88,
      interactionValue: 92,
      mobileReadiness: 91
    },
    summary: '明亮温室、六只纸蝶与上下文故事形成主题专属对象场；指针、选择和加入行动具有同源因果，移动端和回退保留完整任务。',
    findings: [{
      code: 'conceptual-subject-fidelity',
      severity: 'minor',
      checkpoint: 'core',
      message: '纸蝶为风格化程序化概念对象；本轮证明空间对象场与互动能力，不宣称真实展品级模型精度。'
    }]
  }, run.interactionRationale);

  const checkpoint = (kind: 'opening' | 'core' | 'mobile' | 'interaction', summary: string) => ({
    kind,
    ...r120PaperButterflyIdentity,
    passed: true,
    summary
  });
  const finalEvidence = createFinalCreativeEvidence({
    identity: r120PaperButterflyIdentity,
    interaction: run.interactionRationale,
    checkpoints: [
      checkpoint('opening', '桌面高质量模式在 2250ms 内完成展开，真实温室环境和六只 Three.js 纸蝶可见且无运行错误。'),
      checkpoint('core', '一个持续全屏舞台同时承载对象深度、纸材差异、上下文故事和最终加入行动，没有退化为工作台或卡片目录。'),
      checkpoint('mobile', '390×844 reduced-motion 强制 fallback 无横向溢出，六个选择、故事与加入行动完整可用。'),
      checkpoint('interaction', '真实指针改变队形，选择改变 3D 焦点与对象故事，加入行动改变同一对象场的最终编队。')
    ],
    hardGates: {
      runtimeClean: true,
      criticalAssetsLoaded: true,
      primaryActionReachable: true,
      mobileComplete: true,
      truthfulClaims: true,
      interactionVerified: true,
      audioVerified: null
    },
    visualQuality
  });
  const wowEvidence = createWowGateEvidenceFromBrowserObservations({
    identity: r120PaperButterflyIdentity,
    contract: run.visualAmbition!,
    observations: r120BrowserObservations()
  });

  run = attachDirectCreativeEvidence(run, finalEvidence);
  run = attachDirectCreativeWowEvidence(run, wowEvidence);
  return finalizeDirectCreativeRun(run);
}

describe('R120 paper-butterfly-garden final evidence', () => {
  it('persists the same bounded direct run that the contract and browser evidence rebuild', () => {
    const persisted = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));
    const rebuilt = buildR120PaperButterflyRun();

    expect(persisted).toEqual(rebuilt);
    expect(persisted.goalPlayback.originalBrief).toBe(r120PaperButterflyBrief);
    expect(persisted.finalCandidate).toEqual(r120PaperButterflyIdentity);
    expect(persisted.interactionRationale).toMatchObject({ mode: 'direct', audioApplicable: false });
    expect(persisted.visualAmbition?.intentLevel).toBe('immersive');
    expect(persisted.attemptBudget.used).toEqual({
      directionSelections: 1,
      assetBatches: 1,
      builds: 1,
      deterministicRepairs: 1,
      visualRefinements: 0
    });
    expect(persisted.assetPlan).toMatchObject({
      strategy: 'mixed',
      assets: [
        { id: 'rooftop-greenhouse-environment-v1', source: 'generated', required: true },
        { id: 'object-field-subjects', source: 'programmatic', required: true }
      ]
    });
    expect(persisted.adaptiveEvidence?.profile.requiredCheckpoints).toEqual([
      'opening', 'core', 'mobile', 'interaction'
    ]);
    expect(persisted.adaptiveEvidence?.visualQuality).toMatchObject({ verdict: 'pass', score: 91 });
    expect(persisted.wowEvidence?.assessment).toMatchObject({ verdict: 'pass', score: 91 });
    expect(evaluateFinalCreativeEvidence(
      persisted.adaptiveEvidence,
      r120PaperButterflyIdentity
    )).toMatchObject({ identityValid: true, archiveEligible: true });
    expect(evaluateWowGateEvidence(
      persisted.wowEvidence,
      r120PaperButterflyIdentity,
      persisted.visualAmbition!
    )).toMatchObject({ identityValid: true, intentValid: true, passed: true });
    expect(isDirectCreativeRunArchiveEligible(persisted)).toBe(true);
  });

  it('recomputes the final identity from the ordered frozen source bytes', () => {
    const hash = createHash('sha256');
    for (const fileName of ['index.html', 'style.css', 'main.ts']) {
      hash.update(fileName);
      hash.update(Buffer.from([0]));
      hash.update(readFileSync(new URL(fileName, sourceRoot)));
    }
    expect(hash.digest('hex')).toBe(r120PaperButterflyIdentity.bundleHash);
  });
});
