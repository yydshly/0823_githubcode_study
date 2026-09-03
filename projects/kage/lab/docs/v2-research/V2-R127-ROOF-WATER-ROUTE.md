# R127 · 一滴水的屋顶路线

## Design contract

- **Entry mode:** brief-led direct implementation
- **Request revision:** R127 / V2.5 bounded validation
- **Target user and context:** 想理解住宅雨水去向的城市住户与社区规划者；无需工程背景
- **Desired first impression:** 明亮日光下，一滴真实可辨的雨水悬在屋檐，建筑剖面立即建立“水将经过哪里”的空间悬念
- **Visual ambition:** Immersive
- **Experience architecture:** Spatial Stage；持续 Three.js 建筑剖面是主叙事面，不是首屏装饰
- **Scene base:** WebGL / Three.js；DOM 承担语义内容、导航和最终行动
- **Scene persistence:** 从屋顶降雨到花园释放始终保留同一建筑、同一水线与可追踪空间坐标
- **Foreground controls:** 轻量章节导航、状态标签与最终规划对话框；没有持久参数面板或指标集群
- **State-to-scene mapping:** `opening → rainfall → gutter-flow → cistern → garden-release`
- **Mobile transformation:** 保留全屏场景，章节说明压缩为底部可读卡片；不做参数工作台
- **Fallback:** 无 WebGL 时用语义化 CSS/SVG 建筑剖面和同一五状态路线，主要行动仍可完成
- **Visual constraints:** 明亮、自然、建筑模型感；水、玻璃、金属、植被构成统一材质语言；不是暗色科技风，不是三栏工作台，不用大段抽象指标替代空间因果
- **Information constraints:** 只解释概念路线；不伪造真实降雨量、节水量、地理或工程结论
- **Operation constraints:** 滚动与章节导航必须真实改变相机、水路、蓄水量和植被状态；对话框支持 Escape、焦点进入与返回
- **State constraints:** 反向滚动可回到前态；reduced-motion 保留离散关键态；WebGL 丢失时进入可用回退
- **Environment constraints:** 复用现有 Vite、Three.js、V2.5 DirectCreativeRun 与归档门；不接后台 Codex、不引入新供应商、不生成第二方向
- **Primary journey:** 看见屋檐雨滴 → 滚动让降雨落下 → 沿天沟穿行 → 看见蓄水净化 → 水进入花园、植物响应 → 打开“规划我的屋顶路线”并保存本地概念清单
- **User-defined phases:** 一个方向；一次程序化素材批次；一次构建；最多两次确定性修复；最多一次明确缺陷的视觉精修
- **Required artifacts:** 可运行交付页、DirectCreativeRun v2、最终 `runId + bundleHash`、自适应浏览器证据、最终质量判断；只有 pass 才写入 V2.5 示例库
- **Autonomy authorization:** 用户已多次要求持续推进、小目标完成且不要频繁询问；本阶段的可逆实现与验证无需再次确认
- **User-decision boundary:** 真实工程数据、地理数据、外部服务或部署不在本阶段；若成为必须条件才请求新授权

## Positive reference evidence

1. **Threejs-3D-Webpage · articulated spatial reveal**：借用“同一可辨认三维对象在滚动中持续改变相机与空间关系”的机制；不复制题材、构图或视觉风格。
2. **V2 scroll-scrub media prototype · continuous cause and effect**：借用“滚动不是翻页，而是连续驱动同一状态变量”的原理；水线、蓄水和植物响应共享同一进度。
3. **R125 Ice Core Letters · one environment, traceable journey**：借用“同一环境、同一主体、可逆章节状态和可操作终点”的连续性；不复制冰川配色、档案纸张或五段外观。

参考仅提供正向原理，均为 advisory；当前用户要求与项目质量门才是 hard。

## Design direction

