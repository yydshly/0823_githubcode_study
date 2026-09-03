# V2 R120 · 非工作台空间游园证明

## Design Contract

```text
Entry mode: Revision-led
Request revision: R120
Target user and context: 希望把文化活动、展览或对象系列变成具有即时吸引力与探索感网页的访客；不需要理解参数或阅读长篇说明。
Desired first impression: 先进入一座明亮、会呼吸的日光游园，看见六只纸蝶在同一空间中形成不同深度与队形；页面不是工作台、卡片目录或长滚动文章。
Visual ambition: Immersive
Experience architecture: Spatial Stage
Visual constraints: 真实屋顶温室环境承担空间可信度；主题专属 3D 纸蝶承担主视觉。没有持久侧栏、滑杆、指标簇、暗色科技界面或等宽商品卡。
Information constraints: 每只纸蝶的颜色、纸材和巡游故事只在选择后就近展开；未选择时保持场景主导。
Operation constraints: 指针/触摸改变队形与局部反光；点击、键盘或触摸选择对象；最终行动为“选择一只加入巡游”。
State constraints: opening、hover/formation、selected、joined、mobile、reduced-motion、WebGL fallback 均可观察。
Environment constraints: 保留 V1、工作台、R119 与既有案例；复用现有温室素材和 Three.js，不接后台模型、不生成第二素材批次。
Primary journey: 看见完整纸蝶游园 → 指针探索不同深度 → 选择一只纸蝶 → 在对象附近理解材料与故事 → 加入巡游。
User-defined phases: 对象场路由补齐 → 单一空间舞台实现 → 浏览器验收 → 通过后接入已验证示例。
Required artifacts: object-field 结构决策、R120 delivery、固定 bundle 身份测试、浏览器证据、V2 示例入口与阶段记录。
Autonomy authorization: 用户已明确要求继续并按小目标持续开发；本阶段内可自主完成可逆实现、一次视觉精修和验证。
User-decision boundary: 不修改旧案例，不批量补素材，不建设后台 Codex 接入，不扩展为真实票务或活动系统。
Observable completion criteria: exact brief 被编译为 object-field / playful-exploration / contextual / pointer；页面首屏不是编辑长页或参数工作台；同一空间内六只对象可探索、选择和完成行动；桌面与 390px 可用；reduced-motion 与 WebGL fallback 保留完整行动。
Coverage record: 见下表。
```

## Spatial Stage Architecture

```text
Scene base: transparent WebGL over a full-bleed grounded environment
Scene persistence: scene remains visible through opening, exploration, selection and joined state
Foreground control model: minimal masthead, contextual object label, selected-object sheet and one final action
State-to-scene mapping: idle formation → pointer dispersion → selected focus → joined ribbon state
Mobile transformation: compact bottom sheet and touch-selectable objects; no persistent desktop panel
Fallback: full-bleed environment + six semantic object buttons + contextual sheet; no empty canvas
```

## 方向表

| 决策 | 选择 | 可观察约束 | 验收标准 |
| --- | --- | --- | --- |
| 宏观形态 | Playful spatial object field | 一个持续舞台，多对象非均匀分布 | 无长篇编辑章节、无持久控制面板 |
| 主视觉 | 真实温室 + 程序化纸蝶 | 背景提供尺度与光线，3D 提供主题对象与可见变化 | 纸蝶不是通用粒子或平面图标 |
| 交互 | pointer/touch/keyboard selection | 输入改变对象队形、焦点与就近信息 | 画面变化与语义选择来自同一状态 |
| 信息 | contextual | 信息跟随当前对象出现 | 未选择时不以卡片墙遮挡场景 |
| 移动端 | compact spatial stage | 保留舞台、对象选择和最终行动 | 390px 无横向溢出，底部信息不遮住当前对象 |

## Coverage Manifest

| 用户阶段 | 要求或产物 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 对象场路由补齐 | collection brief 形成 single-scene object-field | contract / author package | 类型与单测 | 0–1 | pass | closed |
| 空间舞台 | 六只纸蝶与环境形成持续主表面 | desktop opening | 浏览器截图、DOM、资产请求 | 1–3 | pass | closed |
| 前景交互 | 指针、选择、行动真实联动 | hover / selected / joined | 浏览器输入前后状态 | 4–6 | pass | closed |
| 跨端与降级 | 390px、键盘、reduced-motion、fallback | mobile / media / forced fallback | 浏览器自动测试 | 7–8 | pass | closed |
| 阶段归档 | 固定 bundle 身份并接入 V2 示例 | test / V2 index | hash、构建、入口回归 | 9 | pass | closed |

## 执行边界

- 一个创意方向：纸蝶日光游园。
- 一个素材批次：复用现有温室环境 + 程序化纸蝶，不发起图片重试。
- 一次完整构建，最多两次确定性修复，最多一次视觉精修。
- 如果关键视觉未达到已验证示例标准，记录研究结论但不进入精选入口。

## 执行结果

- 固定入口：`/pages/v2/deliveries/paper-butterfly-garden/?quality=high&motion=full&revision=r120-proof`
- 最终身份：`runId=direct-pdqxba`，`bundleHash=b88dd7c92230fc5044b835eb5fa860fa31509c40c6ff42081cb38d677f80dbf2`。
- 素材批次：同一批次复用已生成的屋顶温室环境，并以 Three.js 程序化构造六只纸蝶；最终记录为 `mixed`，没有发起第二批素材。
- 尝试使用：一个方向、一批素材、一次构建、一次确定性修复、零次视觉精修。
- 自适应证据：opening、core、mobile、interaction 四类检查点均绑定同一最终身份；视觉质量 91，WowGate 91，结论为 pass。
- 浏览器验收：纸蝶交付四状态与 V2 首页四流程共 8/8 通过；覆盖 2250ms 开场、真实指针编队、选择/加入、390px、reduced-motion 与强制 WebGL fallback。
- 工程验收：R120 路由与证据 5/5 通过，TypeScript 通过，Pages 构建通过。相邻回归 60 项中 59 项通过；完整单测为 515/522。其余 7 项由两个既有问题簇构成：2 项 dedicated-code 测试临时 `build-report.json` 目录竞态，5 项旧主题路由/素材契约回归（植物标本、阳台晾晒/地图与档案、榫卯可选环境）。这些不影响 R120 最终身份与浏览器结果，已进入下一阶段跨主题稳定性清单，不扩大进本阶段。

证据文件：

- `docs/v2-research/evidence/r120-paper-butterfly-garden.direct-creative-run.json`
- `tests/v2-r120-paper-butterfly-evidence.test.ts`
- `.artifacts/r120-paper-butterfly-garden/01-desktop-opening.jpg`
- `.artifacts/r120-paper-butterfly-garden/02-desktop-formation.jpg`
- `.artifacts/r120-paper-butterfly-garden/03-desktop-selected-joined.jpg`
- `.artifacts/r120-paper-butterfly-garden/04-mobile-reduced-fallback.jpg`

## 阶段结论

R120 已证明 V2 能根据内容选择“明亮、单一持续舞台、多对象空间探索”形态，而不是再次生成参数工作台、三屏长页或暗色中央主体。它已经作为第 12 个已验证示例接入 V2 首页。

当前边界也被保留：纸蝶属于风格化概念对象，足以验证空间对象场与真实交互，但不等于真实展品级三维模型。下一阶段优先提高参考相关性、关键主体素材质量和跨主题回归完整度，不继续对本案例无限精修。
