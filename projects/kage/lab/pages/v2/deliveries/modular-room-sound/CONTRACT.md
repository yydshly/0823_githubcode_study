# R142 · Modular Room Sound delivery contract

## Design contract

- Entry mode: ordinary brief → medium responsibility regression
- Request revision: R142
- Target user and context: 正在为客厅选择音响摆放方式、希望先理解装配和声路的普通访客
- Desired first impression: 一件温暖住宅日光中的雕塑家具，随后才发现它能拆分、壁挂并露出内部声音通路
- Visual ambition: Immersive product film；Three.js 必须承担真实可检查的空间拓扑，不承担装饰性炫技
- Experience architecture: 固定空间舞台 + 非均匀滚动章节 + 情境化直接控制；不是持久参数工作台
- Visual constraints: 奶油白空间、珊瑚橙主体、钴蓝声路、拉丝金属细节；不继承历史暗色、三屏、中央产品或巨大标题模板
- Information constraints: 只解释横置、分体、壁挂、剖视声路、试听、保存与预约；不虚构声学参数或性能认证
- Operation constraints: 原生滚动驱动章节；拖拽/滚轮可检查视角；按钮和键盘可切换三种装配；试听必须由用户手势启动
- State constraints: `horizontal | split | wall` 是同一装配树的三个姿态；`cutaway` 只移开前盖并显示内部腔体、触点、挂扣和声路；不重建无关对象
- Environment constraints: 产品、空间、声路与试听均为概念设计演示；不是实际品牌、规格、声学测量或安装建议
- Primary journey: 识别合体音响 → 滚动看见左右分体 → 环绕并开启剖视 → 切到壁挂 → 试听当前组合 → 保存并预约试听
- User-defined phase: R142 验证“普通 brief 仅在真实空间职责存在时选择 Three.js”
- Required artifacts: HTML、CSS、TypeScript、合同、asset manifest、真实浏览器证据、生产构建 smoke、DirectCreativeRun、V3 唯一归档入口
- Autonomy authorization: 用户连续指示“继续”，授权在既有项目和有界预算内完成唯一方向
- User-decision boundary: 无；方向、参考、材质和构图由 Codex 按现有协议自主选择
- Observable completion criteria: 隐藏标题仍能识别音响；三姿态实际改变模块、触点和挂扣的空间关系；剖视真实露出内部声路；试听产生可听且可见反馈或明确失败；390px/reduced-motion/fallback 完成同一主要旅程；最终身份绑定 `runId + bundleHash`

## Route decision

- Selected pattern: Immersive + Spatial Stage，DOM/Three hybrid。
- Evidence branch: brief 明确要求同一产品的横置、分体、壁挂、真实连接、剖视和环绕检查；`sceneComposition=spatial-3d`、`stateAssetStrategy=inspectable-model`、`medium=threejs-spatial`。
- Required inputs: 一个具名、可寻址、可插值的音响装配树；三种姿态；独立前盖、扬声单元、低音腔、触点、挂扣和声路；用户手势音频。
- Expected output: 空间关系、遮挡、连接顺序和声路由 Three.js 证明；DOM 负责阅读、控制、披露和最终行动。
- Learning update: 若该普通 brief 能在有界时间内通过空间因果、移动端、音频与 fallback 门禁，则保留“职责触发 Three.js”能力；若只能得到通用盒子或装饰声波，则本轮停止为研究结果，不归档。

## Direction decision

内部只比较一次，不生成并行页面：

1. **日光雕塑音响 + 空间声路（selected）**：圆角挤压箱体、织物网罩和拉丝金属连接形成可信产品；滚动与直接控制共享三姿态，剖视后声路沿真实腔体点亮。
2. 写实客厅生成图 + 叠加波纹：氛围可能更像照片，但无法验证部件拓扑、后部挂扣或内部声路。
3. 黑色产品工作台 + 参数滑块：容易重复历史模板，且参数面板不能替代装配关系。

