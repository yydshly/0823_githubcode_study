# Signal Experience Lab

项目宏观目标是：**用户描述一个期望的想法，系统以最终呈现质量为准，按需分析效果、生成或组织素材，并构建新的、可运行且具有完整产品旅程的优秀网页**。3D、图片、声音、视频、Canvas、蒙版和排版都是开放手段；固定 Demo、基础图形目录和单一效果都不是产品输出。

本实验室只继承配置化叙事、滚动导演、DOM/WebGL 分层、质量档、减弱动效与语义回退等行为需求，不导入或复制上游代码、图片、字体和视觉母题。
当前“描述 → 当前结果可见 → 条件式素材门禁 → Codex 专属网页 → 浏览器精修”的收口与真实验证见 [Core creation loop return R29](docs/CORE-CREATION-LOOP-R29.md)。
总体目标、架构选择、核心中间表示、质量门禁和实施路线统一记录在 [Goal-driven Three.js generation architecture](docs/PRODUCT-ARCHITECTURE.md)。
素材如何从“通用清单”升级为可驱动开场、变化和收束的动态体验合同，见 [Dynamic asset narrative R37](docs/DYNAMIC-ASSET-NARRATIVE-R37.md)。

## 版本状态

- **V2.6 正向创作指导已形成可复核闭环**：R171 冻结感受承诺、正向参考、七项质量观察、八项开放能力、有界 Codex 直创、浏览器证据与最终身份；R172 用一次新的 KAGE 正式产品证明基线可用；R173 把四个正式产品的终稿画面、体验判断、浏览器事实与 `runId + bundleHash` 组成可检索回执。后台自动 Codex、通用独立审美判断、统一首稿时限与远端多人安全仍未完成。见 [V2.6 creative guidance baseline](docs/releases/V2.6-CREATIVE-GUIDANCE-BASELINE.md)、[R172 product proof](docs/v2-research/V2-R172-KAGE-OPENING-REHEARSAL.md) 与 [R173 review receipt](docs/v2-research/V2-R173-FINAL-EFFECT-REVIEW-RECEIPT.md)。
- **R164 已把“创意不能被规则压掉”固化为项目能力**：硬边界只保留用户要求、真实性、可用性、证据身份与有界预算；案例和推断可放弃，媒介字段允许未登记的新技术。最终质量改为核对本次创意承诺，静态表达不因缺少动态扣分，只有承诺动态却没有真实变化才会失败。见 [R164 creative freedom and promise gate](docs/v2-research/V2-R164-CREATIVE-FREEDOM-PROMISE-GATE.md)。
- **R161 已把“能力演示”和“正式产品”分开**：V5 新增产品身份与价值、进入、核心使用、有效结果、后续路径以及正式素材/运行时原生媒介依据。R160 的蒙版、输入与移动端研究通过，但没有完整产品旅程，因此只保留为研究参考，不再标记为正式产品案例。见 [R161 product delivery reset](docs/v2-research/V2-R161-PRODUCT-DELIVERY-RESET.md) 与 [R160 capability record](docs/v2-deliveries/R160-LIGHTHOUSE-CHART-REVEAL-CONTRACT.md)。
- **R159 已完成一次“生成素材不是静态背景”的直接创作证明**：全新“风把信送过山谷”只生成一张雨后山谷环境，并让 DOM/CSS/Canvas 信纸、风向、雾带、景深、距离和投递行动共享滚动状态；桌面开场/中段/完成、390px、reduced-motion 与素材失败回退均通过，最终身份绑定后替换精选库中较弱案例，总量仍为 12。见 [R159 windborne letter contract](docs/v2-deliveries/R159-WINDBORNE-LETTER-VALLEY-CONTRACT.md)。
- **R156 已把三项外部优秀机制接入真实创作输入**：r3f-scroll-rig 的 DOM/WebGL 分责、Codrops 的单一材质进度、Butterchurn 的可解释音频信号均以固定源码 revision + 本地运行证据晋级为正向参考包；只有 brief 明确相关时才进入作者合同，外观、preset 与技术栈不会成为模板。`referenceReadyCount` 从 0 收敛为 3，本批次停止继续扩展。见 [R156 external reference promotion](docs/v2-research/V2-R156-EXTERNAL-REFERENCE-PROMOTION.md)。
- **R155 已完成一次效果优先真实闭环**：全新“海底光缆听诊台”没有生成无职责背景图，而是以透明三维光缆作为持续产品主体；滚轮、指针、故障形变、回波脉冲、阶段化 Web Audio 与保存共享同一状态。一次构建和一次视觉精修后，桌面、390px、reduced-motion 与 WebGL 回退均通过；精选库以该结果替换较弱的旧 3D 声音样例。见 [R155 sea fiber scope](docs/v2-deliveries/R155-SEA-FIBER-SCOPE-CONTRACT.md)。
- **R154 已恢复“效果优先于模板差异”**：模板相似现在只触发复核提示，不能单独淘汰候选；最高目标适配方向可以继续进入唯一素材批次与构建。主题可互换、静态等价、素材错位、行动脱节与真实性风险仍是阻断问题。见 [R154 effect over template policy](docs/v2-research/V2-R154-EFFECT-OVER-TEMPLATE-POLICY.md)。
- **R153 已纠正连续案例的宏观骨架重复**：浏览器对比确认 R145、R149、R152 都落入“全屏生成图 + 大标题叠加 + 底部阶段轨道”。雷暴案例现已在不增加素材和全局风格禁令的前提下，重构为明亮气象乐谱、局部倾斜云体窗口与垂直阶段轴；既有滚轮、风切、声音和保存因果保持不变。见 [R153 thunderhead score sheet](docs/v2-deliveries/R153-THUNDERHEAD-SCORE-SHEET-CONTRACT.md)。
- **V2 V4 首个效果优先成品（历史首版）**：R152“雷暴合唱谱”验证了生成素材、Canvas、Web Audio 与有界执行，但其宏观构图后来被用户浏览器对比判定为与 R145/R149 重复，当前精选已由 R153 替换。见 [R152 thunderhead score history](docs/v2-deliveries/R152-THUNDERHEAD-SCORE-CONTRACT.md)。
- **V2 选择回执运行守卫已接入**：R151 新增版本化 V4 `DirectCreativeRun`。当前 V2 作者包以 `effectSelectionReceipt = null` 开始，未绑定有效的最高目标适配候选时不能进入素材或构建；三个候选全部失败或选择错误会在 `effect-selection` 阶段显式停止。V1–V3 重建入口与冻结身份保持不变。见 [R151 selection receipt run guard](docs/v2-research/V2-R151-SELECTION-RECEIPT-RUN-GUARD.md)。
- **V2 效果质量选择门已接入**：R150 把“内部比较三个方向”升级为可检查的目标相对选择协议；候选必须在体验形态、标志性现象和运行时因果上真正不同，技术数量、3D、声音、视频、模型或来源不计分，全部候选触发拒绝信号时在素材前停止。选择回执不替代最终浏览器质量证据；完整六维门保留在项目，Codex 作者包只携带紧凑执行规则。见 [R150 effect quality selection](docs/v2-research/V2-R150-EFFECT-QUALITY-SELECTION-GATE.md)。
- **V2 开放资源协议已完成首个端到端验证**：R149“日食邮局”在一次生图批次、一次构建、两次确定性修复和一次视觉精修内完成；生成环境图承担材质与空间，Canvas/CSS/DOM 承担实时日食因果，桌面、390px、滚轮、拖动、键盘、保存及双回退均通过，最终结果以 `runId + bundleHash` 进入 V3 精选库。见 [R149 eclipse post office](docs/v2-deliveries/R149-ECLIPSE-POST-OFFICE.md)。
- **V2 开放资源编排已接入**：R148 在最佳效果命题确定后，允许 Codex 从已有产品能力、固定 GitHub 机制、模型生成素材、项目能力与原创代码中选择最少充分组合；不设来源、供应商或技术白名单，同时保留 revision、许可、真实性、质量、回退、唯一素材批次与一次构建边界。见 [R148 effect-led resource orchestration](docs/v2-research/V2-R148-EFFECT-LED-RESOURCE-ORCHESTRATION.md)。
- **V2 外部优秀体验研究基准已建立**：R147 在后续创作前先登记 6 类外部产品研究与 6 个固定 revision 的开源实现，明确区分完整体验、聚焦视觉实验和机制基础设施。当前全部仅为 E3/source-reviewed，`referenceReadyCount=0`；只有通过本地运行、许可、适用性、移动端、减少动态与回退检查后才可晋级 `ReferenceEvidencePack`，不会自动成为模板或注入作者输入。见 [R147 external excellence canon](docs/v2-research/V2-R147-EXTERNAL-EXCELLENCE-CANON.md)。
- **V2 效果优先开放创作协议已接入**：Codex 在素材与编码前先比较三个大胆且真正不同的体验命题，再只执行一个；主导媒介降为资源、真实性与回退锚点，现有 3D、声音、视频、蒙版或能力目录不再构成技术白名单，未列出的表达方式同样允许。运行预算仍保持一次素材批次、一次构建、最多两次确定性修复和一次视觉精修，见 [R146 effect-first open expression](docs/v2-research/V2-R146-EFFECT-FIRST-OPEN-EXPRESSION.md)。
- **V2.5 直接创作基线已冻结**：公共主动作导出 `DirectCreativeAuthorPackage` protocol v3，不静默启动后台任务；后续新精选必须通过版本化归档断言、内容结构依据、最终 `runId + bundleHash`、权威媒介一致性和适用的 WowGate。R125“冰芯来信”仍是 V2.5 冻结锚点，见 [V2.5 direct creative baseline](docs/releases/V2.5-DIRECT-CREATIVE-BASELINE.md)。
- **V1 已归档**：完整能力、耗时基线与六个最终案例保持可复现，见 [V1 baseline](docs/releases/V1-IDEA-TO-EXPERIENCE-BASELINE.md)。
- **V1 已独立部署**：静态演示源码位于 `pages/v1/`，不依赖本地 API 即可运行六个归档 bundle。
- **V2 独立推进**：V2 复用稳定 runtime/schema，但使用独立入口和创意合同；V2.0–V2.2 的旧合同仅保留为历史演进证据，见 [historical reference-guided contract](docs/V2-REFERENCE-GUIDED-CREATIVE-CONTRACT.md)。
- **V2 直接创作产品化层已完成**：用户和通用质量门是唯一硬约束；案例与风格推断只提供可解释的正向建议。相关案例可为 0–3 个，执行固定为一个方向、一次素材批次、一次构建、最多两次确定性修复和一次视觉精修，最终证据绑定 `runId + bundleHash` 并按体验自适应。见 [R112 direct creative productization](docs/v2-research/V2-R112-DIRECT-CREATIVE-PRODUCTIZATION.md)。
- **V2 新主题阶段验证已通过**：全新“手势之间”以明亮编辑画布和真实同步选择跳出历史模板，桌面、390px、键盘、减少动态与最终 bundle 证据均通过；同一目标只归档这一版。见 [R113 sign-language season validation](docs/v2-research/V2-R113-SIGN-LANGUAGE-SEASON-VALIDATION.md)。
- **V2 视觉旗舰门禁已完成首次验证**：全新“薄膜干涉实验室”使用持续 WebGL 场景、5 秒成膜 Hero、视角相关干涉 Shader 与真实多输入联动；最终 bundle 同时通过自适应质量门和身份绑定 WowGate 后才进入精选。见 [R115 thin-film flagship validation](docs/v2-research/V2-R115-THIN-FILM-FLAGSHIP-VALIDATION.md)。
- **V3 入口与静态生产恢复基线已完成**：R134–R137 的五条媒介路线仍保持最终身份；R138 进一步让 Composer 显示权威主媒介与唯一降级条件，并在 `.pages-dist` 中验证 V2 首页、五个 V3 入口、R137 GLB、交互、保存和 390px 状态。下一阶段只使用一个全新 brief 做产品回归，不增加第六个媒介样例，见 [R138 program status](docs/v2-research/V2-PROGRAM-STATUS-R138.md)。
- **V2 参考研究首批完成**：已将 MotionSites 34 / 462 条公开案例建成证据清单，并沉淀 13 个原理和四个创意组合，见 [R05 first-batch synthesis](docs/v2-research/MOTIONSITES-R05-FIRST-BATCH-SYNTHESIS.md)；本地入口为 `/pages/v2/research/`。
- **V2 本地案例研究完成**：已核验 Downloads 中 52 个 HTML，分离展示范例、技术实验和排除项，见 [R06 local exemplars](docs/v2-research/LOCAL-EXEMPLARS-R06.md)。
- **V2 视觉决策层已接入**：brief 现在会先确定素材角色、机制组合、交互含义、最小充分渲染器和回退，再进入 Codex 构建，见 [R07 decision layer](docs/v2-research/V2-DECISION-LAYER-R07.md)。
- **V2 工作台主闭环已接入**：现有服务器任务会先形成并持久化 V2 Creative Contract，再把完整约束交给 Codex；工作台可见参考方向、能力选择、实现路线和停止边界，见 [R11 workbench main loop](docs/v2-research/R11-WORKBENCH-MAIN-LOOP-CONTRACT.md)。
- **V2 主体素材改为质量优先路由**：模型素材、项目素材与程序化 Three.js 都是候选手段；可辨认实体若退化为基础几何拼接只能保留为原型，不能进入最终案例，见 [R58 quality-first subject routing](docs/v2-research/V2-QUALITY-FIRST-SUBJECT-ROUTING-R58.md)。
- **V2 用户意图与实验约束已隔离**：任务持久化不可变的用户原始想法、提交来源和显式用户限制；系统偏好与测试条件不再污染创意 brief，工作台会直接显示来源边界，见 [R59 intent provenance](docs/v2-research/V2-INTENT-PROVENANCE-R59.md)。
- **V2 已验证素材主导权门禁**：新榫卯主题证明高质量素材仍可能被低质量程序化几何压过；该结果被正确拒绝归档，并已把媒体主导路线、来源保真和交付摘要修正沉淀为系统规则，见 [R60 media dominance validation](docs/v2-research/V2-MEDIA-DOMINANCE-VALIDATION-R60.md)。
- **V2 已完成一次有停止边界的媒体主导复验**：同一榫卯目标只生成一个新候选、复用已有素材且不重新生图；真实素材主导权通过，但独立视觉判断为 82 分，因咬合因果不足与移动端重叠保持 `review-required`，没有错误归档或无限修补。门禁、路线感知预检和精修状态修正见 [R61 revalidation](docs/v2-research/V2-MEDIA-DOMINANCE-REVALIDATION-R61.md)。
- **V2 状态资产路由已接入**：装配、拆解、咬合和形变类想法会在 Codex 编码前选择连续媒体、分层主体或可检查模型；单张静态图只能承担环境，不再冒充过程，并且同一门禁会阻止不合格结果进入最终案例。见 [R62 state asset routing](docs/v2-research/V2-STATE-ASSET-ROUTING-R62.md)。
- **V2 主体状态差异门禁已接入**：状态型物理目标必须显式声明持续视觉主体，并由浏览器证明语义状态之间的主体差异；普通图片、画布、文案、箭头、裁切或镜头变化不能冒充实体变化。缺少证据会在独立模型验收前快速停止。见 [R63 subject delta gate](docs/v2-research/V2-SUBJECT-DELTA-GATE-R63.md)。
- **V2 最终案例视觉修复已收口**：榫卯与折叠灯只保留经过汇总精修的最终版本，修复主体状态不匹配、批注残留、关键文字越界和灯具对比失衡，见 [R65 final visual repair](docs/v2-research/V2-FINAL-VISUAL-REPAIR-R65.md)。
- **V2 Beta 素材恢复闭环已接入**：关键素材不足时可复制精确 Codex 素材任务或按职责上传本地文件，随后恢复同一 Job；刷新阻断任务不再错误显示本地草案。最终验收同时拒绝调试标记残留与连续主体裁切跳变，见 [R66 beta closure](docs/v2-research/V2-BETA-CLOSURE-R66.md)。
- **V2 发酵状态素材验证已形成直接恢复结果**：R68 自动 authoring 仍按超时记录为失败；随后复用现有 bundle 接入三态素材、滚轮时间轴与移动端控制，并完成可部署归档。自动与人工恢复状态没有混写，见 [R69 direct recovery](docs/v2-research/V2-R69-DIRECT-RECOVERY-AND-CONSISTENCY.md)。
- **V2 有界生成运行时已接入**：每个任务只有一次 authoring、一次候选恢复和一次视觉处理额度，并受五分钟全局截止时间约束；服务重启只恢复检查点，不重做模型规划，终态停止轮询，旧任务合同可兼容迁移。见 [R70 bounded runtime](docs/v2-research/V2-R70-BOUNDED-GENERATION-RUNTIME.md)。
- **V2 当前项目真相与可提交基线已形成**：R71 清理确定性构建警告、把案例分为 5 个精选与 11 个研究结果、隔离新增运行时任务/证据文件，并明确仍未完成的能力与下一次单 brief 验收边界。见 [R71 current state](docs/v2-research/V2-CURRENT-STATE-R71.md)。
- **V2 单 brief 有界验证已完成**：R72 用全新的合唱排练台主题在约 186 秒内形成唯一可运行候选并明确停止；R73 修正一次交互证据误判，机械复验 100，但独立视觉验收因交互差异和移动端任务路径不足只得 70，因此没有归档或循环精修。见 [R72 bounded validation](docs/v2-research/V2-R72-SINGLE-BRIEF-BOUNDED-VALIDATION.md)。
- **V2 交互差异与移动端任务合同已接入**：R74 复用现有主体截图证据，要求主要参数或高层操作让 `data-signal-visual-anchor` 产生可辨认变化；直接交互页面的 390px 检查会实际操作控件，并验证“控件→结果→行动”完整路径。缺失或横向裁切会在视觉模型调用前停止，不新增候选或修复循环。见 [R74 interaction and mobile contract](docs/v2-research/V2-R74-INTERACTION-AND-MOBILE-CONTRACT.md)。
- **V2 日晷单任务验证已明确停止并修正前置理解**：R75 在约 190 秒因唯一一次 Codex authoring 达到 120 秒硬上限而停止，没有候选或案例；同时发现“纸张”风格词把教学模拟误导为材质微电影。现已加入通用因果模拟工作区，并修复受众与最终行动提取。见 [R75 sundial validation](docs/v2-research/V2-R75-SUNDIAL-BOUNDED-VALIDATION.md)。
- **V2 候鸟风洞单任务验证已拒绝并前置主体焦点合同**：R76 在约 166 秒形成唯一可运行候选，移动端“控件→结果→行动”路径通过，但候鸟被缩成图标、Canvas 主体差异仅约 0.4%，结构预检 54 分后停止且不归档。现已修复课堂语境误当主体的问题，并要求交互主体成为最大清晰焦点、使用参数极值自检明显变化。见 [R76 wind-tunnel validation](docs/v2-research/V2-R76-WIND-TUNNEL-BOUNDED-VALIDATION.md)。
- **V2 候鸟风洞替代版已停止且修正语义结果误判**：R77 在约 200 秒形成同主题唯一替代候选，主体尺度明显改善，但第一个主要参数仍只造成约 0.2% 的 Canvas 差异，因此不替换、不归档、不生成第三份。浏览器证明结果数值实际同步变化，验收器现已读取合同规定的 `data-signal-primary-result`，消除错误判罚但保留弱视觉反馈拒绝。见 [R77 replacement validation](docs/v2-research/V2-R77-WIND-TUNNEL-REPLACEMENT.md)。
- **V2 候鸟风洞已完成演示与滚轮驱动精修**：R78 没有再次调用模型，而是在 R77 页面上增加播放/暂停/重置、滚轮时间线和手动接管，并让候鸟姿态、翼面、气流、轨迹与数值同步变化。桌面、390px 手机、键盘与 reduced-motion 路径均已在真实 Chromium 中通过；本轮只完成交互精修，不自动晋升案例。见 [R78 wind-tunnel interaction](docs/v2-research/V2-R78-WIND-TUNNEL-INTERACTION.md)。
- **V2 已把多源交互沉淀为按需能力并可自动验收**：R79 将 R78 验证过的演示、滚轮和直接控件统一状态写入 creative contract 与 Codex execution brief；只有 brief 明确请求自动演示和至少另一种驱动时才启用。视觉管线复用一个中间检查点，在约 2 秒内有界验证播放、滚轮、人工接管与 Canvas 联动，失败只返回原因、不循环修复。见 [R79 shared-state driver](docs/v2-research/V2-R79-SHARED-STATE-DRIVER.md)。
- **V2 完整闭环已完成一次有界失败探测**：R80 用全新树冠降温主题验证端到端流程，修复了无候选时伪恢复、预算重置、渲染职责冲突和 manual driver 漏识别。两次 `gpt-5.6-sol` authoring 都在 120 秒且候选落盘前停止，因此没有归档空页面；下一步聚焦更快 authoring 模型或更小 authoring 合同，不再延长等待。见 [R80 bounded closed-loop probe](docs/v2-research/V2-R80-BOUNDED-CLOSED-LOOP-PROBE.md)。
- **V2 模型职责已拆分并形成可运行树冠候选**：R81 让 `gpt-5.6-terra` 负责唯一首稿、`gpt-5.6-sol` 只负责证据驱动的一次精修。Terra 在约 90 秒内保存候选，同一候选经一次确定性 `balanced` 类型修复后通过编译并完成浏览器实测；页面交互有效，但遗漏共享状态观察标记，机械评分 76 并正确停在 `review-required`，未调用 Sol、未归档。见 [R81 model role split](docs/v2-research/V2-R81-MODEL-ROLE-SPLIT.md)。
- **问题已冻结**：模型编写和开放式精修是主要耗时，详见 [V1 performance and gaps](docs/releases/V1-PERFORMANCE-AND-GAPS.md)。


