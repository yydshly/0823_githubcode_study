# Reverse Skill 网页最终覆盖记录

> 本文件是 `coverage.md` 的验收后终态记录；初始清单保留为实施前基线。

| 用户阶段 | 要求或产物 | 表面 / 状态 | 证据 | 结果 |
| --- | --- | --- | --- | --- |
| 总体架构 | 六层架构与端到端工作流 | 桌面/移动 | 真实浏览器截图；1440px 与 390px 无横向溢出 | pass |
| Skill 控制 | 路由计分、PRIMARY、scope、tool-index、Evidence 闭环 | 桌面/移动 | 浏览器语义快照包含完整标题、流程和调度表 | pass |
| Skill 目录 | 44 个 Skill 的能力、意义、调度条件 | 全部/分类/搜索 | DOM=44；Ghidra 搜索=1；逆向分类=15；live count 同步 | pass |
| 知识地图 | 逆向、安全及二者关系 | 三个知识视图 | 标签点击和 ArrowRight 均切换至安全生命周期面板 | pass |
| 阅读体验 | 浅色/深色、清晰层级与合理密度 | 双主题 | 浅色桌面/手机和深色知识地图截图 | pass |
| 响应式 | 桌面、平板、390px 手机 | 1440/768/390 | 三视口 `scrollWidth = clientWidth`；平板 Skill 单列 | pass |
| 可访问性 | 跳转、焦点、按钮语义、减少动态 | 键盘/Reduced motion | Tab 顺序：跳转链接→品牌→主题→主操作；焦点 outline=solid；CSS 含 reduced-motion | pass |
| 研究记录 | 项目 README 与来源边界 | 文件 | `projects/reverse-skill/README.md` | pass |
| 页面资源 | HTML、CSS、JS | 本地 HTTP | HTML/CSS/JS 均返回 200/304；无框架错误覆盖层 | pass |
| 站点接入 | Pages 展示页面 | 直接页面路径 | `/projects/reverse-skill.html` 返回 200 | pass |
| 根索引入口 | 首页和仓库索引卡片 | README / Pages 首页 | 已追加 Reverse Skill 项目行、阅读入口与首页卡片 | pass |

## 发布结论

核心架构、44 个 Skill、知识地图、阅读引导、仓库索引和 Pages 首页入口均已覆盖。本阶段没有影响发布的延期项；后续只在出现明确授权任务时，按需补充单项工具实战。
