# Kage V2 恢复交接：能力、架构与下一阶段

日期：2026-08-27  
状态：R01–R07 本地恢复完成，等待统一归档；R08 尚未开始。

## 1. 本轮恢复结论

当前 V2 不是空白规划，也不是已经完成的自动建站产品。它已经实现：

```text
自然语言想法
  -> 有证据的参考选择
  -> 视觉职责和机制组合
  -> 交互含义与渲染路线
  -> 素材/回退/验收合同
  -> 自包含 Codex 构建输入
```

仍未实现：

```text
Codex 构建输入
  -> 自动生成一个专属网页
  -> 浏览器视觉/性能验收
  -> 限时局部修订
  -> 只保留最佳结果
```

## 2. 2026-08-27 验证基线

| 验证 | 结果 | 说明 |
| --- | --- | --- |
| `npm.cmd run build` | 通过 | TypeScript 与常规 Vite 构建通过 |
| `npm.cmd test` | 44 文件 / 139 测试通过 | V2 合同、导演、研究和能力选择包含在内 |
| `npm.cmd run build:pages` | 通过 | V1、V2 Composer、研究页和滚动原型进入独立 Pages 产物 |
| V2 Composer 浏览器专项 | 通过 | 梦境能力命中、GLB 错误路线拒绝、响应式状态通过 |
| V2 研究页浏览器专项 | 通过 | 证据筛选、详情和有边界组合通过 |
| Scroll-scrub 原型专项 | 通过 | 开场、中段、结尾、移动端通过 |

一次批量浏览器运行在 Composer 最后的全页截图处出现 Chromium `Unable to capture screenshot`；功能断言已通过，单独重跑完整通过。保留为测试工具偶发风险，不作为功能失败。

已知工程风险：

- Three.js Pages chunk 约 558 kB，gzip 约 140 kB；需要后续按路由延迟加载。
- 常规体验 chunk 约 651 kB，gzip 约 170 kB。
- 旧源码仍有无扩展名 import 的 Vite 前瞻警告。
- Pages 构建中的部分 V1 素材路径留到运行时解析。
- 本地 R01–R07 代码、文档、证据和测试尚未统一提交。

## 3. 当前演示入口

启动：

```powershell
cd E:\0823_codex_project\projects\kage\lab
npm.cmd run dev -- --host 127.0.0.1 --port 8143
```

入口：

1. `http://127.0.0.1:8143/pages/v2/`  
   输入想法，查看完整创意合同、参考证据、视觉机制、交互含义、渲染路线、素材职责和验收边界。
2. `http://127.0.0.1:8143/pages/v2/research/`  
   查看 MotionSites 首批案例、原理原子、证据等级、创意组合、冲突和禁止推断项。
3. `http://127.0.0.1:8143/pages/v2/prototypes/scroll-scrub-media/`  
   查看第一项 E4 运行能力：固定全屏连续媒体、语义 DOM、阻尼滚动、移动端与低动效回退。

建议演示顺序：

```text
研究页：什么是好、证据是什么
  -> Composer：新想法如何获得有边界的方向
  -> 原型：被选能力是否有真实运行证据
```

## 4. 当前能力图

### 参考理解

- MotionSites 首批 34 / 462 条公开条目已结构化。
- 13 个原理原子按 E1–E4 分级。
- 四个创意组合带证据上限和冲突检查。
- Downloads 中 52 个 HTML 已分类为晋级、保留、技术实验或排除。
- 案例信息与实现事实分离；缩略图和标题不能直接晋级能力。

### 体验导演

- 从 brief 提取主体、受众、感受、变化和行动。
- 选择环境、独立主体、信息证据、空间对象或程序场作为核心视觉职责。
- 最多组合三个机制，记录每项的工作、理由、证据和来源。
- 把滚动、指针、触摸、键盘和直接导航作为语义输入，而不是统一装饰。
- 明确拒绝不适用机制，防止 Codex 在生成时重新引入。

