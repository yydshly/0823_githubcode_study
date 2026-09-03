import { describe, expect, it } from 'vitest';
import {
  assessWowAttraction,
  createVisualAmbitionContract,
  visualAmbitionContractSchema,
  wowGateAssessmentSchema,
  type VisualAmbitionContract,
  type WowGateDimensions,
  type WowGateObservation
} from '../src/v2/visual-ambition.ts';

describe('V2 visual ambition contract', () => {
  it('does not force Three.js when a flagship SVG composition has real depth and motion', () => {
    const contract = flagshipContract();

    expect(contract.rendering.primary).toBe('svg');
    expect(contract.intentLevel).toBe('flagship');
    expect(contract.spatialDepth.mode).toBe('layered-2d');
  });

  it('allows a restrained editorial page to remain flat and still', () => {
    const contract = createVisualAmbitionContract({
      ...flagshipContract(),
      intentLevel: 'restrained',
      intentRationale: '短篇编辑信息以清晰阅读和图文节奏为主要目标。',
      heroMoment: {
        ...flagshipContract().heroMoment,
        appearsWithinSeconds: 8,
        observableRuntimeChange: null
      },
      spatialDepth: {
        mode: 'flat',
        purpose: '保持纸面编辑结构和阅读秩序，不制造无意义空间效果。',
        cues: []
      },
      motionArc: {
        beats: [{
          phase: 'opening',
          driver: 'none',
          visualState: '完整编辑封面保持稳定。',
          thematicPurpose: '让内容本身承担记忆点。'
        }],
        runtimeAdvantage: '无需依赖动态也能完成清晰的信息表达。'
      },
      interactionToScene: []
    });

    expect(contract.intentLevel).toBe('restrained');
    expect(contract.motionArc.beats[0]?.driver).toBe('none');
  });

  it('rejects flagship intent that has no observable runtime advantage', () => {
    const invalid = {
      ...flagshipContract(),
      heroMoment: {
        ...flagshipContract().heroMoment,
        observableRuntimeChange: null
      },
      motionArc: {
        beats: [{
          phase: 'opening',
          driver: 'none',
          visualState: '单张静态构图。',
          thematicPurpose: '作为封面。'
        }],
        runtimeAdvantage: '只有静态封面。'
      }
    };

    const result = visualAmbitionContractSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message).join(' ')).toContain('运行时变化');
      expect(result.error.issues.map((issue) => issue.message).join(' ')).toContain('动态弧线');
    }
  });

  it('requires an input-to-scene mapping when motion claims direct user input', () => {
    const invalid = {
      ...flagshipContract(),
      interactionToScene: []
    };

    expect(() => createVisualAmbitionContract(invalid)).toThrow(/输入如何改变场景/);
  });
});

describe('V2 WowGate attraction assessment', () => {
  it('passes a flagship only when runtime attraction is observable and scores are strong', () => {
    const assessment = assessWowAttraction({
      dimensions: passingDimensions(),
      observation: passingObservation()
    }, flagshipContract());

    expect(assessment).toMatchObject({
      required: true,
      verdict: 'pass',
      score: 91
    });
  });

  it('fails a beautiful static-looking flagship even when its average score is high', () => {
    const assessment = assessWowAttraction({
      dimensions: passingDimensions(),
      observation: {
        ...passingObservation(),
        runtimeAdvantageOverStaticObserved: false,
        summary: '画面工艺优秀，但运行状态与单张截图相比没有可观察优势。'
      }
    }, flagshipContract());

    expect(assessment.required).toBe(true);
    expect(assessment.verdict).toBe('revise');
  });

  it('fails a generic motion demo that lacks theme-specific memory or credible assets', () => {
    const assessment = assessWowAttraction({
      dimensions: {
        ...passingDimensions(),
        themeMemorability: 62,
        assetIntegrationCredibility: 70
      },
      observation: {
        ...passingObservation(),
        themeSpecificMemoryObserved: false,
        credibleAssetIntegrationObserved: false,
        summary: '动画存在，但可以替换成任意主题，关键素材仍像贴图。'
      }
    }, flagshipContract());

    expect(assessment.verdict).toBe('revise');
  });

  it('keeps WowGate separate and not required for restrained pages', () => {
    const restrained = {
      ...flagshipContract(),
      intentLevel: 'restrained' as const,
      heroMoment: { ...flagshipContract().heroMoment, observableRuntimeChange: null },
      motionArc: {
        beats: [{
          phase: 'opening' as const,
          driver: 'none' as const,
          visualState: '稳定的编辑封面。',
          thematicPurpose: '服务阅读。'
        }],
        runtimeAdvantage: '静态编辑表达已经足够。'
      },
      interactionToScene: []
    };
    const contract = createVisualAmbitionContract(restrained);
    const assessment = assessWowAttraction({
      dimensions: {
        fiveSecondImpact: 70,
        runtimeAdvantage: 20,
        themeMemorability: 72,
        motionDepthMeaning: 20,
        assetIntegrationCredibility: 78,
        craftCohesion: 82
      },
      observation: {
        heroMomentObserved: true,
        runtimeAdvantageOverStaticObserved: false,
        themeSpecificMemoryObserved: true,
        meaningfulMotionOrDepthObserved: false,
        credibleAssetIntegrationObserved: true,
        summary: '这是合格编辑页；通用质量门可独立判断，WowGate 不成为阻断条件。'
      }
    }, contract);

    expect(assessment).toMatchObject({ required: false, verdict: 'not-required' });
  });

  it('rejects a tampered pass verdict when observable evidence does not support it', () => {
    const result = wowGateAssessmentSchema.safeParse({
      schemaVersion: 1,
      intentLevel: 'flagship',
      required: true,
      verdict: 'pass',
      score: 91,
      dimensions: passingDimensions(),
      observation: {
        ...passingObservation(),
        meaningfulMotionOrDepthObserved: false
      },
      findings: []
    });

    expect(result.success).toBe(false);
  });
});

