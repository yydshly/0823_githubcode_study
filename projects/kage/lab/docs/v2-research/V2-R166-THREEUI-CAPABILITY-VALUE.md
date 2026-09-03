# V2 R166 · ThreeUI 能力与 Anima 案例价值评估

## 结论

ThreeUI 对 KAGE 有较高的**参考与能力沉淀价值**，但不应被当成整页模板库直接粘贴，也不能替代 KAGE 的产品理解、情绪目标、内容结构与最终质量判断。

- **对参考决策的价值：高。** 它把视觉效果按运行时、交互、素材、参数和变体组织起来，能减少 Codex 只凭抽象形容词自由发挥。
- **对实现机制的价值：高。** Community 仓库公开了可运行实现，包含 Shader、Three.js、Canvas、DOM/CSS、声音、滚动与完整页面适配器。
- **对完整产品生成的价值：中。** 大量条目是 Hero、背景或局部效果，不能单独回答产品价值、核心行动、数据真实性和完整页面路径。
- **Anima 的灵感价值：中高；源码证据价值：低。** 公开页面只有成品视频和文字说明，没有公开实时 Canvas、控制项或源码。它可以启发创意，但不能作为已验证实现直接复用。

本阶段只完成研究结论，不新增运行时依赖、不复制 Pro 源码、不改变现有生成协议，也不触发部署。

## 审阅范围与证据边界

### 官方产品

- ThreeUI catalog：<https://threeui.com/>
- Anima：<https://threeui.com/hero/anima>
- ThreeUI MCP：<https://threeui.com/mcp>
- Community GitHub：<https://github.com/MengTo/threeui>

### 固定源码快照

- Repository：`MengTo/threeui`
- Revision：`68802d5428071ada5c20db8094b1649e6bb770ed`
- Package：`@designcodeio/threeui@1.2.0`
- License：Community package code 为 MIT；仓库随附的 ThreeUI 自有 Community 素材为 MIT；字体为 SIL OFL；远程缩略图/预览媒体不随仓库许可证授权；Pro/Beta 源码与专属素材不在 Community 仓库中。

本次源码审阅属于 `E3 / source-reviewed`，还没有把任何 ThreeUI 条目提升为 KAGE 的 `ReferenceEvidencePack`。只有完成固定版本本地运行、适用性、移动端、降级与资源来源验证后，单个机制才可以进入 `E4`。

## ThreeUI 实际提供了什么能力

### 1. 不只是“好看案例”，而是带实现信息的效果目录

目录将条目组织为 Landing Pages、Hero、Three.js、Motion Design、Sections、Backgrounds、Buttons、Text Animation、UI Elements 与 CSS 等类型。单个条目可以声明：

- runtime 与 source files；
- interaction、passes 与 asset 数量；
- controls、variants 与导入入口；
- origin、source commit 与实现说明；
- 预览、源码和面向编码代理的实现 prompt。

这类结构对 KAGE 最有价值：它提供的是“视觉现象 → 实现机制 → 使用边界”的中间层，而不是只有一张参考截图。

### 2. Community 源码覆盖多种表达媒介

对固定 revision 的静态审阅显示：

- 约 234 个 TS/TSX/JS 源文件与 103 个 package component 入口；
- ShaderMaterial / RawShaderMaterial、WebGLRenderer、Canvas/DOM、指针与触摸、滚动、声音和完整 HTML 场景均有覆盖；
- 多数持续渲染组件显式处理 resize、pixel ratio、页面可见性、IntersectionObserver、动画循环和资源释放；
- catalog 使用 lazy import，允许只运行当前选择的效果；
- 完整页面可以通过 sandboxed iframe 隔离，也存在可组合的原生 React/WebGL 组件。

因此 ThreeUI 的价值并不只是“图像素材”，而是可供研究的渲染、互动和生产生命周期方案。

### 3. MCP 是检索与交付接口，不是质量保证

官方 MCP 提供 `search_catalog`、`get_catalog_item`、`get_item_source`、`get_item_prompt`，可以按名称、分类、runtime 或描述检索，并取得元数据、源码清单、素材、用法和实现 prompt。它需要 OAuth 2.1 与 Pro 权限。

如果后续接入，它可以让 Codex 在创作前按目标检索少量相关机制，避免盲搜；但它不能替代 KAGE 判断“这个效果为什么适合当前产品”，也不能保证拼出的整页优秀。

## Anima 案例拆解

### 已确认事实

公开页将 Anima 描述为全屏 perception platform hero：程序化点云人物半身像与耳机作为主体，叠加 dust、haze、stars 与 bloom；入场时主体从模糊走向聚焦，界面元素逐个清晰；局部 pointer field 会让光点信号围绕指针分开。

公开页实际提供的是约 10 秒成品 WebM 预览：没有公开实时 Canvas、参数面板、源码或可操作 demo，并明确标注 Renderer、source maps、源码和成员包属于 Pro。

