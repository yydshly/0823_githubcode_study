# V2 产品体验质量门 R47

## 设计契约

- Entry mode: Revision-led
- Request revision: R47
- Target user and context: 在工作台输入产品想法，希望直接得到可运行、与产品目标相符且具备视觉质量的网页，而不是固定模板或机械分屏。
- Desired first impression: 系统先理解产品和体验结构，再生成网页；用户能看懂为什么采用当前结构、当前结果是否达标。
- Visual ambition: Immersive（同时允许 Functional / Editorial 结果）
- Experience architecture: 根据 brief 在 Editorial Flow、Spatial Stage、Hybrid Workspace 之间选择；不得默认三屏。
- Visual constraints: 不规定统一风格；保持主题、素材、交互和页面结构与产品目标一致。
- Information constraints: 工作台只展示对决策有用的结构、状态覆盖、质量结论和失败原因。
- Operation constraints: 用户提交想法后由现有 Codex 流水线生成；质量不合格不能自动成为精选案例。
- State constraints: 至少覆盖生成中、可预览、需精修、验收通过和失败/回退。
- Environment constraints: 本地 8143 运行时；桌面与 390px 手机；reduced-motion 与无增强能力时仍保留可理解内容。
- Primary journey: 输入想法 → 结构规划 → 生成并运行 → 浏览器证据 → 产品体验质量裁决 → 预览或归档。
- User-defined phases: 结构自适应；模型/系统判断质量；以最终效果决定案例归档。
- Required artifacts: 质量评估模型、工作台可见结果、归档门槛、测试、浏览器证据、研究记录。
- Autonomy authorization: 用户已明确要求继续推进并以最终效果为目标，可直接实施可逆的项目内改动。
- User-decision boundary: 新增付费外部服务、发布到远端或删除历史案例需要另行授权；本轮不涉及。
- Observable completion criteria:
  1. 任意 brief 的结构模式与语义状态数量可被机器读取并在工作台展示。
  2. 浏览器证据能够按语义状态检查覆盖率，而不是固定检查三屏。
  3. 质量结果包含分数、结论、可操作问题和归档资格。
  4. 未达质量门的结果不能标记为精选。
  5. 桌面、手机、reduced-motion、构建和自动化测试通过。

## 本轮覆盖清单

| 用户阶段 | 要求 / 产物 | 页面 / 状态 | 所需证据 | 所属阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 结构自适应 | 结构与状态来自产品内容 | 生成契约 | 63 个测试文件通过；评审计划由 2–6 个语义状态派生 | Stage 0/6 | pass | — |
| 质量裁决 | 输出分数、结论、问题 | 生成完成 / 需精修 | `ProductExperienceQuality` 与任务持久化测试通过 | Stage 6 | pass | — |
| 工作台反馈 | 用户能理解当前结果 | 桌面默认态 | `.artifacts/r47-quality-gate/01-workbench-desktop.png` | Stage 3/6 | pass | — |
| 归档保障 | 不合格结果不得精选 | 归档动作 | `case-library-archive.test.ts` 通过 | Stage 6/9 | pass | — |
| 跨端保障 | 信息在手机可读 | 390px | `.artifacts/r47-quality-gate/02-workbench-mobile.png`；无横向溢出 | Stage 7 | pass | — |
| 动效回退 | reduced-motion 不丢信息 | reduced-motion | 工作台移动端 reduced-motion 流程通过；生成页按合同继续保留专项检查点 | Stage 7/8 | pass | — |
| 工程闭环 | 测试和构建通过 | 项目 | 234/234 单元测试、2/2 浏览器测试、生产构建通过 | Stage 9 | pass | — |

## 方向约束

- 先判断产品需要哪种体验结构，再决定 DOM、Three.js、素材和动效组合。
- 语义状态是体验变化的锚点，不等于页面数量。
- 质量评分用于阻止明显不合格结果进入案例库，不替代用户最终审美判断。
- 本轮不新增主题、不重复生产素材、不扩展外部模型供应商。

## 实现结论

- 新增统一的产品体验质量对象，将机械运行检查、Codex 独立视觉判断、产品结构和语义状态覆盖汇总成一个结论。
- Codex 视觉验收现在必须分别评价产品目标、结构适配、状态连续、视觉融合、交互因果和移动端完成度；画面漂亮但结构错误不能通过。
- 工作台生成前显示计划结构和待检查状态数，生成后显示综合分数、状态覆盖、具体问题和精选案例资格。
- 视觉验收仍使用既有的一次 Codex 判断，没有增加新的模型调用；本轮能力不会额外扩大生成耗时。

## 浏览器精修记录

- Current stage: Stage 9 / Engineering and delivery closure
- User phase: 结构自适应与质量裁决
- Coverage item: 工作台结果解释与跨端可读性
- Browser environment: `http://127.0.0.1:8143/workbench.html`，Chrome，1440×900 与 390×844，2026-08-28
- Observed evidence: 桌面与手机均显示结构、4/4 状态覆盖、93/100 综合质量和归档资格；无横向溢出。
- Problem category: State feedback / information hierarchy
- Root cause: 旧工作台只有素材质量和单一最终分数，无法解释结构与产品状态是否匹配。
- Minimal intervention: 在既有结果区加入产品体验质量门，并复用现有视觉验收调用。
- Adjacent regression surfaces: 生成前 pending 状态、任务耗时面板、390px 手机、reduced-motion、精选归档。
- Observed result: 所有覆盖项通过，未增加新的生成阶段或模型调用。
- Decision: pass
- Next executable action: 无；R47 范围闭合。
- New authority required: 无。
