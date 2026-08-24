# 第 11 章实践：微调不是一个开关，而是任务头、标签单位与梯度范围

本阶段固定研究上游提交 `ea3390819997999a51983677b80b3aac4dc50ada`。完整 Notebook 涉及未缓存模型和额外依赖，因此不执行大型下载；本地只用已经存在的 90.9MB MiniLM 权重验证 BERT 家族共有的机制。

## 先读代码：第 11 章实际包含四种任务

| 路径 | 输入与标签单位 | 模型头/决策层 | 训练目标 | Notebook 评估 |
| --- | --- | --- | --- | --- |
| 监督分类 | 每段影评 1 个正/负标签 | BERT sequence-classification head | 交叉熵 | F1 |
| SetFit few-shot | 每类 16 条影评、构造句对 | MPNet SentenceTransformer + LogisticRegression | 对比学习 + 分类 | F1 |
| MLM | 每个被遮住的 Token | BERT MLM vocabulary head | 只预测 mask 位置 | fill-mask 候选 |
| NER | 每个词及其 WordPiece 子词 | BERT token-classification head | Token 交叉熵，`-100` 不计损失 | seqeval 实体 F1 |

因此“Fine-tuning BERT”并不是一种固定能力。分类问整段属于哪一类；MLM 问某个位置最可能是什么词；NER 问每个 Token 属于哪个实体标签。相同编码器后面的头、标签形状、损失掩码和评估协议都不同。

## Notebook 保存的结果

| 路径 | 保存指标 |
| --- | ---: |
| BERT 全量影评分类 | F1 0.8566 |
| 只训练分类头 | F1 0.6377 |
| 冻结到第 10 层之前 | F1 0.8141 |
| SetFit，每类 16 条 | F1 0.8364 |
| NER | 报告 F1 0.9180，但评估输入形状存在问题 |

这些数字来自 Notebook 保存输出，不是本地重跑。分类和 SetFit 都在开发过程中直接把 test split 作为 `eval_dataset`；它们适合解释书中机制，不应被当作严格独立测试结论。

## 暂不下载的资源

