#!/usr/bin/env python3
"""Low-cost Chapter 5 topic-modeling practice.

The experiment mirrors the notebook's core pipeline with a deterministic
subset: gte-small embeddings -> UMAP -> HDBSCAN -> BERTopic c-TF-IDF words.
Only HDBSCAN's minimum cluster size changes between the two runs.
"""

from __future__ import annotations

import argparse
import json
import os
import platform
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import bertopic
import datasets
import hdbscan
import numpy as np
import pandas as pd
import psutil
import sentence_transformers
import sklearn
import torch
import transformers
import umap
from bertopic import BERTopic
from datasets import load_dataset
from hdbscan import HDBSCAN
from sentence_transformers import SentenceTransformer
from sklearn.metrics import adjusted_rand_score
from umap import UMAP


UPSTREAM_COMMIT = "ea3390819997999a51983677b80b3aac4dc50ada"
MODEL_ID = "thenlper/gte-small"
DEFAULT_CLUSTER_SIZES = [15, 40]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--documents", type=int, default=600)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--min-cluster-sizes", type=int, nargs="+", default=DEFAULT_CLUSTER_SIZES)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).parent / "results" / "topic-modeling-results.json",
    )
    return parser.parse_args()


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


def topic_preview(
    model: BERTopic,
    labels: np.ndarray,
    titles: list[str],
    abstracts: list[str],
    topic_id: int,
) -> dict:
    indices = np.where(labels == topic_id)[0]
    words = model.get_topic(topic_id) or []
    return {
        "topicId": int(topic_id),
        "documentCount": int(len(indices)),
        "topWords": [
            {"word": word, "weight": round(float(weight), 5)}
            for word, weight in words[:8]
        ],
        "sampleDocuments": [
            {
                "title": titles[int(index)],
                "abstractPreview": abstracts[int(index)][:260],
            }
            for index in indices[:2]
        ],
    }


def summarize_run(
    model: BERTopic,
    labels: list[int],
    titles: list[str],
    abstracts: list[str],
    min_cluster_size: int,
    elapsed_seconds: float,
) -> dict:
    values = np.asarray(labels)
    topic_ids = sorted(int(topic) for topic in set(values) if topic >= 0)
    outlier_count = int(np.sum(values == -1))
    ranked_topics = sorted(topic_ids, key=lambda topic: int(np.sum(values == topic)), reverse=True)
    return {
        "minClusterSize": min_cluster_size,
        "topicCount": len(topic_ids),
        "outlierCount": outlier_count,
        "outlierRate": round(outlier_count / len(values), 4),
        "clusteredCount": int(len(values) - outlier_count),
        "largestTopicCount": int(np.sum(values == ranked_topics[0])) if ranked_topics else 0,
        "elapsedSeconds": round(elapsed_seconds, 3),
        "topics": [
            topic_preview(model, values, titles, abstracts, topic_id)
            for topic_id in ranked_topics[:5]
        ],
    }


def make_topic_model(min_cluster_size: int, seed: int) -> BERTopic:
    umap_model = UMAP(
        n_neighbors=15,
        n_components=5,
        min_dist=0.0,
        metric="cosine",
        random_state=seed,
        n_jobs=1,
    )
    hdbscan_model = HDBSCAN(
        min_cluster_size=min_cluster_size,
        metric="euclidean",
        cluster_selection_method="eom",
        prediction_data=True,
    )
    return BERTopic(
        umap_model=umap_model,
        hdbscan_model=hdbscan_model,
        top_n_words=10,
        calculate_probabilities=False,
        verbose=False,
    )


