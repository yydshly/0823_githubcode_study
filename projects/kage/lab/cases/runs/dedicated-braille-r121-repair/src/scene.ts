export interface SceneHandle {
  resize(): void;
  dispose(): void;
}

// DOM 圆顶本身是完整、可访问的视觉主体；此处保留轻量增强合同。
export function createScene(): SceneHandle {
  return { resize: () => undefined, dispose: () => undefined };
}