## 本地运行

```powershell
npm.cmd install
npm.cmd run dev:8143
```

生产构建、单元/边界测试和浏览器测试：

```powershell
npm.cmd run build
npm.cmd test
npm.cmd run test:browser
```

## 当前可运行基线

**主演示：**直接打开根路径 `/`。默认体验 `resonance-flagship`（《声之形》）不是基础图形模板，而是 ChatGPT 直接生成的主视觉 + 对齐深度图，经 Three.js shader 位移、滚动镜头、指针视差与质量感知 Bloom 形成的资产驱动产品现场。素材缺失会明确报错，不会静默替换成程序化 Demo；`renderer=none` 时从 Manifest 读取同一张真实主视觉作为语义回退背景。生成来源与完整提示词见 [ChatGPT resonance asset pair v1](docs/assets/chatgpt-resonance-v1.md)。

主演示当前素材成熟度为 `L3-presentable`：足以承担网页主视觉，但不冒充可自由环绕的真实 3D 产品模型或 `L4` 近景资产。视觉契约与验收记录见 [Flagship refinement record](docs/FLAGSHIP-REFINEMENT.md)。

**V2.5 冻结锚点：**打开 `/pages/v2/deliveries/ice-core-letters/?quality=high&motion=full&revision=r125-final`。该页面以真实感冰川环境、持续 Three.js 冰芯和纵向层位旅程证明非工作台结构仍可保持 3D、动态与明确行动；最终身份、五类浏览器证据、内容结构判断和 WowGate 均绑定同一 bundle。完整证据见 [R125 ice-core letters](docs/v2-research/V2-R125-ICE-CORE-LETTERS.md)。

