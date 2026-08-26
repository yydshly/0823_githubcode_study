# R19 · GPT-5.6 Sol 迁移与真实演示契约

## 设计契约

- Entry mode: revision-led implementation
- Request revision: R19
- Target user and context: 在工作台输入创意目标、希望直接看到非模板 Three.js 成品网页的创作者
- Desired first impression: 主按钮明确可见；生成回执明确显示 GPT-5.6 Sol；结果呈现一个完整、可滚动、可交互的先锋时装品牌页面
- Visual ambition: Immersive
- Experience architecture: Hybrid Workspace
- Selected pattern: DOM + WebGL scroll story
- Evidence branch: 当前先锋时装 brief 的未缓存 GPT-5.6 真实生成
- Visual constraints: 明确 hero 主体、空间结构变化、稳定最终构图；DOM 承载可读品牌叙事，WebGL 承载流体光幕与空间记忆
- Information constraints: 回执展示 provider、model、bundle、文件、编译、安全与运行时
- Operation constraints: 工作台真实点击；生成期间旧预览保留；成功后 sandbox 切换；失败可重试
- State constraints: ready、authoring、validating/repairing、compiled、failed 可辨认
- Environment constraints: 本地 Codex CLI `0.149.1`；`gpt-5.6-sol`；reasoning low；300 秒单次尝试；严格 TS、路径和网络白名单
- Primary journey: 当前 brief → 点击专属生成 → GPT-5.6 源码 → 校验/编译 → sandbox 舞台 → 打开独立页
- Required artifacts: 迁移配置、真实 bundle、桌面 opening/ending、移动端、工作台证据、测试和验证记录
- Autonomy authorization: 用户明确“确定并继续，并且要帮我演示效果”
- User-decision boundary: 本轮仍不虚构图片、GLB、音频和 MP4；素材模型接入需独立证据
- Observable completion criteria: provider 报告 `gpt-5.6-sol`；真实工作台点击产生新 bundle；回执模型正确；页面 ready、有 Canvas 和可读 DOM；滚动状态变化；390px 无溢出；控制台无阻断错误；回归和构建通过

## 验收结果

| 用户阶段 | 要求 | 结果 | 证据 |
| --- | --- | --- | --- |
| 迁移 | 默认和开发配置使用 GPT-5.6 Sol | pass | provider 返回 `gpt-5.6-sol`；CLI 升级到 `0.149.1` |
| 生成 | 从当前工作台真实点击生成 | pass | `dedicated-315a239d71bf`；`CODEX · GPT-5.6-SOL`；attempt 2 |
| 画面 | 独立页面形成可读 DOM + WebGL 故事 | pass | `DREAMIN MOTION`；1 Canvas；opening/ending 截图 |
| 跨端 | 390px、reduced motion 无溢出 | pass | 390×844；overflow 0；ready true |
| 安全 | sandbox、CORS 白名单、失败保留旧页 | pass | 回执 `SANDBOXED`；完整浏览器回归通过 |
| 工程 | unit、browser、build | pass | 61 unit；53 browser；production build |

## 真实生成回执

- Run: `dedicated-315a239d71bf`
- Model: `gpt-5.6-sol`
- Duration: 296 秒
- Bundle: 4 files
- Compile: 485 ms
- Runtime: Three.js + shader
- Desktop: 1440×900；scrollHeight 2716；scroll 0 → 1816；overflow 0
- Mobile: 390×844；scrollHeight 2548；overflow 0
- Browser errors: 0
- Evidence: `evidence/r19-gpt56-live`
