# KAGE V2 R165 可恢复基线

日期：2026-09-03

## 目的

本基线把当前 KAGE V2 的实现、研究、正式交付、精选案例、测试和必要视觉资产保存为一个可恢复的 Git 树。它不声明 V2 已完成，也不把所有历史结果提升为精选案例。

## 纳入范围

- `projects/kage/README.md`
- `projects/kage/lab` 中的源码、服务器、配置、测试与脚本
- V1/V2 页面、原型、正式交付和研究入口
- 当前案例目录、案例注册表和稳定 case bundles
- 被页面或研究记录引用的正式素材、预览图与浏览器证据
- V2 研究、阶段交付和本次全系统审计文档

Git 提交本身是精确文件清单；可使用 `git show --stat` 和 `git show --name-only` 复核。

## 排除范围

- `.env`、`.env.local` 和供应商密钥
- `node_modules`、`dist`、`.pages-dist` 与发布预览产物
- `.signal-lab-cache`、`.artifacts`、`.tmp` 和浏览器测试临时目录
- `generated/runs`、`generated/jobs/*.json` 与运行时证据缓存
- `r116-regression-results`、`r116-test-results` 等一次性测试结果
- 已知不应归档的两个失败 case bundle
- 意外空文件 `n.dataset.dot)`
- KAGE 以外的项目与仓库级未完成改动

## 基线边界

- 当前分支用于恢复和评审，不直接代表 GitHub Pages 已发布。
- 工作台真实生成链仍主要使用旧 orchestrator；V2 Direct 协议尚未统一接入。
- `ExperiencePromise`、独立体验判断、统一 Artifact Registry 与安全隔离仍属于下一阶段 P0。
- 正式发布前必须单独修复 Pages 部署清单并执行发布级链接验收。

## 已完成验证

- `npm run build`
- 核心协议、最终证据、DirectCreativeRun、效果选择、正式产品与 deadline 共 39 项定向测试
- 本地 10 条关键入口 HTTP 检查

完整差距见 [R165 全系统审计](../v2-research/V2-R165-FULL-SYSTEM-AUDIT.md)。
