"""Chapter 12 zero-download audit: LoRA scope, SFT labels and DPO margins.

This script deliberately avoids PEFT, TRL, bitsandbytes, external datasets and
uncached model assets. It uses the existing SmolLM2-135M-Instruct cache as a
small causal-LM proxy and implements one LoRA linear wrapper explicitly.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import platform
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = SCRIPT_DIR.parents[1]
RUNTIME_DIR = PROJECT_DIR / ".runtime"
HF_HOME = RUNTIME_DIR / "hf-home"
RESULT_PATH = SCRIPT_DIR / "results" / "adapter-and-preference-results.json"
NOTEBOOK_PATH = (
    PROJECT_DIR
    / "upstream"
    / "chapter12"
    / "Chapter 12 - Fine-tuning Generation Models.ipynb"
)

os.environ["HF_HOME"] = str(HF_HOME)
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_DATASETS_OFFLINE"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

import torch
import torch.nn as nn
import torch.nn.functional as F
from transformers import AutoModelForCausalLM, AutoTokenizer


MODEL_ID = "HuggingFaceTB/SmolLM2-135M-Instruct"
MODEL_REVISION = "12fd25f77366fa6b3b4b768ec3050bf629380bac"
MODEL_WEIGHT_BYTES = 269_060_552
SEED = 42


class LoRALinear(nn.Module):
    """A minimal LoRA wrapper: y = Wx + alpha/r * B(Ax)."""

    def __init__(self, base: nn.Linear, rank: int, alpha: float) -> None:
        super().__init__()
        self.base = base
        self.rank = rank
        self.scaling = alpha / rank
        for parameter in self.base.parameters():
            parameter.requires_grad = False
        self.lora_a = nn.Parameter(torch.empty(rank, base.in_features))
        self.lora_b = nn.Parameter(torch.zeros(base.out_features, rank))
        nn.init.kaiming_uniform_(self.lora_a, a=math.sqrt(5))

    def forward(self, inputs: torch.Tensor) -> torch.Tensor:
        base_output = self.base(inputs)
        adapter_output = F.linear(F.linear(inputs, self.lora_a), self.lora_b)
        return base_output + adapter_output * self.scaling


def rounded(value: float, digits: int = 9) -> float:
    return round(float(value), digits)


def max_delta(before: torch.Tensor, after: torch.Tensor) -> float:
    return rounded((after.detach() - before).abs().max().item(), 12)


def notebook_audit() -> dict:
    notebook = json.loads(NOTEBOOK_PATH.read_text(encoding="utf-8"))
    cells = notebook["cells"]

    def source(index: int) -> str:
        return "".join(cells[index].get("source", []))

    def text_output(index: int) -> str:
        chunks: list[str] = []
        for output in cells[index].get("outputs", []):
            chunks.extend(output.get("text", []))
        return "".join(chunks)

    sft_output = text_output(19)
    dpo_output = text_output(30)
    return {
        "cellCount": len(cells),
        "executionCountsPresent": sum(
            cell.get("execution_count") is not None for cell in cells if cell["cell_type"] == "code"
        ),
        "operativeCells": [2, 5, 6, 8, 11, 13, 15, 17, 19, 22, 24, 26, 27, 28, 29, 30],
        "pipeline": {
            "sft": "UltraChat messages -> TinyLlama chat text -> 4-bit base -> rank-64 LoRA -> one epoch -> saved SFT adapter",
            "dpo": "filtered prompt/chosen/rejected pairs -> SFT model -> 4-bit load -> rank-64 LoRA -> 200 DPO steps -> saved DPO adapter",
        },
        "sourceChecks": {
            "usesTestSftForTraining": 'split="test_sft"' in source(5),
            "selectsThreeThousandAfterDatasetLoad": ".select(range(3_000))" in source(5),
            "sftHasCompletionOnlyCollator": "DataCollatorForCompletionOnlyLM" in source(15),
            "leftPaddingConfigured": 'padding_side = "left"' in source(8),
            "mergedModelAssignedBeforeDpo": "merged_model = model.merge_and_unload()" in source(24),
            "dpoPreparationUsesModelVariableNotMergedModel": "prepare_model_for_kbit_training(model)" in source(26),
            "ppoImplemented": "PPOTrainer" in "\n".join(source(i) for i in range(len(cells))),
        },
        "savedOutput": {
            "sftAndDpoExampleExactlyIdentical": sft_output == dpo_output,
            "exampleSha256": hashlib.sha256(sft_output.encode("utf-8")).hexdigest(),
            "sftNumericTrainingMetricsSaved": False,
            "dpoNumericTrainingMetricsSaved": False,
        },
    }


def build_sft_labels(tokenizer) -> tuple[dict, torch.Tensor, torch.Tensor]:
    user = "Explain why a frozen weight does not update."
    assistant = "Its gradient is disabled, so the optimizer cannot change it."
    full_messages = [
        {"role": "user", "content": user},
        {"role": "assistant", "content": assistant},
    ]
    prompt_messages = [{"role": "user", "content": user}]
    full_ids = tokenizer.apply_chat_template(
        full_messages,
        tokenize=True,
        add_generation_prompt=False,
        return_tensors="pt",
    )
    prompt_ids = tokenizer.apply_chat_template(
        prompt_messages,
        tokenize=True,
        add_generation_prompt=True,
        return_tensors="pt",
    )
    prompt_tokens = min(prompt_ids.shape[1], full_ids.shape[1])
    full_labels = full_ids.clone()
    assistant_labels = full_ids.clone()
    assistant_labels[:, :prompt_tokens] = -100
    assistant_count = int((assistant_labels != -100).sum().item())
    if assistant_count == 0:
        raise RuntimeError("Assistant-only mask removed every token")
    return (
        {
            "text": {"user": user, "assistant": assistant},
            "inputTokens": int(full_ids.numel()),
            "promptTokensMasked": prompt_tokens,
            "fullSequenceLabelTokens": int((full_labels != -100).sum().item()),
            "assistantOnlyLabelTokens": assistant_count,
            "interpretation": "A plain text language-modeling dataset copies input_ids into labels; an assistant-only objective masks prompt positions with -100.",
        },
        full_ids,
        assistant_labels,
    )


def module_rank_budget(model) -> dict:
    suffixes = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]
    targets = [
        module
        for name, module in model.named_modules()
        if isinstance(module, nn.Linear) and any(name.endswith(suffix) for suffix in suffixes)
    ]
    per_rank = sum(module.in_features + module.out_features for module in targets)
    return {
        "targetModules": len(targets),
        "targetSuffixes": suffixes,
        "adapterParametersByRank": {
            str(rank): per_rank * rank for rank in [1, 4, 8, 16, 64]
        },
        "formula": "sum over targeted linear layers of rank * (in_features + out_features); biases excluded",
    }


def lora_training_probe(model, input_ids: torch.Tensor, labels: torch.Tensor) -> dict:
    for parameter in model.parameters():
        parameter.requires_grad = False

    original = model.model.layers[0].self_attn.q_proj
    adapter = LoRALinear(original, rank=4, alpha=8.0)
    model.model.layers[0].self_attn.q_proj = adapter
    model.eval()

    trainable = [parameter for parameter in model.parameters() if parameter.requires_grad]
    total_parameters = sum(parameter.numel() for parameter in model.parameters())
    trainable_parameters = sum(parameter.numel() for parameter in trainable)
    optimizer = torch.optim.AdamW(trainable, lr=1e-2, weight_decay=0.0)

    base_before = adapter.base.weight.detach().clone()
    embedding_before = model.model.embed_tokens.weight.detach().clone()
    a_before = adapter.lora_a.detach().clone()
    b_before = adapter.lora_b.detach().clone()
    losses: list[float] = []
    gradient_norms: list[dict] = []

    with torch.no_grad():
        initial_loss = model(input_ids=input_ids, labels=labels).loss.item()

    for _ in range(3):
        optimizer.zero_grad(set_to_none=True)
        loss = model(input_ids=input_ids, labels=labels).loss
        loss.backward()
        losses.append(rounded(loss.item(), 6))
        gradient_norms.append(
            {
                "baseQWeight": None if adapter.base.weight.grad is None else rounded(adapter.base.weight.grad.norm().item()),
                "embedding": None if model.model.embed_tokens.weight.grad is None else rounded(model.model.embed_tokens.weight.grad.norm().item()),
                "loraA": rounded(adapter.lora_a.grad.norm().item()),
                "loraB": rounded(adapter.lora_b.grad.norm().item()),
            }
        )
        optimizer.step()

    with torch.no_grad():
        final_loss = model(input_ids=input_ids, labels=labels).loss.item()

    return {
        "target": "model.layers.0.self_attn.q_proj",
        "baseShape": list(adapter.base.weight.shape),
        "rank": 4,
        "alpha": 8.0,
        "totalParametersIncludingAdapter": total_parameters,
        "trainableParameters": trainable_parameters,
        "trainablePercent": rounded(100 * trainable_parameters / total_parameters, 6),
        "estimatedAdditionalGradientAndAdamMiB": rounded(trainable_parameters * 12 / (1024**2), 6),
        "initialAssistantOnlyLoss": rounded(initial_loss, 6),
        "trainingLossByStep": losses,
        "finalAssistantOnlyLoss": rounded(final_loss, 6),
        "gradientNormsByStep": gradient_norms,
        "maxAbsoluteParameterDeltas": {
            "baseQWeight": max_delta(base_before, adapter.base.weight),
            "embedding": max_delta(embedding_before, model.model.embed_tokens.weight),
            "loraA": max_delta(a_before, adapter.lora_a),
            "loraB": max_delta(b_before, adapter.lora_b),
        },
        "boundary": "One adapter on one real q_proj and one fixed training example; this verifies gradient scope, not instruction quality or generalization.",
    }


def rank_capacity_probe() -> dict:
    generator = torch.Generator().manual_seed(SEED)
    left = torch.randn(64, 12, generator=generator, dtype=torch.float64)
    right = torch.randn(12, 64, generator=generator, dtype=torch.float64)
    target_delta = left @ right
    u, singular_values, vh = torch.linalg.svd(target_delta, full_matrices=False)
    target_norm = torch.linalg.vector_norm(target_delta)
    errors: dict[str, float] = {}
    for rank in [1, 4, 8, 12, 16]:
        approximation = (u[:, :rank] * singular_values[:rank]) @ vh[:rank]
        errors[str(rank)] = rounded(torch.linalg.vector_norm(target_delta - approximation) / target_norm, 6)
    return {
        "targetDeltaShape": [64, 64],
        "constructedRank": 12,
        "relativeFrobeniusErrorByAdapterRank": errors,
        "interpretation": "Rank limits the dimension of the update; more rank increases capacity and parameters, but does not guarantee better task data or evaluation.",
    }


def dpo_loss(margin: torch.Tensor, beta: float) -> torch.Tensor:
    return -F.logsigmoid(beta * margin)


def dpo_probe() -> dict:
    loss_table: dict[str, dict[str, float]] = {}
    for beta in [0.1, 1.0]:
        loss_table[str(beta)] = {
            str(margin): rounded(dpo_loss(torch.tensor(float(margin)), beta).item(), 6)
            for margin in [-2, 0, 2]
        }

    margin = torch.tensor(0.0, requires_grad=True)
    optimizer = torch.optim.SGD([margin], lr=1.0)
    trace = []
    for _ in range(6):
        optimizer.zero_grad(set_to_none=True)
        loss = dpo_loss(margin, beta=0.1)
        loss.backward()
        trace.append(
            {
                "marginBeforeStep": rounded(margin.item(), 6),
                "loss": rounded(loss.item(), 6),
                "gradient": rounded(margin.grad.item(), 6),
            }
        )
        optimizer.step()

    probe_margin = torch.tensor(0.5, requires_grad=True)
    preferred_loss = dpo_loss(probe_margin, beta=0.1)
    preferred_loss.backward()
    preferred_gradient = probe_margin.grad.item()
    swapped_margin = torch.tensor(0.5, requires_grad=True)
    swapped_loss = dpo_loss(-swapped_margin, beta=0.1)
    swapped_loss.backward()
    return {
        "marginDefinition": "(policy chosen - policy rejected) - (reference chosen - reference rejected)",
        "lossByBetaAndMargin": loss_table,
        "sixStepScalarOptimization": trace,
        "finalMarginAfterSixSteps": rounded(margin.item(), 6),
        "labelSwapGradient": {
            "chosenAsPreferred": rounded(preferred_gradient, 6),
            "samePairSwapped": rounded(swapped_margin.grad.item(), 6),
        },
        "interpretation": "DPO increases the relative margin assigned by the dataset. Swapping chosen and rejected reverses the gradient; the objective does not independently establish truth or safety.",
    }


def main() -> None:
    torch.manual_seed(SEED)
    torch.set_num_threads(1)
    torch.use_deterministic_algorithms(True)

    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, local_files_only=True)
    model = AutoModelForCausalLM.from_pretrained(MODEL_ID, local_files_only=True)
    sft_mask, input_ids, assistant_labels = build_sft_labels(tokenizer)
    rank_budget = module_rank_budget(model)
    lora_probe = lora_training_probe(model, input_ids, assistant_labels)

    result = {
        "experiment": "Chapter 12 LoRA scope, SFT label and DPO margin audit",
        "predictionBeforeRun": "Frozen base weights should remain unchanged while LoRA matrices update; masking prompts should reduce SFT label positions; DPO should push the dataset-designated chosen response relative to rejected and reverse direction when labels swap.",
        "controlledVariables": "Cached proxy revision, one prompt/completion, one target q_proj, seed, optimizer, three SFT steps and DPO scalar settings are fixed.",
        "sourceNotebook": notebook_audit(),
        "downloadBoundary": {
            "executedDownloads": [],
            "tinyLlama": "Notebook and official file page report a 4.40 GB model.safetensors; absent locally and not downloaded.",
            "ultraChat": "Notebook downloads eight shards totaling about 1.62 GB before selecting 3,000 rows; absent locally and not downloaded.",
            "dpoPairs": "Notebook downloads 79.2 MB and filters 12,859 rows to 5,922; absent locally and not downloaded.",
            "missingTrainingPackages": ["peft", "trl", "bitsandbytes"],
            "action": "No install, dataset load, TinyLlama load, 4-bit GPU run or adapter checkpoint creation.",
        },
        "proxyModel": {
            "id": MODEL_ID,
            "revision": MODEL_REVISION,
            "weightFileBytes": MODEL_WEIGHT_BYTES,
            "architecture": {
                "parameters": 134_515_008,
                "layers": 30,
                "hiddenSize": 576,
            },
            "localFilesOnly": True,
            "role": "Existing causal-LM cache for gradient and token-label mechanics; not a TinyLlama QLoRA quality reproduction.",
        },
        "quantizationArithmetic": {
            "notebookBaseParametersApprox": 1_100_000_000,
            "fp32RawDecimalGB": 4.4,
            "fourBitRawDecimalGB": 0.55,
            "rawCompressionFactor": 8,
            "boundary": "This is raw weight arithmetic only; actual NF4 GPU memory also includes quantization metadata, activations, LoRA weights, gradients and optimizer state.",
        },
        "sftLabelProbe": sft_mask,
        "allSevenModuleRankBudgetOnProxy": rank_budget,
        "realModelLoRAProbe": lora_probe,
        "rankCapacityProbe": rank_capacity_probe(),
        "dpoPreferenceProbe": dpo_probe(),
        "sourceIntegrityFindings": [
            "Cell 5 trains on test_sft and selects 3,000 only after load_dataset downloads the full approximately 1.62 GB dataset.",
            "Cell 15 passes a plain text field without a completion-only or assistant-only collator, so the language-model objective covers user and assistant tokens.",
            "The tokenizer is configured for left padding, while the saved SFTTrainer warning recommends right padding for half-precision training.",
            "No eval_dataset, held-out generation rubric, numeric SFT metric or numeric DPO metric is saved; the before/after example generations are exactly identical.",
            "The heading says PPO/DPO, but no PPO implementation exists.",
            "Cell 24 assigns merged_model, but cells 26 and 28 continue with model and another peft_config; the intended SFT-to-DPO adapter state is ambiguous and should be made explicit.",
            "Only dataset shuffle fixes a seed; trainer seeds, model/dataset revisions and exact environment are not pinned in the Notebook.",
            "All code-cell execution_count values are empty and current TRL warnings show deprecated arguments, so saved outputs do not prove a clean current-version run.",
        ],
        "interpretationBoundary": "The local run verifies update scope, label masking, low-rank capacity and DPO direction. It does not verify bitsandbytes NF4 kernels, PEFT/TRL integration, TinyLlama generations, instruction following, preference quality, safety or generalization.",
        "environment": {
            "python": platform.python_version(),
            "torch": torch.__version__,
            "transformers": __import__("transformers").__version__,
            "device": "cpu",
            "seed": SEED,
            "offlineFlags": {
                name: os.environ[name]
                for name in ["HF_HUB_OFFLINE", "TRANSFORMERS_OFFLINE", "HF_DATASETS_OFFLINE"]
            },
        },
    }

    RESULT_PATH.parent.mkdir(parents=True, exist_ok=True)
    RESULT_PATH.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({
        "lora": result["realModelLoRAProbe"],
        "sft": result["sftLabelProbe"],
        "dpo": result["dpoPreferenceProbe"],
        "resultPath": str(RESULT_PATH),
    }, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
