# Reverse Skill 架构研究页 · 设计契约

- Entry mode: Brief-led
- Request revision: 1
- Target user and context: 想理解 `reverse-skill`，但暂时不准备安装或执行安全工具的中文读者；主要在桌面浏览，也需要在平板和手机上查阅。
- Desired first impression: 先看懂“它是什么”，再逐层进入路由、Skill 和安全知识；清晰、克制、可信，不使用夸张的黑客视觉。
- Visual ambition: Editorial
- Experience architecture: Editorial Flow
- Visual constraints: 浅色阅读底为默认，深色主题可切换；中文正文保持舒适行宽；用蓝绿表示架构/逆向，用琥珀表示安全边界；动画只服务状态变化。
- Information constraints: 必须覆盖总体架构、PRIMARY 调度、工具与证据闭环、44 个索引 Skill 的能力/意义/调度条件，以及逆向与网络安全知识地图；清楚区分“仓库自述”和“研究判断”。
- Operation constraints: 静态 GitHub Pages；无后端、无登录、无第三方运行时依赖；支持目录跳转、Skill 搜索/分类筛选、知识地图切换、主题切换。
- State constraints: Skill 列表需有全部、逆向、进攻、检测与取证、平台安全、编排与交付分类；无结果状态可见；按钮具备选中、悬停和键盘焦点状态。
- Environment constraints: 复用现有 `docs/` 静态站点和 `styles.css` / `project.css`；页面位于 `docs/projects/reverse-skill.html`。
- Primary journey: 打开页面 → 用一句话理解项目 → 看懂六层架构与调度链 → 按领域浏览/搜索 Skill → 进入逆向与网络安全知识地图 → 理解边界和采用建议。
- User-defined phases: 总体架构；具体 Skill 控制；全部 Skill 能力目录；逆向与网络安全知识地图；舒适清晰的 UI。
- Required artifacts: 研究 README、展示 HTML、专属 CSS、交互 JS、站点索引入口、浏览器验收记录、交接说明。
- Autonomy authorization: 用户明确要求“帮我用网页的方式整理”，允许在现有研究仓库内直接实现可逆的前端与文档改动。
- User-decision boundary: 不安装或执行 `reverse-skill` 安全工具；不对任何真实目标开展安全操作；不引入后端或外部服务。
- Observable completion criteria: 页面无需构建即可运行；44 个 Skill 全部可检索；架构与知识地图在 1440px、768px、390px 无遮挡；主题切换、筛选和键盘路径可用；减少动态偏好下无非必要动画。

## 设计方向

| 决策 | 选择 | 可观察约束 | 验收标准 |
| --- | --- | --- | --- |
| 信息层级 | 定义 → 架构 → 调度 → Skill → 知识地图 → 边界 | 首屏只回答“是什么”和“怎么工作” | 首次浏览不需要先理解工具名 |
| 排版 | 窄正文 + 宽图谱；标题、解释、证据三种文字角色 | 正文行宽约 68–76 个中文字符 | 长段阅读不横跨整屏 |
| 色彩 | 纸白/墨黑基础；青色=架构与逆向；琥珀=授权与风险 | 不依赖颜色单独表达分类 | 标签同时提供文字名称 |
| 组件 | 流程图、层级板、可筛选 Skill 目录、知识路径 | 卡片只承载可比较字段 | 每张 Skill 卡固定显示能力、意义、调度 |
| 响应式 | 桌面双栏/三栏，平板两栏，手机单栏 | 导航和筛选不产生横向溢出 | 390px 可完成完整阅读与筛选 |
| 动效 | 主题、筛选、展开的短过渡 | `prefers-reduced-motion` 下关闭 | 信息不依赖动画出现 |
