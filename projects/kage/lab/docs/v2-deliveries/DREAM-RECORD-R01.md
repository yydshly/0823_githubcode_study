# V2 单结果交付 · 梦境记录 R01

状态：已完成  
更新时间：2026-08-27

## 设计契约

```text
Entry mode: brief-led implementation in an active project
Request revision: R01
Target user and context: 刚醒来、希望在梦消失前留下片段的普通用户
Desired first impression: 像刚睁眼看见仍未清晰的房间；安静、真实、没有常见科技风
Visual ambition: Immersive
Experience architecture: Spatial Stage
Visual constraints: 三张项目已有连续梦境素材全屏融合；暖灰、晨雾和低饱和；无矩形海报边界、紫色霓虹或随机粒子
Information constraints: 每个状态只承担一个叙事动词；开场建立情绪，中段允许片段成形，结尾只保留记录行动
Operation constraints: 滚动推进三个状态；最终行动可由鼠标、触摸和键盘打开；Escape 关闭并返回焦点
State constraints: opening / fragments / record / dialog / saved / reduced motion
Environment constraints: Chrome；1440×900、820×900、390×844；暗色单主题；中文
Primary journey: 醒来 → 沿碎片返回 → 到达稳定记忆 → 写下一段梦 → 本机保存反馈
User-defined phases: 单一页面、单一候选、复用已有素材、有限精修
Required artifacts: 独立可运行页面、最终桌面/手机/操作证据、自动化验收、交付记录
Autonomy authorization: 用户明确“继续”，允许项目范围内可逆实现和验证
User-decision boundary: 新模型、外部 API、新素材生成、部署或改变 V1 冻结案例需另行授权
Observable completion criteria: 三张素材加载且连续融合；正文始终可读；最终行动可操作；保存反馈可见；无横向溢出；reduced motion 和素材失败仍可完成阅读与记录；构建及浏览器验收通过
```

## Spatial Stage

- Scene base：全屏图片序列 + CSS 氛围；不强制 WebGL。
- Scene persistence：三个滚动阶段始终固定在视口，最终记录层打开时退为背景。
- Foreground controls：品牌、章节、进度、叙事文本、最终 CTA 与原生 dialog。
- State-to-scene mapping：滚动同时改变素材权重、可读文本、章节和进度；保存改变 dialog 状态。
- Mobile transformation：文本落在下方安全区；dialog 转为底部全宽表面。
- Fallback：图片失败时保留晨雾渐变、完整正文、CTA 和本机记录。

## 覆盖

| 要求 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- |
| 可运行独立页面 | desktop / opening | `/pages/v2/deliveries/dream-record/` | 1 | pass | 已注册 Pages 路由 |
| 连续素材与首屏层级 | desktop / 3 states | 01、02、03 三张最终截图；3/3 素材加载 | 2-3 | pass | 同一房间连续变化，无海报边界 |
| 最终记录闭环 | dialog / saved | 文本输入、本机保存状态 | 4-6 | pass | 空输入提示和保存异常均有反馈 |
| 响应式 | 820 / 390 | 手机底部记录面板；无横向溢出 | 7 | pass | 390×844 已验证 |
| 键盘与焦点 | keyboard / dialog | Enter、Escape、focus return | 7 | pass | 原生 dialog 闭环通过 |
| reduced motion | desktop / reduce | 三个离散稳定状态 | 8 | pass | 信息和操作完整保留 |
| 素材失败回退 | fallback | 渐变背景、正文和记录操作 | 8 | pass | `?fallback=1` 通过 |
| 工程收口 | tests / build / Pages | 3 项浏览器测试、两类构建 | 9 | pass | 已完成 |

## 时间边界

不调用外部模型，不重新生成素材，不制作第二候选。完成上述覆盖后立即停止。

## 最终结果

- 独立页面：`pages/v2/deliveries/dream-record/`
- 页面实现：三张已有素材作为一个持续空间，以滚动控制权重、文本、章节和终点行动。
- 产品闭环：最终可打开原生记录面板，内容保存在浏览器本机；关闭后焦点回到触发按钮。
- 视觉证据：`.artifacts/v2-dream-record/`，仅保留 opening、fragments、record ending、mobile sheet 四张。
- 自动化：`e2e/v2-dream-record-delivery.spec.ts`，3/3 通过。
- 构建：`npm run build` 与 `npm run build:pages` 通过。

## 对 V2 研究的结论

研究已经能够支撑一次受约束交付：它把“梦境记录”的宽泛想法收敛为持续空间、三段体验状态、明确素材职责和单一行动闭环，并在不调用模型、不生成第二候选的前提下完成。下一阶段不再继续扩充参考库，而是把这套“契约 → 单结果交付”的执行入口接回 V2 工作台。