### 技术路由

- `dom-only`
- `dom-media-hybrid`
- `dom-canvas-hybrid`
- `dom-three-hybrid`

选择目标是“最小充分技术”，不是默认 Three.js。DOM 始终保留可读内容、行动和降级路径。

### 素材与验收

- 素材职责、连续性、安全区、裁切、移动端替代和可见证据进入合同。
- opening / middle / ending / mobile / reduced-motion 是独立验收状态。
- 缺少真实模型时拒绝 3D 拆解，不用占位几何伪装。
- 一个目标只输出一个主结果，最多有限局部修订，只归档最佳结果。

### 已验证运行能力

`scroll-scrub-media` 已达到 E4：

- 三个连续环境状态；
- 全屏媒体层与语义 DOM 分离；
- 滚动进度加 0.12 阻尼；
- 无可见矩形主图边界；
- 390px 移动端与 reduced-motion；
- 可寻址状态与 Playwright 证据。

真实 GLB 产品展示、交互发现、身份/品牌证明目前仍是候选或局部证据，不能称为正式生成能力。

## 5. 整体目标架构

```text
Creative Brief
  -> Intent Interpreter
  -> Reference Intelligence
       source catalog
       local exemplars
       evidence levels
       reusable principles
  -> Experience Director
       primary visual role
       narrative beats
       mechanism composition
       rejected mechanisms
  -> Asset Contract
       visual responsibility
       continuity / safe area
       quality / license / fallback
  -> Capability Router
       DOM / media / Canvas / Three.js
       device and performance gates
  -> Authoring Packet
       self-contained Codex request
       prohibitions and acceptance
  -> Dedicated Builder                 [next product gap]
       generate one page
       integrate real assets
       preserve semantic DOM
  -> Runtime + Browser Evidence        [partly inherited from V1]
       desktop / mobile / reduced motion
       loading / errors / performance
  -> Bounded Review Loop               [next product gap]
       mechanical checks
       visual judgment
       one focused revision
  -> Best Result Archive
```

核心边界：参考库负责提高决策质量，不负责复制页面；导演层负责限制无效探索，不决定固定版式；Codex 负责当前目标的创造性实现；浏览器证据负责证明，而不是用形式化分数替代审美判断。

## 6. 下一阶段顺序

### R08-A：研究队列和代表性覆盖

先把下一批分成三个能力缺口：

1. 真实空间对象；
2. 交互即信息；
3. 身份与证明。

每项只保留代表案例、当前证据、下一问题、晋级/保留/排除状态。目标不是扩大案例数量，而是知道研究缺口在哪里。

### R08-B：一次只完成一个 E4 原型

优先验证“交互即信息”，因为当前已有本地案例证据，且不依赖尚未具备许可与质量门的 GLB。验证内容：桌面指针、触摸替代、键盘路径、reduced-motion、信息发现前后状态。

真实 GLB 路线排在其后；只有获得项目可用的 L3+ 模型、明确许可和资产预算后才启动。

### R09：单结果专属构建

把 Composer 的 authoring packet 连接到 Codex 构建器：一个 brief、一个目录、一个可运行页面、一个可回放构建记录。禁止先生成多个次优页面再筛选。

### R10：限时评审与 V1 对照

固定比较同一批 brief 的：首次可见结果时间、模型耗时、返工轮次、素材实际使用、移动端、最终记忆点和主观视觉结论。验证 V2 是否真正减少无效探索。

## 7. 立即动作与停止条件

立即动作：先归档并提交当前 R01–R07 基线，再开始 R08-A；不得让后续原型混入未提交基线。

停止条件：

- 一轮研究超过一个代表原型时停止扩张；
- 缺少真实素材或许可时停止 3D 产品路线；
- 没有 opening/middle/ending/mobile/reduced-motion 证据时不晋级 E4；
- 视觉问题无法用一条具体修订描述时，不启动开放式模型重做。

