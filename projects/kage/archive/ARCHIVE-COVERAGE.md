# KAGE 归档可查看性修复契约

## Design contract

- Entry mode: Repair-led / archive completeness revision
- Request revision: R174 archive completeness
- Target user and context: 需要在 GitHub Pages 回顾 KAGE 全部阶段成果的项目所有者与研究者
- Desired first impression: 案例边界清楚、数量可信、可直接打开，不需要先理解源码目录
- Visual ambition: Editorial
- Experience architecture: Editorial Flow
- Visual constraints: 保留现有归档视觉语言；不重做 V1、V2 或既有案例页面
- Information constraints: 明确区分 V2 交付、V1 精选/精修、能力基准与历史生成记录；草稿不得伪装成成品
- Operation constraints: 每个正式登记案例同时提供“查看案例”和“查看源码”；搜索与类型筛选继续可用
- State constraints: 归档清单失败时显示错误；无匹配时显示空状态；外链与预览状态有明确文案
- Environment constraints: GitHub Pages 静态托管；独立快照位于 `/projects/kage/archive/snapshot/`；既有 `/v1/`、`/v2/` 与工作台部署不变
- Primary journey: 打开归档 → 查看案例总量与分类 → 检索/筛选 → 打开可运行案例 → 返回归档
- User-defined phases: 全量盘点；补可运行快照；浏览器验收；独立部署
- Required artifacts: 完整 manifest、静态案例快照、归档双入口、桌面与 390px 浏览器证据、远端 Pages 验收
- Autonomy authorization: 用户已要求直接补充并修复，不需要逐步确认
- User-decision boundary: 无；不改旧版本、不提升历史草稿为精选
- Observable completion criteria: 35 个 V2 交付、20 个 V1 案例和 3 个能力基准均有可运行入口；98 个历史生成记录完整登记；归档和代表案例在桌面与 390px 可打开；旧部署地址保持可用

## Coverage record

| 用户阶段 | 要求 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 全量盘点 | 不遗漏案例与历史记录 | manifest | 58 个案例、98 条生成记录、25 个冻结包与目录交叉检查 | Stage 0 | pass | 已生成统一清单 |
| 补可运行快照 | 每个登记案例可直接查看 | 58 个案例入口 | Vite 静态构建，58/58 URL 返回 200 | Stage 1/5 | pass | 已构建独立 snapshot |
| 归档双入口 | 案例与源码入口分离 | 桌面 / 移动 | 58 个 `data-case-view` 与独立源码链接 | Stage 3/4 | pass | 已更新归档 UI |
| 浏览器验收 | 桌面和 390px 可用 | 归档、V1、V2、能力基准 | Playwright 2/2；代表 V1/V2/能力页运行 | Stage 7 | pass | 已完成真实浏览器验证 |
| 独立部署 | 不覆盖旧 V1/V2 | GitHub Pages | Actions run `33868191438` 全部通过；归档、58 个查看入口及代表 V1/V2/能力页在线验收 | Stage 9 | pass | 已完成独立发布 |
