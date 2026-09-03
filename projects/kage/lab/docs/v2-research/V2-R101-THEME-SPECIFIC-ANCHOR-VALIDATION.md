# V2 R101 — 主题专属视觉主体有界验证

## 设计契约

- Entry mode：brief-led；R100 主题主体约束回写后的唯一真实验证。
- Request revision：R101；首次 Job 预检后收敛为“修复主题合同误路由”，真实页面验收顺延到 R102，不在同一阶段重复创建候选。
- Target user and context：在课堂或家庭中第一次学习观察植物的儿童与陪伴者。
- Desired first impression：一张明亮、可以动手检查的自然观察桌，而不是品牌海报、暗色电影页或抽象数据屏。
- Visual ambition：Immersive。
- Experience architecture：Hybrid Workspace；标本桌持续可见，观察任务与证据在同一视口中更新。
- Scene base：语义 DOM + SVG / Canvas；只有在能增强叶片观察而不遮挡任务时才使用轻量 Three.js。
- Scene persistence：叶片、种子、根系和放大镜贯穿选择、检查与结果阶段；窄屏可改为上下分区，但不得退化为无关联长页。
- Foreground control model：标本选择、放大镜拖动、键盘替代、当前观察任务、证据说明和“开始一次观察”。
- State-to-scene mapping：选择标本后，真实改变主体形态、叶脉/根系结构、含水量和生长阶段证据；文字、读数与图形来自同一状态。
- Mobile transformation：390px 首屏先看到主题、一个完整标本和开始操作入口；任务与证据紧随其后，控件不被固定层遮挡。
- Fallback：Canvas 或增强效果不可用时，保留可选择的语义标本图、观察证据和最终行动。
- Visual constraints：纸张白、植物绿、柠檬黄、少量土壤棕；有触感、友好、清楚；主体是完整可识别的植物标本与放大镜。
- Information constraints：标本名称、观察任务、叶脉/含水量/生长阶段、教学说明和行动属于同一业务闭环。
- Operation constraints：拖动或触摸放大镜产生局部揭示；标本按钮与键盘可完成同一状态切换；滚轮只在有明确意义时推进观察，不得强制三屏叙事。
- State constraints：至少三种标本或观察状态在不阅读正文时也可视觉区分；选择、检查、完成和降级状态必须诚实。
- Environment constraints：规范运行源 `http://127.0.0.1:8143`；一个 Job、一个作者候选、最多一次模型视觉精修；不创建第二候选，不无限等待。
- Primary journey：看见植物观察桌 → 选择标本 → 拖动/触摸放大镜 → 看见主题专属结构和证据同步变化 → 完成并开始一次观察。
- User-defined phases：创建唯一 Job、等待有界终止、浏览器验收、最多一次确定性修复、按证据归档。
- Required artifacts：Job/合同记录、可运行页面、桌面和 390px 浏览器证据、指针/键盘/reduced-motion/降级证据、质量与归档结论。
- Autonomy authorization：用户明确“确定并继续”，且此前要求以小目标持续推进、不频繁询问。
- User-decision boundary：不新增供应商、不购买真实课程素材、不创建第二候选、不修改其他路线的视觉风格。
- Observable completion criteria：首屏十秒内识别植物观察业务；完整叶片与放大镜成为视觉主体；交互产生可观察的结构和证据变化；桌面/390px/键盘/reduced-motion/fallback 可完成；机械门和独立视觉门均通过才进入精选。

## 方向校准

