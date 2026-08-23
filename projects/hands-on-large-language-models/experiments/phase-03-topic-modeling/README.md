# 第 5 章实践：主题不是唯一答案

这一轮不把 BERTopic 当成“自动给论文贴正确标签”的黑盒。我们固定论文、Embedding 和降维参数，只改变 HDBSCAN 的最小聚类规模，观察主题数量、离群率和主题解释怎样变化。

## 要回答的问题

没有人工标签时，`Embedding → UMAP → HDBSCAN → c-TF-IDF` 各自做了什么？聚类参数改变后，所谓“主题”还是不是同一个答案？

运行前的预测：

1. 较小的 `min_cluster_size` 会允许更多、更窄的小主题。
2. 较大的值会合并或拒绝小群体，离群文档比例会上升。
3. c-TF-IDF 关键词只能帮助检查主题，不能证明主题名称正确。

## 从上游代码提取的链路

第 5 章 Notebook 的真实代码顺序是：

1. 从 `maartengr/arxiv_nlp` 读取论文标题和摘要。
2. 用 `thenlper/gte-small` 把摘要编码为 384 维句向量。
3. 用 UMAP 把向量降到 5 维，方便密度聚类。
4. 用 HDBSCAN 找高密度群，并把无法可靠归组的文档标成 `-1`（离群文档）。
5. BERTopic 按簇汇总词频，用 c-TF-IDF 给每个簇生成解释词。
6. 上游后续还尝试 KeyBERT、MMR、Flan-T5 和 OpenAI 改写主题名称；本轮没有把这些名称生成方法混进聚类对照。

这四层不要混为一谈：Embedding 表示语义；UMAP 改变可聚类空间；HDBSCAN 决定哪些文档成组；c-TF-IDF 只负责描述已经形成的组。

## 本轮如何控制变量

| 固定项 | 值 |
| --- | --- |
| 数据 | `arxiv_nlp` 固定随机种子抽取 600 / 44,949 篇 |
| Embedding | 上游同款 `thenlper/gte-small`，600 × 384 |
| UMAP | `n_neighbors=15`、`n_components=5`、`min_dist=0`、`metric=cosine` |
| 随机种子 | 42 |
| 唯一主动改变项 | HDBSCAN `min_cluster_size`：15 与 40 |

上游是在完整数据上使用 `min_cluster_size=50`。本轮用 600 篇固定子集和 15/40 做低成本敏感性实验，因此不能把数值当作上游完整基准。

## 实际结果

| `min_cluster_size` | 非离群主题数 | 离群文档 | 最大主题 |
| ---: | ---: | ---: | ---: |
| 15 | 8 | 204 / 600（34.0%） | 92 篇 |
| 40 | 2 | 429 / 600（71.5%） | 97 篇 |

两次划分的 Adjusted Rand Index 为 **0.1528**。当最小成簇规模从 15 增加到 40，主题减少 6 个、离群率增加 37.5 个百分点，运行前预测得到确认。

这不是在证明 8 个主题比 2 个主题“更正确”。它证明主题结构依赖参数：更严格的密度要求宁愿把大量论文留在主题之外，也不会保留较小的局部群体。

## 一次不能隐藏的失败观察

默认 c-TF-IDF 的高权重词里出现大量 `the`、`and`、`to`。部分簇仍能看到 `translation`、`speech`、`asr`、`entity` 等领域词，组内样本文档也呈现机器翻译、语音识别和关系抽取等局部一致性，但默认关键词并不足以直接命名全部主题。

因此正确的检查顺序是：

1. 先看主题内的代表文档是否在讨论相近问题。
2. 再看关键词能否概括这些文档。
3. 若关键词被停用词淹没，尝试英文停用词过滤、KeyBERT 或 MMR，并再次人工核查。
4. 不要因为页面显示了一个主题名称，就把它当作数据中的客观真相。

## 你应该能解释什么

- `-1` 表示聚类器不愿可靠归组的文档，不等于“错误论文”。
- 主题数不是预先给定的类别数，而是密度、降维、样本和随机种子共同作用的结果。
- 聚类和主题命名是两步：组内文档可以相近，但自动关键词仍可能很差。
- ARI 低说明两组配置产生了明显不同的划分，不告诉我们哪一个更符合人的需求。

## 继续动手

每次只改一项，并先写预测：

- 把 `min_cluster_size` 改为 25，判断主题数和离群率会落在哪里。
- 给 BERTopic 的词袋模型增加 `stop_words="english"`，比较主题词是否更可解释；聚类标签应保持不变。
- 把 UMAP 的 `n_neighbors` 改为 5 或 30，观察局部主题与大范围结构的取舍。
- 换用完整 44,949 篇数据，再判断小样本结论是否稳定。

## 复现

在项目目录创建独立 Python 3.10 环境后：

```powershell
python -m pip install -r experiments/phase-03-topic-modeling/requirements-smoke.txt
python experiments/phase-03-topic-modeling/run_topic_modeling.py
```

首次运行需要下载约 53 MB 数据集和 `gte-small` 模型。缓存就绪后，可设置 `HF_HUB_OFFLINE=1`、`TRANSFORMERS_OFFLINE=1` 和 `HF_DATASETS_OFFLINE=1` 离线复跑。本次已完成离线复跑，结果文件中的 `environment.offlineMode` 为 `true`。

机器可读证据见 [`results/topic-modeling-results.json`](results/topic-modeling-results.json)，可执行入口见 [`run_topic_modeling.py`](run_topic_modeling.py)。

## 证据边界

- 使用上游同款 Embedding，但只聚类固定的 600 篇子集。
- 只验证参数敏感性和学习链路，不宣称达到生产主题质量或跨随机种子稳定性。
- 没有评测 KeyBERT、MMR、Flan-T5、OpenAI 标签和可视化质量。
- 关键词和人工观察都不是隐藏的真实标签；若用于业务，还需要领域人员定义可接受标准。
