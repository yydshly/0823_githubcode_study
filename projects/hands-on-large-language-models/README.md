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
| 当前状态 | 研究中：静态能力盘点完成；第 1—10 章共 11 个低成本实践已通过 |
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

## 第4章文本分类实践

2026-08-24 完成第4章 Embedding 分类实验。实验固定 MiniLM 句向量、400条平衡训练评论和200条平衡测试评论，只改变标签证据与决策方法：

| 方法 | Macro-F1 | 说明 |
| --- | ---: | --- |
| 零样本标签向量 | 0.5726 | 只编码正负两个标签短语；负面评论明显被误判为正面 |
| 类别中心 | 0.7248 | 用400条带标签评论形成两个平均向量 |
| Embedding + 逻辑回归 | 0.7348 | 用同一批向量学习线性决策边界 |

监督逻辑回归比零样本方案提高0.1622 Macro-F1，说明主要增益来自真实任务样本。逻辑回归只比类别中心高约0.01，也说明在这次小实验中，复杂分类器不是主要变化来源。

本轮使用 `all-MiniLM-L6-v2` 代理上游 `all-mpnet-base-v2`，没有运行任务专用 RoBERTa、Flan-T5 和 ChatGPT。完整预测、解释、复现命令和边界见 [`experiments/phase-02-classification/`](experiments/phase-02-classification/)；机器结果见 [`classification-results.json`](experiments/phase-02-classification/results/classification-results.json)。

## 第5章主题建模实践

2026-08-24 完成第5章主题建模敏感性实验。实验使用上游同款 `thenlper/gte-small`，固定抽取600篇 arXiv NLP 论文，并固定 Embedding 与 UMAP，只把 HDBSCAN 的 `min_cluster_size` 从15改为40：

| `min_cluster_size` | 非离群主题数 | 离群率 | 结果含义 |
| ---: | ---: | ---: | --- |
| 15 | 8 | 34.0% | 允许保留较小、较局部的文档群 |
| 40 | 2 | 71.5% | 更严格地拒绝小群体，大量文档成为离群点 |

两次划分的 Adjusted Rand Index 只有0.1528，说明所谓“主题结构”会被聚类尺度显著改变，不存在脱离参数的唯一答案。默认 c-TF-IDF 关键词还被 `the`、`and`、`to` 等词干扰，这次失败观察进一步说明：聚类形成文档组与正确命名主题是两层能力，必须检查组内论文，不能盲信自动标签。

本轮只使用600 / 44,949篇固定子集；没有评测 KeyBERT、MMR、Flan-T5 与 OpenAI 主题标签。完整预测、分层原理、修改练习和离线复现见 [`experiments/phase-03-topic-modeling/`](experiments/phase-03-topic-modeling/)；机器结果见 [`topic-modeling-results.json`](experiments/phase-03-topic-modeling/results/topic-modeling-results.json)。

## 第6章提示工程实践

2026-08-24 完成第6章 one-shot 结构化输出实验。固定135M CPU代理模型、12条正式记录、JSON规则和greedy解码，只改变是否加入一个完整输入—输出示例：

| 提示 | 合法JSON | 完整记录正确 | 字段正确 |
| --- | ---: | ---: | ---: |
| 只有规则 | 6 / 12 | 6 / 12 | 18 / 36 |
| 规则 + one-shot示例 | 12 / 12 | 12 / 12 | 36 / 36 |

没有示例时的失败包括Markdown围栏、JSON外解释、未加引号、重复生成后截断和字段值缩短。示例在本轮中给小模型展示了答案的具体语法、长度和停止位置；它改善的是约束遵循，不代表模型获得新知识，也不能推出one-shot对所有任务都有效。

代码审计还发现Notebook当前变量与保存输出不一致、注释代码仍保留旧输出，因此本轮没有复用Notebook展示结果。完整源码审计、原始输出、修改练习和离线复现见 [`experiments/phase-04-prompt-engineering/`](experiments/phase-04-prompt-engineering/)；机器结果见 [`prompt-engineering-results.json`](experiments/phase-04-prompt-engineering/results/prompt-engineering-results.json)。

## 第7章工具与执行链实践

2026-08-24 完成第7章Python计算器观察实验。固定135M CPU代理模型、12条正式换汇任务、回答契约和greedy解码，只改变是否把`Decimal`计算结果作为工具观察交给模型：

