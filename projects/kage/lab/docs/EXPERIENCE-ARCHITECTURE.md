# Experience Architecture v2

## 目标

这个架构不是为了让模型“选一个模板并改颜色”，而是为了让模型、人和运行时围绕同一个可检查的中间表示协作。任何具体作品可以很短、很长、线性、分支、探索式，甚至只包含一个连续镜头。

## 不变量与变量

真正的不变量只有边界：输入意图、结构校验、运行时协议、性能/可访问性约束和可验证输出。节点数量、节点类型、流程拓扑、镜头数量、场景插件、效果组合和交互驱动都属于变量。

因此，系统禁止把“4 章”“一个节点一个镜头”“一个项目一个 Three.js Scene 类”写成核心假设。

## 生成流水线

```text
自然语言 brief
  ↓ 意图提取（目标、受众、情绪、媒介、约束）
ExperienceManifest 草案
  ↓ schema + graph + track + budget validation
FlowPlan 与能力计划
  ↓ 人工确认 / 自动修复 / 插件选择
DOM 内容 + Camera/Scene Tracks + Scene/Effect Plugins
  ↓ 浏览器预览与确定性快照
视觉、性能、可访问性、叙事目标回归
  ↓
版本化可发布体验
```

模型优先生成结构化 manifest；只有注册能力无法表达目标时，才进入受控代码生成。这样可以复用成熟能力，同时保留真正的新视觉方向。

## 当前组件

- `src/experience/schema.ts`：v2 数据契约。
- `src/experience/validator.ts`：结构、引用、轨道、可达性校验。
- `src/experience/flow-plan.ts`：线性化一次确定性体验路径。
- `src/runtime/experience-scroll-driver.ts`：滚动输入适配器。
- `src/runtime/track-sampler.ts`：关键帧窗口与缓动采样。
- `src/runtime/experience-camera-director.ts`：相机轨道解释器。
- `src/runtime/experience-scene-state.ts`：场景状态轨道解释器。
- `src/runtime/plugin-contract.ts`：Scene/Effect 插件生命周期。
- `src/runtime/plugin-registry.ts`：插件注册与实例化。
- `src/runtime/experience-runtime.ts`：Three.js 生命周期与渲染边界。
- `src/plugins/chromatic-tide-plugin.ts`：质量感知的 Shader 光幕场景插件。
- `src/capabilities/catalog.ts`：生成器可选择的已验证能力目录。
- `src/capabilities/planner.ts`：从 manifest 推导能力用量并生成预算决策。


## 下一阶段

1. 实现 CreativeBrief → 多个候选方向 → manifest 的结构化生成器。
2. 为每个生成字段记录来源、置信度、能力选择理由和人工修改历史。
3. 实现 brief → manifest 的结构化生成器，以及逐字段出处、置信度和人工修改记录。
4. 增加视觉目标回归：构图锚点、对比度、遮挡、帧时间和移动端热约束。
5. 将插件代码生成放入隔离沙箱，执行静态检查、资源白名单与浏览器回归后再进入作品库。

验收标准不是“模型输出了代码”，而是：同一 brief 能产生多条结构和视觉均有差异的候选；每条候选可解释、可编辑、可复现、可降级，并且不会破坏运行时边界。