**V3 真实模型路线：**打开 `/pages/v2/deliveries/fox-gait-observatory/?quality=high&motion=full&revision=r137-proof`。同一只可追溯 Fox GLB 真实切换 Survey、Walk、Run，支持环绕、缩放、保存、移动端与诚实回退；完整证据见 [R137 Fox gait observatory](docs/v2-deliveries/R137-FOX-GAIT-OBSERVATORY.md)。

**V2 正向参考闭环：**打开 `/pages/v2/deliveries/sonic-pressing-room/?quality=high&motion=full&revision=r157-final`。R156 晋升的“连续音频信号”和“单一材质因果”参考首次进入未知主题创作；系统识别出静态生图无法承担实时频段职责，改由 WebGL + Web Audio 把低、中、高频分别映射为沟槽、折光和边缘振动。一个方向、一次构建和一次视觉精修后，桌面、390px、滚动、播放、保存、WebGL/音频回退均通过并绑定最终 bundle。设计合同与证据见 [R157 sonic pressing room](docs/v2-deliveries/R157-SONIC-PRESSING-ROOM-CONTRACT.md)。

**V2 跨主题决策稳定性：**R158 用编辑排版、真实地图、可检查模型、声音材质和虚构环境五类输入验证同一选择链，分别稳定落到 `code-native / grounded-real-media / threejs-spatial / webgl-procedural / generated-image`。同时补齐“声纹、频谱、低/中/高频”等自然语言识别；用户无需写技术术语，系统也不会为制造多样性添加全局风格禁令。见 [R158 selection stability](docs/v2-research/V2-R158-CREATIVE-SELECTION-STABILITY.md)。

