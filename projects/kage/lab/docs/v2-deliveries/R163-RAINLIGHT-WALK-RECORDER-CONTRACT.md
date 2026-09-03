# R163 · 雨光夜行记录器

## 设计契约

- Entry mode：brief-led；用于验证 V5 能否从一个全新产品想法独立完成正式产品交付。
- Request revision：R163 / V5 reproducibility proof。
- Target user and context：夜间散步、旅行或独自回家后，希望保存地点、心情与行走节奏的人。
- Desired first impression：雨后城市不是背景图，而是一段等待被重新走过、写下并保存的记忆。
- Visual ambition：Immersive。
- Experience architecture：Spatial Stage；连续雨夜街景始终是操作表面，输入、路线进度、结果与行动覆盖在同一场景中。
- Scene base：正式生成式宽幅街景 + Canvas 光迹 + CSS 蒙版与材质层；语义 DOM 保留完整产品信息与操作。
- Scene persistence：从产品进入、编辑夜行记录到结果保存始终保留；仅在底部真实性说明处让出部分空间。
- Foreground control model：地点与短句输入、步速选择、滚轮/拖动路线、保存结果与再次编辑。
- State-to-scene mapping：`entry → composing → walking → complete → saved`；光迹长度、雨面反射、排版和声音提示共享同一进度。
- Mobile transformation：390px 下保留全屏街景，将输入与结果变为底部半透明纸片，不改成长工作台页面。
- Fallback：图片或 Canvas 不可用时，地点、文字、路线进度与保存结果仍由 DOM 清晰呈现。
- Visual constraints：雨后胶片摄影、琥珀与冷青光、湿路反射；不使用仪表盘、网格科技背景或卡片矩阵作为主构图。
- Information constraints：开场说明产品用途和第一行动；完成态呈现用户输入、距离隐喻、时间和保存行动；不伪造真实导航或地理数据。
- Operation constraints：滚轮、拖动、键盘方向键均可推进；输入和保存可由键盘完成；声音必须由用户主动开启。
- Environment constraints：沿用 Vite + TypeScript；不新增后台、账号、真实地图或定位接口。
- Primary journey：理解产品 → 写下地点和一句话 → 推进一段光迹 → 看到完整夜行信笺 → 保存到本机或重新编辑。
- User-defined phases：以最终产品效果为准；大胆使用生成素材、蒙版、光迹和声音；一个方向、一批素材、最多一次精修。
- Required artifacts：正式主视觉、可运行页面、设计契约、桌面/390px/键盘/减弱动效/素材回退证据、最终身份与产品交付证据。
- Autonomy authorization：用户已明确“确定并继续”，且此前要求小阶段持续推进，不频繁询问。
- User-decision boundary：真实定位、地图路径、云端分享、账号或后台生成不在本阶段范围。
- Observable completion criteria：产品身份一眼可懂；关键生成素材真实加载；输入与路线推进产生清晰视觉变化；完成和保存结果真实；390px 无阻断；无控制台错误；最终证据绑定当前 bundle。

## 正向参考与媒介决策

- `windborne-letter-valley`：借鉴“连续环境承载起点—路径—结果”，不复制山谷构图。
- `eclipse-post-office`：借鉴“主视觉素材与运行时光影共享同一状态”，不复制邮局主题。
- `ten-second-callsign-decode`：借鉴“声音只能由用户触发且必须产生可辨识反馈”，不复制信号仪表。
- Selected direction：把一次雨夜步行压缩为同一幅街景上的可推进光迹和可保存信笺。
- Asset plan：一次生成一张宽幅无字雨后城市街景；若失败则诚实停止素材阶段，不静默重复生成。
- Interaction plan：滚轮/拖动控制路线进度，光迹、反射、文字阶段和轻量合成声音同步变化；保存写入 localStorage。

## 覆盖清单

| 用户阶段 | 要求 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 产品进入 | 身份、受众、价值、第一行动明确 | desktop entry | `desktop-entry.png` + DOM | 2 | pass | 无 |
| 产品使用 | 输入地点、短句并推进路线 | desktop walking | 真实滚轮从 4% 推进至中段 | 5 | pass | 无 |
| 产品结果 | 完整夜行信笺可理解 | desktop complete | `desktop-saved.png` + 最终状态 | 6 | pass | 无 |
| 产品继续 | 保存和再次编辑真实可用 | desktop saved | localStorage + DOM | 6 | pass | 无 |
| 正式素材 | 生成街景加载并承担空间职责 | enhanced/fallback | naturalWidth > 1000 + 素材阻断兜底 | 8 | pass | 无 |
| 移动产品 | 390px 完整路径无溢出 | mobile entry/result | 真实拖动完成；零横向溢出 | 7 | pass | 无 |
| 键盘 | 输入、推进、保存可操作 | keyboard | `End` 完成 + `Enter` 保存 | 7 | pass | 无 |
| 减弱动效 | 信息和操作不依赖动画 | reduced motion | Chrome 媒体偏好路径 | 7 | pass | 无 |
| 工程与身份 | 类型、测试、构建、最终哈希 | repository | 10/10 单测、Pages build、4/4 Chrome、最终 JSON | 9 | pass | 无 |

## 有界执行

- 一个创意方向。
- 一次素材批次。
- 一次完整构建。
- 最多两次确定性修复。
- 最多一次基于真实浏览器证据的视觉精修。
- 未通过产品门则保留研究记录，但不进入正式产品库。

## 阶段结论

- `runId`：`direct-r163-rainlight-walk-recorder`
- `bundleHash`：`51fcaa3efa5b78525d2f6bc58258d1366508c9480b0be7f664ceadcb786647e4`
- Chrome 验收：4 / 4，通过桌面、390px、键盘、减弱动效和正式素材回退。
- 归档：通过完整产品旅程门，作为第二个 V5 正式产品进入独立正式产品库。
- 停止原因：一个方向、一次素材批次、一次完整构建、两次确定性修复、零产品视觉返工后已达到本阶段可观测完成条件；不继续无限精修。
