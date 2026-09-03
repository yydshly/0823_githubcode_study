import type {
  CameraShot,
  ExperienceDiagnostic,
  ExperienceManifest,
  SceneStateValue,
  TrackKeyframe,
  Vec3
} from './schema.ts';

const idPattern = /^[a-z0-9][a-z0-9:_-]*$/;
const colorPattern = /^#[0-9a-f]{6}$/i;

function diagnostic(code: string, path: string, message: string): ExperienceDiagnostic {
  return { level: 'error', code, path, message };
}

function finiteVector(value: Vec3, path: string, issues: ExperienceDiagnostic[]): void {
  if (value.length !== 3 || value.some((item) => !Number.isFinite(item))) {
    issues.push(diagnostic('INVALID_VECTOR', path, '必须是三个有限数值。'));
  }
}

function validateShot(shot: CameraShot, path: string, issues: ExperienceDiagnostic[]): void {
  finiteVector(shot.eye, `${path}.eye`, issues);
  finiteVector(shot.look, `${path}.look`, issues);
  if (!Number.isFinite(shot.fov) || shot.fov < 20 || shot.fov > 90) {
    issues.push(diagnostic('INVALID_FOV', `${path}.fov`, 'FOV 必须位于 20–90。'));
  }
  if (shot.portrait) {
    finiteVector(shot.portrait.eye, `${path}.portrait.eye`, issues);
    finiteVector(shot.portrait.look, `${path}.portrait.look`, issues);
    if (!Number.isFinite(shot.portrait.fov) || shot.portrait.fov < 20 || shot.portrait.fov > 90) {
      issues.push(diagnostic('INVALID_FOV', `${path}.portrait.fov`, '竖屏 FOV 必须位于 20–90。'));
    }
  }
}

function validateSceneState(state: SceneStateValue, path: string, issues: ExperienceDiagnostic[]): void {
  for (const key of ['assembly', 'energy', 'density', 'fog'] as const) {
    const value = state[key];
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      issues.push(diagnostic('INVALID_SCENE_STATE', `${path}.${key}`, '必须位于 0–1。'));
    }
  }
  if (!colorPattern.test(state.accent)) {
    issues.push(diagnostic('INVALID_COLOR', `${path}.accent`, '必须是六位十六进制颜色。'));
  }
}

function validateTrack<T>(
  id: string,
  track: { id: string; keyframes: readonly TrackKeyframe<T>[] },
  path: string,
  issues: ExperienceDiagnostic[],
  validateValue: (value: T, valuePath: string, valueIssues: ExperienceDiagnostic[]) => void
): void {
  if (track.id !== id) issues.push(diagnostic('TRACK_ID_MISMATCH', `${path}.id`, '记录键与 track.id 必须一致。'));
  if (track.keyframes.length === 0) issues.push(diagnostic('EMPTY_TRACK', `${path}.keyframes`, '轨道至少需要一个关键帧。'));
  let previous = -Infinity;
  track.keyframes.forEach((keyframe, index) => {
    const keyPath = `${path}.keyframes[${index}]`;
    if (!Number.isFinite(keyframe.at) || keyframe.at < 0 || keyframe.at > 1) {
      issues.push(diagnostic('INVALID_KEYFRAME_TIME', `${keyPath}.at`, '关键帧位置必须位于 0–1。'));
    }
    if (keyframe.at < previous) issues.push(diagnostic('UNSORTED_KEYFRAMES', `${keyPath}.at`, '关键帧必须按时间递增。'));
    previous = keyframe.at;
    validateValue(keyframe.value, `${keyPath}.value`, issues);
  });
}

