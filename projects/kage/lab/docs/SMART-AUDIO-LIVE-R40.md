# R40 智能声音产品真实生成验收

## 交付契约

- Entry mode：brief-led / live validation
- Request revision：R40
- Target user and context：用一句自然语言想法生成沉浸式 Three.js 发布网页的独立创作者。
- Desired first impression：安静、克制、具有真实产品感；先感知声音的空间与材质，再理解能力，最后自然进入行动。
- Visual ambition：Immersive
- Experience architecture：Hybrid Workspace。工作台只负责输入、真实进度和结果入口；专属页面承担完整沉浸式叙事。
- Visual anchor：透明冷银声学设备；滚动中从完整主体过渡到声场/结构解释，再收束为明确 CTA。
- Visual constraints：不得退化为通用紫色科技粒子、简单球体/圆柱占位、矩形贴图或卡片堆叠；主体与背景需要通过 Alpha、光场、景深和 Three.js 空间层融合。
- Information constraints：开场标题、核心能力和最终行动都要可读；Three.js 不能遮挡语义内容。
- Operation constraints：一次主按钮完成素材选择、Codex 构建、四状态浏览器验收；最多再做一轮有截图证据的定向精修。
- State constraints：opening、middle、final、390px mobile 均需可见、可滚动、无阻断错误；reduced motion 保留信息与行动。
- Environment constraints：`http://127.0.0.1:8143`，desktop 1440×900，mobile 390×844，Chrome + WebGL。
- Primary journey：输入当前智能声音产品描述 → 点击生成最佳网页 → 使用已有高质量声学主体素材 → Codex 生成独立 bundle → 自动视觉精修 → 打开最终最佳页。
- Required artifacts：最终可运行 URL、最终桌面 opening/middle/final 与 mobile 证据、模型/素材/耗时记录、唯一最佳案例决策。
- Autonomy authorization：用户已确认直接执行本次真实生成与验收；可使用现有 Codex CLI 和项目内已登记素材。
- User-decision boundary：新增付费服务、改变产品目标或覆盖用户素材才需要新授权；本次不调用 MiniMax，因为已有更匹配的 ChatGPT 透明声学主体。
- Observable completion criteria：模型解释和专属 bundle 均真实完成；素材在运行代码中被引用；最终机械与独立视觉验收均通过；结果不逊于当前声音产品最佳版本；同一目标只保留一个最佳案例。

## 路由决策

- Selected pattern：DOM + WebGL scroll story / cinematic product showcase。
- Evidence branch：R27 素材驱动声音产品终版与 R35/R36 双重视觉门禁。
- Required inputs：当前 brief、`acoustic-resonance-instrument-v1` 透明主体、Codex 5.6-sol。
- Expected output：一个独立、可滚动、可移动端阅读的声音产品发布页，而非工作台内的模板演示。
- What should update the skill：仅当本次真实运行证明某个可复用的素材选择或视觉门禁规则时记录，不扩展新能力。

## 覆盖记录

| 用户阶段 | 要求 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 生成 | 当前 brief 真实进入模型链路 | workbench / Codex | `job-611a5802bf40f4ed`、provider、model、run id | 1/5 | pass | 5.6-terra 解释，5.6-sol 构建与视觉精修 |
| 素材 | 使用匹配的正式声学主体 | asset route / runtime | catalog、bundle、浏览器画面 | 2/8 | pass | 复用 1 个 ChatGPT 透明主体，跳过 MiniMax |
| 页面 | 形成完整滚动叙事而非占位 demo | opening/middle/final | 三张桌面截图与 DOM 状态 | 2/3/5 | pass | 三段文案、产品位移/尺度和终局 CTA 均成立 |
| 跨端 | 移动端和 reduced motion 可用 | 390×844 | 截图、overflow、ready 状态 | 7 | pass | ready、Canvas=1、overflow=0、标题与 CTA 可读 |
| 筛选 | 同一目标只保留最佳版本 | generated run / case | 与 `dedicated-5dfdc4d0650e` 对照记录 | 9 | pass | 新版替换旧版成为目录中的唯一声音案例 |
| 交付 | 可复现且可直接打开 | project | URL、报告、无阻断错误 | 9 | pass | 生成页、案例页、报告和最终证据均已落盘 |

