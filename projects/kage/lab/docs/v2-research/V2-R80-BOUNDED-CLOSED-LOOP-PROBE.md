# V2 R80 · 有界完整闭环探测

## 目标

用一个未使用过的“城市树冠降温观察站”主题，真实验证：想法 → V2 合同 → Codex 专属代码 → 浏览器验收 → 最终网页。

本轮只允许一个候选、一次 authoring、最多一次精修；无候选时不得伪恢复或无限等待。

## 第一次运行

- 合同准备：67ms；
- 创意理解：约 79 秒；
- 路线错误地组合为 `dom-only / static-sufficient`，但素材阶段又要求程序化 Three.js；
- `gpt-5.6-sol` authoring 在 120 秒上限处停止，没有落盘 `raw-bundle.json`；
- 旧逻辑仍显示 authoring 可恢复，恢复时才以 `ENOENT` 失败，并重新开始五分钟预算。

## 本轮修复

- 只有收到 `candidate-saved` 后，authoring 失败才允许本地候选恢复；
- 默认恢复入口实际检查 `raw-bundle.json`，没有检查点时直接返回明确终态；
- 恢复沿用原 `budgetStartedAt/deadlineAt`，不得刷新总预算；
- authoring 进度不再长期显示不准确的“已耗时 0 秒”；
- “控件接管”被识别为 manual driver；
- 环境剖面、树荫、温度与浇灌等空间因果路线进入 `dom-three-hybrid`；
- 无素材提示按 `dom-only / dom-canvas-hybrid / dom-three-hybrid` 分开，不再同时要求和禁止 Three.js。

## 第二次运行

- 合同准备：18ms；方向命中缓存，约 40ms；
- 合同一致为 `manual + scroll + demo / dom-three-hybrid`；
- 计划包含叙事、共享状态 driver probe、移动端与无 WebGL 回退共 5 个检查点；
- `gpt-5.6-sol` 仍在 120 秒上限处停止，且没有候选检查点；
- 修复后的任务正确进入不可恢复失败：没有空页面、没有恢复按钮、没有重置预算。

## 结论

R80 没有产生最终网页，因此不得归档为案例。当前完整闭环的第一阻塞已经从“无限检查/错误恢复”收敛为一个明确问题：`gpt-5.6-sol` 的一次性 bundle authoring 无法稳定在 120 秒内返回候选。

下一步只比较两种有界方案，不再延长等待：

1. 用更快的 Codex 5.6 Terra 承担首次 bundle authoring，Sol 只保留给高价值视觉精修；
2. 继续压缩 authoring 输入与输出合同，使 Sol 在同一 120 秒上限内完成。

在其中一种路线通过同主题闭环前，不增加新能力、不归档失败页面。
