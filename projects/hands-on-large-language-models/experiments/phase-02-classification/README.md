# Phase 02：第4章文本分类实践

## 这次要理解什么

第4章不是在讲一个唯一的“情感分类模型”，而是在比较多种把文本映射到标签的方法。固定同一批评论和同一个句向量模型后，本实验只改变标签证据的来源：

1. **零样本标签向量**：只把 `A negative movie review` 和 `A positive movie review` 编码成向量；
2. **类别中心**：看过带标签评论后，分别计算正面与负面评论的平均向量；
3. **逻辑回归**：用同一批带标签向量学习一条线性分类边界。

对应上游固定版本 Notebook 的代码单元 14、16、17、19、21、22、23。任务专用 RoBERTa、Flan-T5 和 ChatGPT 路径不在本轮低成本实践范围内。

## 运行前预测

- 两个简短标签不能充分描述影评语言，零样本标签向量应最弱；
- 类别中心看过真实评论后应明显改善；
- 逻辑回归能利用每条训练样本学习边界，应取得最高分。

## 实际结果

数据使用 Hugging Face `rotten_tomatoes`，从训练集按类别抽取 400 条、测试集按类别抽取 200 条，随机种子为 42。

| 判断方法 | 使用的监督信息 | Accuracy | Macro-F1 |
| --- | --- | ---: | ---: |
| 零样本标签向量 | 0 条带标签评论 | 0.6150 | 0.5726 |
| 类别中心 | 400 条评论压缩为2个中心 | 0.7250 | 0.7248 |
| Embedding + 逻辑回归 | 400 条评论学习线性边界 | 0.7350 | 0.7348 |

逻辑回归比零样本方案的 Macro-F1 高 **0.1622**，运行前预测得到验证。机器可读结果见 [results/classification-results.json](results/classification-results.json)。

## 如何解释

### 零样本为什么偏向正面

零样本混淆矩阵为 `[[30, 70], [7, 93]]`：100条负面评论中有70条被误判为正面。两个标签短语只是一个很弱的语义锚点，没有说明反讽、转折、影评写法和数据集的标签边界。

### 类别中心为什么提升明显

类别中心不再拿一句评论和两个抽象标签比较，而是和400条真实影评形成的两个代表位置比较。它仍没有学习复杂边界，但已经把“这个数据集中的正面与负面通常怎样表达”加入判断。

### 逻辑回归为什么只比类别中心高一点

本次 MiniLM 向量已经包含较强语义结构，两个类别在向量空间中可以用简单代表点区分。逻辑回归进一步学习了线性边界，但在400条训练样本下只增加约0.01 Macro-F1。这里更大的增益来自“见过任务数据”，不是换了复杂分类器。

一个可观察例子是：

> The acting is polished, but the story is painfully dull.

零样本方案判断为正面；类别中心和逻辑回归都判断为负面。监督样本让模型更能处理“前半句正向、结论负向”的影评表达。

## 理解检查

如果真正理解了本实验，应该能回答：

1. 三种方法的文本向量完全相同，为什么结果仍然不同？
2. 类别中心使用了标签，为什么它仍不等于训练分类器？
3. 把标签文字改成 `bad movie` / `good movie`，哪一种方法会直接变化？
4. 为什么这次结果不能证明逻辑回归在所有文本分类任务中最好？

## 继续修改

建议按顺序做三个变化，每次只改一个变量：

1. 修改 `LABEL_TEXTS`，观察零样本分数和正负偏置；
2. 用 `--train-per-class 20`、`50`、`100`、`200` 画监督数据量学习曲线；
3. 把代理模型改成上游的 `sentence-transformers/all-mpnet-base-v2`，比较精度、下载大小和CPU耗时。

## 复现

在研究库根目录执行：

```powershell
$python = 'projects\hands-on-large-language-models\.runtime\venv\Scripts\python.exe'
& $python -m pip install -r `
  'projects\hands-on-large-language-models\experiments\phase-02-classification\requirements-smoke.txt'

$env:HF_HOME = 'projects\hands-on-large-language-models\.runtime\hf-home'
$env:PYTHONUTF8 = '1'
& $python `
  'projects\hands-on-large-language-models\experiments\phase-02-classification\run_classification.py'
```

首次运行下载数据集与约90MB的 MiniLM 模型。缓存完成后可以离线复跑：

```powershell
$env:HF_HUB_OFFLINE = '1'
$env:TRANSFORMERS_OFFLINE = '1'
$env:HF_DATASETS_OFFLINE = '1'
& $python `
  'projects\hands-on-large-language-models\experiments\phase-02-classification\run_classification.py'
```

离线复跑返回码为0，结果一致；最终记录的本机缓存运行时间为2.42秒。

## 证据边界

- 上游使用 `all-mpnet-base-v2`，本实验用 `all-MiniLM-L6-v2` 作为CPU低成本代理模型；
- 使用平衡子集，不是上游完整训练集与测试集评测；
- 没有运行任务专用 RoBERTa、Flan-T5 或付费 ChatGPT；
- 单个随机种子用于机制学习，不能当成生产基准或模型排名。
