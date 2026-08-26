# R18 专属代码生成验证记录

## 结论

R18 已完成一条真实的 `自然语言 → Codex 独立源码 bundle → 安全检查 → TypeScript 编译 → sandbox iframe → 可交互网页` 链路。它不再只是把 brief 映射到已有 scene plugin。

## 真实模型证据

- Provider / model: Codex CLI / `gpt-5.4`
- 未缓存 brief: 先锋时装品牌、梦幻流体光幕、空间衣褶、滚动结构变化、鼠标牵引、清晰行动入口
- Bundle: `dedicated-538e5119c9a8`
- Files: `src/experience.ts`、`src/scene.ts`、`src/director.ts`、`src/page.css`
- Source: 24,566 bytes
- Attempts: 2；第一版未通过本地构建后自动重新生成，第二版通过
- TypeScript compile: 391ms
- Assets: 0；本轮明确只验证程序化 Three.js 代码生成，不虚构 GLB、音频或 MP4 能力

## 浏览器运行证据

- 直接路由：`/generated-runs/dedicated-538e5119c9a8/`
- Desktop 1440×900: HTTP 200、`data-generated-ready=true`、1 个 Canvas、无横向溢出
- Opening heading: `Light, cut into a moving garment.`
- Ending heading: `Clarity after the fold.`
- 滚动位置从 0 到 144；首尾截图 SHA-256 不同，证明最终像素画面发生变化
- Mobile 390×844 + reduced motion: ready、1 个 Canvas、无横向溢出
- 最终控制台错误：0
- 工作台组合验证：构建回执 `compiled`、iframe `sandbox="allow-scripts"`、真实 bundle heading 可读、控制台错误 0

证据文件：

- `evidence/r18-live/desktop-opening.png`
- `evidence/r18-live/desktop-ending.png`
- `evidence/r18-live/mobile-reduced.png`
- `evidence/r18-live/workbench-dedicated.png`

## 安全与失败路径

- 生成路径必须位于项目内 `generated/runs/<id>`；拒绝路径穿越和重复路径。
- 只允许 `three`、`three/*`、`@signal-lab/experience-sdk` 与局部相对导入。
- 拒绝外部网络、动态 import、额外 RAF、计时循环、存储、父窗口访问和运行时代码求值。
- 只有 bundle 校验和严格 TypeScript 编译都通过后才物化为可访问结果。
- 工作台生成失败时 iframe 地址不变，旧预览继续可用。
- Windows 超时会终止完整 Codex 进程树；5 秒故障注入后无 `signal-lab-dedicated` 子进程残留。
- sandbox 保持不透明源；仅对 `Origin: null` 且属于生成 bundle、生成 SDK、Vite 编译依赖的本地模块返回精确 CORS 许可。外部 Origin 和非批准路径不返回该响应头。

## 自动验证

- Unit: 23 files / 61 tests passed
- Browser baseline after R18 workflow: 51 tests passed
- R18 sandbox CORS focused: 2 tests passed
- R18 focused browser total: 5 tests passed
- Production: `tsc --noEmit && vite build` passed，159 modules transformed
- Known non-blocking warning: 既有 experience chunk 650.52kB，后续需要代码拆分；Vite 仍提示部分旧 TypeScript import 缺少扩展名

## 当前工作流判断

真实能力已经成立，但一次完成四文件 bundle 的交互延迟仍偏长：本次需要两次模型尝试。当前开发态使用 `low` reasoning，质量由严格提示合同、schema、TypeScript、sandbox 和浏览器验收共同保证。下一阶段应将同步长 HTTP 请求升级为带阶段事件的异步 job，向工作台实时暴露 `authoring / validating / repairing / compiled`，并允许只修复失败文件。
