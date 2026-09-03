export interface RefinementStatusInput {
  status: 'kept' | 'refined' | 'rejected';
  summary: string;
  sourceAssessment: { score: number };
  visualAcceptance: { verdict: 'pass' | 'revise'; score: number };
}

export interface RefinementDeliveryStatusInput {
  finalEligible: boolean;
  summary: string;
}

export function generationJobPatchForRefinement(
  result: RefinementStatusInput,
  deliveryQuality?: RefinementDeliveryStatusInput,
) {
  const visualAccepted = result.status !== 'rejected' && result.visualAcceptance.verdict === 'pass';
  const deliveryAccepted = deliveryQuality?.finalEligible ?? false;
  const accepted = visualAccepted && deliveryAccepted;
  const deliveryFailure = deliveryQuality?.summary
    ?? '缺少交付质量结论，按 fail-closed 规则保留为待评审。';
  const failure = !visualAccepted
    ? result.summary
    : deliveryFailure;
  return {
    stage: accepted ? 'complete' as const : 'review-required' as const,
    message: accepted
      ? result.status === 'refined'
        ? '视觉精修完成，已选中新的最终最佳版本。'
        : '浏览器验收完成，当前版本即为最终最佳版本。'
      : visualAccepted
        ? `视觉检查虽通过，但交付质量尚未达到最终作品门；当前页面保留为待评审，不进入案例库：${failure}`.slice(0, 500)
        : `唯一精修没有形成可交付版本；当前可运行页面保留为待评审，不进入案例库：${failure}`.slice(0, 500),
    sourceScore: result.sourceAssessment.score,
    finalScore: result.visualAcceptance.score,
    error: accepted ? null : failure,
    retryableStage: accepted ? null : 'reviewing' as const,
  };
}