| Decision | Chosen direction | Observable constraint | Acceptance criterion |
|---|---|---|---|
| Composition | 单一持续建筑剖面，文字随空间状态换位而非固定仪表盘 | 首屏先看见屋檐雨滴和建筑关系 | 隐藏标题仍能辨认屋顶、天沟、蓄水与花园 |
| Focal hierarchy | 水滴 / 水线是视觉主角，建筑是坐标，文字是解释 | 任何卡片不能遮住关键水路 | 五秒内看懂“水从屋顶去花园” |
| Typography | 人文无衬线正文 + 紧凑章节编号 | 标题不占据大半屏 | 桌面与 390px 均保持一屏一个清晰信息重点 |
| Palette | 日光石灰、陶土、雨水蓝、植被绿 | 不使用霓虹紫或全黑背景 | 水路在浅色建筑上持续可追踪 |
| Material / depth | 粗糙灰泥、半透明水箱、金属天沟、湿润土壤 | 关键对象必须有遮挡、尺度和相对运动 | 画布状态与截图在各关键态均发生主题相关变化 |
| Motion | 滚动控制雨量、水线、相机、蓄水与植物展开 | reduced-motion 改为离散状态但不隐藏因果 | 正向与反向滚动都可复现状态 |

## Coverage manifest

| 用户阶段 | 要求 / 产物 | Surface / state | Evidence needed | Stage | Status | Next action |
|---|---|---|---|---:|---|---|
| 目标锁定 | 设计契约与有界停止条件 | document | file | 0 | pass | 实现可运行基线 |
| 构建 | 明亮、非工作台、持续 Three.js 建筑剖面 | desktop opening | screenshot + DOM + runtime snapshot | 1–3 | pass | 1440×900 开场证据与运行快照通过 |
| 互动 | 滚动真实驱动五个空间状态且可逆 | opening / middle / ending | browser interaction + canvas/state witness | 5–6 | pass | 五态、反向状态及不同画布 / 截图哈希通过 |
| 行动 | 规划并保存概念路线 | dialog | click + keyboard + focus return | 4–6 | pass | 保存、Escape 关闭与焦点返回通过 |
| 移动 | 390px 不溢出且旅程完整 | mobile reduced-motion | screenshot + overflow + state | 7 | pass | 390×844、reduced-motion、无横向溢出通过 |
| 回退 | 无 WebGL 仍可理解与行动 | forced fallback | screenshot + primary action | 8 | pass | 强制回退状态可保存概念路线且无渲染统计 |
| 性能 | 高成本场景不阻断首屏与滚动 | desktop high | ready time + render stats | 8 | pass | 首态 3344ms ready，关键态无阻断错误 |
| 身份 | 最终证据绑定当前 bundle | final files | runId + SHA-256 + test | 9 | pass | `direct-r127-roof-water-route` + `c41783ee…b6effce` |
| 质量 | 独立视觉判断达到精选标准 | final checkpoints | adaptive evidence + WowGate | 9 | pass | FinalQuality 92；WowGate 91；均为 pass |
| 归档 | 只保留一个通过版本 | V2.5 library | archive gate + registry | 9 | pass | 最终版本已注册为 `roof-water-route` |

## Completion and stop rule

完成条件：运行无阻断错误；关键场景对象真实可见；主体、受众、价值和行动可理解；滚动因果、对话框、390px、reduced-motion 与 fallback 有浏览器证据；视觉质量与 WowGate 均 pass；证据绑定最终身份。

停止条件：一次构建与一次视觉精修后仍不达精选标准，则标记为研究结果并停止，不进入注册表、不循环重做。

## Final stage result

- **Verdict:** pass；本阶段按一个方向、一批程序化素材、一次构建、一次确定性修复、一次视觉精修停止。
- **Final identity:** `direct-r127-roof-water-route` / `c41783ee2c07301fd996e92dd300618c9c019a93f74c358c8a0f36c8cb6effce`。
- **Browser evidence:** 开场、完整水路、规划对话框、390px reduced-motion 与强制 fallback 共五组最终证据，均无页面错误、控制台错误、请求失败或响应错误。
- **Archive decision:** FinalQuality 92、WowGate 91；通过 V2.5 最终身份与归档门，仅保留并注册这一版。
