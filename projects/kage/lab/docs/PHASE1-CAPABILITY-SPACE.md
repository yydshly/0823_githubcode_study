# Phase 1 — Capability Space

## 已验证结论

当前运行时不再只有一个抽象空间场。`signal-world` 使用实例化几何、环轨和粒子建立具象技术空间；`chromatic-tide` 使用细分平面、顶点位移、片元渐变、半透明叠层和折光核心建立编辑化色场。两者共享 DOM、FlowPlan、Camera/Scene Track、质量档和语义回退。

这条证据支持一个有界结论：未来生成器可以根据意图选择不同视觉语法，而不需要改写体验图运行时。它尚不能证明系统拥有无限创意，也不能证明关键词路由等于大模型创作。

## 能力目录

`CapabilityCatalog` 当前记录：

- 能力类型、标签与说明；
- GPU、CPU、内存和 draw-call 相对成本；
- 可用画质；
- 减弱动效与语义回退支持；
- WebGL、运动或交互要求。

`CapabilityPlan` 从 manifest 推导实际使用的 scene、effect、driver 和 output 能力，再结合 renderer、motion 和 quality 得到 `fit`、`degraded` 或 `fallback` 决策。结果包含缺失能力、估算预算和可解释决策，并进入确定性调试快照。

## Shader 质量策略

Chromatic Tide 的高/平衡/低档分别调整细分段数与光幕层数。低画质从 5 层降至 3 层，同时降低顶点数量；DOM 内容与节点流程保持一致。减弱动效继续使用稳定构图和按需渲染。

## 下一研究问题

下一阶段不是直接让模型自由输出 Three.js 代码，而是实现：

```text
CreativeBrief
  -> 意图与约束
  -> 3 个差异化方向
  -> CapabilityPlan
  -> ExperienceManifest 候选
  -> 校验、预览、比较与人工选择
```

只有能力目录无法满足方向时，候选才可以提出“需要新插件”，随后进入隔离代码生成与审核流程。
