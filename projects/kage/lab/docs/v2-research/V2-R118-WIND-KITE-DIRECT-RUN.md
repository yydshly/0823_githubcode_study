# V2 R118 — 风筝风场校准台直接创作运行

## 设计契约

- Entry mode：brief-led。R117 已能生成同源有界创作包；本轮真实消费一次创作包，完成网页、最终身份、浏览器证据和精选归档。
- Request revision：R118。
- Exact brief：为城市风筝学习者设计一座明亮的风场校准台。开场让一只手工纸鸢在近海天空中升起；调整风速、缰绳偏置和飞行高度时，同一只风筝的迎角、弯曲、尾带与风流轨迹同步改变，并给出稳定性和牵引力的演示结果。最后行动为“保存这组飞行方案”。需要具有吸引眼球的实时 3D 效果，但不要暗色科技界面；数值必须明确是概念模拟，不伪装成真实气象结论。
- Target user and context：正在学习调校风筝、希望直观看懂风与结构关系的城市初学者；桌面用于完整调校，手机用于快速试验。
- Desired first impression：五秒内看到一只具有纸张、竹骨和尾带质感的风筝从近海天光中升起，天空和主体都在呼吸，而不是一个静止商品贴图。
- Visual ambition：Immersive / Flagship。
- Experience architecture：Spatial Stage。
- Scene base：Three.js WebGL；DOM 承载标题、说明、控制、结果和保存行动。
- Scene persistence：场景覆盖完整主要旅程；只在浏览器能力失败时退化为同语义 SVG/DOM 风筝。
- Foreground control model：桌面右侧悬浮校准板；移动端变为底部紧凑面板，不把旅程拆成长滚动三屏。
- State-to-scene mapping：开场升起 → 自动稳定 → 用户调风速/缰绳/高度 → 同一风筝姿态、尾带、风流和结果同步变化 → 保存完成。
- Visual constraints：明亮日光、矿物蓝、朱砂红、纸张暖白；主体必须可辨认、接地于天空尺度并有竹骨/纸面层次。禁止用圆球、随机粒子、纯色网格或大标题代替风筝。
- Information constraints：首屏只保留主题、三个直接控件、两个模拟结果和主要行动；技术说明收在短注释中。
- Operation constraints：滚轮微调风速；指针横移形成短时侧风；三个 range 控件共享同一规范化状态；首次真实输入停止开场自动稳定演示。
- State constraints：`demo | manual | saved | fallback` 可观察；保存后保持当前风筝姿态并给出可恢复反馈。
- Environment constraints：沿用现有 Vite、Three.js 和 TypeScript；不新增依赖、不调用外部数据或模型服务。
- Asset strategy：一个程序化素材批次，生成纸鸢几何、竹骨、尾带、风流和云层；这是概念演示资产，不宣称真实商品或气象精度。
- Primary journey：看见风筝升起 → 调整风速或缰绳 → 无需只看数字也能辨认姿态与风流变化 → 理解稳定性/牵引力 → 保存飞行方案。
- User-defined phases：消费作者包、完成旗舰场景、验证真实联动、跨表面与 fallback、绑定最终证据并归档。
- Required artifacts：专属 delivery bundle、R118 E2E、最终 `DirectCreativeRun` JSON、同 bundleHash 的 WowGate、精选案例封面与入口、阶段记录。
- Autonomy authorization：用户已明确“继续”，允许在现有项目内自主完成这一有界阶段，不重复询问。
- User-decision boundary：真实风洞/气象模型、账号保存、后台服务、外部素材授权和部署不属于本轮。
- Observable completion criteria：五秒 Hero 可观察；风速、缰绳、指针/滚轮至少三条输入真实改变同一场景；DOM 结果与 3D 同源；390px、reduced-motion 和强制 WebGL fallback 可用；最终证据绑定 `runId + bundleHash`；只归档一个通过质量门的版本。

## WebGL 路由

- Selected pattern：Product case / Spatial Stage。
- Evidence branch：现有 Three.js 运行时、R115 浏览器检查模式、R116 通用 WowGate。
- Required inputs：无需外部 GLB；程序化纸鸢被明确限定为概念工艺对象，目标质量为 L3 Presentable，不承担真实商品近景检查承诺。
- Expected output：一个明亮、主题专属、可直接操控、具备 DOM fallback 的 3D 网页，而不是可复用模板或视频发布包。
- Skill update：本轮只向项目研究记录沉淀证据，不修改通用技能。

