# V2 R79 · 共享状态交互驱动能力

## 目标

把 R78 候鸟风洞已经运行验证的“自动演示、滚轮推进、直接控件共享状态”沉淀进 V2 生成链路，服务第一目标：用户描述想法后，Codex 在有边界的能力合同内生成合适网页。

本轮不调整风洞页面的视觉或业务、不生成新候选，也不把滚轮叙事强加给所有产品；只补充三个机器可读标记并执行一次有界探测。

## 证据链

```text
R78 风洞页面真实运行
  -> 播放 / 暂停 / 重置、滚轮、滑块、移动端、键盘、reduced-motion 通过
  -> 提炼单一规范化状态与人工接管边界
  -> 进入 V2 creative contract 与 Codex execution brief
  -> 复用三个标记执行一次有界浏览器探测
```

## 能力选择

能力 ID：`shared-state-interaction-driver`。

只在 brief 明确请求自动演示，并同时需要滚轮或直接控件时选择。普通滚动故事只有 `scroll`，普通参数工作区只有 `manual`，均不会启用此能力。

选中后的合同要求：

- 演示、滚轮和直接控件只写入一个 `single-canonical-state`；
- 主体、场景、语义结果和进度都从该状态派生；
- 自动演示有界，提供播放、暂停和重置；
- 第一次人工输入立即停止演示并接管；
- reduced-motion 使用离散语义状态，移动端仍可用直接控件完成任务；
- 用 `data-signal-shared-driver`、`data-signal-demo-control`、`data-signal-driver-progress` 暴露验收入口。
- 共享根节点持续输出 `data-drive-mode=demo|scroll|manual|paused`，让探测能够验证真实接管，而不是只检查元素存在。

## 已接入位置

- `src/v2/shared-state-driver-capability.ts`：能力定义、条件选择和 authoring contract；
- `src/v2/creative-contract.ts`：V2 技术合同、生成约束和共享状态验收；
- `src/v2/codex-execution-brief.ts`：紧凑执行包与一次性 authoring payload；
- `src/v2/workbench-contract-summary.ts`：工作台能力摘要。
- `src/generation/visual-review-plan.ts`：在已有中间检查点复用一次 `driver-probe`，不增加无限截图；
- `server/dedicated-visual-review.ts`：约 2 秒内依次执行播放、滚轮和一次滑块接管，不重试、不自动修复；
- `src/generation/visual-review.ts`：将缺标记、进度静止、场景静止和人工接管失败转成明确阻断原因。

## 验证结果

- R78 真实浏览器探测通过：共享根节点、演示按钮、进度与人工控件均找到；
- 进度证据为 `0.42 -> 0.53`（播放）、`0.53 -> 0.88`（滚轮）、人工接管后为 `0.00`；
- 驱动模式依次为 `demo -> scroll -> manual`，人工输入后额外等待仍保持 `manual`；
- Canvas 差异分别为 `3.77%`、`4.42%`、`3.24%`，三种输入都真正改变场景；
- 单次浏览器用例 8.6 秒完成，视觉结构门 `100/100`，无 findings；
- 共享状态专项、V2 creative contract、Codex execution brief 与工作台摘要回归通过，TypeScript 无错误。

## 边界

本轮完成“研究证据进入规划、生成合同与自动验收”。探测严格限制为一次播放、一次滚轮、一次人工接管；失败后只返回明确原因，不循环修复。它不会承诺每个模型候选都自动达到视觉质量；现有视觉门禁仍负责拒绝主体弱、变化不明显或业务不可读的页面。