## 视觉方向

| 决策 | 选择 | 可观察约束 | 验收标准 |
| --- | --- | --- | --- |
| 构图 | 以一个声学主体和大尺度负空间建立电影感 | 首屏不能出现互相争抢的多个主体 | 第一眼能辨认产品与主要文案 |
| 材质 | 冷银、透明膜、微弱暖色共振核心 | 禁止硬矩形图框和无来源占位物 | 主体边缘与背景连续融合 |
| 深度 | 产品、声场环、信号层和 DOM 文案分层 | WebGL 不遮挡文本，背景不成为独立画框 | 滚动时空间关系清晰变化 |
| 运动 | pointer 为轻微视差，scroll 为主时间线 | 不做追鼠标漂移；reduced motion 保持语义 | 中段变化可感知，结尾能稳定停留 |
| 信息 | 情绪 → 核心能力 → 行动 | 每屏只保留一个主阅读任务 | 首中尾均有清晰阅读焦点 |

## 运行结果

### 真实调用

- 任务：`job-611a5802bf40f4ed`
- 目标解释：`gpt-5.6-terra`
- 专属 bundle 与视觉精修：`gpt-5.6-sol`
- 素材路线：`catalog`；使用 `acoustic-resonance-instrument-v1`，没有调用 MiniMax。
- 首版：`dedicated-ed4b7348709a`
- 最终精修版：`dedicated-1edb98865f4c`
- 总耗时：660 秒。目标理解约 62 秒；首版专属代码约 156 秒；四状态截图、独立视觉判断与精修约 422 秒。
- 本地编译：首版 1410ms；终版 757ms。耗时主体是模型生成与四截图视觉判断，不是 Three.js 或 TypeScript 编译。

### 浏览器验收

- 机械验收：首版 100，终版 100；opening、middle、final、390px mobile 均 ready，Canvas=1，overflow=0，浏览器错误=0。
- 独立视觉验收：`pass / 92`，素材角色为 `dominant`，无 major finding。
- 首版被修订的原因：末段遮罩和主体位置使产品弱化；quality=low 移动端跳过正式素材，只显示程序化圆环。
- 终版修正：所有质量档加载正式素材；终局维持产品—标题—CTA 聚合；移动端放大并上移主体；保留透明边缘、WebGL 回退、reduced motion 和完整生命周期。
- 最终证据：
  - `evidence/r40-smart-audio-live/desktop-opening.png`
  - `evidence/r40-smart-audio-live/desktop-middle.png`
  - `evidence/r40-smart-audio-live/desktop-ending.png`
  - `evidence/r40-smart-audio-live/mobile-reduced.png`
  - `evidence/r40-smart-audio-live/report.json`

### 唯一最佳案例决策

新版本相对旧版 `dedicated-5dfdc4d0650e` 提升了产品尺度、首屏标题层级、中段能力解释和最终 CTA 的聚合度。旧版仍留在内部运行目录用于回溯，但已从精选目录移除；公开案例目录对这个 brief 只保留：

`/cases/dedicated-1edb98865f4c/?quality=high&motion=full`

本轮范围到此关闭：没有继续增加模型、模板或案例数量。

### 工程闭环

- 全量单元测试：36 个测试文件、111 个测试全部通过。
- 生产构建：通过；保留已有的 Vite extensionless import 与大 chunk 提示，没有新增阻断错误。
- 归档案例浏览器实测：HTTP 200、`generatedReady=true`、Canvas=1、overflow=0、浏览器错误=0。
- 为控制证据规模，已删除本轮临时的生成前截图和旧版对比截图目录；只保留最终工作台、首中尾、移动端、联系图和 JSON 报告。