**V2.5 / V3 直接创作入口：**打开 `pages/v2/`，输入想法并生成创意契约，然后用主动作复制 protocol v3 有界包，直接交给当前 Codex 在项目中创作。

**兼容实验工作台：**打开 `workbench.html`。它保留 V1、本地预览和后台实验链兼容性，但不再是 V2.5 直接创作的默认入口。

- 输入想法后，页面会先显示 V2 目标约束摘要；点击“生成并构建最佳网页”才启动服务器任务。该任务只保留一个作者候选，MiniMax 仅在素材职责明确且目录没有可信素材时备用，浏览器自动精修最多一次。

- 首屏现在是一个同源实时创意舞台，可直接切换三个完整网页：资产驱动的《声之形》、生成环境驱动的《潮汐记忆档案》和纯 Shader 的《流体色场》。它们采用不同的主体、空间隐喻、构图、素材策略与运动语言；技术推断和能力缺口已折叠为高级信息。

- 输入目标、受众与氛围，得到可检查的效果方向；当前本地兼容层仍产生 `focus / journey / branching`，它们不是长期产品约束。
- 每个候选现在同时包含 `EffectSpec`、`AssetPlan`、`ProductionPlan`、`CapabilityPlan` 与 `ExperienceManifest`，可以分别检查效果目标、素材缺口、模型适配、运行成本和最终体验图。
- 工作台比较核心记忆点、效果层和素材路线，再进入真实 Three.js 预览，不再把 Demo/插件名称当作用户选择目标。
- 首次进入仍使用 `baseline-keyword-v1`，完全本地且不会产生模型调用。
- 明确点击生成后可选择 `Auto / Codex / MiniMax / OpenAI / 本地基线`，结果显示实际 provider、模型、延迟和回退原因。
- Codex/MiniMax 默认直接生成一个最佳目标驱动 `EffectSpec`，不再为展示数量而生成次优候选，也不选择固定拓扑或 Demo 插件；所有结果仍经过 Zod、素材、生产、manifest 与能力预算校验。
- 远程模型分析按 provider、model、描述和 seed 持久化缓存；同一输入可复用，点击“生成新变体”才会主动递增 seed。
- 模型 `EffectSpec` 现在编译为 `ComposedSceneRecipe`，由 `composed-world` 插件组合主体、材质、实例场、氛围和运动；未生产素材数量会显式保留。
- 当所选 `EffectSpec` 声明 image / texture / sprite 需求且 MiniMax 已配置时，工作台可显式调用 `image-01`，把 base64 结果校验并物化到本地缓存，再重编译为 `resonance-flagship` Three.js 预览。
- 外部素材需求可声明 0–1 时间锚点、视觉功能、目标画面、连续性和融合方式；数量由 brief 决定。生成的多张素材会全部进入 Manifest，并按时间锚点传给 Codex。关键素材没有在最终代码中实际使用时，专属构建不会通过。
- Codex 与 MiniMax 的职责独立记录：语言模型负责意图、EffectSpec 与代码方向，`minimax-image-01` 才是图片字节适配器。新素材保持 `L2-inspectable / publishable=false`，不会因为“生成成功”而被冒充为可发布成品。完整契约见 [模型素材生产管线](docs/ASSET-PRODUCTION-PIPELINE.md)。
- 当描述超出现有目录时，工作台会生成不可执行的 `CapabilityProposal`，列出插件契约、质量门禁与建议文件，而不是伪装成已有功能。
- 每条提案都可生成 `SynthesisWorkspace`：按能力类型形成三个内存虚拟文件并完成静态审计；产物明确 `execution=never`、`registration=not-registered`。
- 无 API 也可运行离线质量门：`EvaluationReport v1` 检查跨产物身份、DOM/WebGL 边界、素材与生产状态、能力和负载预算，并可显式采集桌面 WebGL、移动 WebGL 与移动回退的真实运行快照。构图、记忆点和材质仍标记为 `manual-required`，不伪造视觉判断。工作台还可把强调色、页面标题和节奏指令编译成有差异证明的局部修订；不支持或有歧义的描述不会改变候选。完整边界见 [离线评审与修订闭环](docs/EVALUATION-REVISION-LOOP.md)。

