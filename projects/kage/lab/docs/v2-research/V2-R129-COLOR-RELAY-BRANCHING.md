# R129 · 高彩城市接力演练

## Design contract

- **Entry mode:** brief-led direct implementation
- **Request revision:** R129 / V2.5 branching-confluence validation
- **Target user and context:** 运动视觉导演、活动编排者与年轻观众；希望快速看懂同一支队伍采用不同交棒策略时，运动路径、交接关系与最终队形如何改变
- **Desired first impression:** 一张正在运行的高彩运动图形海报；四条跑道从画面边缘斜向进入交接区，色块、接力棒和路径先于文字建立节奏
- **Visual ambition:** Immersive
- **Experience architecture:** Spatial Stage；持续 SVG 跑道是主要操作表面，控件只在选择发生时上下文出现，不生成持久侧栏、指标簇或下方工作区
- **Scene base:** SVG 负责跑道、队伍、交接区、接力棒与路径；Canvas 只承担轻量速度尾迹和纸屑增强；DOM 负责语义选择、状态、行动与回退
- **Scene persistence:** 四队身份、颜色和同一交接区持续存在；选择只改变焦点、接力棒轨迹、交接重叠和终点队形，不替换整张场景
- **Foreground control model:** 边缘队伍签 → 两个交棒策略按钮 → 播放/重放 → “保存这次交接方案”；无参数面板
- **State-to-scene mapping:** `opening → team-selected → early-handoff | line-handoff → confluence → saved`
- **Mobile transformation:** 390px 转为纵向四泳道；当前队伍占据主舞台，其余队伍保持边缘标签；策略和行动成为底部紧凑控制条
- **Fallback:** `fallback=1` 禁用 Canvas 尾迹，SVG 与 DOM 仍完整完成队伍选择、两条分支、汇合与保存
- **Visual constraints:** 日光白、赛道黑、荧光青、珊瑚红、太阳黄、钴蓝；标题缩成左上赛会签，不占中心；跑道、接力棒和分支路径构成主视觉
- **Information constraints:** 明确标注为虚构的视觉编排模拟；不得伪造成真实赛事、真实成绩、官方队伍、训练建议或安全结论
- **Operation constraints:** 真实鼠标、触摸与键盘完成队伍和策略选择；分支必须让同一根接力棒的轨迹、交接区重叠、运动节奏和最终队形产生可辨差异，不能只换文案或颜色
- **State constraints:** URL 或重置可重放两条分支；Escape 从结果返回策略选择；reduced-motion 使用离散路径终态，不隐藏分支后果；保存只记录虚构方案 ID
- **Environment constraints:** 复用 Vite、SVG、Canvas、V2.5 DirectCreativeRun 与归档门；不接后台模型、不引入真实赛事接口、不增加第二主题
- **Primary journey:** 看见四队汇入交接区 → 选择队伍 → 选择提前交棒或压线交棒 → 观察同一接力棒的不同可见后果 → 汇合为保留路径身份的方案 → 保存
- **User-defined phases:** 一个方向；一次程序化素材批次；一次构建；最多两次确定性修复；最多一次明确缺陷的视觉精修
- **Required artifacts:** branching-confluence 合同与产品路由、可运行专属页面、桌面两支分支/390px/reduced-motion/fallback 浏览器证据、DirectCreativeRun v2、最终 `runId + bundleHash`、通过后唯一归档
- **Autonomy authorization:** 用户已明确要求按小目标持续开发且不频繁询问；本阶段内可逆产品、页面、测试和文档变更无需再次确认
- **User-decision boundary:** 真实赛事数据、商业品牌、训练指导、外部接口和部署不在本阶段；只有它们成为完成条件时才请求新授权
- **Observable completion criteria:** 首屏无需说明即可识别多队汇入同一交接区；两种策略产生不同 SVG 几何与像素证据；两支路径都能返回并汇合；FinalQuality 与 WowGate 通过；最终证据绑定唯一身份

## Positive reference evidence

1. **MotionSites kinetic hero research · movement as layout**：借用“运动路径直接组织构图与阅读方向”的原理；不复制具体案例配色、文案或镜头。
2. **R116 动作记谱台 · 输入与运动轨迹共享状态**：借用“操作、路径与结果由同一状态驱动”的原理；不复制工作台、参数控件或舞蹈主题。
3. **旧 branching runtime · choice edges and rejoin**：借用已验证的“显式选择、确定路径、共同汇合”机械能力；V2.5 页面必须重新形成主题专属视觉与最终证据。

以上均为 advisory；用户当前要求和通用质量门才是 hard。

## Design direction

