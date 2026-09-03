# V2 工作台内嵌预览 R57

## 设计契约

- Entry mode: Repair-led
- Request revision: R57
- Target user and context: 用户在工作台提交或恢复一个生成任务后，需要直接看到已经生成的网页，而不是面对黑色预览框再猜测是否成功。
- Desired first impression: 结果已经真实出现，并且可以在工作台内先检查，再按需打开完整网页。
- Visual ambition: Functional
- Experience architecture: Hybrid Workspace；工作台负责输入与状态，内嵌页面负责呈现生成效果，完整页入口继续作为独立查看方式。
- Visual constraints: 保留现有工作台布局、结果状态卡和生成页视觉；不重做生成页、不增加装饰层遮挡真实结果。
- Information constraints: 预览加载中、可用和失败必须可区分；失败时说明仍可打开完整网页，不能留下无解释黑框。
- Operation constraints: 只修复现有 iframe 装载、可见性和尺寸链路；不新增模型调用、生成任务或后台协议。
- State constraints: 覆盖 review-required 可运行页、加载中、加载失败；完整页链接始终与当前最佳结果一致。
- Environment constraints: `http://127.0.0.1:8143`；Chrome；1440×900 与 390×844；现有本地任务 `job-a25c897814be550b`。
- Primary journey: 打开带 Job 的工作台 → 看见当前结果状态 → 在 LIVE RESULT 内看见真实页面 → 打开完整网页。
- User-defined phases: 复现差异；修复内嵌链路；跨端与交互验证；记录结论。
- Required artifacts: 可复现基线、最小修复、桌面和手机浏览器证据、自动化测试、R57 记录。
- Autonomy authorization: 用户明确“继续”，授权在既有项目中完成下一项可执行修复。
- User-decision boundary: 不修改生成页设计与业务内容；不创建新主题或新任务；若根因要求改变生成页安全边界或后台协议才请求决策。

## 可观察完成标准

1. 独立生成页可见时，工作台 iframe 也显示同一个页面的真实首屏，而非纯黑区域。
2. iframe 的 URL、尺寸与可见状态可在浏览器中检查；加载失败时出现可理解的回退提示。
3. 桌面与 390px 手机均无横向溢出，完整页入口仍可用。
4. 至少验证一个内嵌页面交互或可见状态，不以 iframe 元素存在代替效果验收。
5. 不调用模型，不改变已有生成 bundle。

## 覆盖记录

| 用户阶段 | 要求 / 产物 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 复现差异 | 独立页与 iframe 对照 | desktop / review-required | 独立页与 `embed=1` 直接打开均可见；`sandbox=allow-scripts` 的工作台截图为黑框，DOM、Canvas 与网络均正常 | Stage 1 | pass | 已定位为 Chrome 不透明 sandbox origin 的绘制合成问题 |
| 修复链路 | 真实首屏在工作台可见 | embedded preview | 当前任务 `job-a25c897814be550b`：`data-preview-state=ready`，陶艺釉色页面真实绘制，iframe 内滚动由 0 到 414px | Stage 3/5 | pass | 使用 `allow-scripts allow-same-origin`，并保留生成代码静态能力门禁 |
| 失败回退 | 加载失败不留黑框 | embedded error | `workbench-embedded-preview-r57.spec.ts` 无 `#app` 的 404 夹具：显示“工作台预览未显示”，完整页入口仍可用 | Stage 6 | pass | 8 秒超时、load/error 与空输出统一进入可操作回退 |
| 跨端验证 | desktop / 390px / open link | workbench | 桌面与 390×844 均显示真实页面、无横向溢出；滑杆 32% → 61%，完整页链接可聚焦 | Stage 7 | pass | 已覆盖可见性、交互和键盘入口 |
| 工程闭环 | tests / build / record | repository | bundle 安全单测 4/4；R57 与任务回归 5/5；`npm run build` 通过 | Stage 9 | pass | R57 收口，不启动新模型任务 |

## 实现结论

- 根因不是生成页面、Three.js 或素材加载失败，而是 Chrome 在 `sandbox="allow-scripts"` 的不透明源 iframe 上产生了黑色合成结果。
- 工作台改为 `sandbox="allow-scripts allow-same-origin"` 后，当前真实生成页能在 iframe 中绘制和滚动。
- 同源能力只用于本地生成结果的可见渲染；生成 bundle 的静态门禁同步阻止 `parent`、`top`、`opener`、`frameElement`、`document.domain/defaultView`、网络、存储与动态执行能力。
- iframe 不再强制裁掉为单屏，生成网页可按自身产品结构滚动；工作台对加载中、成功和失败分别暴露 `data-preview-state`。
- 失败不会再留下无法解释的黑框：用户会看到明确提示，并仍可打开完整网页。

## 浏览器证据

- 当前真实结果：浅色陶艺学习工具页面，Three.js 杯体、釉方控件与模拟结果均可见；iframe `background=rgb(221, 213, 200)`，`scrollHeight=1105`、`viewport=592`、`scrollY=414`，控制台错误为 0。
- 自动化交互夹具：内嵌滑杆从 32% 调到 61%，输出同步更新；桌面与 390px 手机均通过。
- 自动化失败夹具：无应用挂载点的 404 页面进入 `failed`，提示完整页仍可单独打开。

## 停止边界

- 不创建 Generation Job，不调用 Codex 或 MiniMax。
- 不改 `generated/runs/dedicated-9535f6c5e73a` 的业务代码和视觉设计。
- 不引入新的 iframe 通信协议；优先修复当前 URL、显示和状态处理。
- 只保留最终必要证据，不归档调试截图。
