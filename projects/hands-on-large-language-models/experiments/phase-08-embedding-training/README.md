# 第 10 章实践：训练损失下降，不等于 Embedding 变好

本阶段研究的不是“怎样调用 Embedding”，而是训练数据怎样改变向量空间。固定上游版本为 `ea3390819997999a51983677b80b3aac4dc50ada`。

## 先读代码：Notebook 实际训练了什么

第 10 章把文本 Embedding 训练拆成几条路径：

| 路径 | 数据 | 模型 | 损失 | 评估 |
| --- | --- | --- | --- | --- |
| 从 BERT 创建模型 | MNLI 前 50,000 行 | `bert-base-uncased` + mean pooling | SoftmaxLoss | STS-B 相似度、Banking77 MTEB |
| 相似度监督 | MNLI 映射为 0/1 | `bert-base-uncased` | CosineSimilarityLoss | STS-B |
| 排序监督 | MNLI 中的 entailment + 随机 soft negative | `bert-base-uncased` | MultipleNegativesRankingLoss | STS-B |
| 继续微调 | 完整 MNLI 前 50,000 行 | `all-MiniLM-L6-v2` | MultipleNegativesRankingLoss | STS-B，另与原模型对比 |
| Augmented SBERT | 10,000 gold + 40,000 CrossEncoder 伪标签 | BERT CrossEncoder → Bi-encoder | 分类 + CosineSimilarityLoss | STS-B |
| 无监督 TSDAE | 25,000 MNLI 的 premise/hypothesis | BERT CLS pooling | DenoisingAutoEncoderLoss | STS-B |

它的核心原理是：编码器把句子变成向量；损失函数根据训练对规定哪些向量要靠近、哪些要远离；评估集再检查这种几何变化能否迁移到未参与训练的任务。

```text
anchor ──编码──> 向量 a ─┐
                         ├─ 相似度矩阵 ─> 让指定 positive 靠近、批内其他项远离
positive ─编码──> 向量 p ┘

训练损失：模型是否适配“你给的配对”
独立评估：这些配对是否真的代表目标语义
```

## 保存结果说明了什么

Notebook 保存的 STS-B Spearman cosine 指标为：

| 训练路径 | Spearman cosine |
| --- | ---: |
| BERT + SoftmaxLoss | 0.4515 |
| BERT + CosineSimilarityLoss | 0.7251 |
| BERT + MultipleNegativesRankingLoss | 0.8106 |
| 原始 `all-MiniLM-L6-v2` | 0.8672 |
| Notebook 的 MiniLM 继续微调 | 0.8485 |

最后一条没有超过原模型，反而下降约 0.0187。数字来自 Notebook 保存输出，不是本地重跑；不同路径的数据和目标不完全相同，不能仅凭这一张表宣布某个损失“普遍最好”。

## 代码审计发现的关键问题

1. **MNRL 不读取 MNLI 三分类标签。** 单元 41 把完整 MNLI 交给 `MultipleNegativesRankingLoss`。该损失使用文本列构造正对，标签列不参与目标；因此 neutral 和 contradiction 行也会被当作应当靠近的正样本。这与保存结果中微调后 STS 指标下降相吻合，但只能视为原因证据，不能仅凭相关性证明唯一因果。
2. **负样本构造不可复现。** 单元 32 对 hypothesis 列直接 `random.shuffle`，没有固定 seed，也没有检查随机后是否出现重复、同义或假负样本。
3. **数据、模型和依赖版本未固定。** `load_dataset("glue", ...)`、`bert-base-uncased` 和 MiniLM 都没有 revision；未来重跑可能得到不同快照。
4. **Notebook 的完整路径需要网络与 GPU。** 代码在线加载 MNLI、STS-B、Banking77，并建议 Colab T4、`fp16=True`；TSDAE 还把 decoder 明确移动到 `cuda`。
5. **后半部分没有完整保存结果。** Augmented SBERT 只保存到 CrossEncoder 开始训练的进度；silver 标注、bi-encoder 训练和 TSDAE 评估没有保存输出，不能声称这些路径已经在该文件中验证完成。
6. **执行顺序无法从计数恢复。** 文件保留了部分输出，但代码单元 `execution_count` 为空；变量名 `embedding_model`、`trainer` 和 `train_dataset` 多次覆盖，乱序执行会改变含义。

