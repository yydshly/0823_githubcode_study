# V2 R18 · 按合同触发的能力验收

## 目标

视觉验收不再机械增加固定截图。叙事状态由 `creativeContract.experience.beats` 决定，特殊状态只在合同明确选择对应能力时出现。

## 触发规则

- `technical.semanticInteraction.selected=true`，且主输入为 `pointer` 或 `direct-navigation`：复用最接近中段的叙事帧执行语义交互探测；两段式故事才补一个中段交互帧。
- `direction.renderer.route=dom-canvas-hybrid` 或 `dom-three-hybrid`：增加一个禁用 WebGL 的回退帧。
- `dom-only` 与 `dom-media-hybrid`：不增加无 WebGL 回退截图。

因此浏览器证据预算仍然有界：2—6 个故事节拍 + 1 个移动端状态 + 最多 1 个回退状态；语义交互通常复用已有节拍，不额外消耗截图。

## 机械证据

语义交互检查：

- 页面存在可见、可聚焦的 DOM 交互入口；
- 指针或键盘输入实际进入生成运行时；
- 该状态截图继续交给最终视觉验收判断交互后的画面是否有意义。

WebGL 回退检查：

- 浏览器启动前阻断 `webgl` / `webgl2` 上下文；
- 证明 `webglAvailable=false` 与 `fallbackActive=true`；
- 页面仍进入可用状态并保留至少两个可读语义内容；
- 回退状态不要求增强 Canvas 存在。

## 真实验证

使用现有 `dedicated-191bc3ce2125` Three.js 页面执行条件式验收：

- 5 个检查点：opening、beat-evidence、final、mobile、fallback；
- 语义交互帧发现 3 个可见入口，输入进入运行时；
- fallback 中 WebGL 已关闭，保留 7 个可读内容；
- 浏览器错误 0；机械验收 `pass / 100`；
- 本次只复用现有页面，未调用远程模型，也未生成新案例。

## 对整体目标的意义

这一步不是扩展更多展示模板，而是把“什么时候必须证明交互与降级”写入 V2 执行边界。模型仍可创作不同页面，但不能声称使用了语义交互或 WebGL 增强却缺少对应证据；未选择这些能力的页面也不会承担额外耗时。
