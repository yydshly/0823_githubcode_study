# V2 R135 · 棱镜种子剧场

## Design Contract

- Entry mode：未包含技术或素材指令的普通想法验证。
- Exact brief：为一座收藏阳光折射标本的植物温室设计网页。访客进入时看见一枚尚未展开的半透明种荚；随着探索，日光穿过种荚，在地面留下不断生长的彩色光谱，最终把这一刻保存成“今日折光标本”。画面明亮、宁静、真实，又有第一次看见自然奇迹的惊喜；不要像参数工作台。
- Request revision：R135。
- Target user and context：第一次进入植物艺术展的普通访客，在一个连续画面中理解“移动日光—看见折射—保存标本”的体验。
- Desired first impression：真实温室里出现一枚具有玻璃、纤维与植物组织质感的巨型种荚，日光经它折成可触碰的光谱；不是代码几何、中央产品照或面板工具。
- Visual ambition：Flagship / Immersive。
- Experience architecture：Spatial Stage；单一持续环境随滚轮、指针、触摸与键盘产生连续光学变化，内容与行动浮在画面边缘而不是排成固定三屏。
- Primary medium：高质量生成主视觉负责环境、种荚、材质和第一记忆点；它是唯一主素材。
- Supporting medium：WebGL 只承担轻量折射、景深、光谱与输入因果；DOM 只承担说明、进度、状态和最终行动。
- Information constraints：只说明艺术化折光观察，不展示或伪造真实光谱测量值。
- Operation constraints：滚轮推进光线穿过种荚；指针改变入射方向；触摸拖动与方向键提供等价操作；完成态可保存本次折光标本到页面内状态。
- State constraints：`sealed → warming → spectrum → specimen`；每次推进必须改变至少两个非 DOM 视觉变量，不能只换文字或透明度。
- Environment constraints：沿用现有 Vite 多页与 8143 开发运行时；桌面、390px、reduced-motion、图片加载失败和 WebGL failure 都必须保留主旅程。
- Primary journey：看见温室与种荚 → 移动日光 → 光谱在环境中展开 → 保存今日折光标本。
- User-decision boundary：不接后台模型、不采购真实植物学数据、不发布或提交远端仓库。

## 正向参考与职责

- `moonlit-tidepool-panorama`：借用“一张可信主图承担空间身份、代码承担互动因果”的职责分离，不复制横向全景结构。
- `stormglass-archive`：借用连续状态与 WebGL 变量绑定，但不复制暗色、中央玻璃、长滚动和程序化主视觉。
- 编辑型参考：借用边缘排版、留白与单一行动，不复制卡片或工作台。
- 生成主图必须真实加载并进入最终 bundle hash；WebGL 不得用低质量图形替代种荚、温室或材质。

## 视觉与互动方向

| 决策 | 选择 | 可观察约束 |
| --- | --- | --- |
| Composition | 明亮温室全景；巨型种荚与环境成为一个空间，文字沿边缘出现 | 无硬边贴图、无中央产品框、无面板围绕主体 |
| Focal hierarchy | 种荚材质和穿透日光第一，光谱完成态第二，文字与 CTA 第三 | 任一时刻只有一个主要视觉事件 |
| Palette | 日光白、叶片青绿、温暖石材、克制棱镜光谱 | 不回落到暗色紫色科技惯性 |
| Motion | 滚轮控制折光展开，指针控制光线角度，自动漂移只提供微弱生命感 | 输入前后至少两项 shader / scene 数值及画面像素变化 |
| Mobile | 同一连续环境，信息层缩到安全边缘；触摸拖动可完成 | 390px 无横向溢出、CTA 可触达 |
| Fallback | 主图仍承担环境，CSS/SVG 光谱承担最小反馈；若图片也失败则使用语义渐变与完整流程 | 降级不是空白，也不伪装 WebGL 成功 |

## Coverage Manifest

| Requirement | Surface / state | Evidence needed | Status | Next action |
| --- | --- | --- | --- | --- |
| 普通 brief 自主选对媒介 | contract / author package | generated-image primary + WebGL supporting | pass | V3 包选择生成图为唯一主媒介，WebGL 与 DOM 为辅助媒介 |
| 唯一高质量主素材 | delivery asset | 文件、尺寸、真实请求、asset-bound hash | pass | 单次素材批次生成 1672×941 主图，素材 SHA-256 已绑定 |
| 主题专属首屏 | desktop opening | screenshot + loaded asset + DOM | pass | 温室、种荚和日光由真实加载主图共同承担 |
| 输入真实联动 | mid / spectrum | wheel + pointer snapshot 与画面差异 | pass | 原生滚轮和指针同时改变折射、光谱、光线角度与 canvas 像素哈希 |
| 保存完成态 | specimen | click、状态、视觉和 focus | pass | 完成态可保存“今日折光标本”，状态与视觉同步变化 |
| 跨表面可用 | 390px / reduced motion | screenshot、overflow、操作 | pass | 390px 无阻断溢出，reduced-motion 保留完整任务与操作 |
| 双重回退 | WebGL failure / asset failure | fallback state + screenshot | pass | 图片和 WebGL 同时失败时仍有完整语义、进度与保存动作 |
| 工程与身份 | tests / builds / evidence | runId + bundleHash + V3 gate | pass | 页面构建通过，V2.5 共 155 项测试通过，最终证据绑定身份 |
| 有界耗时 | first preview / final | 实际时间戳与停止原因 | pass | 首次预览约 7 分钟，总耗时约 20 分 20 秒；达到质量门后停止 |

## Stop Boundary

- 一个主题、一个创意方向、一张最终主视觉、一次素材调用、一次完整构建。
- 最多两次确定性修复；最多一次依据浏览器证据的视觉精修。
- 素材不合格时诚实停止，不静默再次生图；页面不合格时不进入精选库。
- 不新增第二套结构、第二个模型供应商、后台工作台连接或额外研究分支。

## Final Outcome

- Run ID：`direct-r135-prism-seed-theatre`。
- Bundle hash：`d4ebe575019203c7335541c30d22e750be9d64ddf1663e127740f1f55ac6f739`。
- 最终媒介：`generated-image` 主媒介；`webgl-shader`、`dom-css` 辅助媒介。
- 质量判断：Quality `94`，Wow `93`，结论 `pass`，归档状态 `v3-ready`。
- 执行边界：1 个方向、1 次素材批次、1 次完整构建、2 次确定性修复、1 次视觉精修；没有静默重试或第二轮生图。
- 浏览器证据：桌面开场、滚轮与指针联动、保存完成态、390px reduced-motion、图片与 WebGL 双重回退，共 5 个场景通过。
- 停止原因：目标表达、素材职责、真实互动、跨表面运行与 V3 身份门均已通过；R135 不再继续精修。
