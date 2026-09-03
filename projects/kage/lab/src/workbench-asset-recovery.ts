export interface WorkbenchAssetRecoveryRequest {
  requirementId: string;
  role: string;
  modality: string;
  minimumQuality: string;
  recommendedSource?: 'chatgpt-imagegen' | 'user-or-licensed';
  responsibility: string;
  continuity: string;
  proof: string;
  reason?: string;
}

export interface CodexImageGenerationTask {
  jobId: string;
  completionId: string;
  requirementId: string;
  request: WorkbenchAssetRecoveryRequest;
  prompt: string;
}

const imageModalities = new Set(['image', 'transparent-image', 'image-sequence', 'texture', 'sprite', 'environment']);

export function createCodexImageGenerationTasks(
  jobId: string,
  completionId: string,
  brief: string,
  requests: readonly WorkbenchAssetRecoveryRequest[]
): CodexImageGenerationTask[] {
  const stableRequests = [...requests]
    .filter((request) => imageModalities.has(request.modality))
    .sort((left, right) => compareStable(
      `${left.requirementId}\u0000${left.modality}\u0000${left.role}`,
      `${right.requirementId}\u0000${right.modality}\u0000${right.role}`
    ));
  const seen = new Set<string>();
  return stableRequests.flatMap((request) => {
    if (seen.has(request.requirementId)) return [];
    seen.add(request.requirementId);
    return [{
      jobId: jobId.trim(),
      completionId: completionId.trim(),
      requirementId: request.requirementId,
      request,
      prompt: createIdentifiedCodexAssetTask(jobId.trim(), completionId.trim(), brief, request)
    }];
  }).slice(0, 4);
}

export function createCodexAssetTask(
  brief: string,
  request: WorkbenchAssetRecoveryRequest
): string {
  return createAssetTaskBody(brief, request);
}

function createIdentifiedCodexAssetTask(
  jobId: string,
  completionId: string,
  brief: string,
  request: WorkbenchAssetRecoveryRequest
): string {
  return [
    '请完成下面这项 Kage 图片素材任务，并把结果提交回原任务审阅。',
    '',
    `jobId：${jobId}`,
    `completionId：${completionId}`,
    `requirementId：${request.requirementId}`,
    '执行边界：必须继续同一 Job；不要创建新 Job，也不要重新理解或改写用户目标。',
    '',
    createAssetTaskBody(brief, request),
    '',
    '提交要求：完成后将素材文件连同审阅回执提交回同一 Job。审阅回执必须明确包含 jobId、completionId、requirementId、文件名、素材来源，以及“等待 Kage 质量复检”的状态；不要自行声称普通 L2 候选已经达到 L3/L4。'
  ].join('\n');
}

function createAssetTaskBody(brief: string, request: WorkbenchAssetRecoveryRequest): string {
  const source = request.recommendedSource === 'user-or-licensed'
    ? '使用用户提供或具有明确许可的素材；不要伪造真实来源。'
    : '优先使用 ChatGPT / Codex 的图片生成能力；MiniMax 只可作为待检查候选。';
  return [
    '请为当前 Kage 生成任务准备一项可直接接入网页的关键素材。',
    '',
    `用户原始目标：${brief.trim()}`,
    `素材职责 ID：${request.requirementId}`,
    `视觉角色：${request.role}`,
    `素材形式：${request.modality}`,
    `最低质量：${request.minimumQuality}`,
    `视觉责任：${request.responsibility}`,
    `连续性要求：${request.continuity}`,
    `验收证据：${request.proof}`,
    `来源边界：${source}`,
    '',
    '要求：以最终网页效果为准；保持主体、尺度、观察关系和光线连续；不要添加文字、箭头、红框、调试标记、棋盘格或无关装饰；不要用基础几何或低质量占位图替代。生成后保存为 PNG/JPEG/GLB 等与职责匹配的本地文件，再回到同一任务上传并继续。'
  ].join('\n');
}

function compareStable(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function assetAcceptValue(request: WorkbenchAssetRecoveryRequest): string {
  if (request.modality === 'model-3d') return '.glb,model/gltf-binary';
  if (request.modality === 'transparent-image' || request.modality === 'image-sequence' || request.modality === 'texture') {
    return '.png,.jpg,.jpeg,image/png,image/jpeg';
  }
  return '.png,.jpg,.jpeg,.glb,.mp3,.wav,.mp4,.webm';
}

export function assetRequestLabel(request: WorkbenchAssetRecoveryRequest): string {
  return `${request.role} · ${request.modality} · ${request.minimumQuality}`;
}
