# V2 R94 — 音板调校候选成品精修

## 设计契约

- Entry mode：Revision-led / repair-led
- Request revision：R94
- Target user and context：需要理解厚度、模态、频率与风险关系的手工制琴学习者
- Desired first impression：自然天光下真实、克制、专业的制琴测量工作台；先看到同一块音板与可操作调校关系，而不是宣传海报
- Visual ambition：Immersive
- Experience architecture：Hybrid Workspace
- Visual anchor：同一机位、同一块云杉音板；所有状态只在该主体上发生
- Visual constraints：不得显示 atlas 接缝或多个复制主体；不得使用巨大标题、暗色科技风、随机粒子或装饰性声波
- Information constraints：同屏提供基准/当前厚度、频率、局部挠度、节点/腹部图例、安全区间、风险解释和“教学模拟”边界
- Operation constraints：滚轮提供自动演示；第一次操作滑杆后进入人工接管，滚轮不再覆盖人工厚度；保存显示完整方案摘要
- State constraints：基准、平衡、偏薄/偏硬和保存完成均需同时改变主体、数值与解释
- Environment constraints：canonical runtime `http://127.0.0.1:8143`；桌面 1440×900、移动 390×844；支持 reduced-motion
- Primary journey：浏览开场 → 滚轮看到同一音板状态变化 → 手动调厚度 → 理解证据和风险 → 保存本次方案
- Autonomy authorization：用户明确允许直接借助 Codex 优化，以最终效果为第一目标并继续执行
- User-decision boundary：不增加新业务、真实测量服务或外部鉴权；本轮不需要用户再次确认

## 可观察完成标准

1. 桌面和移动端只出现一块完整音板，画面不存在 atlas 竖缝、相邻复制主体或跨主体程序线。
2. 桌面标题不超过 56px、两行；移动标题不超过 40px、两行，首屏同时能识别主体和调校入口。
3. 滚轮与滑杆都驱动同一状态源；厚度、频率、挠度、风险和主体状态同步变化。
4. 极值之间的主体变化无需阅读数值即可辨认，同时保持木材真实感。
5. 保存后显示厚度、频率、挠度、风险和教学模拟标记组成的完整记录。
6. 桌面、移动、reduced-motion 均能完成主要旅程，无运行时错误或横向溢出。

## 覆盖清单

| 用户阶段 | 要求 | 表面 / 状态 | 证据 | Stage | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 最终效果 | 单一音板、无接缝、真实木材层次 | 桌面开场 | `kage-r94-delivery/01-opening.jpg` | 2 | pass | 已完成 |
| 最终效果 | 滚轮、滑杆、主体和结果同源联动 | 桌面交互 | 机械评审 100；手动 Playwright probe | 5–6 | pass | 已完成 |
| 最终效果 | 完整保存记录 | 桌面保存态 | 2.48 mm / 193 Hz / 0.80 mm / 风险摘要 | 6 | pass | 已完成 |
| 最终效果 | 主体与操作不互相遮挡 | 390×844 reduced-motion | `kage-r94-delivery/04-mobile.jpg` | 7 | pass | 已完成 |
| 工程闭环 | 无运行错误、测试与构建通过 | canonical runtime / repository | 379 tests；production build；0 browser/response error | 9 | pass | 已完成 |

## 基线证据

- `C:/Users/yun68/AppData/Local/Temp/kage-r92-product-audit/01-desktop-opening.png`
- `C:/Users/yun68/AppData/Local/Temp/kage-r92-product-audit/03-desktop-workspace-extreme.png`
- `C:/Users/yun68/AppData/Local/Temp/kage-r92-product-audit/05-mobile-workspace-extreme.png`
- 当前问题：atlas 被整张 cover、三块音板和两条硬竖缝同时可见；滚轮不改变业务状态；标题主导首屏；保存只显示轻提示。

## 交付边界

- 只精修现有 `dedicated-b4d381a24320` 候选并复用现有 R92 素材。
- 本轮不再调用图像模型、不创建新主题、不扩展生成架构。
- 只有浏览器证据满足本契约后才允许归档；否则保留为研究候选并明确结束本轮。

## 最终实现

- 将 1821×864 三态 atlas 严格裁为三帧，只在同一目标矩形内交叉；删除整张三联图 cover、白色接缝和复制主体。
- 使用同一 `thickness` 状态驱动素材显影、受轮廓约束的条带挠度、节点线、腹部响应色场、频率、局部挠度、风险和保存摘要。
- 滚轮提供 3.15→2.70 mm 的自动演示；首次操作滑杆后切换人工接管，继续滚动不覆盖人工值。
- 桌面采用“单一音板 + 测量记录台”同屏构图；移动端保留 46svh 主体舞台并在下方提供完整操作。
- SDK canvas 被移动进真实视觉舞台，并按舞台实际尺寸而非整个 viewport 渲染；全页只有一个 canvas。

## 最终证据与决策

- 机械视觉评审：`100 / pass`；opening→middle 主体差异 4.83%，middle→final 6.52%，真实滚轮因果锚点 6.54%。
- 独立 Codex 视觉验收：`91 / pass`；product intent 86、structure fit 94、state continuity 92、visual cohesion 93、interaction causality 88、mobile readiness 84。
- 手动控制 probe：2.48 mm → 193 Hz → 0.80 mm；滚动后仍保持人工值；保存摘要完整；1 canvas；0 横向溢出；0 page error。
- 自动验证：72 个测试文件、379 个测试全部通过；生产构建通过。
- 最终证据目录：`C:/Users/yun68/AppData/Local/Temp/kage-r94-delivery/`。
- 精选案例封面：`public/creative-assets/r94-luthier-soundboard-final-cover.jpg`。
- 已归档为精选案例：`/cases/dedicated-b4d381a24320/`。

## 阶段结论

R94 已完成，无 `continue`、`defer` 或 `blocked` 项。本轮没有重新调用图像生成，也没有扩展生成架构；它只把已有候选按最终效果完成一次受控精修和验收。
