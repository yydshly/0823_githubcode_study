# GitHub Code Study

这是一个用于持续研究、拆解和展示多个开源项目能力的长期仓库。

仓库以本 README 作为统一入口：每个研究对象拥有独立目录、研究记录和可复现示例；适合公开展示的阶段性成果会同步到 GitHub Pages。

## 项目索引

| 子项目 | 研究方向 | 当前阶段 | 研究记录 | 在线展示 |
| --- | --- | --- | --- | --- |
| Hands-On Large Language Models | 书籍驱动的LLM代码学习、13个实践与可复用研究方法 | 暂时归档 | [研究记录](projects/hands-on-large-language-models/README.md) | [按需学习](https://yydshly.github.io/0823_githubcode_study/projects/hands-on-large-language-models.html) |
| HyperFrames Launches | HeyGen 发布视频案例、HTML 网页离线渲染与 Remotion 路线对比 | 暂时归档 | [研究记录](projects/hyperframes-launches/README.md) | [能力展示](https://yydshly.github.io/0823_githubcode_study/projects/hyperframes-launches.html) |
| Kindergrimm | 确定性童话风格的 2D、程序化 3D 与游戏场景素材研究 | 暂时归档 | [研究记录](projects/kindergrimm/README.md) | [能力展示](https://yydshly.github.io/0823_githubcode_study/projects/kindergrimm.html) |
| Claude of Tanks | Three.js 程序化 3D、战车运行时、独立产品工作台与复用边界 | 暂时归档 | [研究记录](projects/claude-of-tanks/README.md) | [能力总览](https://yydshly.github.io/0823_githubcode_study/projects/claude-of-tanks.html) · [阶段归档](https://yydshly.github.io/0823_githubcode_study/projects/claude-of-tanks-archive.html) |

## 仓库结构

```text
.
├─ README.md                 # 仓库总入口与子项目索引
├─ projects/                 # 各子项目的独立研究空间
│  ├─ README.md              # 子项目目录说明
│  └─ _template/             # 新研究项目模板
├─ docs/                     # GitHub Pages 静态展示站点
└─ .github/workflows/        # 自动化校验与 Pages 部署
```

## 研究约定

每个子项目放在 `projects/<project-slug>/` 下，至少包含一份 `README.md`，并按统一结构记录：

1. 研究目标与核心问题；
2. 上游项目、版本或提交哈希；
3. 环境准备与复现步骤；
4. 能力拆解、关键结论和限制；
5. 示例、截图或在线演示；
6. 后续计划。

涉及第三方源码、素材或模型时，应明确来源与许可证；优先使用链接、Git submodule 或复现脚本，避免无说明地复制大体量代码。

## 开始一个新研究

1. 复制 `projects/_template/` 并以简短的英文 slug 命名目录。
2. 完成项目 README，固定上游版本或提交哈希。
3. 在本页“项目索引”中加入项目入口。
4. 若有可公开展示的成果，在 `docs/` 中增加对应页面和链接。

## 当前研究

首个子项目以 [HandsOnLLM/Hands-On-Large-Language-Models](https://github.com/HandsOnLLM/Hands-On-Large-Language-Models) 为研究对象。上游源码通过 Git submodule 固定到提交 `ea3390819997999a51983677b80b3aac4dc50ada`，研究重点不是复述教材目录，而是从 12 个 Notebook 的代码单元中提取模型、数据集、依赖、技术能力和工程边界。

## 在线展示

`main` 分支更新 `docs/` 后，GitHub Actions 会自动发布 GitHub Pages。首次使用时，请在仓库的 **Settings → Pages** 中确认 Source 为 **GitHub Actions**。

预期地址：<https://yydshly.github.io/0823_githubcode_study/>

## 状态说明

- `待开始`：已列入计划，尚未开展。
- `研究中`：正在分析、实验或记录。
- `暂时归档`：第一轮研究完成并保留资料，后期按需学习或补充验证。