## 我们怎样实践理解

### 问题

如果模型收到语义错误的“正样本对”，训练损失是否仍会下降？下降以后，真实检索能力会怎样？

### 运行前预测

干净数据和污染数据都能降低各自的 MNRL 目标，因为损失只服从输入配对。干净配对应保持或扩大正确项与最难负项的距离；污染配对会缩小真实间隔，甚至造成错排。

### 固定条件

- 使用 Notebook 同款 `sentence-transformers/all-MiniLM-L6-v2`，固定 revision `1110a243fdf4706b3f48f1d95db1a4f5529b4d41`；
- 只读取本项目已存在的约 90.9MB 模型缓存，`local_files_only=True`，同时强制 Hugging Face、Transformers 和 Datasets 离线；
- 8 个帮助中心意图、8 个训练 anchor、8 个独立改写查询；
- 两个训练分支使用相同模型、seed 42、CPU、batch 8、12 epochs、AdamW 和学习率 `2e-5`；
- 唯一变化：污染分支将 4/8 个正目标在相近意图之间交换（密码↔二步验证、收据↔退款）。

### 复现：不会下载

本工作区已经缓存所需 MiniLM。脚本显式禁止联网加载；如果固定模型不存在，它会报错停止，而不是下载：

```powershell
.\projects\hands-on-large-language-models\.runtime\venv\Scripts\python.exe `
  .\projects\hands-on-large-language-models\experiments\phase-08-embedding-training\run_pair_quality.py
```

结果写入 `results/pair-quality-results.json`。

## 正式结果

| 模型状态 | 自己收到的目标损失 | 真实检索 Top-1 | 平均正确间隔 | 最小正确间隔 |
| --- | ---: | ---: | ---: | ---: |
| 原始 MiniLM | — | 8 / 8 | 0.373860 | 0.211952 |
| 8/8 干净正对训练后 | 0.003938 → 0.000008 | 8 / 8 | 0.458672 | 0.258258 |
| 4/8 错误正对训练后 | 3.799777 → 0.134823 | 7 / 8 | 0.254062 | -0.000301 |

污染分支的目标损失下降了 3.664954，看上去“训练非常成功”；但独立语义评估变差了。退款查询本应命中 `refund`，最终却把 `receipt` 排在第 1。训练数据曾明确把“下载收据”和“退款期限”互换为正目标，因此模型学到的是错误监督，而不是拒绝这条监督。

干净分支没有提高已经满分的 Top-1，但平均正确间隔从 0.373860 增至 0.458672。这个结果比只报 8/8 更有信息：排名未变时，正确项相对最难干扰项的空间分离仍发生了变化。

## 如何读这些指标

- `objectiveLoss`：模型对当前训练配对的服从程度；不判断配对语义是否正确。
- `Top-1`：独立查询是否把预先标注的正确文档排在第 1。
- `true margin`：正确文档分数减去最高错误文档分数；负值表示已经错排。
- `failure`：保留完整查询、正确文档、错误返回和两者分数，防止平均值掩盖具体失败。

## 你接下来应该怎么改

1. 只把污染率从 4/8 改成 2/8，先预测 Top-1 与平均间隔哪个更早报警。
2. 保持数据不变，把 batch 从 8 改成 4；解释批内负样本数量为什么会改变 MNRL 学习信号。
3. 让两个 anchor 共享同一正确文档，观察“假负样本”如何出现。
4. 新增一组完全独立的业务意图再评估，检查干净分支的提升是否只是适配这个小语料。

## 理解检查

- 为什么污染分支的训练损失显著下降，却不能说明模型变好？
- MNRL 的相似度矩阵中，为什么对角线是谁由数据列顺序决定，而不是由模型自动理解？
- Top-1 已经是 8/8 时，为什么还要看 margin、独立数据和失败样本？
- Notebook 单元 41 应怎样过滤或重构 MNLI，才不会把 contradiction 当正样本？

## 结论边界

这是 8 个英文合成意图的机制实验，不是通用 Embedding 基准，也没有复现 Notebook 的 50,000 行 GPU 训练、完整 MTEB、Augmented SBERT 或 TSDAE。Notebook 的 STS-B 数字和本地检索指标使用不同数据，不可直接比较数值大小。本轮没有下载模型、数据集或依赖；任何后续未缓存资源都需先获得用户确认。