def main() -> int:
    args = parse_args()
    started = time.perf_counter()
    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

    full_dataset = load_dataset("maartengr/arxiv_nlp", split="train")
    if args.documents > len(full_dataset):
        raise ValueError(f"requested {args.documents} documents from {len(full_dataset)}")
    dataset = full_dataset.shuffle(seed=args.seed).select(range(args.documents))
    abstracts = [str(value).strip() for value in dataset["Abstracts"]]
    titles = [str(value).strip() for value in dataset["Titles"]]
    if any(not abstract for abstract in abstracts):
        raise ValueError("sample contains an empty abstract")

    embedding_model = SentenceTransformer(MODEL_ID, device="cpu")
    embedding_started = time.perf_counter()
    embeddings = embedding_model.encode(
        abstracts,
        batch_size=32,
        show_progress_bar=True,
        normalize_embeddings=False,
    )
    embedding_seconds = time.perf_counter() - embedding_started

    runs = []
    label_sets: list[list[int]] = []
    for min_cluster_size in args.min_cluster_sizes:
        run_started = time.perf_counter()
        model = make_topic_model(min_cluster_size, args.seed)
        labels, _ = model.fit_transform(abstracts, embeddings)
        label_sets.append([int(label) for label in labels])
        runs.append(
            summarize_run(
                model,
                labels,
                titles,
                abstracts,
                min_cluster_size,
                time.perf_counter() - run_started,
            )
        )

    comparisons = []
    for index in range(len(label_sets) - 1):
        left = runs[index]
        right = runs[index + 1]
        comparisons.append(
            {
                "leftMinClusterSize": left["minClusterSize"],
                "rightMinClusterSize": right["minClusterSize"],
                "adjustedRandIndex": round(
                    float(adjusted_rand_score(label_sets[index], label_sets[index + 1])), 4
                ),
                "topicCountChange": right["topicCount"] - left["topicCount"],
                "outlierRateChange": round(right["outlierRate"] - left["outlierRate"], 4),
            }
        )

    first = runs[0]
    last = runs[-1]
    predicted_direction = (
        last["topicCount"] <= first["topicCount"]
        and last["outlierRate"] >= first["outlierRate"]
    )
    result = {
        "schemaVersion": 1,
        "experiment": "chapter-05-topic-modeling-density-sensitivity",
        "status": "pass",
        "recordedAt": datetime.now(timezone.utc).isoformat(),
        "source": {
            "upstreamCommit": UPSTREAM_COMMIT,
            "notebook": "chapter05/Chapter 5 - Text Clustering and Topic Modeling.ipynb",
            "mirroredCells": [4, 7, 10, 12, 15, 22, 24, 26],
        },
        "question": "How does density clustering change the topics and outliers produced from fixed document embeddings?",
        "predictionBeforeRun": [
            "A smaller minimum cluster size will allow more, narrower topics.",
            "A larger minimum cluster size will merge or reject small groups and raise the outlier rate.",
            "c-TF-IDF words will make clusters inspectable but will not prove that a topic label is correct.",
        ],
        "controlledVariables": {
            "dataset": "maartengr/arxiv_nlp",
            "fullDatasetRows": len(full_dataset),
            "sampleRows": len(dataset),
            "seed": args.seed,
            "embeddingModel": MODEL_ID,
            "embeddingShape": list(embeddings.shape),
            "umap": {
                "nNeighbors": 15,
                "nComponents": 5,
                "minDist": 0.0,
                "metric": "cosine",
            },
            "changedVariable": "HDBSCAN min_cluster_size",
        },
        "runs": runs,
        "comparisons": comparisons,
        "hypothesisAssessment": {
            "outcome": "confirmed" if predicted_direction else "partly confirmed",
            "observedDirection": {
                "topicCount": f"{first['topicCount']} -> {last['topicCount']}",
                "outlierRate": f"{first['outlierRate']} -> {last['outlierRate']}",
            },
        },
        "timing": {
            "embeddingSeconds": round(embedding_seconds, 3),
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
                "pandas": pd.__version__,
                "bertopic": bertopic.__version__,
                "umapLearn": umap.__version__,
                "hdbscan": getattr(hdbscan, "__version__", "0.8.38.post1"),
            },
        },
        "boundaries": [
            f"The exact upstream gte-small embedding model is used, but only a deterministic {len(dataset)}-document subset is clustered.",
            f"The notebook uses min_cluster_size=50 on the full dataset; this experiment compares {', '.join(str(size) for size in args.min_cluster_sizes)} for a low-cost sensitivity study.",
            "Topic keywords are c-TF-IDF representations that require human inspection; they are not ground-truth labels.",
            "KeyBERT, MMR, Flan-T5, OpenAI labels and visualizations are not benchmarked in this slice.",
            "A seeded CPU run demonstrates the pipeline and parameter sensitivity, not production topic quality or stability.",
        ],
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
