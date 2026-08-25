# 第 12 章实践：量化省的是底座存储，LoRA学的是低秩增量，DPO追随的是偏好标签

本阶段固定研究上游提交 `ea3390819997999a51983677b80b3aac4dc50ada`。完整 Notebook 使用 TinyLlama、UltraChat、DPO 偏好对、bitsandbytes、PEFT 和 TRL；这些资源与依赖未在本地完整存在，因此本轮不下载、不安装，也不运行完整 GPU 训练。

我们只使用已经缓存的 `HuggingFaceTB/SmolLM2-135M-Instruct`，手写一个最小 LoRA 层，在真实 causal LM 的 `q_proj` 上检查梯度和参数变化；SFT 标签掩码与 DPO 目标也直接写成可观察的小实验。

## 先读代码：第 12 章实际是两段训练

| 阶段 | 输入数据 | 底座与可训练部分 | 目标 | Notebook 保存物 |
| --- | --- | --- | --- | --- |
| SFT | UltraChat 多轮 `messages`，格式化成一段聊天文本 | TinyLlama 1.1B 4-bit + rank-64 LoRA | 下一 Token 交叉熵 | `TinyLlama-1.1B-qlora` adapter |
| DPO | `prompt / chosen / rejected` 三列 | SFT 模型 + 新的 rank-64 LoRA | 提高 chosen 相对 rejected 的策略优势 | `TinyLlama-1.1B-dpo-qlora` adapter |

量化、LoRA、SFT、DPO分别回答不同问题：

- **4-bit量化**：底座权重怎样以更少内存参与计算；
- **LoRA**：不改底座矩阵，只训练低秩增量 `BA`；
- **SFT**：哪些文本 Token 被当成“正确下一个 Token”；
- **DPO**：同一提示下，哪一个回答应相对另一个获得更高概率。

它们不是四种相互替代的模型能力，而是可以串联的存储、参数化、数据和目标选择。

## 暂不下载的资源

