# R136B · 西岸集合点图卷

## Design contract

- Entry mode: brief-led direct implementation.
- Request revision: R136B / 1.
- Target user and context: 第一次到上海徐汇滨江看展、需要和朋友确定碰头点的访客。
- Desired first impression: 一张摊开的周末展览折页；真实地图先被看见，集合操作贴近地标发生。
- Visual ambition: Expressive.
- Experience architecture: Spatial Stage，宏结构为 `horizontal-panorama`。
- Scene base: 语义 DOM + 本地 OSM 静态图 + SVG 路线/定位针；禁止 WebGL、Three.js 与生成图。
- Scene persistence: 地图在四个横向位置之间持续可见，集合卡随同一位置同步更新。
- Foreground control model: 地图热点、横向位置索引、上一站/下一站、保存集合点卡。
- State-to-scene mapping: 当前位置同时改变横向卷轴、活跃热点、路线、场馆名称、地址和集合卡；保存状态只确认当前卡片，不制造实时信息。
- Mobile transformation: 390px 下地图保持第一视觉，集合卡收为底部纸签，所有输入与保存继续可达。
- Fallback: 图片失败时显示四个真实地标的诚实名单、地址、坐标、来源说明与可保存集合卡；不伪造地图。
- Visual constraints: 纸白、江水蓝、橙红定位针；底图最大宽度 960px，接近原生分辨率，不低清全屏铺展；不是工作台、卡片轮播或三屏拼接。
- Information constraints: 只复用 `cases/runs/dedicated-c0514ddead80/src/scene.ts` 的四个名称、地址、坐标；真实地理与产品演示建议明确分层；不展示或暗示实时开放时间。
- Operation constraints: 滚轮、拖拽、触摸、左右键、热点、上一站/下一站共同驱动 `panorama-viewport.scrollLeft`；保存使用本地浏览器状态。
- State constraints: 默认、四地标选中、已保存、图片失败、reduced motion。
- Environment constraints: 单一浅色主题；桌面与 390px；无外部运行时请求。
- Primary journey: 穿行连续图卷 → 选择地标 → 核对真实名称/地址/坐标与演示集合建议 → 保存集合点卡。
- User-defined phases: 地图事实接入；横向全景与统一输入；集合卡同步和保存；移动端、减少动态与失败回退。
- Required artifacts: `index.html`、`style.css`、`main.ts`、本地 OSM 资产、`asset-manifest.json`、本合同。
- Autonomy authorization: 用户已明确要求实施，可在交付目录内直接完成与验证。
- User-decision boundary: 不新增真实路线、开放时间、距离、营业状态或后端服务。
- Observable completion criteria: 地图自然尺寸 960×576；四地标事实一致；所有输入改变同一横向位置；所有同步字段一致；保存可用；390px 无文档级横向溢出；减少动态可用；图片失败后名单与保存仍可用；构建通过。

## Design direction

| Decision | Chosen direction | Observable constraint | Acceptance criterion |
| --- | --- | --- | --- |
| Composition | 单一持续地图舞台 + 横向卷轴位置 | 地图不是背景贴图，也不拆成多屏 | 首屏第一记忆点是完整地图折页 |
| Typography | 宋体标题、清晰无衬线事实字段 | 名称、地址、坐标可扫读 | 390px 不裁切关键事实 |
| Palette/material | 纸白、江水蓝、橙红针、折痕与印刷边线 | 不用暗色玻璃工作台 | 选中态不只依赖颜色 |
| Motion | 横向卷轴与离散选点，只解释位置变化 | reduced motion 取消平滑与漂移 | 所有状态仍立即同步 |
| Truth boundary | 地理事实与演示建议分区标注 | 无实时开放暗示 | 每张集合卡持续显示“产品演示”边界 |

## Coverage manifest

| User phase | Requirement / artifact | Surface / state / input | Evidence needed | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| 地图事实接入 | OSM 资产、署名、许可、hash、bytes | 默认 / 资产清单 | 文件与散列 | 1/9 | pass | 124,206 bytes；SHA-256 与 manifest 一致 |
| 地图事实接入 | 四个地标复用既有名称、地址、坐标 | 四个选中态 | DOM/state observation | 3/6 | continue | 实现共享数据源 |
| 横向全景 | 单一 horizontal panorama，地图接近原生尺寸 | 1440px 默认 | 浏览器截图与尺寸 | 2/3 | continue | 实现并检查首屏 |
| 统一输入 | 滚轮、拖拽、触摸、左右键、前后按钮驱动同一位置 | 桌面/移动/键盘 | 交互观察 | 4/5/7 | continue | 实现统一 scrollLeft 控制器 |
| 集合卡 | 热点、名称、地址、集合卡同步 | 四个位置 | 状态观察 | 5/6 | continue | 实现单一选择状态 |
| 保存 | 保存当前集合点卡并提供反馈 | 默认/已保存/切换后 | 交互观察 | 5/6 | continue | 实现本地保存 |
| 诚实边界 | 建议与路线明确为产品演示，无实时开放暗示 | 四个位置 | 文案与 DOM | 3/6 | continue | 实现持续披露 |
| 移动端 | 390px 可用且无文档级横向溢出 | 390×844 / touch | 浏览器截图与交互 | 7 | continue | 响应式检查 |
| 减少动态 | 取消非必要平滑移动但保留功能 | reduced motion | 媒体特性观察 | 7/8 | continue | 运行 reduced-motion 检查 |
| 失败回退 | 诚实名单、事实与保存仍可用 | `fallback=1` / 图片错误 | 浏览器交互 | 6/8 | continue | 实现并强制检查回退 |
| 工程闭环 | 页面可构建 | build:pages 或最小构建 | 命令输出 | 9 | pass | 独立 Vite build：5 modules transformed |

## Current handoff

- Current stage: Stage 7，浏览器跨表面验收由主任务继续。
- Completed: 页面、统一位置状态、四地标事实、产品演示边界、保存、回退、资产清单与最小生产构建。
- Evidence: 独立 Vite production build 通过；资产为 960×576、124,206 bytes，SHA-256 `0a4e65006b159dfc8900e9ef2631a83c0c8bbb456efd774dd582fc12694b3d75`。
- Remaining: 1440px 与 390px 的真实浏览器截图、滚轮/拖拽/触摸/键盘/按钮一致性、reduced motion 和强制 fallback 交互观察。
- Next action: 主任务从本交付 route 运行浏览器矩阵；如观察到可见缺陷，再回到最小修复循环。
