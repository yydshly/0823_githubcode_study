import { z } from 'zod';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const reviewBeatSchema = z.object({
  id: safeId,
  position: z.number().min(0).max(1),
  visibleState: z.string().optional()
}).passthrough();

export const visualReviewCheckpointSchema = z.object({
  id: safeId,
  label: z.string().min(1).max(220),
  progress: z.number().min(0).max(1),
  surface: z.enum(['desktop', 'mobile', 'fallback']),
  quality: z.enum(['high', 'low']),
  reducedMotion: z.boolean(),
  action: z.enum(['none', 'semantic-probe', 'driver-probe', 'webgl-fallback']),
  causalProbe: z.enum(['wheel', 'control']).nullable().optional(),
  expectSceneChange: z.boolean().default(false),
  expectSubjectChange: z.boolean().default(false),
  expectMobileTaskPath: z.boolean().default(false)
}).strict();

export const visualReviewPlanSchema = z.object({
  schemaVersion: z.literal(1),
  source: z.enum(['creative-contract', 'compatibility-fallback']),
  journeyMode: z.enum(['scroll-timeline', 'direct-state']).default('scroll-timeline'),
  rendererRoute: z.enum(['dom-only', 'dom-media-hybrid', 'dom-canvas-hybrid', 'dom-three-hybrid']).optional(),
  minimumSubjectDelta: z.number().min(0).max(1).default(.018),
  minimumCausalAnchorDelta: z.number().min(0).max(1).default(.018),
  visualConstraints: z.object({
    forbidGiantHeading: z.boolean().default(false)
  }).strict().default({ forbidGiantHeading: false }),
  checkpoints: z.array(visualReviewCheckpointSchema).min(3).max(8)
}).strict().superRefine((plan, context) => {
  const ids = plan.checkpoints.map((checkpoint) => checkpoint.id);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: 'custom', path: ['checkpoints'], message: '视觉验收检查点 ID 不能重复。' });
  }
  for (const required of ['opening', 'final', 'mobile']) {
    if (!ids.includes(required)) {
      context.addIssue({ code: 'custom', path: ['checkpoints'], message: `视觉验收缺少 ${required} 检查点。` });
    }
  }
});

export type VisualReviewPlan = z.infer<typeof visualReviewPlanSchema>;
export type VisualReviewCheckpoint = z.infer<typeof visualReviewCheckpointSchema>;

interface ReviewContractLike {
  intent?: {
    negativeConstraints?: ReadonlyArray<string>;
  };
  experience?: {
    beats?: ReadonlyArray<{
      id: string;
      position: number;
      visibleState?: string;
    }>;
  };
  direction?: {
    interaction?: { primaryInput?: 'scroll' | 'pointer' | 'direct-navigation' };
    renderer?: { route?: 'dom-only' | 'dom-media-hybrid' | 'dom-canvas-hybrid' | 'dom-three-hybrid' };
  };
  technical?: {
    semanticInteraction?: { selected?: boolean };
    interactionDriver?: { selected?: boolean };
    stateAssetStrategy?: { required?: boolean; changeKind?: string };
  };
  acceptance?: ReadonlyArray<{
    id?: string;
    priority?: 'blocker' | 'high' | 'normal';
  }>;
}