function flagshipContract(): VisualAmbitionContract {
  return createVisualAmbitionContract({
    schemaVersion: 1,
    intentLevel: 'flagship',
    intentRationale: '该发布体验需要用主题专属的空间动态在开场建立强记忆。',
    heroMoment: {
      title: '语言在空间中点亮',
      description: '手势轨迹从静止笔画展开为具有前后层次的发光语句。',
      themeConnection: '展开动作直接表达手语从身体动作转化为可见语言的主题。',
      appearsWithinSeconds: 3,
      observableRuntimeChange: {
        trigger: '进入页面并移动指针',
        from: '收束在手掌附近的单个符号',
        to: '沿动作轨迹展开的多层语句与人物剪影'
      }
    },
    rendering: {
      primary: 'svg',
      supporting: ['dom-css'],
      rationale: 'SVG 路径提供清晰可控的动作书写，DOM 承担无障碍内容和行动。'
    },
    spatialDepth: {
      mode: 'layered-2d',
      purpose: '用人物、轨迹和字幕的遮挡与尺度差建立可读空间，不强行采用 3D。',
      cues: ['scale', 'occlusion', 'parallax']
    },
    motionArc: {
      beats: [
        {
          phase: 'opening',
          driver: 'time',
          visualState: '符号从手掌附近逐笔显现。',
          thematicPurpose: '建立语言正在发生的第一记忆点。'
        },
        {
          phase: 'exploration',
          driver: 'pointer',
          visualState: '轨迹和景深随指针方向连续调整。',
          thematicPurpose: '让观众通过动作理解空间句法。'
        },
        {
          phase: 'resolution',
          driver: 'scroll',
          visualState: '全部轨迹收束为演出季标题与购票行动。',
          thematicPurpose: '把视觉体验收束到真实产品行动。'
        }
      ],
      runtimeAdvantage: '书写、景深响应与收束过程只有在真实运行时才能完整理解。'
    },
    interactionToScene: [{
      input: '指针水平与垂直位置',
      sceneResponse: '人物层、轨迹层和字幕层以不同幅度偏移并改变局部高光。',
      productMeaning: '观众的动作成为理解动作语言空间关系的媒介。'
    }],
    assetCredibility: {
      level: 'editorial-credible',
      strategy: '人物剪影、动作轨迹和排版共享相同线条语言并接受统一光色处理。',
      disclosure: '演出信息为概念验证数据，并在页面中明确标示。'
    },
    fallbackPerformance: {
      targetFps: 60,
      maxDevicePixelRatio: 2,
      initialTransferBudgetMb: 3,
      mobileFallback: 'simplified-scene',
      reducedMotionFallback: 'key-states',
      rendererFailureFallback: 'dom-content'
    }
  });
}

function passingDimensions(): WowGateDimensions {
  return {
    fiveSecondImpact: 92,
    runtimeAdvantage: 93,
    themeMemorability: 91,
    motionDepthMeaning: 90,
    assetIntegrationCredibility: 89,
    craftCohesion: 91
  };
}

function passingObservation(): WowGateObservation {
  return {
    heroMomentObserved: true,
    runtimeAdvantageOverStaticObserved: true,
    themeSpecificMemoryObserved: true,
    meaningfulMotionOrDepthObserved: true,
    credibleAssetIntegrationObserved: true,
    summary: '开场、空间响应、主题动作和可信素材在真实运行中形成统一记忆点。'
  };
}
