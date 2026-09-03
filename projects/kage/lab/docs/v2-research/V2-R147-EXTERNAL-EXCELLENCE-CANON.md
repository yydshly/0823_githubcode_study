# V2 R147 · 外部优秀体验与开源实现研究基准

## 阶段目标

R146 已把 V2 调整为“先选择最强体验效果，再反推素材、媒介与技术”。R147 补上这条决策链此前缺少的一步：在继续开发和生成新案例前，先用少量、可追溯的优秀外部产品与开源实现建立认知基线。

这不是为了增加案例数量，也不是为 Codex 准备可复制模板。它要回答的是：

- 一个优秀网页让用户从什么状态转变到什么状态；
- 哪个互动动词真正产生价值，而不只是触发动画；
- 图片、3D、声音、视频、Shader、数据和排版分别承担什么必要职责；
- 哪些是源产品可观察的事实，哪些只是尚待验证的实现推测；
- 哪些原则能脱离原作的颜色、构图、品牌和资产继续成立。

## 当前结论

- 首批基线有 **6 个外部产品研究**，覆盖 6 个体验 family，共绑定 14 个源作品、官方案例或官方文档来源。
- 同时保留 **6 个固定 revision 的开源实现研究**，覆盖空间/3D、DOM-WebGL/滚动、Shader/材质转场、音频反应、视频合成和排版转场。
- 产品研究与实现研究是两层独立证据。除 Bruno Simon 同源案例外，不得据此声称某个产品使用了某个开源仓库。
- 当前所有新增记录均为 `source-reviewed / research-only / E3`；`referenceReadyCount = 0`。
- 当前记录没有进入 `positiveReferenceLibrary`，不会被自动选择为 `ReferenceEvidencePack`，也不会自动注入 `CreativeDirectionSpec`、`DirectCreativeAuthorPackage` 或任何作者输入。
- 研究结论不是技术白名单。3D、WebGPU、声音、视频或 Shader 仍然只能在其对体验承诺必要时被选择。

结构化事实源为 [`src/v2/external-excellence-research.ts`](../../src/v2/external-excellence-research.ts)，研究轨道和停止条件记录在 [`src/v2/research-program.ts`](../../src/v2/research-program.ts)。本文只解释阶段判断、适用边界与后续验证，不替代结构化数据。

## 为什么先研究

只依赖模型的通用理解，会产生三类可预见偏差：

1. 把近期看过的视觉皮肤误当成通用答案，例如默认暗色、巨大标题、中央 3D 物体和无因果的滚动动画。
2. 遇到问题后才临时搜索实现，容易只解决“怎样做出来”，没有先判断“为什么值得做”。
3. 把通用工具库的能力、窄视觉实验的一次效果和完整产品体验放在同一层比较，导致机制名称取代产品判断。

R147 因此采用两层研究：产品层先确定体验承诺、感知转变、互动因果与媒介职责；实现层再确认可复用机制、许可、运行成本与失败边界。它服务 R146 的开放表达，而不是收窄表达。

## Source 与 hypothesis 分离

```text
官方产品 / 作者案例 / 官方文档 / 固定源码
  -> confirmed source observation
  -> 可迁移但仍有边界的 borrow principle
  -> 本地固定 revision 运行验证
  -> E4 bounded conclusion
  -> 有条件的 ReferenceEvidencePack
  -> 最多 0–3 条适用参考进入作者输入
```

| 层级 | 可以保存什么 | 不可以声称什么 |
| --- | --- | --- |
| `source` | 官方页面可观察状态、作者明确说明、固定 revision 中的真实代码路径与许可 | 未见源码的内部架构、性能和浏览器兼容性 |
| `hypothesis` | 根据公开现象提出、可被后续实验证伪的实现推测 | 不得改写成 `confirmedMechanisms`，不得进入作者事实输入 |
| `E3` | 官方来源或源码支持的有界判断 | 不等于本地可运行、移动端成立或可合法复用 |
| `E4` | 固定版本在本地复现核心效果，并完成适用性、桌面/移动、降级和来源检查 | 不等于可以复制原作视觉身份，也不自动成为模板 |

例如，Windy 的公开产品和官方 Map API 可以确认共享地图、图层、地点与时间状态；“风场粒子一定由某种 GPU 推进方式实现”仍是 hypothesis。B&O 官方页面可以确认材质配置体验；具体数字孪生、PBR 贴图和变体矩阵在没有源码或运行证据前同样只能保留为 hypothesis。

