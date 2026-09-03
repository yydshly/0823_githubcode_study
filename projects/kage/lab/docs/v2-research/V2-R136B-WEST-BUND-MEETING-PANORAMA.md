# V2 R136B · 西岸集合点图卷

## Design Contract

- Entry mode：brief-led；验证普通地点任务能否自主选择有出处的真实媒体，并形成不同于空间舞台与分支汇流的第三种宏观结构。
- Request revision：R136B。
- Exact brief：为第一次去上海徐汇滨江看展、需要与朋友约碰头点的人设计「西岸集合点图卷」。使用项目已有、带 OpenStreetMap 署名的真实徐汇滨江地图与可追溯地标坐标；西岸美术馆、油罐艺术中心、龙美术馆和星美术馆始终位于同一真实底图和同一位置变换中。滚轮、拖拽、触摸、方向键、热点与上一站/下一站共同改变横向位置，最终保存集合点卡。真实区域、名称、地址与坐标承担事实；集合建议和示意路线明确标为产品演示，不暗示实时开放、路况或可通行性。
- Target user and context：第一次到徐汇滨江看展、需要和同行者确定碰头点的访客。
- Desired first impression：一张摊开的周末展览折页；纸白、江水蓝和橙红定位针围绕真实地图组织，地图先于说明与操作被看见。
- Visual ambition：Expressive。真实地图和地标事实已承担足够强的主题身份，不需要把任务升级为 Immersive / Flagship，也不需要补写 Wow evidence。
- Experience architecture：`horizontal-panorama`；四个地标共享一张持续可见的真实底图和一个 `scrollLeft`，不是卡片轮播、固定三屏或参数工作台。
- Primary medium：`grounded-real-media`，实际主渲染为 `raster-image`；本地授权地图承担道路、黄浦江岸线、区域关系和第一视觉记忆点。
- Supporting medium：语义 DOM 与 CSS 承担事实、控制、保存和回退；SVG 只标记地标和明确标为产品演示的示意路线，不替代真实地图。没有 WebGL、Three.js、Canvas 或生成图。
- Information constraints：地图来源和 OpenStreetMap 署名持续可见；真实地标事实与产品演示建议分层；不提供开放时间、距离、实时路线、路况或可通行性结论。
- Operation constraints：滚轮、拖拽、触摸、左右键、地图热点和上一站/下一站必须驱动同一横向位置；位置变化同步更新活跃热点、场馆名称、地址、坐标、示意路线和集合卡。
- State constraints：四个地标离散位置、当前选择、已保存、390px reduced-motion 与图片失败名单；本地保存跨重载保留。
- Fallback constraints：图片失败时不绘制替代地图，不显示隐藏的地图图片或路线 SVG；只保留四个真实地标的名称、地址、坐标、署名和可保存集合卡。
- Environment constraints：沿用 Vite 多页和 8143 本地运行时；桌面、390×844、reduced-motion 与强制图片失败状态均须完成主要行动且没有文档级横向溢出。
- Primary journey：看见真实徐汇滨江地图 → 横向穿行四个场馆 → 选择并核对名称、地址与坐标 → 保存集合点卡。
- User-decision boundary：不接实时地图 API、不新增真实路线或开放数据、不采购第二份地图、不连接后台服务、不部署或提交远端。

## Positive reference evidence

1. `positive-xuhui-grounded-atlas`：借用同一经纬度投影、持续署名、地理事实与产品演示分层，以及地图失败时不得伪造地理证据的原则。
2. `positive-moonlit-tidepool-panorama`：只借用多输入共享同一横向位置、移动端离散状态和诚实回退的验收方法；不复制虚构潮池素材、夜间视觉或 V2.5 归档身份。

参考仍是 advisory。当前 brief、真实媒体来源门、产品演示披露与最终浏览器证据才是 hard boundary。

## Asset truth boundary

| Fact | Final value | Verification |
| --- | --- | --- |
| Bundle asset | `assets/xuhui-west-bund-osm-map-v1.jpg` | 文件进入最终 bundle hash |
| Decoded media | JPEG，960×576，124,206 bytes | 实际解码尺寸、文件字节与 manifest 一致 |
| Asset SHA-256 | `0a4e65006b159dfc8900e9ef2631a83c0c8bbb456efd774dd582fc12694b3d75` | delivery、副本与 provenance 记录一致 |
| Source | licensed / OpenStreetMap contributors | `asset-manifest.json` 与来源记录一致 |
| License | Open Data Commons Open Database License (ODbL) 1.0 | manifest 保留许可证名称与 URL |
| Attribution | `© OpenStreetMap contributors` | 桌面首屏与图片失败状态均由浏览器观察确认 |
| Runtime boundary | 本地加载，不请求外部瓦片；图片失败时显示真实地标名单 | fallback 观察确认没有可见图片、SVG 或伪造地图 |

最终身份覆盖 `index.html`、`style.css`、`main.ts`、`asset-manifest.json`、`CONTRACT.md` 和地图原始字节。manifest、来源副本、provenance、实际解码结果或浏览器署名任一不一致时，R136B 不得归档。

## Design direction

