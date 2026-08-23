# Hands-On Large Language Models 研究

> 首个正式研究子项目：从教学型 Notebook 中提取一张可验证、可复现、可扩展的大模型能力地图。

## 基本信息

| 项目 | 内容 |
| --- | --- |
| 上游仓库 | [HandsOnLLM/Hands-On-Large-Language-Models](https://github.com/HandsOnLLM/Hands-On-Large-Language-Models) |
| 固定版本 | `ea3390819997999a51983677b80b3aac4dc50ada` |
| 获取方式 | Git submodule：`upstream/` |
| 许可证 | Apache-2.0；外部模型与数据集需分别核查许可证 |
| 开始日期 | 2026-08-23 |
| 当前状态 | 研究中：静态能力盘点完成；第 1—3 章低成本基础实验已通过 |
| 在线展示 | [能力研究页](https://yydshly.github.io/0823_githubcode_study/projects/hands-on-large-language-models.html) |

## 定位结论

这个仓库不是一个可以直接部署的 AI 产品，也不是一个统一的大模型框架。它是 O'Reilly《Hands-On Large Language Models》的官方配套实验代码，以 12 个 Jupyter Notebook 覆盖从模型调用到微调的主要学习路径。

它最适合作为“LLM 能力地图和实验基线”来研究，而不是直接改造成生产应用。

## 代码验证后的能力地图

| 章节 | 代码中实际出现的能力 | 主要技术或对象 |
| --- | --- | --- |
| 01 | 本地加载并运行生成模型 | Phi-3、Transformers pipeline |
| 02 | Token、上下文词向量、句向量与相似推荐 | DeBERTa、SentenceTransformers、Word2Vec |
| 03 | 观察 logits、采样与 KV Cache | Phi-3、`generate`、解码策略 |
| 04 | 监督、零样本与生成式文本分类 | Rotten Tomatoes、Logistic Regression、OpenAI API |
| 05 | 文本聚类和主题建模 | UMAP、HDBSCAN、BERTopic、Flan-T5 |
| 06 | 提示词、上下文学习、推理提示与约束输出 | Phi-3、llama.cpp、grammar |
| 07 | Chain、记忆、工具与 Agent | LangChain、DuckDuckGo Search |
| 08 | 稠密检索、重排、向量库与 RAG | Cohere、FAISS、BM25、LlamaCpp |
| 09 | 图文共同向量空间、图片描述和视觉问答 | CLIP、SentenceTransformers、BLIP-2 |
| 10 | 训练与评估文本 Embedding 模型 | SentenceTransformerTrainer、MTEB、TSDAE |
| 11 | BERT 分类、少样本、MLM 与实体识别微调 | Trainer、SetFit、CoNLL-2003 |
| 12 | 生成模型的 SFT、量化、LoRA 与 DPO | TinyLlama、PEFT、TRL、bitsandbytes |

这张表来自 Notebook 代码单元，不来自章节标题。机器生成的原始证据见 [`analysis/notebook-inventory.json`](analysis/notebook-inventory.json)。

## 它展示的核心原理

仓库中的实验可以归为四条主线：

1. **生成**：文本经 Tokenizer 转换为 token，Transformer 根据上下文逐 token 预测后续内容。
2. **表征**：文本或图片转换为向量，利用距离完成相似度、分类、聚类和检索。
3. **检索增强**：先从外部资料中检索相关内容，再把证据和问题一起交给生成模型。
4. **适配与训练**：用监督数据、对比学习、LoRA 或偏好数据改变模型在特定任务上的行为。

## 首轮运行验证

2026-08-24 已完成第 1—3 章低成本基础实验，固定在 Python 3.10、PyTorch 2.3.1+cpu 和 Transformers 4.41.2：

| 测试 | 执行对象 | 结果 |
| --- | --- | --- |
| Tokenizer 对比 | BERT、GPT-2、Flan-T5、Phi-3 等 5 个 Tokenizer | 5/5 通过；同一输入产生 23—41 个 Token |
| 指令生成 | SmolLM2-135M 代理模型 | 通过；48 个新 Token 用时 3.175 秒 |
| next-token logits | SmolLM2-135M 代理模型 | 通过；argmax 解码为 “ Paris” |
| KV Cache | SmolLM2-135M 代理模型 | 通过；本轮中位耗时由 5.5855 秒降至 1.4778 秒 |

本轮直接运行了 Phi-3 Tokenizer，但没有加载 Phi-3 权重。生成、logits 和 KV Cache 属于相同代码路径的小模型代理验证，不代表 Phi-3 的质量、显存或性能已经复现。

完整命令、失败修复和证据见 [`experiments/phase-01-foundations/`](experiments/phase-01-foundations/)；机器结果见 [`results/smoke-results.json`](experiments/phase-01-foundations/results/smoke-results.json)。

## 代码层面的真实边界

- 全部核心示例都是 Notebook，没有统一的 Python 包、服务入口或 Web 应用。
- 没有端到端自动测试、生产部署、权限、监控和数据持久化方案。
- 部分实验依赖 OpenAI 或 Cohere API Key；大量实验需要从 Hugging Face 下载模型和数据。
- 完整环境固定在 Python 3.10 与一组 2024 年版本的依赖上，优点是贴近教材，缺点是和新环境存在兼容风险。
- Notebook 能证明“示例如何运行”，不能自动证明“方法在真实业务中有效”。

## 适合的研究与使用场景

- 建立大模型学习路线和内部培训材料。
- 快速验证文本分类、聚类、RAG、多模态与微调方案。
- 比较本地模型、云 API 和不同 Embedding 模型。
- 将每章改造成独立、可测试、可部署的小型能力服务。
- 作为后续中文数据、中文模型和国产算力适配的实验基线。

## 当前研究产物

- [`ANALYSIS_METHOD.md`](ANALYSIS_METHOD.md)：整个子项目采用的分析步骤、证据标准和阶段门槛。
- [`scripts/inventory_notebooks.py`](scripts/inventory_notebooks.py)：扫描 Notebook 代码单元的零依赖清单脚本。
- [`analysis/notebook-inventory.json`](analysis/notebook-inventory.json)：固定版本的机器可读能力证据。
- [`experiments/phase-01-foundations/`](experiments/phase-01-foundations/)：第 1—3 章低成本运行脚本、依赖与实验说明。
- [`results/smoke-results.json`](experiments/phase-01-foundations/results/smoke-results.json)：首轮机器可读运行证据。
- [`upstream/`](upstream/)：固定在指定提交的上游源代码。

## 下一阶段

按照由低成本到高成本的顺序执行：

1. 为第 4、5、8 章建立统一的小数据集切片、基线与评测指标。
2. 先复现第 4 章分类，比较监督分类、Embedding 分类和零样本分类。
3. 再复现第 5 章主题建模，记录离群率、主题一致性和人工判断。
4. 将第 8 章整理成可评测、可部署的中文 RAG 演示。
5. 在更大显存环境中补做 Phi-3 原模型复现，再进入第 9—12 章。