| 路径 | 有末尾数字 | 出现正确工具值 | 最终金额正确 |
| --- | ---: | ---: | ---: |
| 模型单独计算 | 10 / 12 | 0 / 12 | 0 / 12 |
| Python工具观察 | 12 / 12 | 7 / 12 | 4 / 12 |

Python执行器12/12都算对，但模型只在7条回答中提到正确值，最终严格正确4条；另外3条先说对、随后又追加错误数字。这把“工具执行”“观察传递”和“最终生成”分成了三个可独立失败的环节。

代码审计还确认Memory只是外部代码重新注入的历史，WindowMemory会遗忘旧轮次，SummaryMemory可能改写事实；上游Agent示例依赖OpenAI、实时搜索和含糊的当前价格，不能直接作稳定离线基准。完整源码审计、原始输出、修改练习和离线复现见 [`experiments/phase-05-tools/`](experiments/phase-05-tools/)；机器结果见 [`tool-observation-results.json`](experiments/phase-05-tools/results/tool-observation-results.json)。

## 第8章语义搜索实践

2026-08-24 完成第8章关键词与稠密检索对照。实验固定12条带唯一标签的英文帮助文档、每条1个复用词汇查询和1个释义查询，只改变表示与评分方式：

| 方法 | 查询类型 | Top-1 | Top-3 | MRR |
| --- | --- | ---: | ---: | ---: |
| BM25 | 复用词汇 | 12 / 12 | 12 / 12 | 1.000 |
| BM25 | 换一种说法 | 6 / 12 | 7 / 12 | 0.610 |
| MiniLM稠密检索 | 复用词汇 | 12 / 12 | 12 / 12 | 1.000 |
| MiniLM稠密检索 | 换一种说法 | 12 / 12 | 12 / 12 | 1.000 |

本轮说明的是表示方式怎样影响排名：BM25依赖词汇重合，MiniLM在这组释义查询中找回了全部正确片段。它并不说明向量检索总是更好；3个明确无答案的问题仍被强制排出Top-1，证明“最相似”不是“语料中有答案”。本实验没有运行生成器，因此也不把检索正确等同于RAG回答正确。

代码审计还发现：Notebook的月球质量问题会从电影语料硬返回3条；只重排BM25候选时，首轮漏掉的相关片段无法恢复；本地RAG的下载代码、保存日志和模型路径不一致。完整源码审计、逐查询排名、失败样本、修改练习和离线复现见 [`experiments/phase-06-semantic-search/`](experiments/phase-06-semantic-search/)；机器结果见 [`semantic-search-results.json`](experiments/phase-06-semantic-search/results/semantic-search-results.json)。

## 第9章多模态大语言模型实践

2026-08-24 完成第9章CLIP图文检索与否定词敏感性实验。实验固定上游3张示例图、Notebook同款CLIP模型和三条描述，只在每条正确描述前加入一个单词 `not`：

| 检验 | 结果 | 含义 |
| --- | ---: | --- |
| 肯定描述图文Top-1 | 3 / 3 | 三张图都与正确描述对齐 |
| 肯定减否定相似度 | 0.0207—0.0419 | 否定词会降分，但幅度很小 |
| 否定描述在六条候选中的排名 | 3 / 3 均为第2 | 语义相反的描述仍非常接近图片 |

CLIP把图片与文字放进共同向量空间，能完成跨模态检索；但相似度不是逻辑真假或概率。本轮三条错误否定句都紧跟在正确描述之后，说明对象与场景重合可以压过单词级否定。

代码审计还发现Notebook图片URL指向可漂移的 `main`、CLIP预处理图被直接显示并触发裁剪警告、`model`变量三次覆盖；BLIP-2保存日志显示约15.5GB权重，而跑车价格回答无法由图片证明。本轮使用固定submodule图片并记录SHA-256，只运行CLIP，不把检索结果冒充图片描述或视觉问答质量。完整审计、逐描述排名和离线复现见 [`experiments/phase-07-multimodal/`](experiments/phase-07-multimodal/)；机器结果见 [`clip-negation-results.json`](experiments/phase-07-multimodal/results/clip-negation-results.json)。

## 第10章文本 Embedding 训练实践

2026-08-25 完成第10章训练数据对质量实验。实验固定已缓存的 `all-MiniLM-L6-v2`、8个训练对、8个独立改写查询和全部超参数，只把4/8个正目标在相近意图之间交换：