| 资源 | 需要它做什么 | 已观察大小/状态 | 本轮处理 |
| --- | --- | --- | --- |
| `bert-base-cased` | 分类、MLM、NER 三条完整路径 | Notebook 日志为 436MB；[官方 safetensors 也是 436MB](https://huggingface.co/google-bert/bert-base-cased/tree/main)；本地只有 tokenizer/config | 不下载，不运行完整 BERT |
| `all-mpnet-base-v2` | SetFit few-shot 表征模型 | [官方 safetensors 438MB](https://huggingface.co/sentence-transformers/all-mpnet-base-v2/tree/main)；本地未缓存 | 不下载，只解释 SetFit 路径 |
| Rotten Tomatoes | 影评分类/MLM | Notebook 日志约 699kB + 90.0kB + 92.2kB | 不下载，用 8 条固定合成文本 |
| CoNLL-2003 | NER | Notebook 日志约 983kB，另需 builder/readme | 不下载，用 1 条固定 BIO 标签序列 |
| `setfit` / `evaluate` / `seqeval` | 训练与评估库 | 当前环境均未安装 | 不安装，用透明的 PyTorch 与形状审计 |

还有一个容易忽略的存储成本：MLM 配置为 10 epochs 且每个 epoch 保存 checkpoint。即使每个 checkpoint 只算一份 436MB 权重，十份也至少约 4.36GB，还没有算 optimizer state、日志和重复输出目录。本轮不创建这些 checkpoint。

## 源码完整性审计

1. **test split 被用于开发评估。** 分类、冻结层和 SetFit 都把 test 数据传给 trainer；比较配置时应使用 validation，最后只评一次 test。
2. **按参数编号 165 冻结很脆弱。** 单元 26 依赖当前模型参数枚举顺序；模型版本、头结构或库升级都可能让编号指向别处，应按层名冻结。
3. **冻结层曲线的 x/y 对不上。** 单元 28 按 0→11 逐渐冻结更多 encoder block；单元 30 又把保存分数 `[::-1]`，同时把横轴端点改成 `None` 和 `All`，导致图示含义与循环不一致。
4. **NER 的 seqeval 输入被压扁。** 单元 57 在 Token 循环内 `append([label])`，把一条句子拆成许多单 Token 序列，B/I 实体连续性丢失；保存的 0.9180 不能视为可信的句级实体跨度 F1。
5. **NER 推理没有聚合 WordPiece。** 单元 61 把 `Maarten` 输出为 `Ma / ##arte / ##n` 三项；需要 `aggregation_strategy` 或后处理才能恢复一个人名跨度。
6. **源码与保存输出可能漂移。** 单元 50 已写 `trust_remote_code=True`，但保存输出仍出现交互式信任询问；全部 `execution_count` 又为空，无法证明当前源码和输出来自同一次顺序执行。
7. **复现条件未固定。** 模型、数据和 metric revision 未固定，随机 seed 未设置，`model`、`trainer`、`training_args` 与输出目录反复复用。

## 我们怎样实践理解

### 问题

冻结 encoder 后，梯度究竟去了哪里？分类标签和 NER 标签为什么不能使用同一种输出形状？WordPiece 拆分后，实体标签应如何延续？

### 运行前预测

- head-only：只有分类头有梯度并更新；
- last-block-plus-head：最后一个 Transformer block 与分类头更新；
- full：词嵌入、早期层、最后层和分类头都更新；
- sequence classification 输出每条文本一个标签分布，token classification 输出每个 Token 一个标签分布；
- `Maarten` 的第一个子词是 `B-PER`，后续子词应改为 `I-PER`。

### 固定条件

- 使用已缓存 `all-MiniLM-L6-v2` revision `1110a243fdf4706b3f48f1d95db1a4f5529b4d41`；
- 该代理是 6 层、hidden size 384 的 BERT 家族模型，权重文件 90,868,376 bytes；
- CPU、seed 42、8 条固定影评、5 个优化步骤；
- encoder 学习率 `2e-5`，分类头学习率 `5e-2`；
- 唯一变化是 trainable scope；
- `local_files_only=True`，并强制 Hugging Face、Transformers、Datasets 离线。

### 复现：不会下载

```powershell
.\projects\hands-on-large-language-models\.runtime\venv\Scripts\python.exe `
  .\projects\hands-on-large-language-models\experiments\phase-09-finetuning-bert\run_freeze_and_labels.py
```

如果固定代理模型不在本地缓存，脚本会报错停止，不会联网获取。结果写入 `results/freeze-and-labels-results.json`。

## 正式结果：冻结真正改变了什么

| 策略 | 可训练参数 | 占全部参数 | 额外 gradient + Adam 估算 | 确认发生更新的位置 |
| --- | ---: | ---: | ---: | --- |
| 只训练头 | 770 | 0.003390% | 0.009MiB | classifier |
| 最后一层 + 头 | 1,775,234 | 7.815599% | 20.316MiB | layer 5 + classifier |
| 全量 encoder + 头 | 22,713,986 | 100% | 259.941MiB | embedding、layer 0、layer 5、classifier |

三个分支都从完全相同的初始 batch loss 0.692400 开始。5 步后分别降到 0.001653、0.001257 和 0.000202；这 8 条训练样本也都达到 100% batch accuracy。

这里不能得出“全量微调最好”。它只说明更大范围的参数参与了这一个训练 batch，并且训练损失降得更低。batch accuracy 不是独立测试，真实选择还要比较 validation/test、训练稳定性、显存、耗时和灾难性遗忘。

## 任务头输出形状

同一个 `[2, 7, 384]` hidden state 经过不同头后：

- sequence classification：`[2, 2]`，两条文本各有一个二分类分布；
- token classification：`[2, 7, 9]`，两条文本的 7 个位置各有一个九分类分布；
- MLM：Notebook 使用 `[batch, sequence, vocabulary]`，但只对被 mask 的标签位置计算损失。

模型头不是装饰，它决定“一个训练标签对应整段、一个 Token，还是词表中的某个候选”。

## BIO 与 WordPiece 实践

`My name is Maarten.` 被代理 tokenizer 切为：

```text
[CLS] my name is ma ##arte ##n . [SEP]
 -100  O   O   O   B     I     I O  -100
```

特殊 Token 用 `-100` 排除损失；`Maarten` 第一个子词继承 `B-PER`，后两个子词必须延续为 `I-PER`。

正确的 seqeval 输入是一条包含 7 个有效 Token 的序列；Notebook 单元 57 实际构造出 7 条、每条只有 1 个 Token 的序列。即使逐 Token 标签大多正确，实体跨度仍可能被错误拆分。

## 你接下来应该怎么改

1. 把 `last-block-plus-head` 改成最后两个 block，先预测可训练参数和哪些探针会更新。
2. 保持冻结策略不变，新增独立测试文本，比较 batch accuracy 与真正的测试 F1。
3. 把 `Maarten` 换成不被拆词的人名，再解释为什么标签数量发生变化。
4. 构造一个 `B-ORG I-ORG` 预测被打断的例子，分别算 Token accuracy 与实体跨度 F1。
5. 真正运行完整 Notebook 时，先创建 validation split、固定 revision/seed，并为每条路径使用独立输出目录。

## 理解检查

- 冻结参数为什么仍然参与前向计算，却没有 gradient 和 optimizer 更新？
- 为什么 770 个可训练参数也能把 8 条训练数据拟合到 100%，但不能证明泛化？
- sequence classification 与 token classification 的标签数量分别由什么决定？
- 如果把每个 `I-PER` Token 当作独立序列，实体级 F1 的含义为什么会被破坏？

## 结论边界

本轮验证的是冻结范围、梯度触达、输出形状和 BIO 对齐机制，不是 `bert-base-cased`、SetFit 或 CoNLL 基准复现。代理模型、8 条合成影评和单条人名序列不能代表生产质量。大型模型、数据集、SetFit/seqeval 依赖与 10-epoch checkpoint 均未下载或生成。
