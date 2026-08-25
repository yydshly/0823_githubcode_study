# Three.js 能力研究阶段归档交付契约

日期：2026-08-26

## 设计契约

- Entry mode：Revision-led；在既有研究平台上新增阶段归档与观看路径。
- Request revision：Phase 01 暂时收束，不继续扩张无必要的 3D 功能。
- Target user and context：当前研究团队、未来恢复研究的人、需要快速理解项目价值的评审者。
- Desired first impression：这一阶段已经形成证据链；用户能立即知道研究了什么、先看哪个页面、哪些结论成立、哪些方向仅是未来研究。
- Visual ambition：Editorial。
- Experience architecture：Editorial Flow。
- Visual constraints：沿用研究平台的深色技术控制面；归档页不加载 Three.js、视频或高成本视觉层。
- Information constraints：严格区分上游能力、研究扩展、已证明、部分证明、历史失败与未实施方向。
- Operation constraints：所有可启动页面有明确同源链接；历史失败实验没有启动链接；键盘焦点可见。
- State constraints：归档状态为 Phase 01 / Archived；项目不是终止，未来可按触发条件恢复。
- Environment constraints：本地 canonical runtime 为 127.0.0.1:4176；桌面 1440×900、移动 390×844；只支持深色主题。
- Primary journey：打开研究平台 → 进入阶段归档 → 按推荐顺序理解能力 → 可选择进入 3D 演示 → 返回研究平台。
- User-defined phases：整理当前研究；整理已有页面；补必要说明型演示；形成暂时阶段归档。
- Required artifacts：归档页、归档文档、阶段包、页面导航、浏览器报告、桌面与移动截图、README 索引。
- Autonomy authorization：用户已明确要求继续整理和归档，可直接实施可逆的项目内修改。
- User-decision boundary：不移动或删除现有研究成果；不新增真实资产、后端、外部发布或新的产品方向。

## 可观察完成标准

1. /research/archive 可直接打开，首屏明确显示归档状态、结论和推荐观看路径。
2. 页面列出当前正式页面、历史失败实验、研究文档、证据与扩展方向。
3. /research 可以进入归档页；归档页可以返回 /research。
4. 归档页不请求 Three.js、游戏主入口、地图或模型资源。
5. 1440px 与 390px 无横向溢出，主要链接至少 44px，reduced-motion 有效。
6. 页面支持键盘顺序访问并具有可见焦点。
7. 阶段包包含冻结说明、最终报告副本、来源路径与 SHA-256 清单。
8. 静态审计、归档页浏览器验收和既有研究平台注册表审计通过。

## 覆盖清单

| 用户阶段 | 要求或产物 | 表面/状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 整理当前研究 | 能力、意义、边界总结 | 归档文档 | `analysis/phase-01-stage-archive-2026-08-26.md` | 3 | pass | 已完成 |
| 整理已有页面 | 页面目录与观看顺序 | 归档页桌面 | `evidence/research-archive/01-desktop-archive.png` | 3 | pass | 已完成 |
| 做必要演示 | 说明型导航进入既有 3D 路线 | 页面链接 | `archive-browser-report.json` 的 4 条同源路线 | 5 | pass | 已完成 |
| 阶段归档 | Phase 01 状态与恢复条件 | 归档首屏 | 桌面与移动完整截图 | 2 | pass | 已完成 |
| 阶段归档 | 归档包和哈希清单 | archive 目录 | 14 个文件、14 项 SHA-256 校验 | 9 | pass | 已完成 |
| 研究入口 | /research 进入归档 | 桌面和移动 | `researchNavigationWorks: true` | 5 | pass | 已完成 |
| 跨表面 | 移动布局和触控目标 | 390×844 | 无横向溢出，链接高度均为 44px | 7 | pass | 已完成 |
| 可访问性 | 键盘焦点与语义 | 桌面键盘 | 首个焦点为 `/research`，2px 可见轮廓 | 7 | pass | 已完成 |
| 工程闭环 | 路由、无 Three.js、无错误 | 真实浏览器 | v2 的 27 项浏览器检查通过，0 控制台错误 | 9 | pass | 已完成 |
| 文档索引 | README 指向归档 | README | 阶段状态、归档页、文档与归档包入口 | 9 | pass | 已完成 |

