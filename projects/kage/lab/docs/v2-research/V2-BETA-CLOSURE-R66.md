# V2 Beta 收口 R66

## 设计契约

- Entry mode: Revision-led product closure
- Request revision: R66
- Target user and context: 用户在 Kage 工作台只描述一个想法；当高质量主体素材不足时，需要看懂缺口、交给 Codex/ChatGPT 准备素材或选择本地文件，并从同一任务继续，而不是重新生成或得到占位页面。
- Desired first impression: 生成链路有明确结论；系统知道缺什么、为什么停、补齐后从哪里继续。
- Visual ambition: Functional；本轮收口工作台流程，不规定生成网页的视觉风格。
- Experience architecture: Editorial Flow；保留现有想法输入、生成状态、内嵌预览与最终结果结构。
- Visual constraints: 不新增案例、模板、供应商或固定页面结构；不重做工作台主题。
- Information constraints: 素材请求必须显示职责、最低质量、连续性、验收证据和停止原因；上传动作必须与具体职责关联。
- Operation constraints: 复用现有 `/api/creative/assets/import`、`/api/creative/jobs/:id/assets` 和持久任务恢复；不建立新队列或数据库。
- State constraints: `blocked / needs-codex-assets` 才显示补充操作；每项只接收一个候选文件；门禁通过后自动恢复同一 Job；门禁仍失败则保留明确缺口；不重复调用完整 authoring。
- Environment constraints: 本地规范入口 `http://127.0.0.1:8144/workbench.html`；桌面与 390px；无 ChatGPT 图片 API 时使用 Codex 辅助或本地文件，不伪装全自动生图。
- Primary journey: 提交想法 → 形成素材请求 → 复制 Codex 任务或选择文件 → 文件导入并关联职责 → 素材门禁复检 → 同一 Job 自动继续 → 工作台展示最终网页或明确停止。
- User-defined phases: 回归整体目标；补齐自动闭环；不无限修复；归档并发布 V2 Beta。
- Required artifacts: 本契约、工作台素材恢复控件、状态与错误反馈、定向测试、桌面/移动端浏览器证据、当前项目状态更新。
- Autonomy authorization: 用户明确“确定并继续”，允许在现有 Kage 架构内进行可逆实现和验证。
- User-decision boundary: 不接入新的外部 API，不发布远端，不删除既有运行记录；若要把 Codex Desktop 工具直接嵌入网页，需要新的产品/权限决策。

## 可观察完成标准

1. 素材门禁阻断时，每个请求显示“复制给 Codex”和“选择素材并继续”。
2. 复制内容包含原始目标、素材职责、最低质量、连续性、验收证据和禁止用占位物替代的边界。
3. 选择图片后使用现有导入 API，随后把返回素材 ID 绑定到正确 `requirementId`；门禁通过后同一 Job 自动恢复。
4. 上传、门禁复检或恢复失败时保留请求和原始目标，显示可读错误，不创建新 Job。
5. 桌面与 390px 下控件可操作、无横向溢出；键盘可到达复制与文件选择控件。
6. 定向单测、TypeScript、生产构建与真实浏览器操作通过后，本阶段停止，不启动新案例。

## 覆盖记录

| 用户阶段 | 要求 / 产物 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 目标锁定 | R66 合同与停止边界 | 文档 | 本文件 | Stage 0 | pass | 检查现有素材恢复 API |
| 可运行基线 | 被素材门禁阻断的工作台 | blocked / needs-codex-assets | 持久 Job 夹具；刷新后不再回退为“模型不可用”本地草案 | Stage 1 | pass | — |
| 操作闭环 | 复制任务、选择文件、自动恢复 | desktop / keyboard | `e2e/workbench-asset-recovery-r66.spec.ts` | Stage 4-6 | pass | — |
| 跨端 | 390px 无溢出且操作可达 | mobile | `kage-r66-asset-recovery-mobile.png`；Playwright 2/2 | Stage 7 | pass | — |
| 工程闭环 | 测试、类型、构建、状态记录 | repository | 定向 Vitest 43/43；`tsc --noEmit`；`npm run build` | Stage 9 | pass | — |

## 当前边界

R66 不声称工作台已经拥有 ChatGPT 图片 API。它完成的是现有架构中缺失的可恢复操作层：Codex/ChatGPT 在外部生成或用户提供的高质量素材，可以被明确关联到当前任务，并从原 Job 继续。低质量素材仍由现有门禁拒绝。

## 实际完成

- 工作台会按 `requirementId` 列出每项素材职责，并按职责切换文件类型。
- “复制给 Codex”包含原始目标、视觉责任、连续性、验收证据、来源边界和禁止占位/调试标记的规则。
- 上传沿用现有文件签名与体积检查，随后调用现有 Job 素材接口；通过后恢复原 Job，不创建新任务。
- 主工作台与专属构建区域通过 Job 更新事件保持一致；刷新被阻断任务时不再同时显示错误的本地草案结论。
- 最终视觉验收新增两项通用失败类型：`debug-artifact-visible` 与 `subject-crop-unstable`。它们覆盖红框、箭头、调试文字残留，以及连续素材锚点/连接位置跳变，不绑定某个案例。

## 停止结论

本轮到此停止，不再生成案例。下一阶段不是继续补规则，而是用一个全新目标完成一次真实端到端 Beta 试运行，并按同一门禁给出“最终网页 / 待素材 / 待评审”三种明确结论。
