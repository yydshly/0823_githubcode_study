# V2 R134 · 雷雨余光档案馆

## Design Contract

- Entry mode：brief-led validation。
- Request revision：R134。
- Target user and context：对自然现象、材料与视觉叙事感兴趣的普通访客，在浏览器中理解“收集雷雨余光”的虚构产品概念。
- Desired first impression：一片悬浮的风暴玻璃内仍困着刚结束的闪电；安静、危险、可凝视，不像通用科技粒子背景。
- Visual ambition：Immersive。
- Experience architecture：Spatial Stage；一个持久 WebGL 场景承担主叙事，DOM 只提供可读章节、状态与最终行动。
- Visual constraints：铅灰、雾白、少量电蓝；玻璃裂隙是唯一主视觉锚点；真实折射感和不规则分叉优先于霓虹发光；不用持久参数面板、卡片目录或等高三段模板。
- Information constraints：只解释“余光进入—电荷汇聚—裂隙成像—保存拓片”四个语义阶段；明确标记为艺术化模拟，不显示伪造的气象数值。
- Operation constraints：原生滚动是唯一主驱动；键盘章节锚点可到达；最终按钮保存本次闪电拓片到页面内状态，不引入后端。
- State constraints：`dormant → gathering → branching → imprinted`；每次状态变化同时改变 WebGL 玻璃、电荷、裂隙亮度和前景语义，不允许只切换文案。
- Environment constraints：canonical dev URL 为 `http://127.0.0.1:8143/pages/v2/deliveries/stormglass-archive/`；桌面、平板、390px、reduced-motion 与 WebGL failure 必须保留完整主旅程。
- Primary journey：进入悬浮玻璃场景 → 滚动收集电荷 → 看见裂隙形成唯一闪电拓片 → 保存拓片并获得明确完成状态。
- User-defined phases：一个有界 R134 交付阶段。
- Required artifacts：专属 delivery、V3 合同/运行记录、浏览器证据、定向测试、V2.5 回归与构建结果。
- Autonomy authorization：用户已明确“继续”，并要求按小目标持续开发，无需再次确认可逆的项目内实现。
- User-decision boundary：无；不创建远端服务、不调用真实气象接口、不发布或提交远端仓库。
- Observable completion criteria：下方 Coverage 全部 pass，最终页面有非空 WebGL、滚动产生可测场景差异、保存状态可达、390px 无阻断溢出、reduced-motion 与 fallback 可操作、最终身份和证据一致。
- Coverage record：见下表。

## WebGL routing

- Selected pattern：DOM + WebGL scroll story。
- Evidence branch：现有 `ice-core-letters` 的持久场景/章节绑定与 `moonlit-tidepool-panorama` 的内容适配证据；只借用运行机制，不复制视觉布局。
- Required inputs：当前 Three.js 运行时、程序化玻璃/裂隙材质、滚动进度、语义 DOM；不要求外部图片或模型。
- Expected output：一页可滚动、可保存、可降级的主题专属视觉叙事。
- Reusable conclusion：验证 `webgl-procedural` 能由 V3 内容决策选择并真正承担产品含义，而不是成为默认渲染器。

## Scene architecture

- Scene base：Three.js/WebGL，固定全视口 canvas；玻璃由透明外壳、内部薄层、电荷光点和分叉裂隙组成。
- Scene persistence：从开场到完成态始终可见；章节 DOM 作为滚动代理，不把主旅程移到场景下方的工作台。
- Foreground control model：顶部极简项目名、左侧阶段索引、章节文本与最终保存按钮。
- State-to-scene mapping：
  - dormant：低对比玻璃，少量余辉漂移；
  - gathering：电荷数量和运动幅度增加，玻璃内部出现折射带；
  - branching：裂隙按滚动真实生长并提升局部亮度；
  - imprinted：运动减弱，闪电拓片在玻璃内形成稳定完成构图。
- Mobile transformation：canvas 仍为背景，章节文字缩成底部安全区；阶段索引横向排列，不出现侧栏工作台。
- Fallback：WebGL 失败时显示同一主题的 SVG 闪电拓片、完整章节与保存按钮；不得回退为空白或通用网格。

