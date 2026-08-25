# Three.js Capability Research · Phase 01 Archive

状态：`ARCHIVED`  
日期：2026-08-26  
范围：Claude of Tanks / Three.js 程序化 3D 能力研究

## 这个归档包保存什么

这是一个轻量、可审计的阶段包，不是源代码快照，也不是可独立部署的游戏副本。它保存：

- 本阶段完整结论与恢复条件；
- 研究控制台、产品工作台、视觉层实验和沙漠能力场景的关键报告；
- 移动端性能评分；
- 阶段归档页的桌面、平板与移动截图；
- 每个归档文件的来源、字节数和 SHA-256。

完整源码、历史截图和大体积追踪仍保留在项目原目录中。失败的工业展厅实验也仍在原证据目录中，作为“结构通过不等于视觉复用成功”的边界证据。

## 阅读顺序

1. `phase-01-stage-archive.md` 与 `archive-refinement-r2.md`：阶段结论、能力、意义、风险、恢复条件和 v2 展示优化记录；
2. `screenshots/01-desktop-archive.png`、`02-tablet-archive.png`、`03-mobile-archive.png`：三端归档页面与 v2 章节导航；
3. `reports/research-platform-audit.json`：研究注册表与边界审计；
4. `reports/product-workbench-browser-report.json`：world:none 产品工作台的复用证据；
5. `reports/visual-layer-lab-report.json` 与 `reports/desert-capability-report.json`：分层原理与组合场景证据；
6. `manifest.json`：文件完整性清单。
7. `audit-report.json`：最近一次完整性与归档页浏览器证据审计结果。

## 运行中的页面

在项目根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-research-platform.ps1 -Port 4176
```

然后访问：

- 研究控制台：`http://127.0.0.1:4176/research`
- 阶段归档：`http://127.0.0.1:4176/research/archive`
- 产品工作台：`http://127.0.0.1:4176/workbench`
- 视觉层实验：`http://127.0.0.1:4176/studio?map=desert&showcase=capabilities&lab=layers&nogate=1`
- 沙漠能力场景：`http://127.0.0.1:4176/studio?map=desert&showcase=capabilities&nogate=1`

## 重新生成与审计

```powershell
node scripts/build-phase-01-archive.mjs
node scripts/audit-phase-01-archive.mjs
```

重新生成只更新这个 Phase 01 包中的派生副本与 `manifest.json`，不会修改原始证据。若以后恢复研究，应创建新的阶段目录，不改写本阶段结论。

