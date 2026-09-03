# V2 有限恢复与候选保全 R53

## 设计契约

- Entry mode: Revision-led repair
- Request revision: R53
- Target user and context: 用户在现有 Kage 工作台提交想法后，需要在有限时间内得到可运行结果或明确、可恢复的失败结论。
- Desired first impression: 工作台始终说明当前是在调用模型、保存候选、本地修复、编译还是验收，不出现长时间无结论。
- Visual ambition: Functional；生成出的最终页面继续由其独立创意合同决定，不在本轮固定视觉风格。
- Experience architecture: 现有工作台 Editorial Flow；最终生成页面继续按 V2 合同选择 Spatial Stage、Hybrid Workspace 或 Editorial Flow。
- Visual constraints: 不重做工作台外观；只补充已有状态反馈所缺的候选保存、本地恢复和停止信息。
- Information constraints: 明确区分模型生成、本地确定性修复、增量模型修复与最终拒绝。
- Operation constraints: 一次完整生成；最多两轮本地确定性修复；本轮不调用增量模型修复；边界耗尽立即停止。
- State constraints: 原始候选先保存再校验；每次错误分类、修复动作和耗时可追溯；已完成阶段不重复运行。
- Environment constraints: 沿用 `generation-job-runner`、`generation-job-store`、`dedicated-code-service`、现有工作台和 `.artifacts`；不增加数据库、队列、服务或新工作台。
- Primary journey: Codex 返回候选 → 候选落盘 → 本地规范化/修复 → 编译成功进入既有浏览器验收，或在有限边界内携带完整证据停止。
- User-defined phases: 候选保全；错误分类；本地修复；现有 Job/工作台状态；测试与真实运行证据。
- Required artifacts: 设计记录、失败候选目录与报告、修复器与测试、工作台阶段反馈、全量测试/构建/浏览器证据。
- Autonomy authorization: 用户已确认实施，并明确禁止无限修复等待。
- User-decision boundary: 不新增创意能力、不扩展案例库、不调用 MiniMax、不远端发布；R53 完成后才重新运行一个新的投影仪验证任务。

## 可观察完成标准

1. 任意 Codex bundle 在 Schema 或 TypeScript 校验前已经保存；失败后可读取原始候选、错误类型和修复记录。
2. 无素材伪声明、路径规范化和已验证的 Three.js 背景色联合类型问题可在本地确定性修复，不调用模型。
3. 本地修复严格限制最多两轮；每轮后重新执行完整 Schema、安全和 TypeScript 门禁。
4. 现有 Job 历史和工作台显示“候选已保存 / 本地修复 n/2 / 已恢复或已停止”，并保持原 URL 与任务恢复机制。
5. 失败边界耗尽时返回明确结果，保存候选，不自动进入下一次完整生成。
6. 注入真实已出现的两类错误可本地恢复；全量测试、生产构建和工作台浏览器状态通过。

## 覆盖记录

| 用户阶段 | 要求 / 产物 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 目标锁定 | 当前文档与硬停止边界 | 文档 | 文件 | Stage 0 | pass | 审查现有服务边界 |
| 候选保全 | 原始 bundle 先于验证落盘 | 服务 / 失败态 | `raw-bundle.json` + `recovery-report.json` 注入测试 | Stage 1/6 | pass | 后续真实任务复用同一路径 |
| 本地恢复 | 白名单错误最多修复两轮 | 服务 / 编译态 | 路径/伪素材 + `scene.background.set` 两轮恢复测试 | Stage 5/6 | pass | 不扩大白名单 |
| 任务反馈 | 现有 Job 和工作台显示恢复阶段 | 工作台 / running / failed | Playwright 真实 DOM 与截图 | Stage 3/6 | pass | 后续任务直接观察 Job 历史 |
| 工程闭环 | 不回归现有生成、视觉验收和案例 | 项目 | 64 个测试文件 / 248 项测试 + production build | Stage 8/9 | pass | R53 结束后再提交新想法 |

## R53 结果

- 完整模型生成从“最多两次整页重写”收窄为严格一次。
- 原始候选保存在 `.artifacts/generation-candidates/<run-id>/attempt-01/`，修复前后 bundle 和报告可追溯。
- 当前白名单只处理已验证的低风险错误：安全路径前缀、无素材任务的伪 `bundle.assets`、`scene.background.set` 联合类型保护。
- 安全、运行时、未知错误以及没有形成实际变化的修复立即停止；TypeScript/Schema 门禁在每轮修复后完整重跑。
- 现有工作台直接显示候选保存、修复 `n/2`、不重新调用模型以及恢复成功信息。
- 验证结果：定向测试通过，全量 Vitest 248/248，生产构建通过，Playwright 工作台状态 3/3。

## 硬停止规则

- 完整 Codex authoring：最多一次。
- 本地确定性修复：最多两轮，每轮必须产生实际代码或 bundle 变化，否则立即停止。
- 增量 Codex 工程修复：R53 不调用。若未来加入，只能是单独批准的 changed-files 响应，不能恢复为整页重写。
- 浏览器视觉精修不在编译失败时触发；只有形成可运行页面后才进入现有视觉门禁。
- 任一阶段超过既有硬超时即停止，保留最后候选与报告，不自动创建新任务。
