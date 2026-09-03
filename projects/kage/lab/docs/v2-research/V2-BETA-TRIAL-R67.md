# V2 正式 Beta 试运行 R67

## 设计契约

- Entry mode: Brief-led Beta validation
- Request revision: R67
- Target user and context: 社区烘焙学习者在一次短操作中理解发酵条件如何改变面团状态，并保存一份可复查的烘焙计划。
- Desired first impression: 明亮、温暖、可信的共享厨房工作台；第一眼看见同一只发酵罐及其当前状态，而不是宣传标题或抽象科技效果。
- Visual ambition: Immersive
- Experience architecture: Spatial Stage
- Scene base: 由 V2 合同按目标在 DOM / Canvas / Three.js 中选择；透明发酵罐与面团是持续视觉锚点。
- Scene persistence: 调节温度、含水率和时间时持续可见；保存结果后仍保留最终状态。
- Foreground control model: 三个可键盘操作的参数控件、可读估算反馈和唯一“保存这份烘焙计划”行动。
- State-to-scene mapping: 初始、调节中、目标区间、风险区间、已保存；罐内体积、气泡密度、表面张力与颜色必须同步变化。
- Mobile transformation: 390px 使用紧凑控制区或抽屉，不能把场景变成长滚动宣传页。
- Fallback: 无 WebGL 或 reduced-motion 时仍可操作参数、看见数值与文本结果并保存。
- Visual constraints: 明亮自然日光、麦粉白、亚麻、浅木与发酵琥珀色；不要暗色科技风、紫色霓虹、巨大标题、随机粒子或电影式长滚动。
- Information constraints: 所有结果明确标注“教学估算”，不得伪装成真实食品安全结论；约 10 秒内能理解对象、操作与结果。
- Operation constraints: 温度、含水率和时间必须改变同一底层状态与主体画面；不能只更新数字或按钮颜色。
- State constraints: 一个作者候选；最多一次证据驱动精修；失败后停止为 `review-required`，不循环重生成。
- Environment constraints: `http://127.0.0.1:8144`；Codex 解释层使用当前可用 5.6 模型，bundle 使用项目配置的 `gpt-5.6-sol`；MiniMax 只在素材职责适合时作为候选。
- Primary journey: 看见发酵罐 → 调节三个参数 → 主体和教学估算同步变化 → 理解当前状态 → 保存计划。
- User-defined phases: 真实生成；浏览器验收；有限精修；形成明确结论；通过才归档。
- Required artifacts: 持久 Job、可运行页面或明确阻断、桌面/390px/reduced-motion 证据、耗时与停止记录。
- Autonomy authorization: 用户已明确“继续”，允许在现有 Kage V2 架构中运行一次新的有界 Beta 任务。
- User-decision boundary: 不接入新 API，不发布远端，不归档未通过页面；若素材门禁要求外部生成，只使用 R66 恢复层，不改目标。

## 可观察完成标准

1. 工作台只创建一个持久 Job，并能刷新恢复。
2. 页面结构由产品需要决定，不固定三屏或四屏。
3. 同一视觉锚点在参数变化后产生明显、可归因的状态差异。
4. 文本反馈、数值和画面同源，并明确是教学估算。
5. 桌面、390px、键盘、reduced-motion 与无 WebGL 回退保持业务闭环。
6. 最多一次精修；最终只记录 `complete`、`blocked` 或 `review-required`。

## 覆盖记录

| 用户阶段 | 要求 / 产物 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 目标锁定 | R67 合同与停止边界 | 文档 | 本文件 | Stage 0 | pass | 创建唯一 Job |
| 真实生成 | 新主题持久任务 | server Job | `job-76defed6dac8cedb`；`dedicated-9850596d220a` | Stage 1 | pass | 同一 Job 完成素材恢复与 authoring |
| 主交互 | 参数改变同一主体与反馈 | desktop / keyboard | `dedicated-53ab257bae4f`；机械复验 52 | Stage 4-6 | review-required | 数值闭环存在，但 Canvas 变化低于可辨识阈值 |
| 跨端 | 390px 与 reduced-motion | mobile / fallback | 六个自适应检查点；无横向溢出，遮挡已修复 | Stage 7-8 | pass | 保留为待评审候选，不归档 |
| 收口 | 明确最终三态和耗时 | repository | Job `review-required`；best run `dedicated-53ab257bae4f` | Stage 9 | pass | 停止本次任务，缺陷进入下一轮能力建设 |

## 本次原始目标

> 为社区烘焙学习者设计一个明亮的发酵观察工作台。持续展示同一只透明发酵罐，用户调整室温、面团含水率和发酵时间时，罐内面团体积、气泡密度、表面张力与颜色同步变化，并用清楚文字解释当前状态；所有结果明确标注为教学估算，最终行动是“保存这份烘焙计划”。使用自然日光、麦粉白、亚麻、浅木与发酵琥珀色，不要暗色科技风、紫色霓虹、巨大标题、随机粒子或电影式长滚动。页面结构按这个产品需要决定，不固定三屏或四屏。

## Authoring timing finding

- The first authoring attempt stopped before a candidate was saved because the
  `gpt-5.6-sol` call reached the former 100-second hard limit.
- This is a timeout-budget defect, not a browser, asset, or compilation defect:
  the same pipeline previously needed about 115 seconds for a successful R54
  authoring pass.
- The authoring hard limit is therefore adjusted to 120 seconds. It remains one
  model call, one candidate, and no unbounded retry loop.

## Final bounded result

- The supplied transparent jar asset was accepted as `L3-presentable` and bound
  to the original persistent Job; no second interpretation Job was created.
- The 120-second authoring boundary produced `dedicated-9850596d220a` in about
  114 seconds; TypeScript compiled in 396 ms.
- Mechanical review found the full-screen Canvas hidden behind
  `main.ferment-app`. A new deterministic preflight repair now removes a proven
  opaque Canvas occluder once, then repeats the existing adaptive review.
- The repaired candidate is `dedicated-53ab257bae4f`. Occlusion was removed and
  the score rose from 0 to 52, with desktop/mobile/fallback content remaining
  reachable.
- The remaining blocker is interaction causality: sliders and presets update
  the teaching estimate, but the jar state changes too weakly to be visually
  attributable. The Job therefore ends as `review-required` and is not archived.
- Root-cause correction: parameter-driven volume, bubble, colour, gloss, crack,
  or surface transitions now select `material-transition` instead of
  `static-sufficient`. New tasks must provide at least three continuous/layered
  states, an inspectable model, or verified procedural state evidence before
  authoring; a single completed-state image can no longer pass this gate.