使用 `experience` 参数切换体验：

- `resonance-flagship`：默认主演示，模型彩色/深度资产对、shader 深度视差、滚动导演和受控 Bloom。
- `tidal-archive`：ChatGPT 生成水下记忆环境与对齐深度图，叠加玻璃档案片、关系线、水体粒子和克制滚动镜头。
- `observatory`：品牌信号观测站，4 节点线性体验。
- `archive`：数字展陈，4 节点线性体验。
- `explainer`：技术解释，4 节点线性体验。
- `single-hero`：1 节点、3 个内部关键帧，证明节点不等于静态画面。
- `long-form`：9 节点长叙事，证明运行时不假设固定长度。
- `branching-lore`：5 个图节点、每次选择得到 4 节点流程；`choice=shadow|luminous` 控制路径。
- `chromatic-tide`：Shader 光幕、折光核心和编辑化色场，验证第二种视觉语法。
- `composed-world`：EffectSpec 场景语法演示，组合 knot 主体、emissive 材质、stream 实例场与质量档降级。

其他确定性参数：

- `node=<node-id>`：深链接到当前流程中的节点。
- `quality=auto|high|balanced|low`
- `motion=system|full|reduce`
- `renderer=webgl|none`
- `debug=1`

旧参数 `story` 和 `chapter` 暂时保留为兼容别名。仅在 `debug=1` 时暴露只读的 `window.__signalLab.snapshot()`，供回归与架构检查使用。