## 视觉方向

| 决策 | 选择 | 可观察约束 | 验收 |
| --- | --- | --- | --- |
| 构图 | 近海天空占据整屏，纸鸢偏左上升，控制板位于右侧前景 | 场景始终可见，控制不遮挡主体 | 首屏先看到纸鸢及其飞行关系 |
| 字体 | 大号窄体/黑体用于主题，小号等宽用于模拟状态 | 不让标题覆盖主体，不依赖外部字体 | 390px 仍能读懂主题和结果 |
| 色彩 | 天光蓝、纸白、朱砂红、钴蓝、暖金竹骨 | 不使用暗色科技背景 | 白天主题在截图和 fallback 中一致 |
| 材质 | 轻薄纸面、竹骨、编织尾带、半透明风流 | 主体有层次且不会塑料化 | 中近景能辨认结构与弯曲 |
| 深度 | 透视、视差、云层、遮挡、接近/远离的风流 | 镜头不持续推近，不制造眩晕 | 指针与滚轮变化仍保持尺度关系 |
| 动态 | 升起、稳定、受风、保存定格 | 每段动态有产品含义 | 最终状态比中间态更完整 |

## 覆盖记录

| 用户阶段 | 要求或产物 | 表面 / 状态 | 所需证据 | 内部阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 消费作者包 | exact brief 生成 package / run 并保持同源 | 数据 / 初始 | contract/package/run 单测 | 0–1 | pass | `contract-4dfa7s` → `direct-1b52abp` 同源 |
| 旗舰场景 | 纸鸢、天空、风流、DOM 控制形成一个 Spatial Stage | 桌面 / opening | 浏览器首屏、五秒 Hero、无错误 | 2–4 | pass | 3.2 秒 Hero 与持久 Three.js 场景通过 |
| 真实联动 | range、滚轮、指针改变同一场景与模拟结果 | manual / saved | 操作前后状态和视觉差异 | 5–6 | pass | 三 range、滚轮、指针、语义与保存同源联动 |
| 跨表面 | 390px、键盘、reduced motion、WebGL fallback | mobile / fallback | Playwright 与最终截图 | 7–8 | pass | 390px、低动态、强制 fallback 均通过 |
| 最终归档 | runId + bundleHash、硬门、WowGate、封面、示例入口 | final / library | evidence JSON、测试、Vite build | 9 | pass | 最终身份绑定、封面与第 10 张精选卡已归档 |

## 浏览器基线

- Canonical URL：`http://127.0.0.1:8143/pages/v2/deliveries/wind-kite-lab/?quality=high&motion=full&revision=r118-final`
- Start command：`npm run dev -- --host 127.0.0.1 --port 8143`
- Browser：Chrome / Playwright，桌面 1440×900 与手机 390×844。
- Baseline state：新主题尚无页面；R117 作者包、Three.js 依赖和自适应证据结构已可用。

## 执行边界

- 一个创意方向。
- 一个程序化素材批次。
- 一次完整构建。
- 最多两次确定性修复。
- 最多一次视觉精修。
- 不生成第二个候选，不并行扩展案例研究。

## 阶段完成记录

- Direct run：`direct-1b52abp`。
- Frozen bundleHash：`48b0f7afa06039ccbe1fd4c627ad3312150b47acdbfdce8d7ba435a9ec086fb3`。
- 唯一视觉精修：增加纸张纤维、可见双侧缰绳与移动端结果底板；未更换方向、素材批次或渲染路线。
- 浏览器验收：R118 delivery `4/4 passed`；V2 Composer 与 10 张精选入口回归 `4/4 passed`。
- 证据验收：R118 identity / General visual / Flagship WowGate / archive eligibility `2/2 passed`；视觉评分与 WowGate 均为 `93`。
- 构建验收：`npx tsc --noEmit` 通过，`npm run build:pages` 通过；既有历史素材路径与 Three.js chunk 仅产生非阻断警告。
- 阶段结论：R118 已完成“同源作者包 → 专属旗舰网页 → 自适应浏览器证据 → 最终身份绑定 → 精选归档”的一次真实闭环，不继续修图或生成第二候选。
