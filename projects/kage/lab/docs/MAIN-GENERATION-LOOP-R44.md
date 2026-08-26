# R44：自然语言到最佳网页的主闭环

## Design contract

- Entry mode：revision-led / continue
- Target user：希望用一句话得到可运行创意网页的创作者
- Desired first impression：输入目标后，系统开始一项可信、可恢复的构建任务，而不是展示模板或本地假结果
- Visual ambition：工作台为 Functional + Editorial；生成结果可按目标选择 Immersive、Editorial Flow、Spatial Stage 或 Hybrid Workspace
- Experience architecture：工作台采用 Hybrid Workspace，左侧描述与状态，右侧持续显示最终网页；生成作品架构由模型按 brief 决定
- Preserved：现有解释器、素材策略、Codex bundle、浏览器机械评审、独立视觉验收、稳定归档与案例库
- Excluded：GLB 自动建模、音频响应、MP4 导出、更多 provider、更多案例
- Primary journey：描述想法 → 创建持久任务 → 服务端规划/选材/构建/验收/最多一次精修 → 工作台恢复最终最佳网页 → 用户打开或保存
- User phases：描述目标；生成素材；构造最终效果；浏览器验收；保留最佳结果
- Required artifacts：持久任务执行器、真实阶段状态、刷新恢复、自动化测试、桌面/手机验收记录
- Autonomy authorization：用户要求“接下来”并已多次授权持续完成主项目；可直接实施可逆的本地工程修改
- User-decision boundary：只有新增外部付费调用、不可恢复写操作或改变产品目标才需要重新确认

## Observable completion criteria

1. 远程生成按钮只创建一个任务，浏览器不再承担模型解释、素材生成、Codex 构建和精修调度。
2. 关闭或刷新工作台不会终止服务端任务；重新打开相同 `job` URL 能恢复阶段和最终网页。
3. 自动路线固定为 `plan → assets → author → browser review → refine at most once → best result`。
4. Codex 是主解释、主构建和主精修能力；MiniMax 只在素材策略明确需要且没有项目素材时调用。
5. 任务状态明确区分 `complete`、`blocked` 和可重试 `failed`，不以本地草案伪装模型结果。
6. 单阶段超时受控；任务在阶段边界检查总预算，并保留已经生成的最好结果指针。

## Coverage manifest

| User phase | Surface / state | Evidence | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- |
| 描述与启动 | 工作台桌面/手机 | 单次 POST、任务 URL | 4–5 | continue | 接入服务端执行器 |
| 模型规划 | 服务端任务 | planning/assets 历史 | 6 | continue | 服务端调用现有解释器 |
| 素材准备 | 项目素材/MiniMax/程序化/阻断 | 明确 route 与资产数 | 6 | continue | 复用现有素材策略 |
| 专属构建 | Codex bundle | compiled receipt | 6 | continue | 服务端调用现有构建器 |
| 视觉验收 | 四状态与最多一次精修 | final score / best receipt | 6 | continue | 服务端调用现有精修器 |
| 刷新恢复 | 相同 job URL | 关闭/刷新后恢复 | 5–7 | continue | 工作台只轮询任务 |
| 工程关闭 | 测试与构建 | Vitest、Playwright、build | 9 | continue | 完成后执行终端审计 |