## 当前架构

```text
CreativeBrief -> IntentEvidence -> EffectSpec[]
                                  ├─> dynamic asset experience contracts -> AssetPlan + runtime CapabilityPlan
                                  ├─> ProductionCapabilityProfile -> ProductionPlan
                                  ├─> persistent analysis cache
                                  ├─> ComposedSceneRecipe -> ManifestCompiler -> Workbench -> preview
                                  ├─> missing capability -> CapabilityProposal -> SynthesisWorkspace
                                  └─> AssetGenerator -> role-aware bounded MiniMax media generation -> local materialization
                                                        -> multi-asset Manifest integration -> Codex dedicated build
                                                        -> required usage gate -> independent visual acceptance
                                  └─> RuntimeEvidenceCollector -> OfflineEvaluator -> EvaluationReport
                                                                        -> RevisionPlan -> LocalRevisionResult -> revised preview

ExperienceManifest v2
  ├─ nodes + flows ──> validator ──> FlowPlan
  ├─ cameraTracks ─────────────────> Camera Director
  ├─ sceneTracks ──────────────────> Scene State Director
  ├─ drivers ──────────────────────> Scroll Driver
  └─ scenes/effects ──> Plugin Registry ──> ExperienceRuntime
                                                ├─ DOM remains semantic
                                                └─ Three.js renders atmosphere
```

