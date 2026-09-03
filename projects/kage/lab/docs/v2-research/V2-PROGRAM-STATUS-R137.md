# Kage V2/V3 · R137 项目状态

## 第一目标

把普通用户的一段想法转译为主题专属、视觉优秀、具有合适互动、可运行且可验证的网页。案例只提供正向原理；用户明确要求和通用质量门才是硬约束。素材、页面长度、结构和渲染技术由内容职责决定，不能让暗色、三屏、中央主体或工作台成为默认模板。

## 本阶段完成了什么

R137 用「狐步三拍」补齐计划内唯一缺少最终证据的真实 3D 模型路线：

- 页面：`pages/v2/deliveries/fox-gait-observatory/`
- Run ID：`direct-r137-fox-gait-observatory`
- Bundle SHA-256：`7b234dd7c3d49d642a974b7e6797fb47d14967f9a9f34b6d1c93664b1c9f83e6`
- 主媒介：`threejs-spatial`；主渲染：`threejs-3d`；辅助：`dom-css`
- 宏观结构：`spatial-inspection`
- 素材策略：一批 `licensed` 模型素材，没有第二批素材或程序化替身
- 质量：Quality 92；Wow 91；V3 archive gate `pass`

同一只 Khronos Fox GLB 持续承担主体。Survey、Walk、Run 来自模型内真实动画剪辑；按钮、键盘、拖拽、滚轮、镜头、足迹说明和保存结果共享同一状态。页面持续显示来源、许可和“模型动作演示，不是野外测量数据”。

## 最终证据

- Fox.glb：162,852 bytes；SHA-256 `d97044e701822bac5a62696459b27d7b375aada5de8574ed4362edbba94771f7`
- GLB：1 scene、26 nodes、1 mesh / primitive、1 skin；Survey / Walk / Run 各 21 channels / samplers
- 浏览器：5/5——桌面开场、三动作与键盘、Orbit 拖拽与滚轮缩放、保存重载、390×844 reduced-motion、诚实 fallback
- 所有 checkpoint 的 page、console、request、response issue 均为空
- 首页精选卡、V3 registry、浏览器报告与 DirectCreativeRun 使用同一 `runId + bundleHash`
- 有界执行：一个方向、一批模型、一次构建、0 次确定性修复、0 次视觉精修；通过后停止

## 当前可验证覆盖

| Dimension | Coverage | Evidence-backed result |
| --- | --- | --- |
| V3 计划媒介路线 | `5/5` | `webgl-procedural`、`generated-image`、`code-native`、`grounded-real-media`、`threejs-spatial` 均有最终证据 |
| V3 宏观结构 | 4 种 | `spatial-journey`、`branching-confluence`、`horizontal-panorama`、`spatial-inspection` |
| V3 verified deliveries | 5 个 | R134、R135、R136A、R136B、R137 均绑定最终身份 |
| R137 自适应浏览器检查 | `5/5` | opening、core、mobile、interaction 与 fallback 全部通过 |
| R137 最终质量 | 92 / Wow 91 | hard gates、quality、WowGate、medium consistency 全部通过 |

`5/5` 只表示计划内五类媒介决策已有各自的端到端证明，不表示产品完成度是 100%，也不表示任意想法首稿都必然优秀。

## 已知边界

本地 Vite 与软件 WebGL 冷启动时，主题壳在 231ms 可见，模型完整 ready 约 10,010ms。报告分别保留两个时间，没有把模型到达伪装成五秒 Hero。模型文件只有 162,852 bytes，因此下一阶段应在生产构建中复核首模时间；本阶段不启动第二素材批次或无界性能调参。

## 距离第一目标还差什么

媒介与创意决策层的代表性闭环已经完成，但产品层仍有三项独立工作，不能由 `5/5` 自动宣告完成：

1. **直接创作入口验收**：确认 V2 Composer 导出的有界包能准确显示目标、正向参考、媒介选择、素材职责与停止边界，并能稳定交给当前 Codex 执行。
2. **恢复与发布基线**：在干净启动和生产构建中验证 V2 首页、五个 V3 成品、最终证据与静态路由可恢复；记录冷启动与构建耗时。
3. **新想法回归**：只用一个从未使用的新 brief，检查系统是否自主选择合适媒介和结构，而不是又回到工作台、暗色、三屏或中央主体惯性。失败时按有界规则诚实停止，不循环修补。

## 下一阶段边界

R138 不再制作第六个示范主题。先完成“产品入口 + 恢复基线”的工程验收：一轮构建、一轮自适应浏览器检查、一份恢复记录；若发现阻断问题，最多两次确定性修复。通过后才进入单一新 brief 的产品回归。