export function inspectExperience(manifest: ExperienceManifest): ExperienceDiagnostic[] {
  const issues: ExperienceDiagnostic[] = [];
  if (manifest.schemaVersion !== 2) issues.push(diagnostic('UNSUPPORTED_VERSION', 'schemaVersion', '仅支持 Experience Manifest v2。'));
  if (!idPattern.test(manifest.id)) issues.push(diagnostic('INVALID_ID', 'id', '体验 id 格式非法。'));
  const nodeIds = Object.keys(manifest.nodes);
  if (nodeIds.length === 0) issues.push(diagnostic('EMPTY_GRAPH', 'nodes', '体验至少需要一个节点。'));
  if (!manifest.nodes[manifest.entryNodeId]) issues.push(diagnostic('MISSING_ENTRY', 'entryNodeId', '入口节点不存在。'));
  if (manifest.drivers.length === 0) issues.push(diagnostic('MISSING_DRIVER', 'drivers', '至少需要一个输入 Driver。'));
  if (!manifest.drivers.some((driver) => driver.primary)) issues.push(diagnostic('MISSING_PRIMARY_DRIVER', 'drivers', '需要一个 primary Driver。'));

  for (const [name, value] of Object.entries(manifest.theme)) {
    if (!colorPattern.test(value)) issues.push(diagnostic('INVALID_COLOR', `theme.${name}`, '必须是六位十六进制颜色。'));
  }

  for (const [nodeId, node] of Object.entries(manifest.nodes)) {
    const path = `nodes.${nodeId}`;
    if (node.id !== nodeId) issues.push(diagnostic('NODE_ID_MISMATCH', `${path}.id`, '记录键与 node.id 必须一致。'));
    if (!idPattern.test(nodeId)) issues.push(diagnostic('INVALID_ID', `${path}.id`, '节点 id 格式非法。'));
    if (!node.content.title.trim()) issues.push(diagnostic('EMPTY_TITLE', `${path}.content.title`, '节点标题不能为空。'));
    if (node.span.mode === 'viewport') {
      const span = node.span.value;
      if (!Number.isFinite(span) || span! < 60 || span! > 320) {
        issues.push(diagnostic('INVALID_SPAN', `${path}.span.value`, 'viewport span 必须位于 60–320。'));
      }
    }
    if (node.tracks.camera && !manifest.cameraTracks[node.tracks.camera]) {
      issues.push(diagnostic('MISSING_TRACK', `${path}.tracks.camera`, '引用的 Camera Track 不存在。'));
    }
    if (node.tracks.scene && !manifest.sceneTracks[node.tracks.scene]) {
      issues.push(diagnostic('MISSING_TRACK', `${path}.tracks.scene`, '引用的 Scene Track 不存在。'));
    }
    if (node.sceneId && !manifest.scenes[node.sceneId]) {
      issues.push(diagnostic('MISSING_SCENE', `${path}.sceneId`, '引用的 Scene 不存在。'));
    }
  }

  const flowIds = new Set<string>();
  for (const [index, flow] of manifest.flows.entries()) {
    const path = `flows[${index}]`;
    if (!idPattern.test(flow.id) || flowIds.has(flow.id)) issues.push(diagnostic('DUPLICATE_FLOW_ID', `${path}.id`, 'Flow id 必须合法且唯一。'));
    flowIds.add(flow.id);
    if (!manifest.nodes[flow.from]) issues.push(diagnostic('MISSING_FLOW_NODE', `${path}.from`, 'Flow 起点不存在。'));
    if (!manifest.nodes[flow.to]) issues.push(diagnostic('MISSING_FLOW_NODE', `${path}.to`, 'Flow 终点不存在。'));
    if (flow.trigger.type === 'timeout' && (!Number.isFinite(flow.trigger.milliseconds) || flow.trigger.milliseconds < 0)) {
      issues.push(diagnostic('INVALID_TIMEOUT', `${path}.trigger.milliseconds`, 'timeout 必须为非负有限数。'));
    }
  }

  for (const [id, track] of Object.entries(manifest.cameraTracks)) {
    validateTrack(id, track, `cameraTracks.${id}`, issues, validateShot);
  }
  for (const [id, track] of Object.entries(manifest.sceneTracks)) {
    validateTrack(id, track, `sceneTracks.${id}`, issues, validateSceneState);
  }

  if (manifest.nodes[manifest.entryNodeId]) {
    const reachable = new Set<string>([manifest.entryNodeId]);
    const queue = [manifest.entryNodeId];
    while (queue.length) {
      const current = queue.shift()!;
      manifest.flows.filter((flow) => flow.from === current).forEach((flow) => {
        if (!reachable.has(flow.to)) {
          reachable.add(flow.to);
          queue.push(flow.to);
        }
      });
    }
    nodeIds.filter((id) => !reachable.has(id)).forEach((id) => {
      issues.push(diagnostic('UNREACHABLE_NODE', `nodes.${id}`, '节点无法从入口到达。'));
    });
  }
  return issues;
}

export function assertExperienceManifest(manifest: ExperienceManifest): ExperienceManifest {
  const errors = inspectExperience(manifest).filter((item) => item.level === 'error');
  if (errors.length) {
    throw new Error(errors.map((item) => `${item.code} ${item.path}: ${item.message}`).join('\n'));
  }
  return manifest;
}
