# Phase 4 — Capability gap and synthesis proposal

这一阶段验证的不是“让模型随便写一个 Three.js 页面”，而是自然语言如何安全地驱动能力空间扩展。

## 路由与证据

- Selected pattern：可复用的 DOM + WebGL 滚动叙事工作台。
- Evidence branch：现有 `BriefInterpreter → ManifestCompiler → CapabilityPlanner → ScenePlugin` 原型与真实浏览器运行时。
- Required inputs：用户 brief、当前能力目录、provider 结构化输出。
- Expected output：可运行方向与不可运行需求分离；后者形成可检查、不可执行的能力提案。
- Skill update：本阶段只更新项目证据，不把尚未实现的自动插件合成写成可复用结论。

## 已实现链路

```text
CreativeBrief
  -> BriefInterpreter
     ├─ IntentEvidence + CreativeDirections
     └─ CapabilityGap[]
  -> existing directions: compile + validate + preview
  -> gaps: deterministic CapabilityProposal planner
     -> target capability id
     -> lifecycle contract
     -> quality / accessibility / performance gates
     -> recommended files
     -> review-required
```

模型只能识别缺口，不能宣称缺口已经完成。三个候选方向仍只允许引用 `signal-world` 与 `chromatic-tide`。提案不会进入 `PluginRegistry`，也不会改变运行时行为。

本地基线可以识别六类明确需求：真实 GLB/glTF 产品资产、音频响应、物理交互、角色资产、体积介质场景、自动成片输出。远程模型使用同一 Schema，最多返回三个缺口。

## 提案包含什么

每个 `CapabilityProposal v1` 都包含：

- `targetCapabilityId`：未来能力目录中的稳定目标 ID；
- `contract`：插件、Driver、Asset 或 Output 必须遵守的边界；
- `qualityGates`：单元测试、语义回退、reduced motion、视觉评审、性能或资产预算；
- `recommendedFiles`：建议实现、测试与文档位置；
- `fallback`：提案未通过时必须继续使用的诚实回退。

工作台新增“能力缺口”示例。它要求真实 GLB 拆解、音乐响应和 MP4 输出，本地与 Codex 都能把三项需求拆成独立提案；点击“检查能力提案”可查看完整 JSON。

## 真实模型证据

2026-08-24 使用 `codex-cli 0.142.5 + gpt-5.4` 完成受约束烟雾测试：模型在约 81 秒内返回三个可运行方向，并分别输出 `asset / driver / output` 三个 essential 缺口，没有回退，也没有把缺口写入可运行 scene plugin。

视觉证据：[390px 能力提案工作台](screenshots/phase4-capability-proposals-mobile.png)

## Phase 4 截止时尚未实现

- 不生成可执行插件源码，也不执行任何生成内容；
- 不下载模型、音频或其他资产；
- 不把提案自动注册进能力目录；
- 不提供隔离构建环境、差异审查或人工批准状态机；
- 不代表真实 GLB、音频响应或 MP4 输出能力已经存在。

Phase 5 已完成其中的虚拟部分：从提案生成内存脚手架并静态审计，但没有物化到隔离目录，也没有运行生成代码。后续仍需受限构建、差异审查与人工批准，只有通过审核的构件才能进入 `CapabilityCatalog` 与 `PluginRegistry`。

