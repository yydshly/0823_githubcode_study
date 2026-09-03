# V2 R112 — 直接创作产品化契约

## 设计契约

- Entry mode：revision-led。保留现有运行时、案例库和验证能力，修订创意决策、参考与最终验收层。
- Target user：输入一个想法，希望在不管理模型、素材与技术细节的情况下得到优秀、具有主题专属性的网页的人。
- Desired first impression：十秒内能理解主题与核心行动，同时感到这是一件为当前想法专门创作的作品，而不是历史模板变体。
- Visual ambition：由 brief 决定 Functional、Editorial 或 Immersive，不预设明暗、节数、媒介、主体位置或互动数量。
- Experience architecture：由内容选择 Editorial Flow、Spatial Stage 或 Hybrid Workspace；选择是建议，不是风格硬禁令。
- Visual constraints：用户当前明确要求为硬约束；案例、关键词和历史风格距离只提供可解释的正向建议。
- Information constraints：主体、受众、期望感受、核心行动必须被回放；数据和来源不得被伪装为真实。
- Operation constraints：一个方向、一次素材批次、一次完整构建、最多两次确定性修复和一次视觉精修；不静默重试。
- State constraints：承诺的滚动、直接操作或媒体状态必须有真实输入与可见结果；未承诺互动的编辑页面可以不强造互动。
- Environment constraints：保留 V1 与现有后台兼容；本轮不接工作台后台 Codex、Minimax、Figma 或新的模型供应商。
- Primary journey：想法回放 → 内部比较方向 → 选 1–3 个高相关正向参考 → 素材和互动计划 → 一个专属网页 → 最终浏览器证据 → 自动精选或诚实停止。
- User-defined phases：规则复位、参考增强、直接创作协议、最终验收、阶段验证。
- Required artifacts：版本化创意指令、参考证据包、DirectCreativeRun、最终证据绑定、自动测试、阶段结论。
- Autonomy authorization：用户已明确要求实施整套方案并由 Codex 自主选择、验收和归档，不重复询问可逆实现决策。
- User-decision boundary：外部部署、付费素材、真实业务数据或破坏性迁移需要新授权；当前仓库内可逆实现与测试由 Codex 决定。
- Observable completion criteria：下方覆盖记录全部 pass；没有可执行 continue；最终结论与自动测试和浏览器证据一致。

## 覆盖记录

| 用户阶段 | 要求或产物 | 表面 / 状态 | 证据 | 内部阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 规则复位 | 硬规则仅来自用户或通用质量门 | 合同与风格选择 | 类型、单测 | 0–3 | pass | `CreativeInstruction` 已分层；历史风格轴只作排序诊断 |
| 参考增强 | 1–3 个高相关正向参考；低相关可为空 | 参考选择与执行包 | 数据、单测 | 2–3 | pass | 六类证据包已进入 authoring，低相关剧场 brief 返回空参考 |
| 直接创作 | 有界记录和停止规则 | DirectCreativeRun | 类型、状态转换、单测 | 4–6 | pass | 契约可直接编译为 run；次数、停止和 60 秒状态报告已固化 |
| 最终验收 | 最终 runId + bundleHash；自适应证据 | opening/core/mobile/适用互动 | 单测与最终浏览器检查 | 5–8 | pass | 证据身份、硬门、优秀度维度和自适应检查点已实现 |
| 兼容性 | 不破坏 V1、既有案例与后台链 | build / tests | TypeScript、Vitest | 9 | pass | 469 项单测、主构建和 Pages 多入口构建通过 |
| 阶段验证 | 一个未使用主题与两个既有回归案例 | 真实浏览器 | 自适应最终证据 | 1–9 | pass | 全新“手势之间”通过桌面、390px、直接交互与错误监听；梦境记录和潮线证词回归通过 |
| 归档 | 同一目标只保留通过门禁的最佳版 | 案例库 | 最终 verdict 与 hash | 9 | pass | R113 最终 bundle 绑定唯一 hash 后进入 V2 精选；没有保留同目标中间版 |

## 实现映射

- `src/v2/creative-instruction.ts`：统一指令来源、作用域和强弱；只有 `user` 与 `quality` 可以为 hard。
- `src/v2/reference-intelligence.ts`：六类首批 `ReferenceEvidencePack` 与 0–3 条相关选择。
- `src/v2/codex-execution-brief.ts`：把 hard / advisory 和正向 borrow 原理送入首稿执行包。
- `src/v2/direct-creative-protocol.ts`：把既有 V2 contract 编译成一次有界直接创作记录。
- `src/v2/direct-creative-run.ts`：一次方向、一次素材批次、一次构建、两次确定性修复、一次视觉精修和 60 秒状态报告。
- `src/v2/final-creative-evidence.ts`：最终 bundle 身份、自适应检查点、硬门与独立视觉质量判断。
- `server/dedicated-code-service.ts`：兼容旧后台，但不再把风格距离、案例风险或能力选择升级为硬禁令。
- `pages/v2/v2.ts`：只展示真正相关的正向参考；低相关时明确显示不强行套案例。

## 已完成验证

- `npx tsc --noEmit`：通过。
- `npm test`：84 个测试文件、469 项测试全部通过。
- `npm run build` 与 `npm run build:pages`：通过；仅保留既有大 chunk 与运行时绝对素材路径提醒。
- `npx playwright test e2e/v2-composer.spec.ts --project=desktop`：2 项真实 Chrome 验收通过，包括桌面、390px、正向参考、空参考、GLB 路线和工作台防漂移。
- `npx playwright test e2e/v2-sign-language-season-delivery.spec.ts --project=desktop`：2 项通过，覆盖运行错误、键盘、390px、减少动态与 SVG 路径真实联动。
- `e2e/v2-dream-record-delivery.spec.ts` 与 `e2e/v2-semantic-interaction.spec.ts`：既有滚动叙事、直接交互及回退状态回归通过。
- [R113 阶段验证结论](./V2-R113-SIGN-LANGUAGE-SEASON-VALIDATION.md)与 [最终 DirectCreativeRun](./evidence/r113-sign-language-season.direct-creative-run.json)共同绑定最终结果。

## 停止规则

- 单个阶段超过 60 秒时报告当前状态，不以沉默等待替代进展。
- 素材生成失败或超时后不自动重开批次；保留当前候选并记录停止原因。
- 一次视觉精修后仍有重大缺陷则标记为研究结果，不进入精选库。
- 不为了完成本契约新增主题、供应商、后台协议或无关能力。