因此可以确认的是**设计意图和可观察结果**，不能确认其几何构建、点云采样、后期处理配置、性能、移动端或无 WebGL 降级方式。

### 值得借鉴的正向原理

1. **先选有语义的主体。** 人物与耳机直接回应“感知/信号”，比无含义的随机几何更容易形成产品记忆。
2. **只建立一个签名现象。** 点云从噪声聚合为人物、指针让信号局部分开，两个变化围绕同一“从信号中看见感知”命题。
3. **用层次而不是贴图制造空间。** 主体、近景粒子、雾、星点、辉光和界面清晰度构成连续深度。
4. **入场负责建立理解。** 模糊到清晰不仅是动画，它把用户从噪声带到可识别对象与可读信息。
5. **指针改变主体状态。** 互动发生在核心视觉对象上，而不是另加一个装饰光标。
6. **视觉隐喻与产品语言一致。** 媒介选择由主题驱动，而不是因为“3D 更高级”。

### 不能沉淀成全局规则的外壳

- 黑白暗色；
- 中央人物；
- 点云与 bloom；
- 超大标题；
- 耳机、星尘和科幻气质。

这些只属于 Anima 的具体答案。把它们写成默认模板，会再次造成 KAGE 已经出现过的风格收敛。

### 研究等级

```text
referenceId: threeui-anima
role: runtime-observed / inspiration-only
evidence: official-description + official-video-preview
confidence: 0.72
promotion: hold
risk: Pro 源码不可见；无实时交互、移动端、降级和性能证据
```

## 对 KAGE 的具体价值

### 可以补足的能力

| KAGE 当前缺口 | ThreeUI 可提供的帮助 | 正确接法 |
| --- | --- | --- |
| 想法直接交给模型，机制选择缺少依据 | catalog 的 runtime、interaction、asset、controls 与 source metadata | 先检索 1–3 个相关机制，再提炼 `borrow principle` |
| 视觉容易退化成纯 CSS 或静态大图 | Community 中可运行 Shader、Three.js、Canvas、声音和滚动机制 | 让关键媒介承担可验证职责，不按技术名堆砌 |
| 效果有画面但不像产品 | 完整 landing page 与局部组件的分层示例 | 效果只进入页面结构中的必要位置，产品路径仍由 KAGE 规划 |
| 运行后才发现性能与生命周期问题 | resize、visibility、DPR、reduced motion、cleanup 等实现样本 | 提炼为质量门和适配器，不复制视觉皮肤 |
| 大模型难以从预览还原实现 | Community 固定源码与 source manifest | 只对许可和来源明确的条目做源码验证 |

### 不能解决的能力

ThreeUI 不能替代：

- 用户想法、受众、情绪价值和核心行动的理解；
- 页面信息架构、业务数据、事实来源和转化路径；
- 为当前主题生成或选择真正合适的产品素材；
- 整页构图、排版、叙事节奏和最终视觉判断；
- KAGE 的有界执行、版本绑定、浏览器验收与案例归档。

所以它应进入 KAGE 的“参考智能与机制资产层”，而不是成为新的整页生成器。

## 建议的接入方式

当前不直接安装 `@designcodeio/threeui`。KAGE 当前不是以 React 组件库为唯一运行边界，直接引入会增加 React、Three 版本、CSS 与资源路径耦合，也会把研究库变成生产依赖。

采用三层接入：

1. **SourceProfile**：记录 ThreeUI 的目录能力、许可、版本、MCP 与证据等级。
2. **ObservedReference**：Anima 只保存已观察到的体验原理与风险，不写成实现事实。
3. **MechanismPilot**：从 Community 中选择最多 3 个互补机制做固定版本本地验证；通过后只把去品牌、去外壳的原理提升为 `ReferenceEvidencePack`。

首批候选建议：

- `Liquid Form`：验证 pointer-reactive Shader 与完整 WebGL 生命周期；
- `Article Headings` 或 `Typography Vortex`：补足动态排版，不让“吸睛”等同于中央 3D；
- `Kage Landing Page` 或一个完整场景 adapter：验证局部机制如何进入完整网页和降级路径。

停止条件：最多验证 3 个机制；如果不能复现清晰的创作决策提升，就停止扩展，不批量收集 catalog。

## 最终判断

ThreeUI **值得参考，也值得纳入研究资产**。它最重要的意义不是让 KAGE 多一个模板库，而是把“优秀效果”拆成有证据的主体、现象、互动、媒介职责、运行成本和适用边界，让 Codex 在写首稿之前就做出更有依据的选择。

Anima **值得作为正向创意案例**，尤其适合说明“语义主体 + 单一签名现象 + 深度层次 + 局部因果互动”怎样形成吸睛 Hero；但当前只能作为观察型参考，不能声称已掌握或复用其实现。