| 决策 | 选择 | 可观察约束 | 验收 |
| --- | --- | --- | --- |
| 构图 | 桌面标本场 + 同视口任务区 | 不使用中央悬浮产品、固定三屏或卡片后台 | 首屏同时出现完整标本、放大镜和观察入口 |
| 视觉主体 | 一片主题明确的完整叶片及其叶脉证据 | 网格、圆环、随机线条、粒子不能代替植物 | 不读文案也能识别叶片与局部放大关系 |
| 交互 | 拖动放大镜与标本选择共同驱动同一状态 | 图形、读数、任务说明不能各自更新 | 指针与键盘都产生可复现的视觉和证据变化 |
| 色彩与字体 | 明亮自然观察教材，层级清楚 | 不使用暗色电影感、霓虹科技和巨型标题 | 桌面与 390px 对比清楚、无裁切重叠 |
| 增强 | SVG / Canvas 只用于结构观察 | 增强失败不影响标本选择、证据与行动 | fallback 和 reduced-motion 均可用 |

## 覆盖清单

| 用户阶段 | 要求或产物 | 表面 / 状态 | 证据 | 阶段 | 状态 | 结论 |
| --- | --- | --- | --- | --- | --- | --- |
| 首次合同 | 原始植物 brief 的真实合同预检 | `job-a093a62d0c5333fd` | persisted job | 0 | pass | 发现误路由为 `material-transformation / layered-2d` |
| 有界停止 | 错误合同不得进入 Codex authoring | server job | history / attempts | 1 | pass | 36.8 秒后在素材门停止；`authoringAttempts=0` |
| 根因修复 | 植物观察专属工作区合同 | repository | contract assertions | 0 | pass | 输出 `editorial-field / interactive-field / procedural-field` |
| 主体 | 完整叶片、放大镜和观察证据进入执行边界 | contract / prompt | Vitest | 0 | pass | 专属 visual anchor 与 fallback 已锁定 |
| 场景 | 标本观察不再误判为环境树冠分层 | scene router | Vitest | 0 | pass | `single-image-hybrid / required=false`，仅一个程序化主体 |
| 意图 | 否定项不再污染情绪与身份能力 | intent parser | Vitest | 0 | pass | “不要电影感/品牌标题”不再变成正向需求 |
| 工程 | 合同、场景、执行包与生产构建 | repository | 36 tests / build | 9 | pass | 36 项定向测试与 `npm run build` 通过 |
| 浏览器与归档 | 首屏、交互、390px、降级与案例决定 | R102 candidate | N/A | 2-9 | pass | R101 未产生页面，不归档、不冒充案例；由 R102 唯一 Job 验证 |

## 停止边界

本轮只创建一个 Job。模型作者只允许一次，runner 的现有确定性恢复和最多一次视觉精修可以执行；不创建第二主题或第二候选。若首个候选能运行，只修复阻断主旅程、主题识别或移动端完成度的确定性缺陷，不进行无边界审美探索。独立视觉验收未通过时不得标为精选：研究价值完整则归档为 `refined`，主题识别或主旅程失败则保留记录并淘汰。

## 执行结果

- 唯一 Job：`job-a093a62d0c5333fd`；约 0.1 秒完成合同规划、36.8 秒进入并停止于素材门。
- 停止原因：旧合同把“叶片 + 选择/变化”当成状态化环境，错误生成 `layered-2d` 的环境、主体、前景和深度职责；这会要求三项无关外部图层。
- 防护结果：Job 在 Codex authoring 前停止，`authoringAttempts=0`、`refinementAttempts=0`，没有浪费一次模型编写，也没有生成或归档错误案例。
- 根因修复：新增植物标本观察路由、主题专属 visual anchor、程序化标本职责与标本工作区场景豁免；同时让情绪和身份能力只读取正向 brief。
- 证据：`tests/v2-creative-contract.test.ts`、`tests/v2-scene-composition-plan.test.ts`、`tests/codex-execution-brief.test.ts` 共 36 项通过；`npm run build` 通过，仅保留既有非阻断 chunk-size 提示。
- 阶段结论：R101 已作为“合同预检与上游修复”关闭；没有可归档网页。下一阶段 R102 必须先用同一 brief 断言新合同，再只创建一个 Job 做真实页面与浏览器双门验收。