| 资源 | Notebook用途 | 已观察规模 | 本轮处理 |
| --- | --- | ---: | --- |
| `TinyLlama-1.1B-intermediate-step-1431k-3T` | SFT与DPO底座 | Notebook与[官方文件页](https://huggingface.co/TinyLlama/TinyLlama-1.1B-intermediate-step-1431k-3T/blob/main/model.safetensors)均显示 `model.safetensors` 为4.4GB | 不下载 |
| `HuggingFaceH4/ultrachat_200k` | SFT聊天数据 | Notebook八个分片合计约1.62GB；[官方数据页](https://huggingface.co/datasets/HuggingFaceH4/ultrachat_200k)也显示总文件1.62GB | 不下载 |
| `argilla/distilabel-intel-orca-dpo-pairs` | DPO偏好对 | [官方文件页](https://huggingface.co/datasets/argilla/distilabel-intel-orca-dpo-pairs/tree/main)显示79.2MB | 不下载 |
| `peft / trl / bitsandbytes` | Adapter、Trainer和4-bit CUDA路径 | 当前项目环境均未安装 | 不安装 |

Notebook 在 `load_dataset(...).select(range(3_000))` 之前已经加载完整 UltraChat，因此“只选3,000条”不会把下载缩小到3,000条。完整路径还会创建 SFT adapter、DPO adapter、`./results` 训练输出，并在 merge 时重新形成底座模型视图。

1.1B参数若以FP32原始权重计算约为4.4GB；4-bit原始位宽约为0.55GB，即8倍缩减。但0.55GB不是实际训练显存：还需量化scale、激活、LoRA参数、梯度、optimizer state和CUDA工作区。

## 源码完整性审计

1. **SFT训练使用 `test_sft`。** 单元5没有使用 `train_sft`，也没有留下独立验证/测试协议。
2. **选择3,000条发生在完整下载之后。** Notebook保存输出显示八个UltraChat分片，总计约1.62GB。
3. **SFT默认训练整段聊天文本。** 单元15只传 `dataset_text_field="text"`，没有completion-only或assistant-only collator。按照[TRL的SFT数据说明](https://huggingface.co/docs/trl/main/sft_trainer)，纯文本语言建模数据在没有标签mask时会复制 `input_ids` 为labels；用户提示也参与loss。
4. **padding设置与Trainer警告冲突。** 源码设置left padding，保存的SFTTrainer警告建议FP16训练使用right padding。
5. **没有保存可比较的训练/评估指标。** SFT和DPO只有进度对象与警告；没有eval dataset、loss汇总、偏好准确率或独立生成评分。
6. **DPO前后示例输出完全相同。** 单元19与30的保存文本字节级相同，不能证明DPO带来变化。
7. **标题写PPO/DPO，但只实现DPO。** Notebook中不存在 `PPOTrainer`。
8. **SFT到DPO的模型变量不清晰。** 单元24得到 `merged_model`，但单元26继续准备 `model`，随后DPOTrainer又收到 `peft_config`；应明确“已合并SFT底座”与“新DPO adapter”的对象身份。
9. **运行证据不完整。** 全部代码单元 `execution_count` 为空；保存输出包含参数弃用警告；模型、数据revision和完整随机条件未固定。

## 我们怎样实践理解

### 问题

LoRA到底冻结了什么？rank改变的是参数量还是质量保证？SFT把哪些Token当标签？DPO真的知道哪个回答真实吗？

### 运行前预测

- 冻结底座并只训练LoRA时，base `q_proj` 与embedding没有梯度、没有参数变化；
- LoRA初始 `B=0`，第一步 `A` 梯度可以为0，`B`先获得梯度；后续两者都会更新；
- 把prompt标签设为 `-100` 后，SFT只对assistant部分计算loss；
- DPO从零margin开始会增加chosen相对rejected的margin，交换标签会反转梯度；
- 更高rank能表示更高秩的更新，但不能修复错误数据或缺失评估。

### 固定条件

- 已缓存模型：`SmolLM2-135M-Instruct` revision `12fd25f77366fa6b3b4b768ec3050bf629380bac`；
- CPU、seed 42、强制离线、`local_files_only=True`；
- 一个固定user/assistant样本；
- 只替换第0层一个真实 `q_proj`；
- rank 4、alpha 8、3个AdamW步骤；
- DPO只计算透明的标量目标，不训练语言模型。

### 运行

从仓库根目录执行：

```powershell
$env:HF_HUB_OFFLINE='1'
$env:TRANSFORMERS_OFFLINE='1'
$env:HF_DATASETS_OFFLINE='1'
.\projects\hands-on-large-language-models\.runtime\venv\Scripts\python.exe `
  .\projects\hands-on-large-language-models\experiments\phase-10-generation-finetuning\run_adapter_and_preference.py
```

脚本不会调用 `pip`、`load_dataset` 或远端模型；也不会保存任何模型checkpoint。

## 实际观察

### 1. 一个真实q_proj上的LoRA

| 指标 | 结果 |
| --- | ---: |
| 代理模型基础参数 | 134,515,008 |
| 新增/可训练LoRA参数 | 4,608 |
| 可训练比例 | 0.003426% |
| gradient + Adam额外状态估算 | 0.052734MiB |
| assistant-only loss | 5.093253 → 5.026644 |

基础 `q_proj` 与embedding的最大变化均为 `0`；LoRA A/B最大变化分别为 `0.016035888344` 与 `0.030039507896`。第一步A梯度为0、B梯度为0.018641492；到第二步A也获得梯度0.06441135，符合“B从零开始”的LoRA初始化路径。

如果把Notebook列出的7类模块应用到代理模型全部30层，参数预算随rank线性变化：

| rank | Adapter参数 |
| ---: | ---: |
| 1 | 305,280 |
| 4 | 1,221,120 |
| 8 | 2,442,240 |
| 16 | 4,884,480 |
| 64 | 19,537,920 |

rank控制的是低秩更新容量与成本，不是质量保证。一个构造为rank-12的目标更新矩阵，用rank 1/4/8近似时相对误差分别为0.896395、0.646021、0.360200；rank 12才能在数值精度内完全表达。

### 2. SFT标签不是“整段文本”与“assistant回答”的同义词

固定聊天共有53个Token。纯文本语言建模方式使用53个标签Token；把prompt位置设为 `-100` 后，assistant-only只剩14个标签Token。两种路径训练的责任不同：前者也在学习复述用户/模板，后者集中学习回答部分。

### 3. DPO学习偏好方向，不验证偏好真伪

`beta=0.1`时，relative margin为 `-2 / 0 / 2` 的loss分别是 `0.798139 / 0.693147 / 0.598139`。从margin 0优化6步后变为0.298131，loss持续下降。

同一对答案在margin 0.5时：

- chosen保持原标签：梯度 `-0.048750`，优化器会继续提高margin；
- chosen/rejected互换：梯度 `+0.051250`，更新方向反转。

因此DPO忠实执行偏好标注，但它不独立判断事实、安全或价值。如果chosen本身有问题，loss下降仍可能意味着模型更稳定地偏向错误回答。

## 结论边界

本实验验证了：真实causal LM上的LoRA梯度范围、rank参数预算、assistant-only标签mask以及DPO目标方向。它没有验证bitsandbytes NF4 CUDA kernel、PEFT/TRL集成、TinyLlama生成质量、完整SFT/DPO收敛、偏好数据质量、安全性或泛化。

两次强制离线运行得到字节级相同的结果JSON，SHA-256为 `4D9F559E77B9FA352B2F6D650572CCDC9D40BDD03147B3AAC3570211CF1EFE17`。

## 继续修改

1. 把单层rank从4改为1或8，先预测可训练参数、初始梯度和3步loss。
2. 把adapter从一个 `q_proj` 扩到同层 `q_proj + v_proj`，检查参数公式与冻结探针。
3. 对同一聊天分别使用full-sequence与assistant-only标签，比较prompt Token的梯度责任。
4. 把DPO的chosen/rejected互换，或把beta从0.1改成1.0，解释loss与梯度变化。
5. 若以后获准运行完整路径，先改用训练split、独立validation、明确SFT/DPO adapter对象，并保存before/SFT/DPO三组固定提示评分。

## 理解检查

- 4-bit量化为什么减少底座存储，却不等于只训练4-bit整数？
- rank从4变为64时，哪些参数增长，哪些底座权重仍冻结？
- 为什么纯文本SFT会把user prompt也当标签？
- DPO margin为正说明了什么，又不能说明什么？
- 为什么DPO前后同一段输出，不能证明“没有学到”，也不能证明“已经变好”？

机器可读结果见 [`results/adapter-and-preference-results.json`](results/adapter-and-preference-results.json)。
