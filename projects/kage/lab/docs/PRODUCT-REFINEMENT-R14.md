# Product Refinement R14 — Idea to Best Experience

## Design contract

```text
Entry mode: revision-led implementation
Request revision: R14
Target user and context: 不熟悉 Three.js、只想表达网页目标的独立创作者与产品设计者
Desired first impression: 这是一台把想法直接变成完整网页的创作工具，而不是 Three.js 参数控制台
Visual ambition: Immersive
Experience architecture: Hybrid Workspace
Visual constraints: 最终网页预览是视觉中心；工作台克制、安静，不与生成结果争夺注意力
Information constraints: 主界面只解释输入、生成状态、最佳结果和一句话修订；Provider、候选、素材与工程产物折叠
Operation constraints: 主要旅程只需要一次描述、一次生成；系统内部比较候选并自动选出当前最佳结果
State constraints: idle、generating、ready、error 必须有清晰且可恢复的反馈
Environment constraints: Vite + TypeScript + Three.js；桌面、平板、390px 手机；语义 DOM 与 reduced-motion 保持可用
Primary journey: 描述目标 → 生成 → 直接查看最佳网页 → 一句话修改或打开完整网页
User-defined phases: 明确目标；生成/选择素材；构造最终效果；按结果继续调整
Required artifacts: 可运行工作台、自动候选选择、真实内嵌预览、桌面/移动证据、构建与测试结果
Autonomy authorization: 用户明确“继续”，允许在现有项目内完成可逆的产品收口实现与验证
User-decision boundary: 新的付费 API、发布到外部环境、引入需要授权的真实品牌/产品资产
Observable completion criteria: 首屏没有候选卡和工程控制干扰；生成后自动显示一个最佳结果；高级信息仍可检查；桌面和手机主旅程可完成
```

## Experience architecture

- Scene base: 生成页面自身的 WebGL + 语义 DOM，通过同源 iframe 作为持续预览舞台。
- Scene persistence: 桌面端生成舞台保持在主视区；移动端转为输入在前、结果紧随其后的单列流。
- Foreground controls: brief、生成按钮、状态、打开成品和一句话修订。
- State-to-scene mapping: idle 显示等待创作；generating 显示构建阶段；ready 显示自动选出的真实生成页；error 保留输入并提供重试。
- Fallback: 工作台本身不依赖 WebGL；生成页保留 semantic-dom 渲染路线。

## Coverage manifest

| User phase | Requirement | Surface / state | Evidence | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| 描述目标 | 单一明确输入与主要按钮 | Desktop / idle | Browser screenshot + DOM | 2–4 | continue | 重构首屏层级 |
| 生成 | 可理解的生成中反馈 | Desktop / generating | Interaction observation | 5–6 | continue | 实现阶段反馈 |
| 构造结果 | 自动选择并显示最佳真实网页 | Desktop / ready | Iframe runtime + screenshot | 5 | continue | 增加候选评分与自动预览 |
| 继续调整 | 一句话修订与打开成品 | Desktop / ready | Keyboard/click journey | 5 | continue | 收敛结果动作 |
| 高级检查 | Provider、候选、素材与工程信息不丢失 | Desktop / details | DOM observation | 3–4 | continue | 移入高级抽屉 |
| 跨端 | 手机无横向溢出且主旅程顺序正确 | 390×844 | Screenshot + DOM | 7 | continue | 移动端复查 |
| 可访问性 | 键盘焦点、状态播报、reduced-motion | Desktop/mobile | Browser observation | 7–8 | continue | 交互后验证 |
| 工程闭环 | 构建与相关测试通过 | Repository | build/test output | 9 | continue | 完成后执行 |

## Baseline evidence

- Canonical command: `npm.cmd run dev -- --host 127.0.0.1 --port 8143`
- Canonical URL: `http://127.0.0.1:8143/workbench.html`
- Baseline observed: 2026-08-25 Asia/Shanghai
- Baseline defect: 候选选择、Provider、质量基准 Demo、五步流程和工程按钮同时进入主视图，掩盖“描述后直接得到最佳网页”的产品目标。
- Baseline screenshot: external Codex evidence directory `kage-r14/baseline-desktop.png`.