## 首批 6 个外部产品研究

### 1. One Shared House 2030 · 编辑排版与参与式研究

- 官方来源：[源产品](https://onesharedhouse2030.com/intro/) · [SPACE10 项目资料](https://space10.com/projects/one-shared-house-2030)
- 体验承诺：让抽象的未来居住议题成为一次有个人立场、群体对照和结果反馈的参与过程。
- 已确认：产品包含问卷、结果、项目说明和资源路径，并明确是匿名的 playful research；个人答案可以与总体参与结果比较。
- 感知转变：从“阅读一个命题”到“看见自己的选择位于群体中的什么位置”。
- 可借原则：当产品要求用户表达立场时，让输入立即改变同一视觉世界并产生可信比较；排版本身可以承担身份、章节和反馈，无需默认添加 3D。
- 边界：没有真实结果、可信聚合数据和匿名说明时，不得伪造群体比较。产品为外部公开体验，不授予其视觉或数据的复用许可。
- 研究置信度：0.84。

### 2. The Boat · 运动扮演叙事中的物理力量

- 官方来源：[SBS 源产品](https://www.sbs.com.au/theboat/) · [SBS 发布资料](https://www.sbs.com.au/aboutus/2015/04/29/sbs-online-releases-first-ever-interactive-graphic-novel/) · [作者项目档案](https://www.matthuynh.com/stories/theboat-9rw43)
- 体验承诺：把图像小说、历史档案、声音和滚动组合成具有身体感的海上逃亡阅读。
- 已确认：这是 SBS 的互动图像小说；官方制作资料确认使用 HTML、JavaScript、GLSL、WebGL、动态媒体流与自适应自动滚动。
- 感知转变：从“阅读图像小说”到“身体感受到风浪、拥挤和历史压力”。
- 可借原则：强动效只有在扮演主题中的物理力量、情绪压力或时间变化时才成为核心；图像、文字、声音和档案证据应承担不同职责。
- 边界：不能复制水墨、红黑色、倾斜文字和历史素材；眩晕、音频解锁、减少动态效果和媒体载荷必须单独验证。
- 研究置信度：0.90。

### 3. Windy · 一个真实数据世界承载全部工具状态

- 官方来源：[源产品](https://www.windy.com/) · [官方 Map API](https://docs.windy-plugins.com/api/modules/map.html)
- 体验承诺：让不可见的全球气象系统变成可感知、可定位、可切换时间与模型的行动工具。
- 已确认：地图、地点、气象图层、时间和预报信息位于同一个可交互空间；官方文档确认 Map、LeafletGL 与扩展图层接口。
- 感知转变：从“感知全球天气流动”到“得到地点、时间和模型明确的局部判断”。
- 可借原则：复杂工具应尽量让不同控件改变同一个可信对象；粒子、颜色和运动必须编码变量、方向或速度。
- 边界：GPU 风场推进方式尚未确认；没有真实数据、来源和更新时间时，不得用生成点位或随机地图冒充公共服务事实。
- 研究置信度：0.88。

### 4. B&O Atelier Composer · 3D 为材质选择承担证据职责

- 官方来源：[Composer](https://www.bang-olufsen.com/en/gb/composer) · [Atelier 官方故事](https://www.bang-olufsen.com/en/gb/story/atelier) · [Threedium 平台说明](https://threedium.io/)
- 体验承诺：让用户从欣赏既定产品转向验证材质和部件组合，并形成自己的版本。
- 已确认：品牌官方页面把 Atelier 描述为可从多种颜色和材质构建个性化产品的数字 Composer；公开入口由实时 3D 配置平台承载。
- 感知转变：从“观看品牌定义的产品”到“验证自己选择的材质组合”。
- 可借原则：只有当用户需要检查角度、表面、部件或组合时，3D 才应成为核心；每次选择必须在同一对象上留下可比较证据。
- 边界：数字孪生、PBR 贴图和变体矩阵仍是 hypothesis；屏幕颜色不能冒充真实材料样品，品牌模型、材质和影像不在复用许可内。
- 研究置信度：0.86。

### 5. Patatap · 同一输入同时生成声音与视觉事件

- 官方来源：[源产品](https://patatap.com/) · [官方 GitHub 源码](https://github.com/jonobr1/Patatap)
- 许可：代码 MIT；声音、图形素材与第三方内容仍需逐项核对。
- 体验承诺：让近乎空白的页面在第一次按键后立即成为可演奏的视听乐器。
- 已确认：产品明确自述为 portable animation and sound kit 并提示闪烁风险；源码确认 Two.js、Tween.js、键盘、触摸、MIDI 与 Web Audio AudioContext 的组合。
- 感知转变：从“面对安静的空白画布”到“用自己的节奏制造声音与动态图形”。
- 可借原则：核心输入应同时产生可听与可见结果并共享状态；一个主题专属动词可以撑起完整体验。
- 边界：必须验证音频解锁、静音、触摸、MIDI 可选性、闪烁警告和减少动态效果；不能把背景音乐或频谱动画误当产品价值。
- 研究置信度：0.94。

### 6. Bruno Simon Folio 2025 · 内容节点组成可驾驶世界

- 官方来源：[源产品](https://bruno-simon.com/) · [官方 GitHub 源码](https://github.com/brunosimon/folio-2025)
- 许可：根源码 MIT；包元数据写 ISC，服务端代码未公开，音乐和其他资产需按各自声明处理。
- 体验承诺：把浏览作品集从点击目录转变为驾驶、发现、互动和停留在一个持续世界中。
- 已确认：源产品公开键鼠、触摸、手柄、音频、质量、WebGPU/WebGL、地图、重置和互动控制；源码公开 Three.js、Rapier、天气、日夜、区域、对象和资产压缩结构。
- 感知转变：从“浏览个人信息和项目链接”到“在具有规则的世界中主动发现作者”。
- 可借原则：空间网站先定义身份、世界规则、内容节点和发现路径，再决定模型、物理与镜头。
- 边界：内容很少、任务高频或移动端预算不足时不应强制驾驶；小车、岛屿、低多边形外观和奖励机制不能复制。
- 研究置信度：0.96。

## 首批 6 个固定版本开源实现

分类名称只描述证据角色：

| 分类 | 回答的问题 | 不能被当作什么 |
| --- | --- | --- |
| `complete-experience` | 多种机制如何在一个可用产品中形成完整体验 | 不等于其全部源码与资产均适合直接复用 |
| `focused-visual-experiment` | 一个窄效果如何建立清楚的视觉因果 | 不等于完整网站架构或生产基线 |
| `mechanism-infrastructure` | 某类体验怎样可靠实现和降级 | 不能称为优秀视觉成品 |

### 1. brunosimon/folio-2025

- 分类/角色：`complete-experience / direct-experience`
- 官方来源：[GitHub](https://github.com/brunosimon/folio-2025) · [Live](https://bruno-simon.com/)
- 审阅 revision：`41046b57eeed8d156d9c3fd7fa259900baef7816`
- 维护快照：2026-04-07 仍有推送，约 930 commits。
- 许可：MIT；`package.json` 标记 ISC，晋级时必须保留不一致说明；服务端和资产许可另计。
- 已确认机制：按阶段排序输入、玩家、物理、世界、音频与渲染；Zones/InteractivePoints 把距离变成交互时机；键鼠、触摸、手柄共享输入语义；移动端独立质量路线。
- 可借原则：先把内容拓扑映射为空间节点，距离只决定何时互动，DOM/modal 继续承载正文。
- 风险/适用：自由漫游、Rapier 和大资产提高学习与性能成本；适用于创意作品集、数字博物馆、品牌世界与地点探索。
- 研究置信度：0.96。

### 2. 14islands/r3f-scroll-rig

- 分类/角色：`mechanism-infrastructure / mechanism-only`
- 官方来源：[GitHub](https://github.com/14islands/r3f-scroll-rig)
- 审阅 revision：`123663599e4b31af56f1845a19132d17e6a9b81f`
- 维护快照：2025-12-17 有推送，约 635 commits，审阅时版本 8.15.0。
- 许可：根许可证 MIT；包元数据标记 ISC，晋级时需说明。
- 已确认机制：一个固定 GlobalCanvas 服务全站；DOM 边界、滚动 delta、IntersectionObserver 和 ResizeObserver 同步 WebGL 对象；Canvas 不可用时保留完整 DOM。
- 可借原则：DOM 是内容与布局真相，WebGL 是渐进增强；需要混合时使用单一全局画布和完整无 Canvas 回退。
- 风险/适用：它不是视觉方向，会引入滚动同步、CLS、z-fighting 和 React/R3F 绑定；适用于产品叙事、编辑滚动故事、图库和案例页。
- 研究置信度：0.95。

### 3. mohAmineBrs/codrops-noise-transition

- 分类/角色：`focused-visual-experiment / principle-only`
- 官方来源：[GitHub](https://github.com/mohAmineBrs/codrops-noise-transition) · [作者/Codrops 解析](https://tympanus.net/codrops/2024/05/02/model-texture-transition-and-procedural-radial-noise-using-webgl/) · [Live](https://tympanus.net/Development/TextureTransition/)
- 审阅 revision：`0face2aaa637780bb2862c807efce1aabfecc9ea`
- 维护快照：2026-08-22 有推送，但近期改动主要是依赖覆盖；项目约 13 commits。
- 许可：README 声明 MIT，但仓库缺少根 LICENSE；模型为 CC-BY-4.0，当前不得直接复用。
- 已确认机制：`onBeforeCompile` 注入统一 `u_progress`；4D noise、parabola 与 smoothstep 形成不规则表面边界；背景径向波纹响应同一进度。
- 可借原则：一个语义状态使用一个进度源；噪声只塑造边界，环境回声必须服从主体变化。
- 风险/适用：原例缺少键盘、减少动态效果和失败回退；只适用于存在真实材质/款式变化的包装、化妆品和配置产品。
- 研究置信度：0.88。

### 4. jberg/butterchurn

- 分类/角色：`mechanism-infrastructure / mechanism-only`
- 官方来源：[GitHub](https://github.com/jberg/butterchurn) · [Live](https://butterchurnviz.com/)
- 审阅 revision：`fbac2f6bab62fd9c6a50ebbeb29359c5eb05903e`
- 维护快照：2026-04-20 有推送，约 205 commits；审阅时 3.0.0 beta，并有 Puppeteer/Docker 视觉快照测试。
- 许可：MIT；preset、纹理、声音和作者权利另计。
- 已确认机制：Web Audio Analyser 与双声道 FFT 分离 bass/mid/treble；即时、平均和长期基线采用帧率校正平滑；ping-pong framebuffer 保持视觉连续性。
- 可借原则：显式分频、归一化和 attack/release；静音时保持稳定；以合成音频做确定性视觉回归。
- 风险/适用：随机 preset 不能代替视觉设计，并带来 WebGL2、音频手势、闪烁和光敏风险；适用于音乐发布、音频工具、节庆与听觉档案。
- 研究置信度：0.96。

### 5. imweb-project/ImWeb

- 分类/角色：`complete-experience / principle-only`
- 官方来源：[GitHub](https://github.com/imweb-project/ImWeb) · [Live](https://imweb.image-ine.org/)
- 审阅 revision：`9eb0161988d859bf8cc558ba2c8ab588751d3215`
- 维护快照：2026-09-01 仍有推送，约 1,049 commits，审阅时版本 0.22.1；项目较新，低采用量不作为质量结论。
- 许可：AGPL-3.0-or-later；当前只研究原则，禁止直接复制进闭源交付。
- 已确认机制：相机、视频、静帧、噪声、3D 和粒子先进入有限 mix bus，再经过固定顺序效果 pass；非活跃 pass 可跳过；Live GLSL 失败保留 last-good shader；UI、输出和 WebM 导出共享状态。
- 可借原则：把视频视为可编排媒介；先限定来源和效果顺序，再让预览、输出与导出共享状态。
- 风险/适用：完整 VJ 管线远超普通页面，涉及权限、编解码、CORS、录制、GPU 和移动端风险；适用于媒体艺术、现场演出、电影展览和媒体档案。
- 研究置信度：0.92。

### 6. codrops/KineticTypePageTransition

- 分类/角色：`focused-visual-experiment / principle-only`
- 官方来源：[GitHub](https://github.com/codrops/KineticTypePageTransition) · [Live](https://tympanus.net/Development/KineticTypePageTransition/)
- 审阅 revision：`ebe926e2f1de42950c36ff8a678321155280c1af`
- 维护快照：小而稳定的实验，共 6 commits，最后推送为 2025-05-30。
- 许可：代码 MIT；字体、图片和其他演示资产另计。
- 已确认机制：一个带 labels 的 GSAP timeline 协调列表退出、全屏文字、正文进入和图片位移；`isAnimating` 阻止重入；装饰文字 `aria-hidden`，真实内容保留在语义 HTML。
- 可借原则：转场词汇来自内容或品牌；单一时间线负责状态交接；视觉复制层不得取代真实页面语义。
- 风险/适用：原例缺少键盘焦点和 reduced-motion，长转场不适合高频工具；适用于文化编辑、时尚、创意作品集和案例图库。
- 研究置信度：0.94。

## 当前作者输入边界

R147 当前只增加研究事实，不改变生成行为：

- `externalExcellenceStudies[*].referenceEligibility` 固定为 `research-only`。
- `getExternalExcellenceResearchSummary().referenceReadyCount` 必须为 `0`。
- `externalImplementationStudies` 不在 `positiveReferenceLibrary` 中，也不参与现有 reference selector。
- 产品名称、仓库名称、视觉皮肤、模型、配色和原始资产均不进入作者包。
- 实现 hypothesis 不得进入 `confirmedMechanisms`；机制基础设施不得获得“优秀视觉”标签。
- 即使未来晋级，单个 brief 仍只可选择 0–3 个明确适用的 evidence pack，不形成固定模板和技术白名单。

## 下一步：有界 E4 验证

首轮只验证 3 个 family，每个 family 恰好包含一个产品状态探测和一个实现机制探测，以覆盖三种实现分类：

1. `Bruno Simon Folio 2025 + folio-2025`：完整体验与同源源码，验证空间内容节点、跨输入控制和移动质量路线。
2. `B&O Atelier Composer + codrops-noise-transition`：产品事实与聚焦实验分离，验证“同一对象的材质因果”能否脱离原作视觉成立。
3. `Patatap + butterchurn`：产品体验与机制基础设施分离，验证音频解锁、共享视听状态、频段平滑、静音和闪烁边界。

完成这 3 个 family 后必须先评估它们是否改善了未见 brief 的生成前决策；在该检查完成前不启动第 4 个 E4 单元，也不新增外部案例。

每个 E4 单元必须同时完成：

- 固定来源 URL、观察时间、仓库 revision、根许可证和资产/字体/声音/preset 的独立权利说明；
- 产品开场、核心变化和结果/收束状态的真实运行证据；
- 实现源码位置到可观察效果的一一映射，不以 README 宣传语代替运行结果；
- 桌面和 390px 移动端状态，以及适用的键盘、触摸、音频解锁、reduced-motion、无 WebGL/无 Canvas 或失败回退；
- 核心负载、首屏等待、控制可达性和阻断错误记录；
- 一个适用 brief、一个明确不适用 brief，以及不复制原作身份仍可成立的 borrow principle；
- `pass / hold / reject` 单一结论。只有 `pass` 才可另行提议 ReferenceEvidencePack，晋级本身不在本阶段自动发生。

WebGPU 不是单独晋级理由。即使 Folio 使用 Three.js `WebGPURenderer`，E4 仍要验证实际后端、可见效果、WebGL fallback 和设备表现；渲染 API 的新旧不能代替资产、镜头、交互与体验判断。

## 停止规则

- 首批固定为 6 个产品研究 + 6 个实现研究；在 E4 决策检查前停止扩张，不以案例数量作为进度。
- 官方来源不可达、固定 revision 无法构建、核心效果无法复现或许可/资产责任无法厘清时，该项保持 `research-only` 或标记 `reject`。
- 原则只有依赖原作颜色、构图、模型、文案或品牌身份才成立时，停止晋级。
- 机制不能改善真实 brief 的生成前选择，或只增加展示页面而不提高决策质量时，停止研究该分支。
- 移动端、减少动态效果或关键失败回退不可接受且没有诚实替代路线时，不晋级。
- AGPL 或许可不清晰项目只保留 principle-only 研究，除非后续交付明确满足其许可要求。
- E4 验证失败不是继续加案例或延长精修的理由；保存失败原因，回到当前可验证能力。

## 有界验收

本阶段的完成条件是研究合同成立，而不是外部代码进入产品：

- 6 个产品研究、6 个实现研究均通过结构化 schema；
- 6 个产品 family 各不重复，来源总数为 14；
- 6 个实现均固定 40 位 revision，并全部保持 E3；
- `r3f-scroll-rig` 与 `butterchurn` 只能作为 `mechanism-only`；
- `referenceReadyCount = 0`，状态为 `research-before-authoring`；
- R146 的一次素材批次、一次构建与开放表达边界均未改变。

## 后续阶段

下一阶段不是继续搜索更多“好看网站”，而是按上述顺序完成最多 3 个 E4 单元，观察有来源的正向原则能否让 Codex 在首稿前做出更准确的体验判断。只有出现可复现的决策提升，才讨论把单个、去身份化的原则晋级为 `ReferenceEvidencePack`。
