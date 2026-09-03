# V2 R104 — 登机行李整理工作区有界验证

## 设计契约

- Entry mode：brief-led validation；验证 R103 修正后的创意路由和最终质量门。
- Request revision：R104-2。R104-1 在 Codex 编码前被旧的“两项素材完成上限”错误阻断；本修订只允许一次替代任务验证修复，不增加生成循环。
- Target user and context：第一次独自乘机、需要在出发前快速完成随身行李整理的人。
- Desired first impression：日光下真实、可触摸的旅行整理桌；一眼能看懂“把什么放进哪里、会带来什么结果”。
- Visual ambition：Editorial。
- Experience architecture：Hybrid Workspace；持续可见的打开行李箱是工作表面，物品、结果和行动围绕同一状态组织，不做固定章节长页。
- Visual constraints：允许 Codex、主图模型、MiniMax、项目素材、授权/用户素材、DOM、SVG、Canvas 和 Three.js 自由组合；来源不决定质量。最终画面必须明亮、触感真实、像旅行杂志与桌面摄影，禁止暗色科技、孤立中央产品、巨型标题、粒子、仪表盘和固定三屏。
- Information constraints：当前重量、空间占用、安检提醒和装箱清单必须由同一整理状态派生；如果是模拟数据，明确标注为估算。
- Operation constraints：拖动/选择物品是主要输入；触摸与键盘提供等价路径。滚动只允许自然阅读，不得承担机械章节切换。
- State constraints：同一只打开的软壳登机箱和同一组物品贯穿初始、整理中和完成状态；最终状态仍能看到已装物品的空间关系与清单，不得只剩标题和 CTA。
- Environment constraints：桌面 1440×900、平板约 1024px、390×844 手机、reduced-motion、增强渲染失败后的语义 fallback。
- Primary journey：识别打开的行李箱与候选物品 → 拖动或选择衣物/相机/药盒/水杯 → 同步看到空间、重量与安检结果 → 形成可见装箱布局和清单 → “带走这份装箱单”。
- User-defined phases：一个候选、一个自动有界生成任务、一次独立视觉验收、通过才归档。
- Required artifacts：job 记录、run bundle、机械浏览器证据、独立视觉验收、R104 结论记录；只有最终通过才产生案例库记录。
- Autonomy authorization：用户已授权持续推进、以小目标收口，不重复请求确认。
- User-decision boundary：外部发布、购买素材或接入真实航空规则才需要新授权；本地生成、素材选择、测试和淘汰由 Codex 决定。

## 可观察完成标准

1. 合同路由为聚焦交互工作区；不能回到 guided journey 或固定三段页面。
2. 隐藏标题后仍能辨认打开的登机箱、待装物品和整理关系。
3. 至少两个相反整理状态在同一视觉主体上产生明显差异，重量、空间、提醒和清单同步更新。
4. 最终状态保留行李箱、已装物品和可见清单，并提供明确行动；不是纯色终页或文案替代结果。
5. 桌面、390px、reduced-motion 和增强失败路径均能完成主任务。
6. 机械门通过；独立视觉 `pass`、分数不低于 88、无 major；`deliveryQuality.finalEligible=true` 才可标记完成并归档。

## 覆盖清单

| 用户阶段 | 要求 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 目标锁定 | 新主题、来源开放、最终质量优先 | repository | 本契约 | 0 | pass | 检查路由 |
| 合同路由 | interactive-field / focused workspace | contract | job trace | 1 | continue | 创建唯一任务 |
| 素材完成合同 | 分层职责一次最多 4 项，自动素材仍最多 2 项 | pre-authoring gate | gate requests + tests | 1 | pass | 创建一次替代任务 |
| 首屏主题 | 无标题也能识别行李整理 | desktop opening | screenshot | 2 | continue | 自动浏览器验收 |
| 业务闭环 | 物品→整理→结果→清单→行动 | desktop interaction | runtime + screenshots | 4-6 | continue | 自动浏览器验收 |
| 跨表面 | 平板、390px、键盘、reduced-motion、fallback | required surfaces | browser evidence | 7-8 | continue | 自动浏览器验收 |
| 最终质量 | mechanical + independent visual + delivery | final run | receipts | 9 | continue | 通过才归档 |

## 停止规则

- R104-1 `job-a79770da8e5eeb0e` 在 Codex 编码前因旧的“两项素材完成上限”阻断（planning 67ms、assets 33501ms、authoringAttempts=0），保留为基础设施失败证据。
- 只允许为该编码前基础设施缺口创建一个 R104-2 替代任务；不并行生成多个页面，也不允许第三个任务。
- 允许流水线内最多一次证据驱动精修；若仍为 `review-required`、`blocked` 或 `failed`，立即停止并记录。
- 不手工美化失败 run，不用机械通过冒充优秀作品，不把未通过结果写入案例库。

## 运行记录

- R104-2 Job：`job-8803c3edf8de7638`，seed 131；素材完成合同一次给出 `scene-environment`、`scene-subject`、`scene-foreground` 三项，证明 2→4 全链路边界修复生效。
- 素材完成：环境 `environment-v1.png`（1672×941）；主体 `suitcase-alpha-v2.png`（真实 Alpha，透明区域约 51.7%）；近景 `foreground-cloth-alpha-v2.png`（真实 Alpha，透明区域约 67.5%）。
- 四物件精灵候选因两次背景提取仍无真实 Alpha 被淘汰；未提交、未冒充合格素材。独立拖动物品由页面交互节点承担，前景素材只承担遮挡与低幅视差职责。
- 2026-08-30 素材提交后同一 Job 门禁为 ready：4 个可信素材覆盖环境、主体、前景和深度职责；恢复次数 1/1，进入唯一一次 `gpt-5.6-sol` 代码生成。
- 终态：`gpt-5.6-sol` 在 120 秒硬上限内没有返回可落盘 bundle；Job 按合同结束为 failed，authoringAttempts=1、authoring=120603ms，不创建第三个任务、不归档案例。
- 随后发现交付评级把“最高职责门槛 L3”与“异构素材包最低层级 L2”错误比较；修复限定在 external 素材包，只有逐职责素材门禁 ready 才把整体包归一到合同目标，程序化/混合路线不放宽。

## R105 系统收口（不重跑页面）

- 失败主因不是本机渲染或磁盘：唯一一次 Sol 作者任务收到约 32,465 bytes 的提示词，比同期成功样本大约高 42%，同时还包含四层素材、拖拽共享状态与重复合同字段，120 秒内没有形成完整 JSON bundle。
- 作者输入已做有界瘦身：素材条目去除模型不需要的 `payloadBytes` 和重复描述；V2 创意合同存在时不再注入旧版深色参考主题。四素材作者提示词由测试约束为小于 27 KB，素材 URI、路径、质量、角色和融合要求仍完整保留。
- 执行合同片段从 11,939 bytes 压缩到 4,791 bytes（40.1%）；只保留精确 brief、核心旅程、视觉锚点、交互、场景构成、风格差异、有效能力合同与执行边界。
- `direct-workbench` 的拖拽任务已从错误的 `direct-navigation` 修正为 `pointer + direct-manipulation`，明确要求位置、占用关系与业务结果同步变化。
- 统一回归：8 个相关测试文件 60 项通过；作者合同 9 项通过；TypeScript 检查通过。没有调用模型、没有新建 Job，也没有把 R104 失败 run 写入案例库。
- 阶段停止：不通过延长超时或继续重试来掩盖输入问题。下一阶段只能选择一个全新主题、创建一个有界任务，并以最终可见作品与独立视觉验收决定是否归档。