## Visual direction

| 决策 | 选择 | 可观察约束 | 验收 |
| --- | --- | --- | --- |
| Composition | 持久全屏玻璃主体，章节在边缘流过 | 主体不被卡片包住，滚动时构图连续 | 首屏和完成态均能在隐藏标题后辨认玻璃/闪电主题 |
| Focal hierarchy | 裂隙亮度与玻璃折射第一，文字第二，CTA 最后 | 同时最多一个高亮语义焦点 | 每个阶段第一注意力仍在场景变化 |
| Typography | 克制窄体无衬线＋小型档案编号 | 不使用巨型标题覆盖主体 | 390px 保持可读且不遮挡完成态 |
| Palette/material | 铅灰玻璃、雾白电荷、电蓝只用于最高能量 | 不使用紫色科技渐变或彩色噪点 | 玻璃、雾和闪电形成统一材质语言 |
| Depth | 真实透视、内外壳遮挡、折射带和微弱相机侧移 | 不用纯缩放冒充空间 | 浏览器像素与运行快照同时证明深度变化 |
| Motion | 滚动驱动 director state；自动漂移仅为次要生命感 | reduced-motion 使用离散关键状态 | 滚轮前后裂隙、电荷和折射数值均变化 |

## Coverage Manifest

| Requirement | Surface / state | Evidence needed | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- |
| V3 选择正确媒介 | contract / author package / run | medium decision + protocol test | 0–1 | pass | `webgl-procedural` 与 `webgl-shader`、程序化素材职责一致 |
| 主题专属首屏 | desktop opening | screenshot + canvas pixels + DOM | 2 | pass | 首屏 2084ms 内出现非空风暴玻璃场景 |
| 滚动真实联动 | gathering / branching / imprinted | snapshot 数值、截图、交互测试 | 5–6 | pass | 四状态、四组 canvas 像素与电荷/裂隙/折射数值共同变化 |
| 保存完成态 | final action | click、状态与 focus 证据 | 5–6 | pass | 最终按钮写入 `saved`，状态反馈与焦点证据完整 |
| 跨表面可用 | tablet / 390px / keyboard | screenshot、overflow、focus | 7 | pass | 390px 无横向溢出，reduced-motion 仍完成主旅程 |
| 动效与能力降级 | reduced motion / WebGL failure | browser state + fallback screenshot | 8 | pass | 离散关键状态与 SVG fallback 均可保存拓片 |
| 工程可交付 | V2.5 / build / pages | automated output | 9 | pass | 定向测试、TypeScript、生产构建和 pages 构建通过 |
| 有界归档 | final runId + bundleHash | final evidence + research record | 9 | pass | V3 独立归档门绑定最终身份、宏观结构与主媒介 |

## Stop boundary

- 一个主题、一个媒介方向、一次程序化素材批次、一次完整构建。
- 最多两次确定性修复和一次基于浏览器证据的视觉精修。
- 不因“还可以更炫”增加新相机、新模型、新页面或第二套视觉方向。
- 未达到主题专属、运行时变化和跨端硬门时停止为研究结果，不进入精选库。

## Final outcome

- Final run：`direct-r134-stormglass-archive`。
- Bundle hash：`b518d1bcaeb0c4f4cba2267e29716337e1b1d07e09d1ab9006a704dace474591`。
- Medium binding：`webgl-procedural → webgl-shader → programmatic`，关键视觉职责没有被静态占位素材替换。
- Browser proof：5/5 通过，覆盖桌面首屏、真实滚轮四阶段、保存完成态、390px reduced-motion 与强制 WebGL failure。
- Quality：最终视觉质量 95 / WowGate 95，结论 `pass`。
- Bounded attempts：一次完整构建；一次确定性修复用于移除平滑滚动导致的状态越界；一次视觉精修把平面裂隙提升为玻璃内的体积电光核心与光晕。
- Archive：通过独立 V3 archive gate；V2.5 冻结登记表保持不变，V3 登记绑定相同 `runId + bundleHash`。
- Stop reason：全部覆盖项已通过，因此在本方向停止，不增加第二媒介、第二素材批次或额外视觉探索。
