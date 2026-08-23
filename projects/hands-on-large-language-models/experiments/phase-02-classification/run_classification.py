#!/usr/bin/env python3
"""Low-cost Chapter 4 text-classification practice.

The upstream notebook compares several classification paths. This experiment
keeps one embedding model and one balanced dataset slice fixed, then changes
only how class evidence is constructed: label text, class centroids, or a
supervised logistic-regression boundary.
"""

from __future__ import annotations

import argparse
import json
import os
import platform
import random
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import datasets
import numpy as np
import psutil
import sentence_transformers
import sklearn
import torch
import transformers
from datasets import load_dataset
from sentence_transformers import SentenceTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score


UPSTREAM_COMMIT = "ea3390819997999a51983677b80b3aac4dc50ada"
UPSTREAM_MODEL = "sentence-transformers/all-mpnet-base-v2"
DEFAULT_PROXY_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
LABEL_TEXTS = ["A negative movie review", "A positive movie review"]
PROBES = [
    {"text": "A dazzling performance and a story that stays with you.", "expected": 1},
    {"text": "The acting is polished, but the story is painfully dull.", "expected": 0},
    {"text": "Not a bad movie at all; I would gladly watch it again.", "expected": 1},
    {"text": "It looks expensive and still manages to be boring.", "expected": 0},
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default=DEFAULT_PROXY_MODEL)
    parser.add_argument("--train-per-class", type=int, default=200)
    parser.add_argument("--test-per-class", type=int, default=100)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).parent / "results" / "classification-results.json",
    )
    return parser.parse_args()


def balanced_indices(labels: list[int], per_class: int, seed: int) -> list[int]:
    rng = random.Random(seed)
    selected: list[int] = []
    for label in (0, 1):
        candidates = [index for index, value in enumerate(labels) if value == label]
        if len(candidates) < per_class:
            raise ValueError(f"label {label} has only {len(candidates)} rows")
        selected.extend(rng.sample(candidates, per_class))
    rng.shuffle(selected)
    return selected


def normalized_centroids(embeddings: np.ndarray, labels: np.ndarray) -> np.ndarray:
    centroids = np.stack([embeddings[labels == label].mean(axis=0) for label in (0, 1)])
    return centroids / np.linalg.norm(centroids, axis=1, keepdims=True)


