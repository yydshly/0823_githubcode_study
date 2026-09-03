# V2 R151 · 选择回执运行守卫

> R154 兼容修订：`template-inertia` 只作为复核提示，不再单独阻止最高目标适配候选绑定回执；真正的主题、因果、素材、行动与真实性拒绝信号仍会在素材前停止。

## 设计契约

- Entry mode：revision-led；延续 R150 的目标相对选择门，不重做现有协议。
- Request revision：R151 / 1。
- Target user and context：在 V2 页面生成创作契约，并交给 Codex 直接完成专属网页的用户。
- Desired first impression：用户能明确看见“方向比较尚未完成时，素材和构建不会开始”。
- Visual ambition：Functional；本轮只强化执行状态可读性，不制作新视觉案例。
- Experience architecture：Editorial Flow；沿用现有 V2 说明卡，在效果选择门中增加真实运行许可状态。
- Visual constraints：保持现有页面层级、色彩和响应式语言；不新增侧栏、弹窗或装饰动画。
- Information constraints：区分 `pending`、`selected`、`stopped`；回执是执行许可，不是最终视觉证据。
- Operation constraints：V1–V3 继续可解析和重建；R151 使用版本化 V4 入口，不改写冻结案例身份。
- State constraints：未绑定回执禁止素材批次；无合格候选或无效选择显式停止；有效最高目标适配候选才可进入一次素材批次和一次构建。
- Environment constraints：canonical runtime 为 `npm run dev -- --host 127.0.0.1` 与 `http://127.0.0.1:8143/pages/v2/?revision=r151-selection-run-guard`；桌面与 390px 均可读。
- Primary journey：输入想法 → 生成 V4 作者包 → 查看选择许可为 pending → Codex 绑定有效回执 → 才允许素材与构建。
- User-defined phases：一个有界小阶段；不生成案例、不调用模型、不修复历史证据。
- Required artifacts：V4 run schema、回执绑定函数、尝试守卫、V4 author package 入口、工作台状态、单元测试、浏览器证据、阶段记录。
- Autonomy authorization：用户已明确“确定并继续”，允许完成可逆项目内改造，无需重复确认。
- User-decision boundary：不提交远端、不部署、不改变 V1–V3 冻结身份、不扩展后台工作流。
- Observable completion criteria：V4 初始回执为空；素材尝试被阻断；有效最高候选绑定后放行；全候选拒绝或错误选择显式停止；作者包携带 V4 pending seed；页面展示真实状态；桌面和手机浏览器通过。

## 覆盖记录

| 用户阶段 | 要求 / 产物 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 运行协议 | V4 回执状态与兼容解析 | TypeScript schema | V1–V3 保持兼容，V4 显式 pending | 0–1 | pass | 已完成 |
| 执行守卫 | 回执前禁止素材和构建 | run transition | 有效最高候选放行，其余显式停止 | 5–6 | pass | 已完成 |
| 作者交付 | V4 pending seed | author package | 当前 V2 入口使用 V4，旧入口保留 V3 | 5–6 | pass | 已完成 |
| 项目展示 | 真实许可状态可见 | V2 desktop / mobile | pending 与 `ASSETS LOCKED` 可见 | 3–7 | pass | 已完成 |
| 工程闭环 | 类型、相关测试、构建 | repository | TypeScript、45 个定向测试、构建、8 个浏览器测试 | 9 | pass | 已完成 |

## 停止条件

- 不创建或精修任何视觉案例。
- 不把回执自评分当成最终优秀质量证明。
- 不修改旧 runId、bundleHash、截图或浏览器报告。
- 只修复 R151 引入且可复现的类型、状态、布局和浏览器阻断问题。

## 阶段结论

- V4 以版本化入口加入；V1–V3 的解析、重建入口和冻结身份保持不变。
- V4 初始 `effectSelectionReceipt` 为 `null`，任何素材、构建、修复或精修尝试都会被运行守卫阻断。
- 只有结构有效且目标适配得分最高的合格候选能够绑定；绑定后运行方向同步更新，并只开放既有的一次素材批次和一次构建预算。
- 三个候选全部失败时，以 `hard-gate-failed / effect-selection` 停止；回执错误或选择非最高候选时，以 `invalid-evidence / effect-selection` 停止，资源与构建尝试仍为零。
- 当前 V2 页面和作者包已使用 V4，页面明确展示 `PENDING RECEIPT · ASSETS LOCKED`；旧 V3 作者入口继续保留。
- 选择回执只决定是否允许执行，不替代最终浏览器质量、交互真实性与 `runId + bundleHash` 身份证据。

## 验证记录

- `npx tsc --noEmit`：通过。
- 7 个相关 Vitest 文件、45 个测试：全部通过。
- `npm run build:pages`：通过；仅保留原有静态资源解析与大 chunk 提示。
- R151、R150 与 V2 Composer 相邻 Playwright：8 个测试全部通过。
- 浏览器证据：
  - `docs/v2-research/evidence/r151-selection-run-guard/01-desktop-pending-guard.png`
  - `docs/v2-research/evidence/r151-selection-run-guard/02-mobile-pending-guard.png`
- 全量 Vitest：146 个文件中 138 个通过；746 个测试中 737 个通过、9 个失败。9 个失败均为 R151 前已存在的冻结身份、旧证据、旧 prompt 上限和 checkpoint 债务，本阶段没有新增失败。
- 本阶段未创建新案例、未生成素材、未修改旧证据，也没有后台重试。
