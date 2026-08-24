# 第 6 章实践：一个示例怎样改变输出

这一轮不比较“哪个回答看起来更好”，而是把提示工程变成一个可量化的控制变量实验：模型、JSON 规则、测试记录和 greedy 解码都不变，只观察加入一个完整输入—输出示例后发生什么。

## 要回答的问题

当提示已经明确规定 JSON 字段时，再提供一个 one-shot 示例，会帮助小模型把规则落实成输出模式，还是会让它错误复制示例内容？

在先导测试前记录的判断：

1. 两组都写明 JSON 规则，应该都能产生一部分合法 JSON。
2. 示例可能让格式更稳定，也可能让 135M 小模型锚定在示例人物 `Ivo` 上。
3. JSON 合法、字段结构正确、字段值正确是三项不同验收，必须分别计分。

## 先从代码中纠正几个误解

本轮检查的是固定提交中第 6 章 Notebook 的代码单元，不是只看章节标题。源码实际覆盖 Phi-3 加载、采样参数、提示组件、上下文示例、Prompt Chaining、CoT、多角色推理、JSON 模板与 llama.cpp 语法约束。

但保存的 Notebook 结果不能直接当成实验结论：

- Cell 13 先定义长文章，随后又把 `text` 覆盖成 `MY TEXT TO SUMMARIZE`；Cell 15 保存输出却仍在总结旧长文，当前源码与输出不一致。
- Cell 24 已经全部注释，却保留一段生成答案。
- Cells 7/8 都只是打开采样，`temperature=1` 和 `top_p=1` 又接近中性默认值；没有种子和重复试验，两个不同笑话不能分别证明 temperature 与 top-p 的作用。
- Cell 29 所谓 Tree-of-Thought 只是让单个模型一次性扮演三位专家，没有分支、评分、剪枝或回退搜索。
- Cell 34 是字段模板，不是完整的 user→assistant one-shot 示例。
- Cells 33/34 只打印 JSON 样式文字；真正的 `json.loads` 验证直到 Cell 39 才出现。

因此我们的实践重新运行模型、保留原始文字并用程序评分，不复用这些保存输出。

## 控制变量

| 固定项 | 值 |
| --- | --- |
| 模型 | `HuggingFaceTB/SmolLM2-135M-Instruct`，固定 revision `12fd25f...` |
| 任务 | 4 条先导记录 + 12 条互不重合的正式记录 |
| 输出规则 | 只允许 `character`、`armor`、`weapon` 三个 JSON 字段，并要求原样复制值 |
| 解码 | CPU、`do_sample=False`、`max_new_tokens=64`、seed 42 |
| 唯一变化项 | 是否增加一组 Ivo / leather coat / iron dagger 输入—输出示例 |

上游使用约 3.8B 参数的 Phi-3 Mini 和 CUDA；本轮复用已经缓存的 135M CPU 代理模型，验证提示机制，不声称复现 Phi-3 的质量。

## 怎样评分

模型原始输出不会先去 Markdown、补引号或截取 JSON 再评分：

- **合法 JSON**：整段输出能否直接被 `json.loads` 解析为对象。
- **精确 Schema**：是否恰好只有三个规定字段。
- **完整记录正确**：JSON、字段和三个字段值是否全部严格正确。
- **字段正确率**：36 个正式字段中有多少完全相等。
- **示例复制**：是否把 `Ivo`、`leather coat` 或 `iron dagger` 错写到新记录。

这一区分很重要：一段文字可以“肉眼看到 JSON”，但因为夹带 Markdown 或解释文字而不能直接交给程序；合法 JSON 也仍可能包含错误值。

## 实际结果

### 4 条先导记录

| 提示 | 合法 JSON | 完整记录正确 | 字段正确 |
| --- | ---: | ---: | ---: |
| 只有规则 | 2 / 4 | 2 / 4 | 6 / 12 |
| 规则 + one-shot 示例 | 4 / 4 | 3 / 4 | 10 / 12 |

先导结果显示示例方向更好且没有复制示例，因此正式运行前记录预测：one-shot 会提高字段正确率，并且不会复制 Ivo 的值。

### 12 条正式记录

| 提示 | 合法 JSON | 精确 Schema | 完整记录正确 | 字段正确 | 复制示例字段 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 只有规则 | 6 / 12 | 6 / 12 | 6 / 12 | 18 / 36 | 0 |
| 规则 + one-shot 示例 | 12 / 12 | 12 / 12 | 12 / 12 | 36 / 36 | 0 |

正式结果重复了先导方向：加入一个示例后，完整记录正确率从 **50% 提高到 100%**，36 个字段全部严格匹配，也没有出现示例复制。

## 失败输出教会了什么

没有示例时的 6 条失败不是同一种错误：

- 有些回答在 JSON 外加上 `JSON:`、Markdown 代码围栏和解释段落，肉眼可读但整段不能直接解析。
- 有一条没有给 `obsidian plate` 和 `sun hammer` 加引号，生成了非法 JSON。
- 多条输出到 64 Token 上限时仍在重复第二份 JSON，最终被截断。
- `brass cuirass` 曾被缩成 `brass`，即使结构修好也会是语义错误。

one-shot 示例在本轮中不只是重复规则，而是给小模型展示了“答案应该多短、引号放在哪里、何时停止”。这提高的是任务约束遵循，不代表模型获得了新的知识或推理能力。

## 你应该能解释什么

- 为什么“输出看起来像 JSON”不等于“程序可以直接解析”。
- 为什么精确 Schema 仍不能证明字段值正确。
- 为什么本轮 one-shot 有效，却不能推出 one-shot 在所有模型和任务上都有效。
- 为什么 llama.cpp 的 grammar 约束不能直接放进这组提示 A/B：它同时更换了后端和解码约束，会形成混杂变量。

## 继续动手

每次只改一项并先写预测：

- 把示例人物替换成中文名字，检查相同趋势是否保持。
- 故意让示例多一个 `level` 字段，观察模型会遵循文字规则还是复制示例结构。
- 将 `max_new_tokens` 从64改为32，判断两组的截断风险怎样变化。
- 在更强模型上复跑同一12条记录，检查示例收益是否缩小。
- 单独增加 llama.cpp grammar 组，但把它定义为“强制解码能力”实验，不和提示 A/B 混为同一因果比较。

## 复现

在项目的 Python 3.10 环境中：

```powershell
python -m pip install -r experiments/phase-04-prompt-engineering/requirements-smoke.txt
python experiments/phase-04-prompt-engineering/run_prompt_engineering.py
```

模型缓存完成后，可设置 `HF_HUB_OFFLINE=1` 与 `TRANSFORMERS_OFFLINE=1` 离线运行。本次最终结果来自完全离线复跑，模型加载约1.9秒，32次生成合计约99秒。

机器可读证据见 [`results/prompt-engineering-results.json`](results/prompt-engineering-results.json)，可执行入口见 [`run_prompt_engineering.py`](run_prompt_engineering.py)。

## 证据边界

- 135M CPU 代理模型不是上游 Phi-3 Mini 的质量或性能复刻。
- 12 条合成 RPG 记录和一个示例只能支持描述性比较，不能证明 one-shot 普遍有益。
- greedy 解码保证本轮稳定复现，但没有评估采样波动或创意质量。
- 结果按原始输出严格评分；“去首尾空格后正确”只作为次要诊断，不替代严格结果。
- 没有运行 llama.cpp grammar，因为它会把提示变化与后端/强制解码变化混在一起。
