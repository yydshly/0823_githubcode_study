# Reverse Skill 架构研究页 · 交接

## 1. 项目与阶段

这是 GitHub Code Study 仓库中的 Reverse Skill 架构研究项目。Stage 9 已完成，页面本体和研究记录可以交付。

## 2. 已完成

- 一页式中文架构研究页面；
- 六层系统架构、确定性路由、Scope、工具平面和 Evidence→Finding→Path；
- 44 个 Skill 的能力、意义和调度条件；
- 搜索、五类筛选、结果计数和空结果；
- 逆向、安全生命周期、目标技术面三张知识地图；
- 浅色/深色主题、桌面/平板/390px 手机适配；
- 研究 README、设计契约与最终覆盖记录。

## 3. 发布接入

根 README、项目 README 索引和 Pages 首页均已增加 Reverse Skill 入口；项目 README 提供从 3 分钟结论到知识地图、Skill 检索和后续实战的阅读路径。

## 4. 验收证据

- JavaScript `node --check`：通过；
- Skill 静态条目：44；浏览器实际渲染：44；
- 搜索 `Ghidra`：1 个结果 `ghidra-reverse`；
- “逆向分析”分类：15 个结果，`aria-pressed=true`；
- 知识标签点击和 ArrowRight：面板与 `aria-selected` 同步；
- 主题切换：`data-theme=dark`，按钮文案与 pressed 状态同步；
- 1440px、768px、390px：无页面横向溢出；
- Tab 焦点顺序和可见 outline：通过；
- 服务器资源：页面、共享 CSS、专属 CSS、JS 均返回 200/304；仅浏览器默认请求的 favicon 为 404，不影响页面。

最终截图临时保存在 `.tmp/`，未作为产品文件提交：

- `reverse-skill-viewport.png`
- `reverse-skill-dark-knowledge.png`
- `reverse-skill-tablet-skills.png`
- `reverse-skill-mobile.png`

## 5. 后续触发条件

当前不需要继续深入。只有在出现明确的授权目标、隔离环境或具体安全任务时，再从相应 Skill 开始补充工具安装、运行证据与案例复盘。