| Decision | Chosen direction | Why it serves the goal | Observable constraint | Acceptance criterion |
|---|---|---|---|---|
| Composition | 四条非对称斜向跑道围绕共享交接区汇入和离开 | 分支关系直接成为第一视觉 | 中心不得被大标题、产品或面板占据 | 隐藏文字仍能辨认“多队 → 交接 → 分流/汇合” |
| Focal hierarchy | 接力棒与动态路径第一，队伍颜色第二，策略与说明第三 | 用户先看见发生了什么，再理解选择 | 策略未出现前不占据舞台 | 五秒内可找到队伍选择并理解接力棒正在移动 |
| Typography | 压缩无衬线赛会签 + 超细编号 + 少量中文说明 | 保持海报速度感，不变成仪表盘 | 每个状态最多一个说明句 | 1440px 与 390px 均无文字覆盖跑道主关系 |
| Palette | 高明度纸白底配四支饱和色队伍与黑色跑道 | 与近期暗色、自然材质、3D 场景拉开距离 | 不使用紫色科技渐变、玻璃卡或中性数据面板 | 四队在色觉以外仍有编号与线型身份 |
| Material | 平面赛道、半透明交接区、金属接力棒和印刷网点 | 像可操作的运动图形海报 | Canvas 不能承载必要语义 | fallback 无 Canvas 仍保留完整场景与路径 |
| Branching | 提前交棒形成宽缓弧线与松散终点队形；压线交棒形成急切折线与紧凑终点队形 | 分支真正改变同一主体的可见结果 | 不允许只换 active class、数字或说明 | 两支路径的 SVG path、交接重叠和最终队形均不同 |
| Motion | 首屏轻量演示；首次真实输入后人工接管；分支动画 1.8 秒内完成 | 让页面立即有生命，又不制造等待 | reduced-motion 直接显示离散终态 | 两种模式均能完成保存且不丢信息 |

## Coverage manifest

| User phase | Requirement / artifact | Surface / state | Evidence needed | Stage | Status | Next action |
|---|---|---|---|---:|---|---|
| 目标锁定 | branching-confluence 缺口、契约与停止条件 | document | file + audit | 0 | pass | 实现产品结构 |
| 产品能力 | V2.5 schema、contract、author package 明确表达分支与汇合 | contract output | unit tests | 0–1 | pass | 10/10 专测与 V2.5 回归通过 |
| 构建 | 高彩、非工作台的持续接力舞台 | desktop opening | screenshot + DOM/runtime | 1–3 | pass | SVG/Canvas/DOM 页面已完成 |
| 队伍选择 | 四队真实可选并保持身份 | team-selected | click/touch/keyboard + state | 4–6 | pass | 四队按钮与共享状态已验证 |
| 分支 A | 提前交棒产生宽缓轨迹和松散终点队形 | early-handoff | interaction + geometry/pixel witness | 5–6 | pass | `relay-a5b860c6` 与松散队形已留证 |
| 分支 B | 压线交棒产生急切轨迹和紧凑终点队形 | line-handoff | interaction + geometry/pixel witness | 5–6 | pass | `relay-f46f6396` 与紧凑队形已留证 |
| 汇合 | 两支路径进入同一结果表面并保留路径身份 | confluence | return/replay + DOM/state | 5–6 | pass | 返回、重放与共同结果已验证 |
| 保存 | 保存当前虚构交接方案 | saved | action + persistence | 5–6 | pass | 最终行动与本地虚构 ID 已验证 |
| 移动 | 390px 触摸完成两支路径和保存 | mobile | screenshot + overflow + state | 7 | pass | 390×844 无横向溢出并完成保存 |
| 动效 | reduced-motion 保留离散分支后果 | reduced-motion | browser state | 7–8 | pass | 触摸离散终态已验证 |
| 回退 | 无 Canvas 仍完成选择、分支、汇合与保存 | fallback | screenshot + journey | 8 | pass | `canvasFrames=0` 仍完成蓝队 B 路线 |
| 性能 | 首屏和分支不造成可感等待 | enhanced runtime | timing + render observation | 8 | pass | 首屏 ready 约 1.15 秒；分支 1.8 秒内结束 |
| 身份 | 证据绑定最终 bundle | final files | runId + SHA-256 + test | 9 | pass | `direct-r129-color-relay-branching` + `1ccc5319…e2cc` |
| 质量 | 具有主题专属记忆点且不落入既有模板 | final checkpoints | adaptive evidence + WowGate | 9 | pass | FinalQuality 94；Immersive WowGate 95 |
| 归档 | 同一目标只保留一个通过版本 | V2.5 library | archive gate + registry | 9 | pass | registry 与第 17 个示例入口已接入 |

## Completion and stop rule

完成条件：branching-confluence 进入 V2.5 正式合同；同一接力棒的两支分支、回放、汇合、保存、390px、reduced-motion 与 fallback 均有真实证据；FinalQuality、WowGate、宏观结构评审与最终身份全部通过。

停止条件：一次构建和一次视觉精修后，两支路径仍无法从几何与队形辨认，或页面退化为参数工作台/普通按钮切页，则记录为研究结果并停止，不进入正式 registry，不循环重做。

## Final result

- **Verdict:** pass；R129 阶段已完成并停止，不继续重做。
- **Final identity:** `direct-r129-color-relay-branching` + `1ccc53197308a7f6411a1157774b65980284dab773c50c8189f7210195c7e2cc`。
- **Bounded usage:** 一个方向、一批程序化素材、一次构建、0 次编译修复、一次视觉精修。
- **Browser evidence:** 桌面开场、同队 A/B 两分支、共同汇合与保存、390px reduced-motion、强制 Canvas fallback 共五张最终截图；无页面、控制台、请求或响应错误。
- **Quality:** FinalQuality `94`；Immersive WowGate `95`；宏观结构 `branching-confluence` 通过且不是持久工作台。