def scores(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    return {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "macroF1": round(float(f1_score(y_true, y_pred, average="macro")), 4),
        "confusionMatrix": confusion_matrix(y_true, y_pred).tolist(),
    }


def gpu_inventory() -> list[dict[str, str]]:
    try:
        import subprocess

        output = subprocess.check_output(
            [
                "nvidia-smi",
                "--query-gpu=name,memory.total,driver_version",
                "--format=csv,noheader,nounits",
            ],
            text=True,
            timeout=10,
        ).strip()
    except (OSError, subprocess.SubprocessError):
        return []
    devices = []
    for line in output.splitlines():
        name, memory_mb, driver = [part.strip() for part in line.split(",", 2)]
        devices.append({"name": name, "memoryMiB": memory_mb, "driverVersion": driver})
    return devices


def main() -> int:
    args = parse_args()
    started = time.perf_counter()
    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

    dataset = load_dataset("rotten_tomatoes")
    train_indices = balanced_indices(dataset["train"]["label"], args.train_per_class, args.seed)
    test_indices = balanced_indices(dataset["test"]["label"], args.test_per_class, args.seed + 1)
    train = dataset["train"].select(train_indices)
    test = dataset["test"].select(test_indices)
    y_train = np.asarray(train["label"])
    y_test = np.asarray(test["label"])

    model = SentenceTransformer(args.model, device="cpu")
    encode_started = time.perf_counter()
    train_embeddings = model.encode(
        train["text"], batch_size=32, show_progress_bar=True, normalize_embeddings=True
    )
    test_embeddings = model.encode(
        test["text"], batch_size=32, show_progress_bar=True, normalize_embeddings=True
    )
    label_embeddings = model.encode(LABEL_TEXTS, normalize_embeddings=True)
    probe_embeddings = model.encode(
        [item["text"] for item in PROBES], normalize_embeddings=True
    )
    encode_seconds = time.perf_counter() - encode_started

    zero_shot_pred = np.argmax(test_embeddings @ label_embeddings.T, axis=1)
    centroids = normalized_centroids(train_embeddings, y_train)
    centroid_pred = np.argmax(test_embeddings @ centroids.T, axis=1)
    classifier = LogisticRegression(random_state=args.seed, max_iter=1000)
    classifier.fit(train_embeddings, y_train)
    supervised_pred = classifier.predict(test_embeddings)

    methods = {
        "zeroShotLabelEmbeddings": {
            "supervision": "No labeled training rows",
            **scores(y_test, zero_shot_pred),
        },
        "classCentroids": {
            "supervision": f"{len(train)} labeled rows summarized into two means",
            **scores(y_test, centroid_pred),
        },
        "logisticRegression": {
            "supervision": f"{len(train)} labeled rows fit a linear decision boundary",
            **scores(y_test, supervised_pred),
        },
    }

    probe_predictions = {
        "zeroShotLabelEmbeddings": np.argmax(probe_embeddings @ label_embeddings.T, axis=1),
        "classCentroids": np.argmax(probe_embeddings @ centroids.T, axis=1),
        "logisticRegression": classifier.predict(probe_embeddings),
    }
    probes = []
    for index, item in enumerate(PROBES):
        probes.append(
            {
                **item,
                "predictions": {
                    name: int(values[index]) for name, values in probe_predictions.items()
                },
            }
        )

    errors = []
    for index, (truth, prediction) in enumerate(zip(y_test, supervised_pred)):
        if truth != prediction:
            errors.append(
                {
                    "text": test[index]["text"],
                    "expected": int(truth),
                    "predicted": int(prediction),
                }
            )
        if len(errors) == 5:
            break

    ranking = sorted(methods, key=lambda name: methods[name]["macroF1"], reverse=True)
    zero_f1 = methods["zeroShotLabelEmbeddings"]["macroF1"]
    supervised_f1 = methods["logisticRegression"]["macroF1"]
    result = {
        "schemaVersion": 1,
        "experiment": "chapter-04-embedding-classification",
        "status": "pass",
        "recordedAt": datetime.now(timezone.utc).isoformat(),
        "source": {
            "upstreamCommit": UPSTREAM_COMMIT,
            "notebook": "chapter04/Chapter 4 - Text Classification.ipynb",
            "mirroredCells": [14, 16, 17, 19, 21, 22, 23],
        },
        "question": "How does adding labeled evidence change classification on fixed embeddings?",
        "predictionBeforeRun": [
            "Zero-shot label embeddings will be weakest because two short labels do not describe review language well.",
            "Class centroids will improve after seeing labeled review examples.",
            "Logistic regression will perform best by learning a supervised boundary.",
        ],
        "controlledVariables": {
            "dataset": "rotten_tomatoes",
            "proxyModel": args.model,
            "upstreamModel": UPSTREAM_MODEL,
            "trainRows": len(train),
            "testRows": len(test),
            "balancedLabels": True,
            "seed": args.seed,
        },
        "datasetSizes": {split: len(rows) for split, rows in dataset.items()},
        "methods": methods,
        "rankingByMacroF1": ranking,
        "hypothesisAssessment": {
            "supervisedMinusZeroShotMacroF1": round(supervised_f1 - zero_f1, 4),
            "outcome": "confirmed" if ranking[0] == "logisticRegression" else "partly confirmed",
        },
        "probeSentences": probes,
        "firstSupervisedErrors": errors,
        "timing": {
            "encodingSeconds": round(encode_seconds, 3),
            "totalSeconds": round(time.perf_counter() - started, 3),
        },
        "environment": {
            "python": sys.version.split()[0],
            "platform": platform.platform(),
            "offlineMode": all(
                os.environ.get(name) == "1"
                for name in ("HF_HUB_OFFLINE", "TRANSFORMERS_OFFLINE", "HF_DATASETS_OFFLINE")
            ),
            "logicalCpuCount": psutil.cpu_count(logical=True),
            "memoryGiB": round(psutil.virtual_memory().total / 1024**3, 2),
            "gpus": gpu_inventory(),
            "packages": {
                "torch": torch.__version__,
                "transformers": transformers.__version__,
                "sentenceTransformers": sentence_transformers.__version__,
                "datasets": datasets.__version__,
                "scikitLearn": sklearn.__version__,
                "numpy": np.__version__,
            },
        },
        "boundaries": [
            "The upstream all-mpnet-base-v2 model is replaced by all-MiniLM-L6-v2 for a low-cost CPU smoke test.",
            "The experiment uses balanced subsets, not the full train and test splits.",
            "Task-specific RoBERTa, Flan-T5 and paid ChatGPT paths are not benchmarked here.",
            "One seeded run is evidence for mechanism understanding, not a production benchmark.",
        ],
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