export function createVisualReviewPlan(contract?: ReviewContractLike | null): VisualReviewPlan {
  const parsedBeats = z.array(reviewBeatSchema).min(2).max(6).safeParse(contract?.experience?.beats);
  if (!parsedBeats.success) return fallbackPlan();

  const beats = [...parsedBeats.data].sort((a, b) => a.position - b.position);
  const expectsSubjectChange = contract?.technical?.stateAssetStrategy?.required === true
    && contract.technical.stateAssetStrategy.changeKind !== 'none';
  const structuralDeformation = contract?.technical?.stateAssetStrategy?.changeKind === 'structural-deformation';
  const minimumSubjectDelta = structuralDeformation ? .045 : .018;
  const minimumCausalAnchorDelta = structuralDeformation ? .065 : .018;
  const forbidGiantHeading = (contract?.intent?.negativeConstraints || []).some((constraint) => (
    /(?:巨大|巨型|超大)[^，。；;]{0,8}标题/.test(constraint)
    || /(?:giant|huge|oversized)[^,.;]{0,20}(?:title|headline)/i.test(constraint)
  ));
  const desktop: VisualReviewCheckpoint[] = beats.map((beat, index) => ({
    id: index === 0 ? 'opening' : index === beats.length - 1 ? 'final' : `beat-${beat.id}`,
    label: beat.visibleState || beat.id,
    progress: beat.position,
    surface: 'desktop' as const,
    quality: 'high' as const,
    reducedMotion: false,
    action: 'none',
    expectSceneChange: false,
    expectSubjectChange: expectsSubjectChange && index > 0,
    expectMobileTaskPath: false
  }));
  const needsSemanticProbe = contract?.technical?.semanticInteraction?.selected === true
    && contract?.direction?.interaction?.primaryInput !== 'scroll';
  const needsDriverProbe = contract?.technical?.interactionDriver?.selected === true;
  const rendererRoute = contract?.direction?.renderer?.route;
  const expectsSceneChange = rendererRoute === 'dom-canvas-hybrid' || rendererRoute === 'dom-three-hybrid';
  if (needsDriverProbe || needsSemanticProbe) {
    const existing = desktop
      .map((checkpoint, index) => ({ checkpoint, index }))
      .filter(({ checkpoint }) => checkpoint.id !== 'opening' && checkpoint.id !== 'final')
      .sort((a, b) => Math.abs(a.checkpoint.progress - .5) - Math.abs(b.checkpoint.progress - .5))[0];
    if (existing) {
      desktop[existing.index] = {
        ...existing.checkpoint,
        action: needsDriverProbe ? 'driver-probe' : 'semantic-probe',
        expectSceneChange: expectsSceneChange,
        expectSubjectChange: needsDriverProbe ? existing.checkpoint.expectSubjectChange : true,
        expectMobileTaskPath: false
      };
    } else {
      desktop.splice(1, 0, {
        id: needsDriverProbe ? 'driver' : 'interaction',
        label: needsDriverProbe
          ? '播放、滚轮与人工接管共享状态探测'
          : '语义交互输入、可见控件与状态反馈',
        progress: .5,
        surface: 'desktop',
        quality: 'high',
        reducedMotion: false,
        action: needsDriverProbe ? 'driver-probe' : 'semantic-probe',
        expectSceneChange: expectsSceneChange,
        expectSubjectChange: !needsDriverProbe,
        expectMobileTaskPath: false
      });
    }
  }
  const requiresCausalProbe = contract?.acceptance?.some((item) => item.id === 'process-causal' && item.priority === 'blocker') === true;
  if (requiresCausalProbe) {
    const target = desktop
      .map((checkpoint, index) => ({ checkpoint, index }))
      .sort((left, right) => Math.abs(left.checkpoint.progress - .5) - Math.abs(right.checkpoint.progress - .5) || left.index - right.index)[0];
    if (target) {
      desktop[target.index] = {
        ...target.checkpoint,
        causalProbe: contract?.direction?.interaction?.primaryInput === 'scroll' ? 'wheel' : 'control'
      };
    }
  }
  const needsWebglFallback = rendererRoute === 'dom-canvas-hybrid' || rendererRoute === 'dom-three-hybrid';
  const journeyMode = contract?.direction?.interaction?.primaryInput === 'scroll' ? 'scroll-timeline' : 'direct-state';
  const mobileCheckpoints = journeyMode === 'scroll-timeline'
    ? createScrollMobileCheckpoints(beats)
    : [createDirectStateMobileCheckpoint(beats[0].position, needsSemanticProbe)];
  // Scroll journeys spend three of the eight browser slots proving that the
  // mobile composition survives the opening, middle and final states. Keep the
  // desktop checkpoints representative and preserve any explicit interaction
  // probe rather than silently exceeding the hard evidence budget.
  const desktopBudget = 8 - mobileCheckpoints.length - (needsWebglFallback ? 1 : 0);
  const boundedDesktop = boundDesktopCheckpoints(desktop, desktopBudget);

  return visualReviewPlanSchema.parse({
    schemaVersion: 1,
    source: 'creative-contract',
    journeyMode,
    minimumSubjectDelta,
    minimumCausalAnchorDelta,
    visualConstraints: { forbidGiantHeading },
    ...(rendererRoute ? { rendererRoute } : {}),
    checkpoints: [
      ...boundedDesktop,
      ...mobileCheckpoints,
      ...(needsWebglFallback ? [{
        id: 'fallback' as const,
        label: '无 WebGL 时的完整语义阅读回退',
        progress: beats[0].position,
        surface: 'fallback' as const,
        quality: 'low' as const,
        reducedMotion: true,
        action: 'webgl-fallback' as const,
        expectSceneChange: false
      }] : [])
    ]
  });
}

