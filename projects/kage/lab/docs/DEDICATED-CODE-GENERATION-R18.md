# R18 专属代码生成契约

## 设计契约

- Entry mode: revision-led implementation
- Request revision: R18
- Target user and context: 已经得到一个模型方向、但需要看到不同于注册场景模板的真实 Three.js 成品网页的创作者
- Desired first impression: 点击后能明确看到 Codex 正在写独立代码，成功时画面和回执都证明它不是原有 scene plugin 的换参结果
- Visual ambition: Immersive
- Experience architecture: Hybrid Workspace
- Visual constraints: 保留当前结果作为安全基线；专属代码预览取代舞台内容但不覆盖原保存记录；首个验收使用程序化资产，避免伪造真实产品
- Information constraints: 明确显示 provider、bundle id、文件数、源码大小、Shader、编译状态和安全边界
- Operation constraints: 只有 ready 候选可触发；生成期间不可重复提交；失败可重试且原预览不变；完整页在受控路由打开
- State constraints: unavailable、ready、generating、validating、compiled、failed 均有可读反馈
- Environment constraints: 本地 Vite/Codex CLI；生成文件只写入 `generated/runs/<bundle-id>`；禁止任意网络和越权路径
- Primary journey: 生成模型方向 → 构建专属网页 → Codex 返回文件束 → 白名单校验 → TypeScript 编译 → 沙箱预览 → 打开独立页
- User-defined phases: 继续实现项目；看到真正的专属网页生成效果
- Required artifacts: SDK、bundle provider、物化与编译器、预览路由、工作台控制、真实 Codex 证据、测试与文档
- Autonomy authorization: 用户明确说“继续”
- User-decision boundary: GLB、音频、MP4、云部署在后续独立切片；本轮不伪装这些能力
- Observable completion criteria: 至少一个未缓存 brief 由 Codex 返回 dedicated bundle；生成目录包含四个必需文件；TypeScript 校验通过；工作台 iframe 显示该 bundle；桌面与 390px 可操作；失败路径保留旧预览；全量回归通过

## Spatial Stage / Hybrid Workspace

- Scene base: 受 sandbox iframe 约束的 Three.js Canvas + 可读 DOM
- Scene persistence: 生成期间保留旧场景；bundle 完成后切换；失败不切换
- Foreground control model: 当前结果区的“用 Codex 构建专属网页”按钮与生成回执
- State-to-scene mapping: generating 保留原画面并显示状态；compiled 切换专属页；failed 保留原画面并显示原因
- Mobile transformation: 控制和回执单列；预览仍保持 4:5 舞台
- Fallback: bundle 页面自身必须有语义 DOM；WebGL 初始化失败时保留文字与行动信息

## 生成与安全边界

- 模型可决定：DOM 结构、WebGL 场景、几何、材质、Shader、灯光、镜头、滚动和鼠标导演逻辑、响应式 CSS。
- 系统固定：生命周期、帧状态、质量档、reduced motion、路径和导入白名单、源代码预算、TypeScript 编译、CSP、iframe sandbox、超时和失败恢复。
- 首个证据分支：程序化时装/流体或声学光场，不依赖虚假的 GLB、音频或图片。

## 覆盖清单

| 用户阶段 | 要求 | 状态 / 视口 | 证据 | 阶段 | 状态 | 结果 |
| --- | --- | --- | --- | --- | --- | --- |
| 专属生成 | Codex 返回独立四文件以上 bundle | live provider | `dedicated-538e5119c9a8` / API / 文件 | 1/9 | pass | 4 文件、24,566 bytes、attempt 2 |
| 安全构建 | 路径、导入、网络、预算、生命周期和 TS 编译 | valid/invalid | unit/integration | 8/9 | pass | 编译 391ms；非法 bundle 被拒绝 |
| 工作台 | ready 后可触发，成功切换沙箱预览 | desktop | browser + `workbench-dedicated.png` | 4-6 | pass | 真实 bundle 在 `allow-scripts` iframe ready |
| 错误恢复 | 生成或编译失败保留原预览 | failed | browser | 6 | pass | iframe src 不变且可重试 |
| 跨端 | 1440、900、390px 控件与预览无溢出 | desktop/tablet/mobile | browser / screenshots | 7 | pass | 桌面和 390px overflow=0 |
| 降级 | reduced motion 与无 WebGL 保留语义内容 | capability fallback | SDK / browser | 8 | pass | mobile reduce ready；语义 DOM 独立于 Canvas |
| 工程闭环 | 单元、构建、全量浏览器回归 | project | command | 9 | pass | 61 unit、51 browser baseline、2 sandbox CORS、build passed |

详细证据见 `docs/DEDICATED-CODE-GENERATION-R18-VERIFICATION.md`。