选择 1。页面不复制旧案例外观，只复用常驻 Group、状态插值、受限 Orbit、音频手势与语义 fallback 机制。

## Positive reference

- `positive-smart-audio-anchor`：只借“同一可信产品贯穿全程、抽象声音反馈绑定具体产品状态”。不借旧案例的平面产品图、暗色声场或固定工作台。
- `positive-sonic-editorial-feedback`：只借“声音、可见反馈、解释和行动共享状态；由用户手势启动；声音来源诚实披露”。不借电台排版或视觉语言。

## Asset decision

- One direction, one deterministic procedural model batch, no external image batch.
- Dedicated concept model: `productRoot / leftModule / rightModule / bridge / drivers / bassChamber / contacts / wallHooks / frontCover / soundRoute`。
- 外壳使用圆角 `Shape + ExtrudeGeometry`，单元使用共享 Cylinder/Cone/Torus，触点和螺钉实例化，网罩使用 CanvasTexture，声路使用低段数 TubeGeometry。
- 该资产可诚实达到 L3 精致概念产品与可检查拓扑；不得声称真实品牌、规格级工业模型或精确声学模拟。
- 若模型不可用，只显示同状态语义/SVG 回退，不用图片或随机几何冒充三维检查。

## Public runtime contract

页面提供只读 `window.__MODULAR_ROOM_SOUND__.snapshot()`，以及验证辅助方法 `goto(mode)`、`toggleCutaway()`、`playPreview()`、`saveAndBook()`：

- snapshot: `ready, mode, progress, cutaway, playing, audioState, saved, booked, fallback, reducedMotion, quality, revision, frames, drawCalls, triangles, pixelRatio, camera, partPositions, coverOffset, hooksVisible, routeVisible, canvasVisualHash, horizontalOverflow`
- semantic inputs: `[data-mode]`、`[data-cutaway]`、`[data-listen]`、`[data-save]`、`[data-book]`
- URL gates: `quality=high|balanced|low`、`motion=full|reduce`、`revision=...`、`fallback=1`、`audioFallback=1`

## Attempt budget

- Direction selections: `1 / 1`
- Asset batches: `1 / 1`
- Complete builds: `0 / 1`
- Deterministic repairs: `0 / 2`
- Visual refinements: `0 / 1`
- Silent retries: `0`

## Coverage manifest

| Requirement | Surface / state | Evidence | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- |
| 普通 brief 因空间职责选择 Three.js | contract tests | route/state/scene/medium assertions + non-spatial negative control | 2 | pending | 先运行测试锁定路由 |
| 主题专属产品与可信拓扑 | 1440×900 opening | nonblank canvas + named part tree + calls/tris + screenshot | 3 | pending | 构建唯一概念模型 |
| 三姿态真实装配因果 | desktop horizontal/split/wall | semantic input + part positions/contact gap/hooks + distinct hashes | 5 | pending | 共享 pose 插值 |
| 环绕、剖视与声音通路 | desktop direct interaction | real drag/wheel + cover offset + route visibility + audio state | 5 | pending | 同状态驱动 Three/DOM/Audio |
| 保存和预约完成态 | desktop completion | saved/booked state + live announcement + persistence | 5 | pending | 完成主要行动 |
| 手机与 reduced-motion | 390×844 low/reduce | touch context + DPR≤1 + complete journey + no overflow | 7 | pending | 保留离散姿态与 44px 控制 |
| WebGL 与音频独立失败 | fallback / audioFallback | SVG 同状态旅程；音频失败不阻断装配、保存与预约 | 8 | pending | 诚实降级，不重试 |
| 生产构建与最终身份 | build + production smoke + report | exact bundle + screenshot bytes + runId + bundleHash | 9 | pending | 通过后只归档唯一版本 |

## Stop rule

完成一次构建、最多两次确定性修复和一次针对明确缺陷的视觉精修；任何素材或音频失败都不得触发静默重试。若唯一版本无法证明真实空间因果或独立视觉质量，则停止并记录为研究结果，不进入精选库。