| Decision | Chosen direction | Observable constraint | Acceptance criterion |
| --- | --- | --- | --- |
| Composition | 地图与集合卡组成同一张横向周末折页 | 地图持续可见，信息贴近当前地标；没有持久控制台 | 五秒内理解“在真实西岸地图上选集合点” |
| Focal hierarchy | 真实地图第一，当前地标与集合事实第二，保存行动第三 | 标题、提示和按钮不遮挡地图事实 | 选点后能立即核对地点、地址和坐标 |
| Typography | 编辑折页标题、紧凑事实标签和清晰行动文案 | 390px 仍可读；不使用巨型标题挤压地图 | 桌面与移动端行动均可达 |
| Palette | 纸白、江水蓝、橙红定位针与深色事实文字 | 颜色不是唯一选择证据；热点、索引、文字和位置同步 | 当前地标在地图、轨道与集合卡中一致 |
| Motion | 同一 `scrollLeft` 的横向移动与离散吸附 | reduced-motion 取消非必要平滑但保留位置变化 | 滚轮、拖拽、触摸、键盘和按钮得到同一状态 |
| Truth | 授权地图和地标坐标承担事实，虚线只承担产品演示 | 持续显示署名与“不代表实时路线/开放状态”披露 | 正常与 fallback 均不伪造地理信息 |
| Structure | `horizontal-panorama` | 四站在同一地图与位置坐标中，不拆为卡片轮播 | 宏观结构内容适配门为 pass |

## Coverage Manifest

| Requirement | Surface / state | Evidence | Status | Result |
| --- | --- | --- | --- | --- |
| 内容适配媒介 | V3 contract / run | `grounded-real-media` + `raster-image` + licensed plan | pass | 真实地理职责没有漂移到程序图形或生成图 |
| 素材真相门 | manifest / JPEG / provenance | hash、bytes、dimensions、source、license、attribution | pass | manifest 与实际解码字节、来源副本和 provenance 一致 |
| 主题专属首屏 | desktop opening | 1440×900 screenshot + runtime state | pass | 410ms 内显示 960×576 地图、四地标与 OSM 署名 |
| 同一横向控制器 | desktop inputs | wheel / drag / ArrowRight / previous / next | pass | 五类输入均改变同一 `scrollLeft`，热点与轨道索引同步 |
| 地标事实与保存 | desktop selected / reload | route、card、localStorage、runtime state | pass | 龙美术馆事实同步更新，保存状态跨重载保留 |
| 移动与减少动态 | 390×844 touch / reduced-motion | screenshot、touch、state、overflow | pass | 触摸前往油罐艺术中心并保存；无文档级横向溢出 |
| 诚实图片回退 | forced fallback | rendered media count、facts、attribution、save | pass | 无图片或 SVG 假地图；四个真实地标与保存仍可用 |
| 自适应证据 | opening / core / mobile / scroll / interaction | identity-bound checkpoints | pass | 5/5，所有 page、console、request、response issue 列表为空 |
| 最终质量 | adaptive quality gate | 六项质量维度与 minor truth-boundary finding | pass | Quality 93 |
| V3 归档 | run / evidence / registry | `runId + bundleHash`、媒介一致性、宏结构门 | pass | `direct-r136b-west-bund-meeting-points` 已登记为 V3 verified delivery |

## Bounded repair and stop boundary

- 一个主题、一个创意方向、一批授权地图素材、一次完整构建；没有第二地图、第二方向或静默重试。
- `assetBatches: 1` 记录一次对既有授权地图的有界素材决策，不代表生图、第二批素材或运行时外部下载。
- 使用 1 次 deterministic repair，修复滚轮移动后被旧程序化吸附状态回吸的问题。
- 使用 1 次 visual refinement，消除 fallback 说明与真实地标名单的遮挡。
- 修订后重新生成当前 bundle 的浏览器报告和身份；旧报告不能代表新 hash。
- 项目停止口径为 `completed`：manifest 真相门、5/5 浏览器检查、Quality 93 与 V3 一致性门均通过后停止。
- DirectCreativeRun 技术状态为 `verdict: pass`、`stopReason: null`，stage report 为 `status: completed`；这里的 `completed` 不是失败 stop reason。

## Final Outcome

- 结论：R136B 通过并进入 V3 精选；当前页面不再继续精修。
- 页面：`pages/v2/deliveries/west-bund-meeting-points/`。
- Run ID：`direct-r136b-west-bund-meeting-points`。
- Bundle SHA-256：`8112989e87b0046a51b3b4420a12555d160b7590b3adf929d79105a3998037e3`。
- 最终媒介：`grounded-real-media`；主渲染 `raster-image`，辅助 `dom-css`，素材策略 `licensed`。
- 最终结构：`horizontal-panorama`；宏观结构内容适配门为 pass。
- 质量与浏览器证据：Quality 93；5/5 browser checkpoints；无阻断运行时错误。Expressive 不要求 WowGate，因此没有附加 Wow evidence。
- 尝试与停止：1 次方向选择、1 次素材决策、1 次构建、1 次确定性修复、1 次视觉精修；质量门通过后以 `completed` 收口。
- 冻结说明：bundle 内的 `CONTRACT.md` 保留浏览器验收前的 Stage 7 记录，因为它本身属于最终 hash；事后修改会立即使当前报告和归档身份失效。最终完成状态以当前浏览器报告、DirectCreativeRun 与本收尾记录为准。

## Program implication

R136B 只证明了“有出处真实媒体 + 横向全景”的完整 V3 闭环。连同 R134、R135 与 R136A，目前五种媒介路线覆盖 `4/5`：程序化 WebGL、生成主视觉、代码原生与真实媒体已经各有最终证据；宏观结构覆盖 3 种：`spatial-journey`、`branching-confluence`、`horizontal-panorama`。

尚不能声称五媒介体系已经完成。唯一未闭环的媒介路线是独立真实 3D 模型：需要由可追溯 GLB/glTF 的真实几何、材质、部件或空间关系承担主职责，并以 Three.js 浏览器证据证明交互、移动端和回退；已有 WebGL、图片视差或程序化基础几何都不能替代这项证明。
