# Kindergrimm 能力与场景实验室

该工作台用固定上游提交的真实运行页面回答三个问题：

1. 当前已经具备哪些 2D、3D、混合场景和游戏能力；
2. 如何从现有证据继续建设视觉内容包、导出管线、SDK、AI Recipe 与规模化优化；
3. 如何将能力组合成 NPC 工厂、IP 内容工作室、装备生态和程序化 3D 资产实验室。

## 启动

从仓库根目录运行：

```powershell
.\projects\kindergrimm\scripts\lab.ps1
```

打开：

```text
http://127.0.0.1:8881/projects/kindergrimm/lab/
```

页面必须通过 HTTP 访问，不能只双击 `index.html`。实验室需要同源加载 `upstream/` 中的 ES modules 和真实演示路由。

## 文件

```text
lab/
├─ index.html   # Hybrid Workspace 结构和无脚本回退
├─ lab.css      # 桌面/移动端、焦点与 reduced-motion 样式
├─ lab.js       # 14 项能力、5 条扩展路线和 4 个场景导演状态
└─ README.md
```

交付合同与覆盖清单位于 `../analysis/lab-delivery-contract.md`。
