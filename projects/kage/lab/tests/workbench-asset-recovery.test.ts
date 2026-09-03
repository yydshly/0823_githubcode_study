import { describe, expect, it } from 'vitest';
import { assetAcceptValue, assetRequestLabel, createCodexAssetTask, createCodexImageGenerationTasks } from '../src/workbench-asset-recovery';

const request = {
  requirementId: 'state-subject',
  role: 'subject',
  modality: 'image-sequence',
  minimumQuality: 'L3-presentable',
  recommendedSource: 'chatgpt-imagegen' as const,
  responsibility: '持续表现同一盏灯从折叠到点亮的过程。',
  continuity: '四个状态共享同一产品、机位、尺度和光线。',
  proof: '关键状态能直接辨认结构变化。',
  reason: '当前没有可信状态素材。'
};

describe('workbench asset recovery', () => {
  it('creates a bounded Codex task from the original brief and selected responsibility', () => {
    const task = createCodexAssetTask('为露营灯设计状态网页。', request);
    expect(task).toContain('用户原始目标：为露营灯设计状态网页。');
    expect(task).toContain('素材职责 ID：state-subject');
    expect(task).toContain('四个状态共享同一产品');
    expect(task).toContain('不要添加文字、箭头、红框、调试标记');
    expect(task).toContain('回到同一任务上传并继续');
  });

  it('maps image and model responsibilities to explicit file inputs', () => {
    expect(assetAcceptValue(request)).toContain('image/png');
    expect(assetAcceptValue({ ...request, modality: 'model-3d' })).toBe('.glb,model/gltf-binary');
    expect(assetRequestLabel(request)).toBe('subject · image-sequence · L3-presentable');
  });

  it('creates at most four stable, identified image tasks', () => {
    const foreground = { ...request, requirementId: 'scene-foreground', role: 'atmosphere' };
    const duplicate = { ...request, responsibility: '重复职责不应产生第二项任务。' };
    const model = { ...request, requirementId: 'hero-model', modality: 'model-3d' };
    const environment = { ...request, requirementId: 'scene-environment', role: 'environment', modality: 'texture' };
    const information = { ...request, requirementId: 'scene-information', role: 'information', modality: 'texture' };
    const depth = { ...request, requirementId: 'texture-depth', role: 'atmosphere', modality: 'texture' };
    const tasks = createCodexImageGenerationTasks(
      'job-1234567890abcdef',
      'job-1234567890abcdef-assets-v1',
      '为露营灯设计状态网页。',
      [foreground, request, model, duplicate, environment, information, depth]
    );

    expect(tasks.map((task) => task.requirementId)).toEqual([
      'scene-environment', 'scene-foreground', 'scene-information', 'state-subject'
    ]);
    expect(tasks).toHaveLength(4);
    expect(tasks[0]?.prompt).toContain('jobId：job-1234567890abcdef');
    expect(tasks[0]?.prompt).toContain('completionId：job-1234567890abcdef-assets-v1');
    expect(tasks[0]?.prompt).toContain('requirementId：scene-environment');
    expect(tasks[0]?.prompt).toContain('必须继续同一 Job；不要创建新 Job');
    expect(tasks[0]?.prompt).toContain('审阅回执必须明确包含 jobId、completionId、requirementId');
    expect(tasks[0]?.prompt).toContain('不要自行声称普通 L2 候选已经达到 L3/L4');
  });

  it('is independent of request order and keeps a single selected task identified', () => {
    const second = { ...request, requirementId: 'hero-image', modality: 'transparent-image' };
    const forward = createCodexImageGenerationTasks('job-a', 'completion-a', '同一目标。', [request, second]);
    const reversed = createCodexImageGenerationTasks('job-a', 'completion-a', '同一目标。', [second, request]);

    expect(forward.map((task) => task.prompt)).toEqual(reversed.map((task) => task.prompt));
    const single = createCodexImageGenerationTasks('job-a', 'completion-a', '同一目标。', [request]);
    expect(single).toHaveLength(1);
    expect(single[0]?.prompt).toContain('requirementId：state-subject');
  });
});
