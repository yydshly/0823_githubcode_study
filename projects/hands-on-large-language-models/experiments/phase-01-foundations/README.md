# Phase 01：第 1—3 章基础机制冒烟实验

## 结论

2026-08-24 在本机完成了第一轮真实运行验证。四项测试全部通过：

| 测试 | 结果 | 关键证据 |
| --- | --- | --- |
| 第 2 章 Tokenizer 对比 | 通过 | 5/5 个 Tokenizer 成功；同一输入产生 23—41 个 Token |
| 第 1 章指令生成路径 | 通过（代理模型） | 135M 模型在 CPU 生成 48 个新 Token，用时 3.175 秒 |
| 第 3 章 next-token logits | 通过（代理模型） | logits 形状为 1×5×49152，argmax 解码为 “ Paris” |
| 第 3 章 KV Cache | 通过（代理模型） | 30 层缓存；有缓存中位数 1.4778 秒，无缓存 5.5855 秒 |

KV Cache 在这次小模型 CPU 冒烟测试中约快 3.78 倍。它只是一次机制验证，不是正式性能基准。

机器可读结果见 [results/smoke-results.json](results/smoke-results.json)。

## 为什么使用代理模型

上游第 1、3 章直接以半精度方式把 `microsoft/Phi-3-mini-4k-instruct` 放入 CUDA。该模型约 3.8B 参数，仅半精度参数理论上就接近 7.6GB；当前 RTX 4070 Laptop GPU 只有 8188MiB，尚需为 KV Cache、激活值和框架保留显存。

因此本轮采用两层证据：

1. Phi-3 的 Tokenizer 直接真实运行；
2. 生成、logits 与 KV Cache 使用公开的 `HuggingFaceTB/SmolLM2-135M-Instruct` 验证相同代码路径。

这证明基础机制能够运行，但不证明 Phi-3 的输出质量、显存占用或性能已经复现。

## 运行环境

- Windows 10 build 26200
- Python 3.10.11
- CPU 执行；32 个逻辑核心；15.63GiB 内存
- 可见 GPU：NVIDIA GeForce RTX 4070 Laptop GPU，8188MiB
- PyTorch 2.3.1+cpu
- Transformers 4.41.2
- NumPy 1.26.4
- 上游提交：`ea3390819997999a51983677b80b3aac4dc50ada`

## 复现命令

在研究库根目录执行：

```powershell
`$runtime = 'projects\hands-on-large-language-models\.runtime'
python -m venv "`$runtime\venv"

`$python = "`$runtime\venv\Scripts\python.exe"
& `$python -m pip install -r `
  'projects\hands-on-large-language-models\experiments\phase-01-foundations\requirements-smoke.txt'

`$env:HF_HOME = "`$runtime\hf-home"
`$env:PYTHONUTF8 = '1'
& `$python `
  'projects\hands-on-large-language-models\experiments\phase-01-foundations\run_smoke.py'
```

首次运行会下载 5 个 Tokenizer 和约 269MB 的代理模型权重。再次运行可设置：

```powershell
`$env:HF_HUB_OFFLINE = '1'
`$env:TRANSFORMERS_OFFLINE = '1'
```

本轮离线复跑用时 21.08 秒并返回退出码 0。

## 实际观察

### Tokenizer 不只是“切词”

- `bert-base-uncased` 把大小写归一化，并把 emoji 与中文字符变成未知 Token。
- `bert-base-cased` 保留大小写，但大写单词被拆成更多子词。
- GPT-2 使用字节级表示，Token 列表看起来破碎，但能无损还原输入。
- Flan-T5 对 emoji 与中文字符产生未知 Token。
- Phi-3 Tokenizer 用字节 Token 保存 emoji 与中文，能够还原原文，但本例 Token 数最多。

因此 Tokenizer 会直接改变上下文长度、模型可见信息和推理成本。

### 生成成功不等于质量合格

代理模型成功走通指令模板、Tokenize、前向计算和逐 Token 生成，但输出出现重复。这说明“代码路径通过”和“回答质量可用”必须分开评估。

### logits 是下一 Token 的完整候选分布

输入 “The capital of France is” 得到形状 `[1, 5, 49152]`。最后一个位置在 49152 个词表项上取 argmax，解码结果为 “ Paris”。

### KV Cache 避免重复计算历史 Token

模型返回 30 层 `past_key_values`。在固定输入和 20 个新 Token 下：

- 有缓存：1.4607、1.4949 秒；
- 无缓存：5.5237、5.6473 秒。

这次数据支持上游第 3 章的机制说明，但不能替代多轮、预热、不同长度和 GPU 环境下的正式基准。

## 失败与修复记录

1. 首次 CPU PyTorch 安装只使用专用索引，普通构建依赖解析失败；修复为 CPU 索引加 PyPI 备用源。
2. 自动解析得到 NumPy 2.2.6，PyTorch 2.3.1 发出二进制兼容警告；按上游要求固定到 NumPy 1.26.4。
3. 首次运行在写完结果后，Windows GBK 控制台无法打印 🎵；脚本改为 UTF-8，并在离线模式复跑通过。

这些失败都属于可复现环境的一部分，不能从研究记录中删除。

## 下一步

- 若要完全复现第 1、3 章原代码，应使用显存更充足的 GPU 环境直接加载 Phi-3。
- 当前机器可另做 4-bit 量化实验，但那属于“适配后的消费级 GPU 路径”，不能冒充上游原代码复现。
- 研究主线下一步进入第 4、5、8 章，为分类、主题建模和 RAG 建立统一小数据集与评测指标。
