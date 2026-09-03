# V2 R98 — 创意契约直达有界构建

## 设计契约

- Entry mode：revision-led；把 R97 已验证的结构合同从“可阅读结果”推进为真实构建入口。
- Request revision：R98。
- Target user and context：在 V2 项目页输入想法、查看结构与能力选择后，希望直接得到一个最终网页的创作者。
- Desired first impression：用户清楚知道当前采用什么结构、点击后会发生一次什么构建，而不是在 V2 与旧工作台之间重新选择流程。
- Visual ambition：Functional / Editorial。
- Experience architecture：Hybrid Workspace；V2 负责意图与合同，工作台负责生成进度、结果和恢复。
- Visual constraints：主按钮必须从合同自然延续；复制输入保留为辅助动作，不新增固定视觉模板。
- Information constraints：构建前显示结构形式、工作台策略、一次构建和停止上限；不得把研究卡片当作主行动。
- Operation constraints：单次点击进入 Codex；只允许一个服务端 Job、一次作者调用、最多一次自动精修；刷新只恢复同一 Job。
- State constraints：V2 合同 ID 必须随启动链接进入工作台，并由客户端与服务端共同校验；不一致时停止，不得静默重算后继续。
- Environment constraints：规范本地入口 `http://127.0.0.1:8143/pages/v2/`；公开静态页面仍不伪装私有 Codex 可用。
- Primary journey：描述想法 → 查看 V2 合同和结构 → 点击“用此契约构建” → 工作台锁定同一合同 → 建立一个有界 Job。
- User-defined phases：只完成入口、合同握手、状态说明和验证；本阶段不实际消耗模型生成新案例。
- Required artifacts：入口 UI、URL/Job 合同握手、定向测试、构建、桌面与移动浏览器证据、本记录。
- Autonomy authorization：用户已明确“继续”，允许在当前项目内直接实施。
- User-decision boundary：不新增供应商、素材接口、案例或自动精修轮次。
- Observable completion criteria：
  1. V2 合同区存在唯一主构建动作，URL 含 brief、seed、provider、quality、autorun 和 contract ID；
  2. 工作台在启动前校验 URL 合同与本地合同一致；
  3. 服务端创建 Job 时再次校验同一合同 ID，并保留该来源；
  4. 工作台显示业务结构选择与工作台允许策略；
  5. 定向测试、TypeScript、生产构建和桌面/390px 浏览器路径通过。

## 覆盖记录

| 用户阶段 | 要求或产物 | 表面 / 状态 | 证据 | 所属阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 合同直达 | V2 主按钮生成完整有界构建 URL | `/pages/v2/` 默认与新 brief | DOM / URL 断言 | Stage 4 | pass | 阶段完成 |
| 合同锁定 | 工作台和服务端拒绝合同漂移 | URL / Job create | 单元、服务端及浏览器零调用断言 | Stage 6 | pass | 阶段完成 |
| 结构可见 | 工作台显示业务结构和工作台策略 | `/workbench.html` ready | V2 摘要与浏览器 DOM | Stage 3 | pass | 阶段完成 |
| 跨端可用 | 主动作在桌面和 390px 可见可达 | desktop / mobile | `e2e/v2-composer.spec.ts` | Stage 7 | pass | 阶段完成 |
| 工程收口 | 类型、定向测试和构建通过 | repository | 28 项 Vitest、TypeScript、Vite | Stage 9 | pass | 阶段完成 |

## 边界

R98 连接已经存在的 V2 合同和服务端生成链，不重写生成架构，也不把“验证入口”变成一次昂贵的模型测试。真实创意质量验证留给下一次由用户主动发起的新主题构建。

## 实施结果

- V2 合同区新增唯一主动作“用此契约构建”，复制 Codex 输入仍作为辅助能力。
- 启动 URL 固定携带 `provider=codex`、`quality=high`、brief、seed、`autorun=1`、合同 ID 与 `source=v2-composer`。
- 工作台在初始化和创建 Job 前检查合同；合同无效或由 brief 重算后不一致时，显示明确错误并停止，浏览器证据确认不会发送 Job POST。
- 服务端创建 Job 时再次重算并核对合同 ID，匹配时持久化 `expectedContractId`；Runner 在作者调用前再检查一次，避免任务文件或恢复过程发生合同漂移。
- 工作台的“如何避免重复”现在直接显示连续叙事场、空间地图、声音排版场等业务结构，以及“工作台由业务要求 / 可选 / 禁止默认套用”的选择。
- 修改想法会主动解除旧合同、移除 `autorun` 和来源参数，允许用户在新目标上重新形成合同，而不是被旧链接锁死。

## 验证证据

- 定向回归：5 个测试文件、28 项测试全部通过。
- 工程验证：TypeScript 与生产构建通过；仅有既存的大 chunk 提示。
- 浏览器验证：V2 桌面与 390px 主动作可见、无横向溢出；合同漂移路径显示错误、禁用构建且 Job 创建次数为 0。
- 本阶段没有调用 Codex、MiniMax 或其他模型，没有新增案例，也没有启动自动精修。

## 阶段结论

R98 已完成：V2 已从“生成一份可复制的研究合同”升级为“用同一份合同直接进入一次有界构建”。下一阶段不再补入口或规则，而应由一个未使用过的新主题主动触发这条链，验证最终成品是否真的体现 R97 的结构多样性；该动作会产生真实 Codex 构建成本，因此不在本次无模型验证中自动执行。