关键边界：

- `ExperienceManifest` 是生成、编辑、校验和保存的中间表示，不直接生成散乱业务代码。
- `EffectSpec` 记录目标、核心记忆点、空间隐喻、DOM/WebGL 分工、效果层、镜头、交互和抽象素材需求。
- `AssetPlan` 记录素材生成路线、L0-L5 成熟度、候选来源、许可、负载、回退与发布状态；缺失素材不会被伪装成已有文件。
- `FlowPlan` 将图解析为本次可重放路径；分支选择不会污染渲染循环。
- Driver 只产出进度与活动节点，不知道镜头、场景和页面必须有几段。
- Camera/Scene Track 使用稳定 ID 与关键帧，不以数组下标耦合内容。
- `ExperienceRuntime` 只负责 WebGL 生命周期、相机、质量和渲染；视觉世界由 `ScenePlugin`、`EffectPlugin` 注册。
- `ComposedSceneRecipe` 是从效果目标到可执行场景的受限语法，不是页面模板；主体、场域、氛围和运动可以独立组合。
- `CapabilityCatalog` 与 `CapabilityPlan` 检查运行时插件、设备模式和画质预算。
- `ProductionCapabilityProfile` 只声明项目已经接入的模型、媒体与评审适配器，不把 provider 的潜在能力当成已实现能力。
- `ProductionPlan` 把每项需求变成直接使用、生成、替代、降级或阻断任务，并记录对最终效果的影响。
- `SynthesisWorkspace` 只保存内存虚拟文件与静态审计结果；通过审计不等于实现、运行或注册。
- `EvaluationReport` 不生成无证据审美分数；自动证据、真实浏览器证据和人工视觉判断保持可区分。
- `RevisionPlan` 以失败/未决检查为来源，记录目标产物、层、预期可见差异和 `none / partial / full` 重生成范围。
- 无 WebGL、减弱动效和质量档是正式输出模式，不是错误页面。