function createScrollMobileCheckpoints(beats: ReadonlyArray<z.infer<typeof reviewBeatSchema>>): VisualReviewCheckpoint[] {
  const opening = beats[0];
  const final = beats[beats.length - 1];
  const middle = beats.length > 2
    ? beats.slice(1, -1).sort((left, right) => Math.abs(left.position - .5) - Math.abs(right.position - .5))[0]
    : null;
  const middleProgress = middle?.position ?? opening.position + (final.position - opening.position) / 2;
  return [
    {
      id: 'mobile',
      label: '移动端首个叙事状态与 reduced-motion 基线',
      progress: opening.position,
      surface: 'mobile',
      quality: 'low',
      reducedMotion: true,
      action: 'none',
      expectSceneChange: false,
      expectSubjectChange: false,
      expectMobileTaskPath: false
    },
    {
      id: 'mobile-middle',
      label: middle?.visibleState || '移动端中段叙事状态',
      progress: middleProgress,
      surface: 'mobile',
      quality: 'low',
      reducedMotion: true,
      action: 'none',
      expectSceneChange: false,
      expectSubjectChange: false,
      expectMobileTaskPath: false
    },
    {
      id: 'mobile-final',
      label: final.visibleState || '移动端最终行动状态',
      progress: final.position,
      surface: 'mobile',
      quality: 'low',
      reducedMotion: true,
      action: 'none',
      expectSceneChange: false,
      expectSubjectChange: false,
      expectMobileTaskPath: false
    }
  ];
}

function createDirectStateMobileCheckpoint(progress: number, needsSemanticProbe: boolean): VisualReviewCheckpoint {
  return {
    id: 'mobile',
    label: needsSemanticProbe
      ? '移动端主要控件、结果与最终行动任务路径'
      : '移动端首个叙事状态与 reduced-motion 基线',
    progress,
    surface: 'mobile',
    quality: 'low',
    reducedMotion: true,
    action: needsSemanticProbe ? 'semantic-probe' : 'none',
    expectSceneChange: false,
    expectSubjectChange: false,
    expectMobileTaskPath: needsSemanticProbe
  };
}

function boundDesktopCheckpoints(checkpoints: VisualReviewCheckpoint[], maximum: number): VisualReviewCheckpoint[] {
  if (checkpoints.length <= maximum) return checkpoints;
  const selected = new Set<number>([0, checkpoints.length - 1]);
  checkpoints.forEach((checkpoint, index) => {
    if (checkpoint.action !== 'none' || checkpoint.causalProbe) selected.add(index);
  });
  while (selected.size < maximum) {
    const candidate = checkpoints
      .map((checkpoint, index) => ({ checkpoint, index }))
      .filter(({ index }) => !selected.has(index))
      .map(({ checkpoint, index }) => ({
        index,
        distance: Math.min(...[...selected].map((selectedIndex) => Math.abs(checkpoint.progress - checkpoints[selectedIndex].progress)))
      }))
      .sort((left, right) => right.distance - left.distance || left.index - right.index)[0];
    if (!candidate) break;
    selected.add(candidate.index);
  }
  return checkpoints.filter((_, index) => selected.has(index)).slice(0, maximum);
}

function fallbackPlan(): VisualReviewPlan {
  return visualReviewPlanSchema.parse({
    schemaVersion: 1,
    source: 'compatibility-fallback',
    journeyMode: 'scroll-timeline',
    checkpoints: [
      { id: 'opening', label: '桌面开场', progress: 0, surface: 'desktop', quality: 'high', reducedMotion: false, action: 'none', expectSceneChange: false },
      { id: 'beat-middle', label: '桌面中间状态', progress: 0.44, surface: 'desktop', quality: 'high', reducedMotion: false, action: 'none', expectSceneChange: false },
      { id: 'final', label: '桌面收束', progress: 1, surface: 'desktop', quality: 'high', reducedMotion: false, action: 'none', expectSceneChange: false },
      { id: 'mobile', label: '移动端开场与 reduced-motion 基线', progress: 0, surface: 'mobile', quality: 'low', reducedMotion: true, action: 'none', expectSceneChange: false }
    ]
  });
}
