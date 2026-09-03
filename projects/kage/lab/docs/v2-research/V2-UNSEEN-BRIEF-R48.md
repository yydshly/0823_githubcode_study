# V2 未见主题端到端验证 R48

## 设计契约

- Entry mode: Brief-led validation
- Request revision: R48
- Target user and context: 陶艺创作者在一个网页工作区内试验釉料比例和烧成温度，观察同一器物表面变化并保存配方。
- Desired first impression: 明亮、安静、像真实材料实验桌；首先看到可信陶瓷器物与釉面，而不是通用科技背景。
- Visual ambition: Immersive + Functional
- Experience architecture: Spatial Stage；同一陶瓷器物持续可见，参数控件与结果证据位于前景工作区。
- Scene base: WebGL / Three.js；DOM 提供完整参数、状态和保存操作。
- Scene persistence: 从初始配方、调节、烧成结果到保存始终保留同一器物。
- Foreground control model: 可键盘操作的矿物比例、温度选择与保存配方行动。
- State-to-scene mapping: 初始素坯 → 釉色混合 → 烧成变化 → 配方完成。
- Mobile transformation: 紧凑控制面板；器物仍可见，不能退化成长篇三屏页面。
- Fallback: 无 WebGL 或 reduced-motion 时保留配方参数、结果文字和保存操作。
- Visual constraints: 日光中性、陶土与矿物色；不要暗色科技风、随机粒子、巨大标题、固定 hero/process/final 三屏。
- Information constraints: 只展示理解当前配方所需的成分、温度、釉面状态和最终操作。
- Operation constraints: 一个候选、现有 Codex 构建、最多一次精修；不调用 MiniMax、不新增外部素材。
- Environment constraints: `http://127.0.0.1:8143`；桌面 1440×900、390×844、键盘、reduced-motion、WebGL fallback。
- Primary journey: 调整配方或温度 → 同一器物即时变化 → 查看结果解释 → 保存配方。
- Required artifacts: 专属生成运行、质量结论、桌面/交互/手机/回退证据、是否归档决定、研究记录。
- Autonomy authorization: 用户已明确“继续”，可直接完成本项目内可逆验证。
- User-decision boundary: 不发布远端、不增加付费服务、不自动进入精选案例。

## 验证 brief

> 为一间面向独立陶艺创作者的釉色实验室设计交互网页。保持同一只未烧制的陶瓷器物始终可见，用户调整氧化铁、长石和灰釉比例，并选择烧成温度时，器物表面的颜色、光泽、细裂纹和流釉边界要产生有因果的变化；同时更新配方数值和结果解释，最后行动是“保存这份釉色配方”。页面明亮、安静，像日光下真实的材料实验桌。不要暗色科技风、随机粒子、巨大标题或固定的三屏长滚动。

## 覆盖清单

| 要求 | 状态 / 页面 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- |
| 新主题结构选择 | 工作台规划态 | `job-c5e9c5c9f5d29057` 合同摘要 | Stage 0/1 | pass | 已从错误的 editorial-flow 修正为 material-transformation / interactive-field / DOM + Three.js |
| 专属网页生成 | Codex 构建态 | `dedicated-13c527949126` 与增量结果 `dedicated-67618f3d695c` | Stage 1/6 | pass | 1 次初始编译、1 次有边界的局部修订；无 MiniMax、无外部素材 |
| 参数交互因果 | 桌面交互态 | `.artifacts/r48-glaze-lab-refined/06-high-iron-1280.jpg` | Stage 4/5 | revise | 器物、结果文字和即时数值能同步变化；但三个百分比可合计为 152%，语义约束未成立 |
| 视觉与状态质量 | 初始态 / 高铁高温态 | `.artifacts/r48-glaze-lab-refined/01-opening.jpg` 与 `06-high-iron-1280.jpg` | Stage 6 | revise | 明亮实验桌与同一器物成立；材质差异仍偏克制，尚不足以成为精选最终案例 |
| 手机与回退 | 390px / reduced-motion / WebGL off | `05-mobile.jpg` 与 `07-fallback.jpg` | Stage 7/8 | pass | 无横向溢出；移动端安全区显著改善；无 WebGL 时保留稳定器物、控制和行动 |
| 是否归档 | 最终候选 | 本记录与运行证据 | Stage 9 | blocked | 不进入精选案例；保留为研究运行，先补“数值/汇总/主体同源状态”质量门 |

## 结论

这次验证证明 V2 已能把一个未见主题路由为产品需要的结构，并由 Codex 生成独立的 DOM + Three.js 工作区；它不再默认落入固定三屏或暗色电影式模板。结构纠偏耗时 7ms，专属代码模型约 135 秒，本地编译约 0.4 秒，主要耗时仍在模型生成与视觉修订。

本轮同时发现两类应沉淀到系统而不是继续手修案例的问题：

1. 运行时原先无法捕获同步 `mount()` 异常，导致 WebGL fallback 评审等待 30 秒后超时；已改为 Promise 链内挂载并增加回归测试。
2. 现有质量门能检查可见性、移动端、回退和视觉因果，却没有验证控件、显示值、合计值、解释和主体是否共享同一语义状态；已新增 `semantic-state-consistent` 验收约束。

## R49 系统闭环：可执行语义状态门

R48 暴露的语义缺口已经转为自动浏览器证据，而不再只是一条提示词约束：

- 视觉计划现在区分 `scroll-timeline` 与 `direct-state`。滚动叙事继续检查有效行程和时间线；釉色工作台这类直接操作产品不再被错误要求制造长滚动。
- `semantic-probe` 会真实改变页面中的范围输入、选择器或按钮，并比较操作前后的控件值、`data-value` 可见值、`data-total` 汇总值和结果反馈。
- 声明为百分比的总配比必须保持 100%；控件与对应显示值必须一致；操作必须产生可见结果变化。违反任一项会产生 `semantic-state-inconsistent`，候选只能进入 `revise`，不能归档为最佳案例。
- 旧的视觉计划若没有 `journeyMode`，按滚动时间线兼容读取，避免已有案例报告失效。

真实浏览器复验 `dedicated-67618f3d695c`：氧化铁从 18% 调到 40% 后，结果文案和显示值发生变化，但总配比从 100% 变为 122%。新门禁因此能够稳定识别该候选的语义矛盾；这正是该研究运行不进入精选库的原因。

该运行用于验证和暴露门禁缺口，不作为精选案例。下一次未见主题生成应直接继承新的结构路由、运行时错误边界和语义状态一致性约束。