## 如何扩展

- 新体验：添加一个通过 `assertExperienceManifest` 的 manifest，不改运行时。
- 新视觉方向：实现并注册新的 `ScenePlugin` 或 `EffectPlugin`，不要向核心运行时增加 preset 分支。
- 新交互方式：实现新的 Driver，将其输出统一为节点 ID、局部进度和全局进度。
- 新生成能力：实现新的 `BriefInterpreter`；模型只提出结构化方向，仍必须经过编译、校验、预算与预览。

- 新素材能力：实现 `AssetGenerator`，让图片、纹理、3D、角色、环境、音频或视频生成结果进入同一质量与来源门禁。
- 新评审能力：实现 `Evaluator`，输出可复现的结构、代码、视觉、性能、可访问性或发布证据。
- 新产品路线：实现 `PatternRouter`，在产品页、查看器、影片、作品集、配置器、角色或真实场景之间选择，而不是复制页面模板。
当前已实现离线基线、Codex CLI、MiniMax、可选 OpenAI provider、模型直接 `EffectSpec v1`、持久化分析缓存、`ComposedSceneRecipe`、`AssetPlan v1`、`ProductionCapabilityProfile v1`、`ProductionPlan v1`、可重放的 MiniMax `image-01` AssetGenerator、本地素材物化与缓存、生成素材到旗舰场景的 Manifest 集成、候选多样性门禁、能力缺口提案、不执行/不注册的虚拟合成工作区、两个物化的模型彩色/深度资产体验、三方向实时创意舞台、离线 `EvaluationReport v1 -> RevisionPlan v1` 质量门，以及 `RuntimeEvidenceBundle v1 -> LocalRevisionResult v1` 的无 API 局部修订闭环。模型缺失能力会被显式生成、替代、降级或阻断，详见 [模型能力适配](docs/MODEL-CAPABILITY-ADAPTATION.md)。真实 Codex 非模板化 EffectSpec 证据见 [Phase 6](docs/PHASE6-DIRECT-EFFECTSPEC.md)，缓存与组合场景证据见 [Phase 7](docs/PHASE7-CACHED-COMPOSED-SCENES.md)。下一门禁回到核心产品：让 Codex/MiniMax 从想法直接规划并合成新的页面结构、素材路线与场景实现，生成结果继续进入同一个实时舞台；真实 MiniMax 联网验证仍需配置 `MINIMAX_API_KEY`。

视觉证据：[R11 创意舞台桌面](docs/screenshots/phase11-creative-stage-desktop.png) · [R11 创意舞台手机](docs/screenshots/phase11-creative-stage-mobile.png) · [潮汐记忆完整网页](docs/screenshots/phase11-tidal-archive-desktop.png) · [旗舰桌面首屏](docs/screenshots/flagship-desktop-hero.png) · [旗舰深度状态](docs/screenshots/flagship-desktop-depth-state.png) · [旗舰移动低画质](docs/screenshots/flagship-mobile-low.png) · [运行证据与局部修订手机](docs/screenshots/phase10-runtime-revision-mobile.png) · [离线评审手机](docs/screenshots/phase9-offline-evaluation-mobile.png) · [模型素材生产完成态](docs/screenshots/phase8-asset-production-ready.png) · [模型素材生产移动端](docs/screenshots/phase8-asset-production-mobile.png) · [Shader 色潮](docs/screenshots/phase1-chromatic-tide.png) · [EffectSpec 组合场景](docs/screenshots/phase7-composed-world.png)

运动架构与验收：[R12 电影化指针与滚动精修](docs/MOTION-REFINEMENT-R12.md) · [R12 真实浏览器运动状态](docs/screenshots/phase12-motion-desktop.png)。
R13 体验与工作流：[四阶段场景节奏与创作者五步工作流](docs/EXPERIENCE-WORKFLOW-R13.md) · [旗舰章节桌面](docs/screenshots/phase13-flagship-desktop.png) · [工作台调整桌面](docs/screenshots/phase13-workbench-desktop.png) · [工作台调整手机](docs/screenshots/phase13-workbench-mobile.png)。

本目录没有获得 Kage 原项目的代码或美术再分发授权；实验室不应被描述为法律意义上的 clean-room 认证结果。
