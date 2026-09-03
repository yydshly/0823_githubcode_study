# V2 工作台质量状态 R56

## 设计契约

- Entry mode: Repair-led
- Request revision: R56
- Target user and context: 用户从工作台提交想法后，需要立即理解系统在做什么、当前结果是否可用、检查通过了什么，以及为何停止。
- Desired first impression: 工作台是清晰的创作控制台，不是内部日志页；用户先看到当前结论，再按需理解检查证据。
- Visual ambition: Functional
- Experience architecture: Editorial Flow；左侧继续负责想法输入，右侧预览上方承载生成阶段与质量结论。
- Visual constraints: 延续现有深色工作台、绿色强调和紧凑状态卡；不重做页面、不增加大面积面板、不把技术堆栈暴露给用户。
- Information constraints: 使用用户语言显示“生成、结构检查、视觉判断、是否精修、最终结果”；原始异常栈、模型内部输出和文件路径不进入主界面。
- Operation constraints: 只读取现有 `GenerationJob` 数据；不新增 API、不调用模型、不改变生成或验收结果。
- State constraints: 覆盖进行中、完成、待评审和失败；待评审必须同时说明“当前网页可查看”和“为什么没有进入最终案例”。
- Environment constraints: `http://127.0.0.1:8143/workbench.html`；桌面 1440×900 与手机 390×844；现有服务 8143。
- Primary journey: 查看结论 → 看懂已完成检查和停止原因 → 打开当前网页；不需要理解内部阶段编号。
- User-defined phases: 捕获现状；增加可读状态；跨端验收；记录结论。
- Required artifacts: 工作台状态组件、review-required 浏览器证据、移动端证据、自动化测试、R56 记录。
- Autonomy authorization: 用户已明确“确定并继续”，授权在现有工作台内实施。
- User-decision boundary: 不改变生成网页视觉、不重新评审 R54、不创建新任务；若需要新的产品动作才请求决策。

## 可观察完成标准

1. `review-required` 时首屏可看见“网页已生成、当前为待评审、可打开结果”。
2. 显示四类用户可理解的检查项：网页运行、交互/结构、视觉质量、精修结论；不得伪造不存在的分数。
3. 超时或门禁停止时显示简短原因，不展示调用栈或内部路径。
4. `complete`、进行中和失败状态仍能得到正确文案，不受 R54 专用逻辑限制。
5. 桌面与 390px 手机无横向溢出，现有想法输入和预览入口可用。

## 覆盖记录

| 用户阶段 | 要求 / 产物 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 目标锁定 | 本契约与有限边界 | 文档 | 文件 | Stage 0 | pass | 捕获基线 |
| 捕获现状 | R54 待评审状态 | desktop/mobile | 截图 + DOM | Stage 1/6 | pass | 结论原本埋在多层技术状态之后，移动端尤为明显 |
| 状态实现 | 结论、检查、原因、结果入口 | workbench result panel | DOM + tests | Stage 3/6 | pass | 复用现有验收区，在结果列顶部显示紧凑状态卡 |
| 状态回归 | complete/running/review-required/failed | fixture states | unit + browser tests | Stage 6 | pass | 不伪造分数；有可运行页时保留入口，没有结果时不声称已生成 |
| 跨端验收 | desktop/390px/keyboard | workbench | browser | Stage 7 | pass | 1440/390 均无横向溢出；手机端入口可见并可聚焦 |
| 工程闭环 | 测试、构建、记录 | repository | command + doc | Stage 9 | pass | 252 个单元测试、4 个工作台浏览器测试和生产构建通过 |

## 停止边界

- 不创建生成 Job，不调用模型。
- 不修改生成页 bundle。
- 不新增后台协议；只消费已有 Job 字段。
- 只增加一个紧凑状态区域和必要样式。

## 实现结论

- 工作台现在先显示用户结论，再显示 V2 约束、交付路线与真实耗时；内部信息仍保留，但不再抢占第一判断。
- `review-required` 被明确解释为“网页已经生成、可以查看，但视觉判断未完成”；时间上限会被转换成用户语言，并明确系统已经停止，不会无限重试。
- 四项状态分别是网页生成、结构与交互、视觉质量、精修结论；分数缺失时显示“未得出最终结论”，不使用占位分数。
- 同一状态渲染器同时服务主工作台轮询与专属页面恢复，刷新后不会回退到旧文案。

## 验证证据

- 真实任务：`job-a25c897814be550b`，状态 `review-required`，结果入口 `/generated-runs/dedicated-9535f6c5e73a/`。
- 桌面 1440px：结果卡位于右侧第一块，高 231px，无横向溢出，无浏览器错误。
- 手机 390px：结果卡位于输入区之后，高 370px，四项状态采用 2×2 排列，入口可见、可键盘聚焦，无横向溢出。
- `npm test`：64 个测试文件、252 个测试通过。
- `npx playwright test e2e/v2-workbench-main-loop.spec.ts`：4/4 通过。
- `npm run build`：TypeScript 与 Vite 生产构建通过；仅保留项目既有的扩展名和 bundle 大小警告。
