# V2 R108 — 社区菜市场当季食材编排台

## 设计契约

- Entry mode：brief-led / end-to-end proof。
- Target user and context：需要在菜市场快速决定一周采购组合的普通家庭。
- Desired first impression：上午自然光、真实食材、印刷采购单和可直接整理的桌面。
- Visual ambition：Editorial。
- Experience architecture：Hybrid Workspace。
- Visual constraints：明亮、食材可信、关系先于装饰；禁止暗色科技、中央孤立产品、巨型标题、随机粒子、固定三栏和固定三屏长滚动。
- Operation constraints：拖动和键盘等价；一次操作必须同时改变空间位置、季节性、保存天数、预算和采购顺序。
- State constraints：一人 / 三人份共享同一食材状态；生成采购单前必须形成可解释组合。
- Primary journey：选择份量 → 编排食材 → 观察因果结果 → 生成本周采购单。
- Environment constraints：桌面与 390px 手机；reduced-motion 保留完整信息与操作。
- Autonomy authorization：用户已要求持续开发，不重复询问可逆的项目内实现选择。
- User-decision boundary：不增加真实支付、库存、登录或外部业务接口。
- Execution boundary：一个 Job、一个素材批次（最多四项）、一次 Terra 首稿、已有候选后最多一次 Sol 精修、三分钟总上限。

## 精确输入

为社区菜市场设计一张明亮的“本周当季食材编排台”。主工作区像上午自然光下的摊位与印刷采购单，持续展示番茄、青豆、蘑菇、南瓜和香草。用户把食材拖到工作日晚餐或周末慢炖区域，食材位置、季节性、预计保存天数、预算小计和建议采购顺序在同一桌面同步变化；切换一人 / 三人份会重新计算数量。最后行动为“生成本周采购单”。不要暗色科技、中央孤立产品、巨型标题、随机粒子、固定三栏或三屏长滚动。素材来源不限，以食材可信、关系清晰、操作有反馈和最终视觉质量为准。

## 覆盖记录

| 用户阶段 | 要求 | 证据 | 所属阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- |
| 想法收敛 | 合同必须进入直接操作工作区且不是固定三屏 | `contract-1ffunl4`：`interactive-field` / `layered-2d` | Stage 0 | pass | 已完成确定性预检 |
| 素材职责 | 环境与五类可拖拽食材必须独立且达到展示级 | `asset-32d93dbc183e3307` + `asset-ee3381db635e1827`；1672×941；subject 为 soft alpha | Stage 3–4 | pass | 已通过唯一素材恢复合同 |
| 唯一生成 | 一个任务在三分钟内形成页面或明确失败 | `job-5ebaaea4f3001c38` 时间线 | Stage 5 | fail-fast | Sol 在 90.6 秒且候选落盘前超时；没有重试 |
| 主旅程 | 拖动同时改变主体和业务结果 | 无候选，因此没有浏览器交互证据 | Stage 5–6 | blocked | 下一轮仅在 Terra 产生候选后检查 |
| 跨端 | 桌面、390px、键盘和 reduced-motion 可用 | 无候选，不做虚假验收 | Stage 7 | blocked | 候选通过主旅程后检查 |
| 交付 | 只有通过质量门的最终版本进入案例库 | Job 最终状态 `failed`，未归档 | Stage 9 | pass | 正确拒绝把失败任务写入案例库 |

## R108 阶段结论

- 素材生成、透明度检查、项目导入、L3 审阅回执和同一 Job 恢复链路均通过。
- 唯一失败点是首稿模型：运行环境中的 `CODEX_BUNDLE_MODEL=gpt-5.6-sol` 覆盖了 Terra 默认值；90 秒时尚未产生可恢复候选。
- 硬停止规则实际生效：总任务没有循环创建、没有重复素材批次、没有恢复/精修尝试，也没有误归档。
- 本地运行配置已显式设置 `CODEX_AUTHORING_MODEL=gpt-5.6-terra`。下一阶段只验证“Terra 能否在边界内先落下一版可运行候选”；Sol 只在已有浏览器证据时承担一次精修。

## 停止规则

- 预检不符合目标：停止，不创建任务。
- 素材门阻断：记录唯一补齐请求，不调用作者模型。
- 首稿 90 秒无候选：立即失败，不重新创建任务。
- 有候选但视觉不合格：最多一次证据驱动精修；达到三分钟立即保留候选并停止。

后续紧凑协议、可运行候选与浏览器交互结论见 `V2-R111-COMPACT-AUTHORING-PROOF.md`。
