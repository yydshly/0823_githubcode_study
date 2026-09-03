# Kage V2/V3 · R136B 项目状态

## 第一目标

把普通用户的一段想法转译为主题专属、视觉优秀、具有合适互动、可运行且可验证的网页。媒介和宏观结构由内容职责决定；生成图、真实媒体、Three.js、WebGL、SVG 与 DOM 都不是默认答案，也不能用低质量替代物冒充关键素材。

## 恢复锚点

- R134「雷雨余光档案馆」：`webgl-procedural` / `spatial-journey`，V3 通过。
- R135「棱镜种子剧场」：`generated-image` / `spatial-journey`，V3 通过。
- R136A「旧胶片相机维修判断」：`code-native` / `branching-confluence`，V3 通过。
- R136B「西岸集合点图卷」：`grounded-real-media` / `horizontal-panorama`，V3 通过。
- 恢复时以最终 delivery、浏览器报告、DirectCreativeRun、V3 registry 和 `runId + bundleHash` 为准，不以旧截图或对话摘要代替当前 bundle 证据。

## R136B 阶段结论

- Run ID：`direct-r136b-west-bund-meeting-points`。
- Bundle SHA-256：`8112989e87b0046a51b3b4420a12555d160b7590b3adf929d79105a3998037e3`。
- 内容决策：真实徐汇滨江地理关系必须由有出处地图承担，因此选择 `grounded-real-media`；主渲染为 `raster-image`，素材策略为 `licensed`。
- 宏观结构：`horizontal-panorama`；滚轮、拖拽、触摸、键盘、热点与按钮共享同一横向位置。
- 素材真相：960×576 JPEG，124,206 bytes，素材 SHA-256 `0a4e65006b159dfc8900e9ef2631a83c0c8bbb456efd774dd582fc12694b3d75`；manifest、实际字节、来源副本、provenance、ODbL 与 OSM 署名一致。
- 浏览器：5/5——桌面开场、多输入同位、选择与跨重载保存、390×844 reduced-motion、诚实图片 fallback；所有运行时 issue 列表为空。
- 质量：Quality 93，宏观结构门 pass，V3 媒介一致性门 pass。视觉等级为 Expressive，不要求也没有附加 Wow evidence。
- 有界执行：1 次方向选择、1 次素材决策、1 次构建、1 次 deterministic repair、1 次 visual refinement。
- 两次修订分别解决滚轮回吸和 fallback 说明遮挡；没有第二批素材、第二方向或静默重试。
- 停止口径：`completed`。DirectCreativeRun 为 `verdict: pass`、`stopReason: null`，stage report 为 `status: completed`；通过全部门禁后停止，不再精修 R136B。

## 当前可验证覆盖

| Dimension | Coverage | Evidence-backed result |
| --- | --- | --- |
| V3 媒介路线 | `4/5` | `webgl-procedural`、`generated-image`、`code-native`、`grounded-real-media` 已闭环 |
| V3 宏观结构 | 3 种 | `spatial-journey`、`branching-confluence`、`horizontal-panorama` |
| 当前 V3 verified deliveries | 4 个 | R134、R135、R136A、R136B 均绑定最终身份与浏览器证据 |
| R136B 自适应检查 | `5/5` | opening、core、mobile、scroll、interaction 全部通过 |
| R136B 最终质量 | 93 | hard gates、structure、quality、medium consistency 全部通过 |

`4/5` 是五种媒介验证矩阵的客观计数，不是“产品已完成 80%”的换算。三种宏观结构也只证明当前已归档案例没有全部落入同一骨架，不代表所有网页形态已经覆盖。

## 唯一未闭环的媒介路线

独立真实 3D 模型路线仍未完成。合格证明必须同时满足：

1. `threejs-spatial` 是内容职责驱动的首选媒介，而不是为了增加 3D 效果；
2. 可追溯的 GLB/glTF 或等价真实模型承担几何、材质、部件层级或空间关系；
3. Three.js 是主空间渲染，真实输入改变可观察的相机、部件或空间状态；
4. 模型字节、来源、许可、尺寸/层级检查和最终 bundle 身份可验证；
5. 桌面、移动端、reduced-motion、模型或 WebGL 失败回退与主要行动均有浏览器证据；
6. 程序化球体/盒子、CSS 伪 3D、图片视差或现有 WebGL shader 不能冒充这条路线。

因此现在只能准确表述为“V3 已覆盖 4/5 媒介路线和 3 种宏观结构”。在独立真实 3D 模型路线通过同样的最终证据门之前，不得写成五媒介完成、V3 全能力完成或产品全面完成。

## R137 下一步与停止点

1. R137 的第一个有界目标只选择一个确实需要可检查真实 3D 的普通 brief，并只使用一个可追溯模型资产批次。
2. 沿用一次方向、一次素材决策、一次构建、最多两次确定性修复和一次视觉精修；模型不合格、职责不成立或浏览器门失败时诚实停止，不用基础几何替代。
3. 真实 3D 通过后，才可把媒介矩阵更新为 `5/5`；发布、首页、Composer 与恢复基线仍按各自工程验收记录，不由媒介计数自动推定完成。

R136B 已完成并停止。当前不继续修改其页面、素材或证据，也不批量增加案例；R137 的首个验证里程碑只处理独立真实 3D 模型路线，之后再分别验收首页、Composer、发布与恢复基线，不能由 `5/5` 媒介计数自动宣告这些产品工作完成。
