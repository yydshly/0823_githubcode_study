# R17 能力保存与生成引擎升级契约

## 设计契约

- Entry mode: revision-led implementation
- Request revision: R17
- Target user and context: 在工作台中用自然语言生成 Three.js 网页、比较结果并保留可复用阶段成果的创作者
- Desired first impression: 当前结果可以被明确保存，保存后仍可继续探索，不会因为换方向而丢失
- Visual ambition: Immersive
- Experience architecture: Hybrid Workspace
- Visual constraints: 保留 R16 工作台层级；保存操作属于当前结果，不与“生成”争夺首要焦点
- Information constraints: 明确区分自动运行缓存、显式保存的能力版本与能力样例
- Operation constraints: 结果 ready 后才能保存；保存后可查看、继续生成或删除；键盘可达
- State constraints: empty、ready、saved、opened、storage-error 均有可读反馈
- Environment constraints: 首版使用浏览器 localStorage，不引入账号、数据库或外部 API
- Primary journey: 生成结果 → 保存当前能力 → 继续换方向 → 打开已保存能力 → 无模型调用重放原结果
- User-defined phases: 保存当前能力；继续实现专属网页生成架构
- Required artifacts: 保存按钮、已保存能力库、打开/删除流程、存储结构测试、浏览器证据、生成束接口
- Autonomy authorization: 用户明确要求“增加一个按钮，保存当前能力，继续实现我们的项目”
- User-decision boundary: 云同步、多人协作、永久服务端存储不在本轮范围
- Observable completion criteria: 桌面与 390px 手机可完成保存和打开；刷新后记录仍存在；当前预览和旧生成流程不回归；构建与相关测试通过

## 场景与回退

- Scene base: WebGL iframe + semantic DOM workbench
- Scene persistence: 保存与能力库操作期间保留当前预览；打开保存结果时加载对应生成 Manifest
- Foreground control model: 结果操作区中的保存按钮；顶栏中的已保存能力入口；模态能力库
- State-to-scene mapping: 保存不重载场景；打开保存结果时在新页重放；错误时保留原场景
- Mobile transformation: 能力库为全宽可滚动对话框，操作按钮两列排列
- Fallback: WebGL 不可用时仍可读取保存记录、brief、来源和生产边界

## 覆盖清单

| 用户阶段 | 要求 | 表面 / 状态 | 证据 | 阶段 | 状态 | 结果 |
| --- | --- | --- | --- | --- | --- | --- |
| 保存当前能力 | 保存按钮只在结果可用时启用 | ready / idle | DOM + interaction | 4-6 | pass | Playwright 验证 ready 后可用 |
| 保存当前能力 | 显式保存可运行上下文 | localStorage | unit test | 6 | pass | Manifest、brief、来源、seed、生产状态持久化 |
| 保存当前能力 | 查看、打开、继续生成、删除 | dialog / keyboard | browser | 5-7 | pass | 保存结果无需模型调用；继续生成复用 brief |
| 保存当前能力 | 桌面与 390px 手机无溢出 | 1440 / 390 | browser screenshots | 7 | pass | 两个视口均可操作 |
| 继续实现项目 | 定义专属网页生成束与安全边界 | source / docs | schema tests | 9 | pass | 必需文件、路径、源码预算、导入与网络门禁已验证 |
| 工程闭环 | 单元、构建、浏览器回归 | build / tests | command output | 9 | pass | 59 unit、48 browser、production build 通过 |

## 本轮边界

`GeneratedExperienceBundle` 已成为下一阶段模型代码输出的正式契约，但本轮没有把 Codex 输出直接写入工作区或执行。后续必须先接入 provider 输出、隔离物化、TypeScript 编译和独立预览路由，才能把 UI 标记为“专属代码生成”。

