# R149 · 日食邮局有界端到端验证

## 设计契约

- Entry mode：brief-led，验证 R148 开放资源编排是否能服务第一目标。
- Request revision：R149 / 1。
- Target user and context：希望把一次天象感受留成私人纪念的普通访客。
- Desired first impression：进入页面五秒内看见盐湖邮局、逼近的月影和即将发生的全食；安静但具有视觉冲击。
- Visual ambition：Immersive。
- Experience architecture：Spatial Stage。场景持续可见，正文、进度与行动作为前景层，不变成工作台或三段页面。
- Visual constraints：唯一生成环境素材承担盐湖、纸张、黄铜和真实光线；Canvas、CSS 遮罩与 DOM 只增强日食因果；不使用紫色科技、随机粒子、卡片墙或中央产品台。
- Information constraints：说明这是艺术化日食体验，不提供真实天象时间、地点或安全观测建议。
- Operation constraints：滚轮与拖动月影驱动同一对齐值；键盘与 range 输入等价；保存行动只在全食完成后可用。
- State constraints：`waiting → approach → diamond-ring → totality → saved`；场景、文字、进度、色温和行动必须同步。
- Environment constraints：桌面、390px 手机、reduced-motion、Canvas 失败和主图失败均保留完整语义旅程。
- Primary journey：移动月影 → 天地逐渐变暗 → 光环闭合 → 明信片显影 → 保存全食明信片。
- User-defined phases：一个方向、一批素材、一次构建、最多两次确定性修复、最多一次视觉精修。
- Required artifacts：独立页面、唯一主视觉、资源清单、浏览器证据、测试、最终结论。
- Autonomy authorization：用户已明确“确定并继续”，无需重复确认可逆实现选择。
- User-decision boundary：不接真实天文服务、不发布或部署、不把艺术模拟宣称为真实数据。
- Observable completion criteria：主题五秒内可辨认；真实输入产生清晰日食变化；主图实际加载；最终行动可完成；390px 无阻断溢出；回退可操作；最终浏览器证据与代码一致。

## 资源决策

采用最少充分组合：

1. `model-generated-asset`：一张盐湖开放式邮局环境主图，承担真实材质、空间、光线和第一记忆点。
2. `project-existing-capability`：沿用项目的有界运行状态、最终身份和 Playwright 证据模式。
3. `direct-original-code`：Canvas 日冕、CSS 月影/遮罩、原生滚轮与拖动共享状态。

本题不需要引入新的 GitHub 运行依赖或第三方产品服务；强行接入只会增加许可、体积和回退成本。R148 的“开放”意味着择优，而不是每次把所有来源拼在一起。

## 覆盖记录

| 用户阶段 | 要求 / 产物 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 有界创作 | 独立沉浸页面 | desktop opening | `01-desktop-opening.png` 与 snapshot | 1–3 | pass | 已完成 |
| 真实因果 | 滚轮、拖动共享状态 | approach → totality | `meanPixelDelta=88.69` 与 `02-desktop-totality.png` | 4–6 | pass | 已完成 |
| 最终行动 | 明信片显影与保存 | totality → saved | `03-desktop-saved.png` 与 saved snapshot | 5–6 | pass | 已完成 |
| 跨表面 | 390px 与键盘 | mobile / range | `04-mobile-saved.png`，无横向溢出 | 7 | pass | 已完成 |
| 回退 | reduced-motion / Canvas / asset | fallback | 双回退仍到达 saved | 8 | pass | 已完成 |
| 工程闭环 | 类型、构建、测试 | final bundle | TypeScript、pages build、3 个 Playwright 场景 | 9 | pass | 已完成 |

## 停止条件

- 不进行第二批生图。
- 首次完整构建后只处理浏览器中可复现的阻断问题。
- 最多一次视觉精修；不达精选标准则保留为研究结果，不伪装归档。

## 最终结论

- 最终 `runId`：`direct-r149-eclipse-post-office`。
- 最终 `bundleHash`：`8b33a2fbb920fbf3a62c325b8fd809edad21201c64c8583f9b5a16009f5d4ea8`。
- 素材批次：1；完整构建：1；确定性修复：2；视觉精修：1；没有静默重试。
- 独立视觉质量：94；WowGate：94；V3 归档结论：`pass`。
- 结论边界：它验证了 R148 能按目标择优组合模型素材与项目运行能力，不表示以后每个主题都应使用生成图片，也不把 3D、声音、视频或 GitHub 依赖设为必选项。
