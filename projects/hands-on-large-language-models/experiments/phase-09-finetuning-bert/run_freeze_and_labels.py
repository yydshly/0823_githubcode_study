"""Audit frozen gradients, task-head shapes and BIO alignment without downloads."""

from __future__ import annotations

import gc
import json
import os
import platform
import random
import time
from datetime import datetime, timezone
from pathlib import Path


EXPERIMENT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = EXPERIMENT_DIR.parents[1]
HF_HOME = PROJECT_DIR / ".runtime" / "hf-home"
os.environ.setdefault("HF_HOME", str(HF_HOME))
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
os.environ.setdefault("HF_DATASETS_OFFLINE", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

import torch
from sentence_transformers import SentenceTransformer
from torch import nn


MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"
MODEL_REVISION = "1110a243fdf4706b3f48f1d95db1a4f5529b4d41"
SEED = 42
STEPS = 5
ENCODER_LR = 2e-5
HEAD_LR = 5e-2

TEXTS = [
    "A moving film with thoughtful performances.",
    "The story is warm, funny, and beautifully acted.",
    "An absorbing movie that rewards close attention.",
    "The direction is confident and the ending works.",
    "A dull film with lifeless performances.",
    "The story is tedious, confused, and badly acted.",
    "A forgettable movie that wastes its premise.",
    "The direction is clumsy and the ending fails.",
]
LABELS = torch.tensor([1, 1, 1, 1, 0, 0, 0, 0], dtype=torch.long)


def set_seed(seed: int) -> None:
    random.seed(seed)
    torch.manual_seed(seed)


def load_backbone_and_tokenizer():
    wrapper = SentenceTransformer(
        MODEL_ID,
        revision=MODEL_REVISION,
        device="cpu",
        local_files_only=True,
    )
    return wrapper[0].auto_model, wrapper.tokenizer


class MeanPoolClassifier(nn.Module):
    def __init__(self, encoder: nn.Module) -> None:
        super().__init__()
        self.encoder = encoder
        self.classifier = nn.Linear(encoder.config.hidden_size, 2)

    def forward(self, input_ids: torch.Tensor, attention_mask: torch.Tensor) -> torch.Tensor:
        hidden = self.encoder(
            input_ids=input_ids,
            attention_mask=attention_mask,
        ).last_hidden_state
        mask = attention_mask.unsqueeze(-1).to(hidden.dtype)
        pooled = (hidden * mask).sum(dim=1) / mask.sum(dim=1).clamp_min(1)
        return self.classifier(pooled)


def configure_strategy(model: MeanPoolClassifier, strategy: str) -> None:
    for parameter in model.encoder.parameters():
        parameter.requires_grad = False
    if strategy == "last-block-plus-head":
        for parameter in model.encoder.encoder.layer[-1].parameters():
            parameter.requires_grad = True
    elif strategy == "full-encoder-plus-head":
        for parameter in model.encoder.parameters():
            parameter.requires_grad = True
    elif strategy != "head-only":
        raise ValueError(f"Unknown strategy: {strategy}")


def parameter_count(module: nn.Module, trainable_only: bool = False) -> int:
    return sum(
        parameter.numel()
        for parameter in module.parameters()
        if parameter.requires_grad or not trainable_only
    )


def gradient_norm(parameter: torch.Tensor) -> float | None:
    if parameter.grad is None:
        return None
    return round(float(parameter.grad.norm().item()), 9)


def train_strategy(strategy: str) -> dict:
    set_seed(SEED)
    encoder, tokenizer = load_backbone_and_tokenizer()
    model = MeanPoolClassifier(encoder)
    configure_strategy(model, strategy)
    encoded = tokenizer(
        TEXTS,
        padding=True,
        truncation=True,
        max_length=48,
        return_tensors="pt",
    )
    unique_token_ids = torch.unique(encoded["input_ids"])
    probes_before = {
        "embeddingBatchRows": model.encoder.embeddings.word_embeddings.weight[
            unique_token_ids
        ].detach().clone(),
        "firstBlockQuery": model.encoder.encoder.layer[0].attention.self.query.weight.detach().clone(),
        "lastBlockQuery": model.encoder.encoder.layer[-1].attention.self.query.weight.detach().clone(),
        "classifierWeight": model.classifier.weight.detach().clone(),
        "classifierBias": model.classifier.bias.detach().clone(),
    }
    encoder_parameters = [
        parameter for parameter in model.encoder.parameters() if parameter.requires_grad
    ]
    optimizer_groups = []
    if encoder_parameters:
        optimizer_groups.append({"params": encoder_parameters, "lr": ENCODER_LR})
    optimizer_groups.append({"params": list(model.classifier.parameters()), "lr": HEAD_LR})
    optimizer = torch.optim.AdamW(optimizer_groups, weight_decay=0.0)
    criterion = nn.CrossEntropyLoss()

    model.eval()
    with torch.no_grad():
        initial_logits = model(encoded["input_ids"], encoded["attention_mask"])
        initial_loss = float(criterion(initial_logits, LABELS).item())
        initial_accuracy = float((initial_logits.argmax(dim=1) == LABELS).float().mean().item())

    losses = []
    first_step_gradients = {}
    started = time.perf_counter()
    for step in range(STEPS):
        set_seed(SEED + step)
        model.train()
        optimizer.zero_grad(set_to_none=True)
        logits = model(encoded["input_ids"], encoded["attention_mask"])
        loss = criterion(logits, LABELS)
        loss.backward()
        if step == 0:
            first_step_gradients = {
                "embeddingBatchRows": gradient_norm(
                    model.encoder.embeddings.word_embeddings.weight
                ),
                "firstBlockQuery": gradient_norm(
                    model.encoder.encoder.layer[0].attention.self.query.weight
                ),
                "lastBlockQuery": gradient_norm(
                    model.encoder.encoder.layer[-1].attention.self.query.weight
                ),
                "classifierWeight": gradient_norm(model.classifier.weight),
                "classifierBias": gradient_norm(model.classifier.bias),
            }
        optimizer.step()
        losses.append(round(float(loss.detach().item()), 6))
    elapsed = time.perf_counter() - started

    model.eval()
    with torch.no_grad():
        final_logits = model(encoded["input_ids"], encoded["attention_mask"])
        final_loss = float(criterion(final_logits, LABELS).item())
        final_accuracy = float((final_logits.argmax(dim=1) == LABELS).float().mean().item())
        probes_after = {
            "embeddingBatchRows": model.encoder.embeddings.word_embeddings.weight[
                unique_token_ids
            ].detach(),
            "firstBlockQuery": model.encoder.encoder.layer[0].attention.self.query.weight.detach(),
            "lastBlockQuery": model.encoder.encoder.layer[-1].attention.self.query.weight.detach(),
            "classifierWeight": model.classifier.weight.detach(),
            "classifierBias": model.classifier.bias.detach(),
        }

    deltas = {
        name: round(float((probes_after[name] - before).abs().max().item()), 12)
        for name, before in probes_before.items()
    }
    total = parameter_count(model)
    trainable = parameter_count(model, trainable_only=True)
    result = {
        "strategy": strategy,
        "totalParameters": total,
        "trainableParameters": trainable,
        "trainablePercent": round(trainable / total * 100, 6),
        "estimatedAdditionalGradientAndAdamMiB": round(trainable * 12 / 1024**2, 3),
        "initialBatchLoss": round(initial_loss, 6),
        "finalBatchLoss": round(final_loss, 6),
        "initialBatchAccuracy": round(initial_accuracy, 4),
        "finalBatchAccuracy": round(final_accuracy, 4),
        "trainingLossByStep": losses,
        "trainingSeconds": round(elapsed, 3),
        "firstStepGradientNorms": first_step_gradients,
        "maxAbsoluteParameterDeltas": deltas,
    }
    del model, encoder, tokenizer, optimizer
    gc.collect()
    return result


def task_shape_probe() -> dict:
    set_seed(SEED)
    encoder, tokenizer = load_backbone_and_tokenizer()
    encoded = tokenizer(
        ["A thoughtful film.", "A tedious film."],
        padding=True,
        return_tensors="pt",
    )
    encoder.eval()
    with torch.no_grad():
        hidden = encoder(**encoded).last_hidden_state
        mask = encoded["attention_mask"].unsqueeze(-1).to(hidden.dtype)
        pooled = (hidden * mask).sum(dim=1) / mask.sum(dim=1).clamp_min(1)
        sequence_logits = nn.Linear(encoder.config.hidden_size, 2)(pooled)
        token_logits = nn.Linear(encoder.config.hidden_size, 9)(hidden)
    result = {
        "inputIdsShape": list(encoded["input_ids"].shape),
        "hiddenStateShape": list(hidden.shape),
        "sequenceClassificationLogitsShape": list(sequence_logits.shape),
        "tokenClassificationLogitsShape": list(token_logits.shape),
        "interpretation": {
            "sequenceClassification": "one label distribution per input text",
            "tokenClassification": "one label distribution per token position",
            "mlm": "the Notebook uses one vocabulary distribution per token position and computes loss only at masked labels",
        },
    }
    del encoder, tokenizer
    gc.collect()
    return result


def bio_alignment_probe() -> dict:
    _, tokenizer = load_backbone_and_tokenizer()
    words = ["My", "name", "is", "Maarten", "."]
    word_labels = ["O", "O", "O", "B-PER", "O"]
    encoding = tokenizer(
        [words],
        is_split_into_words=True,
        return_tensors="pt",
    )
    word_ids = encoding.word_ids(batch_index=0)
    tokens = tokenizer.convert_ids_to_tokens(encoding["input_ids"][0])
    aligned = []
    previous_word_id = None
    for word_id in word_ids:
        if word_id is None:
            aligned.append("-100")
        elif word_id != previous_word_id:
            aligned.append(word_labels[word_id])
        else:
            label = word_labels[word_id]
            aligned.append("I-PER" if label == "B-PER" else label)
        previous_word_id = word_id
    non_ignored = [label for label in aligned if label != "-100"]
    correct_seqeval_shape = [non_ignored]
    notebook_seqeval_shape = [[label] for label in non_ignored]
    result = {
        "words": words,
        "wordLabels": word_labels,
        "tokens": tokens,
        "wordIds": word_ids,
        "alignedTokenLabels": aligned,
        "personSubtokens": [
            {"token": token, "label": label}
            for token, label in zip(tokens, aligned)
            if label in {"B-PER", "I-PER"}
        ],
        "correctSeqevalInput": {
            "sequenceCount": len(correct_seqeval_shape),
            "tokensPerSequence": [len(row) for row in correct_seqeval_shape],
            "labels": correct_seqeval_shape,
        },
        "notebookCell57Input": {
            "sequenceCount": len(notebook_seqeval_shape),
            "tokensPerSequence": [len(row) for row in notebook_seqeval_shape],
            "labels": notebook_seqeval_shape,
        },
        "integrityFinding": "Cell 57 appends one singleton list per token, breaking B-PER/I-PER continuity across a sentence before seqeval computes entity spans.",
    }
    del tokenizer
    gc.collect()
    return result


def main() -> None:
    if not HF_HOME.exists():
        raise RuntimeError(f"Offline cache directory is missing: {HF_HOME}")
    strategies = [
        train_strategy("head-only"),
        train_strategy("last-block-plus-head"),
        train_strategy("full-encoder-plus-head"),
    ]
    result = {
        "experiment": "Chapter 11 frozen-gradient, task-head and BIO-label audit",
        "predictionBeforeRun": "Frozen parameters should have no gradients or updates; unfreezing the last block should update only that block and the head; full fine-tuning should update embeddings, early and late blocks. Sequence and token heads should expose different label units.",
        "controlledVariable": "Trainable scope only: the cached proxy backbone, classifier initialization, eight texts, labels, tokenization, five steps, seed and optimizer settings remain fixed.",
        "sourceNotebook": {
            "chapter": 11,
            "upstreamCommit": "ea3390819997999a51983677b80b3aac4dc50ada",
            "operativeCells": [4, 7, 9, 11, 13, 14, 16, 18, 20, 22, 23, 26, 30, 32, 33, 34, 36, 37, 40, 42, 44, 45, 46, 47, 50, 52, 53, 55, 57, 59, 60, 61],
            "savedMetrics": {
                "fullBertClassificationF1": 0.8566073102155576,
                "headOnlyClassificationF1": 0.637704918032787,
                "lastTwoBlocksClassificationF1": 0.8141086749285034,
                "setFit16PerClassF1": 0.8363988383349468,
                "reportedNerF1WithFlattenedSeqevalInput": 0.9180087380808113,
            },
        },
        "downloadBoundary": {
            "executedDownloads": [],
            "bertBaseCased": {
                "notebookWeightLog": "436 MB pytorch_model.bin",
                "officialSafetensorsSize": "436 MB",
                "localCache": "tokenizer/config only; weights absent",
                "action": "not downloaded and full BERT training not run",
            },
            "allMpnetBaseV2": {
                "officialSafetensorsSize": "438 MB",
                "localCache": "absent",
                "action": "not downloaded; SetFit path documented only",
            },
            "datasetsAndMetrics": {
                "rottenTomatoesNotebookDownloads": "699 kB + 90.0 kB + 92.2 kB plus metadata",
                "conll2003NotebookDownload": "983 kB plus builder/readme",
                "action": "not loaded locally; synthetic text and labels used instead",
            },
            "checkpointAmplification": "The MLM path requests 10 epochs with save_strategy='epoch'. Ten 436 MB weight snapshots alone would be at least about 4.36 GB, before optimizer states and duplicated output-directory artifacts.",
        },
        "proxyModel": {
            "id": MODEL_ID,
            "revision": MODEL_REVISION,
            "weightFileBytes": 90868376,
            "architecture": "6-layer BertModel, hidden size 384",
            "role": "cached BERT-family proxy for gradient and label mechanics; not a reproduction of bert-base-cased quality",
            "localFilesOnly": True,
        },
        "fixedConditions": {
            "texts": len(TEXTS),
            "steps": STEPS,
            "seed": SEED,
            "encoderLearningRate": ENCODER_LR,
            "headLearningRate": HEAD_LR,
            "device": "cpu",
        },
        "environment": {
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "python": platform.python_version(),
            "torch": torch.__version__,
            "transformers": __import__("transformers").__version__,
            "sentenceTransformers": __import__("sentence_transformers").__version__,
            "offlineMode": all(
                os.environ.get(name) == "1"
                for name in ("HF_HUB_OFFLINE", "TRANSFORMERS_OFFLINE", "HF_DATASETS_OFFLINE")
            ),
            "hfHome": str(HF_HOME),
        },
        "freezeStrategies": strategies,
        "taskShapeProbe": task_shape_probe(),
        "bioAlignmentProbe": bio_alignment_probe(),
        "sourceIntegrityFindings": [
            "The classification and SetFit trainers use the test split as eval data during development instead of reserving it for final evaluation.",
            "Cell 26 freezes parameters by numeric enumeration index 165, which is brittle across model and library changes.",
            "Cell 30 reverses the saved freeze-score list while relabeling the endpoints None and All, so the plotted x/y meaning does not match the loop in cell 28.",
            "Cell 57 flattens each NER token into a separate one-token sequence before seqeval, breaking entity-span continuity; the saved 0.9180 F1 is not a trustworthy sentence-level entity F1.",
            "Cell 61 omits an aggregation strategy, so one person name is returned as three WordPiece entities rather than one merged span.",
            "Model, dataset and metric revisions are not pinned; random seeds are not fixed; model, trainer, data and output directory names are repeatedly reused.",
            "The source in cell 50 already passes trust_remote_code=True, while the saved output still contains an interactive trust prompt, suggesting source/output drift.",
        ],
        "interpretationBoundary": [
            "This verifies parameter freezing, gradient reach, head output units and BIO alignment mechanics, not bert-base-cased benchmark quality.",
            "The eight sentiment texts are a fixed optimization batch; final batch accuracy is not an independent generalization metric.",
            "The task-shape heads are untrained probes used only to expose tensor responsibility.",
            "No SetFit, evaluate, seqeval, Rotten Tomatoes or CoNLL package/data path was installed or downloaded.",
        ],
    }
    output_path = EXPERIMENT_DIR / "results" / "freeze-and-labels-results.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(result, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "strategies": strategies,
                "taskShapeProbe": result["taskShapeProbe"],
                "bioAlignmentProbe": result["bioAlignmentProbe"],
                "resultPath": str(output_path),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