| 模型状态 | 训练目标损失 | 真实检索 Top-1 | 平均正确间隔 |
| --- | ---: | ---: | ---: |
| 原始 MiniLM | — | 8 / 8 | 0.373860 |
| 干净正对训练后 | 0.003938 → 0.000008 | 8 / 8 | 0.458672 |
| 50%错误正对训练后 | 3.799777 → 0.134823 | 7 / 8 | 0.254062 |

污染分支的损失大幅下降，但退款查询被错排成收据，证明训练目标只会奖励提供的配对关系，不会自动判断监督语义是否正确。代码审计也解释了Notebook保存结果中原始MiniLM的STS Spearman为0.8672，而完整MNLI继续微调后降至0.8485：单元41把三类MNLI全部交给不读取分类标签的MNRL，中立和矛盾句也会被当成正对。该代码问题与指标下降一致，但不能单凭一次结果断言它是唯一原因。

本轮强制离线并使用 `local_files_only=True`，没有下载模型、数据集或依赖。完整损失/数据/评估审计、修改练习和复现方式见 [`experiments/phase-08-embedding-training/`](experiments/phase-08-embedding-training/)；逐查询排名与损失轨迹见 [`pair-quality-results.json`](experiments/phase-08-embedding-training/results/pair-quality-results.json)。

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
- [`experiments/phase-02-classification/`](experiments/phase-02-classification/)：第4章三种Embedding分类策略、复现脚本与理解检查。
- [`classification-results.json`](experiments/phase-02-classification/results/classification-results.json)：第4章机器可读评测、混淆矩阵、探针句与失败样本。
- [`experiments/phase-03-topic-modeling/`](experiments/phase-03-topic-modeling/)：第5章主题建模参数实验、分层解释与继续修改任务。
- [`topic-modeling-results.json`](experiments/phase-03-topic-modeling/results/topic-modeling-results.json)：第5章主题数、离群率、ARI、主题词和样本文档。
- [`experiments/phase-04-prompt-engineering/`](experiments/phase-04-prompt-engineering/)：第6章one-shot对照、源码完整性问题与理解检查。
- [`prompt-engineering-results.json`](experiments/phase-04-prompt-engineering/results/prompt-engineering-results.json)：第6章原始模型输出、JSON/Schema/字段评分与示例复制检查。
- [`experiments/phase-05-tools/`](experiments/phase-05-tools/)：第7章工具观察对照、执行链分层和理解检查。
- [`tool-observation-results.json`](experiments/phase-05-tools/results/tool-observation-results.json)：第7章原始模型输出、Python工具轨迹、数字序列和分层评分。
- [`experiments/phase-06-semantic-search/`](experiments/phase-06-semantic-search/)：第8章BM25/稠密检索对照、源码完整性审计和理解检查。
- [`semantic-search-results.json`](experiments/phase-06-semantic-search/results/semantic-search-results.json)：第8章24条标注查询排名、Top-k/MRR、失败列表和无答案探针。
- [`experiments/phase-07-multimodal/`](experiments/phase-07-multimodal/)：第9章CLIP图文检索、否定词探针、图片来源审计与理解检查。
- [`clip-negation-results.json`](experiments/phase-07-multimodal/results/clip-negation-results.json)：第9章图文矩阵、六描述排名、否定差值、环境与图片哈希。
- [`experiments/phase-08-embedding-training/`](experiments/phase-08-embedding-training/)：第10章训练对质量、MNRL输入语义、源码完整性审计与理解检查。
- [`pair-quality-results.json`](experiments/phase-08-embedding-training/results/pair-quality-results.json)：第10章损失轨迹、独立查询排名、正确间隔和失败样本。
- [`upstream/`](upstream/)：固定在指定提交的上游源代码。

## 下一阶段

按照由低成本到高成本的顺序执行：

1. 进入第11章 Fine-tuning BERT，先审查分类头、SetFit、MLM、NER的数据标签与评估代码。
2. 给第10章增加独立业务语料、污染率曲线、batch大小与假负样本对照。
3. 给第9章加入更大独立图片集、对象正确但场景错误的描述，以及可承受的小型图片描述模型。
4. 给第8章增加独立阈值校准集与混合检索，分别评测召回、拒答和重排。
5. 在更大显存环境中补做 Phi-3 与BLIP-2原模型复现，再评估第11—12章完整GPU训练。
