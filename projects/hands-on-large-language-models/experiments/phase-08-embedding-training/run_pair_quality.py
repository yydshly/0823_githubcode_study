"""Show how positive-pair quality changes an embedding model, fully offline."""

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

import numpy as np
import torch
from sentence_transformers import SentenceTransformer, losses


MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"
MODEL_REVISION = "1110a243fdf4706b3f48f1d95db1a4f5529b4d41"
SEED = 42
EPOCHS = 12
LEARNING_RATE = 2e-5

DOCUMENTS = [
    {
        "id": "password",
        "text": "Reset a forgotten password from Settings > Security. A recovery link is sent to the account email.",
    },
    {
        "id": "two_factor",
        "text": "Two-factor recovery codes replace an unavailable authenticator. Each recovery code works once.",
    },
    {
        "id": "token",
        "text": "API access tokens expire after 90 days and can be rotated from Developer settings.",
    },
    {
        "id": "invite",
        "text": "Workspace owners invite colleagues from Members. Invitations expire after seven days.",
    },
    {
        "id": "receipt",
        "text": "Download payment receipts as PDF from Billing > Transactions after a charge is completed.",
    },
    {
        "id": "refund",
        "text": "Refund requests are accepted within 14 days of purchase through Billing support.",
    },
    {
        "id": "upload",
        "text": "Each attachment can be at most 25 MB. Larger files must be shared with an external link.",
    },
    {
        "id": "csv_export",
        "text": "Export report tables as CSV from Analytics > Reports. Filters remain in the downloaded file.",
    },
]

TRAIN_ANCHORS = [
    "How do I recover a forgotten password?",
    "Can I sign in if my authenticator is unavailable?",
    "Where can I replace an expiring API credential?",
    "How does an owner add a colleague to the workspace?",
    "Where can I download a receipt for a completed charge?",
    "How soon must I request a refund?",
    "How large can an uploaded attachment be?",
    "Where can I export analytics rows as CSV?",
]

EVALUATION_QUERIES = [
    {"expected": "password", "text": "I forgot my login secret. How can I regain account access?"},
    {"expected": "two_factor", "text": "My authenticator phone is gone. Can recovery codes let me in?"},
    {"expected": "token", "text": "How long does a developer credential last, and where can I replace it?"},
    {"expected": "invite", "text": "How do I bring a coworker into our shared workspace?"},
    {"expected": "receipt", "text": "Where can I get proof that a completed charge was paid?"},
    {"expected": "refund", "text": "What is the deadline for asking for my money back?"},
    {"expected": "upload", "text": "What is the biggest file I can attach here?"},
    {"expected": "csv_export", "text": "How do I move analytics table rows into a spreadsheet?"},
]

# Four of eight anchors are paired with a semantically wrong but nearby document.
# This mirrors the Chapter 10 risk: MNRL consumes text columns, not MNLI class labels.
CONTAMINATED_TARGET_INDEX = [1, 0, 2, 3, 5, 4, 6, 7]


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


def load_model() -> SentenceTransformer:
    model = SentenceTransformer(
        MODEL_ID,
        revision=MODEL_REVISION,
        device="cpu",
        local_files_only=True,
    )
    model.max_seq_length = 128
    return model


def pairs_for(target_indices: list[int]) -> list[tuple[str, str]]:
    return [
        (anchor, DOCUMENTS[target_index]["text"])
        for anchor, target_index in zip(TRAIN_ANCHORS, target_indices)
    ]


def objective_loss(model: SentenceTransformer, pairs: list[tuple[str, str]]) -> float:
    model.eval()
    loss_model = losses.MultipleNegativesRankingLoss(model=model)
    loss_model.eval()
    features = [
        model.tokenize([pair[position] for pair in pairs])
        for position in (0, 1)
    ]
    labels = torch.zeros(len(pairs), dtype=torch.float32)
    with torch.no_grad():
        return float(loss_model(features, labels).item())


def evaluate(model: SentenceTransformer) -> dict:
    document_vectors = model.encode(
        [document["text"] for document in DOCUMENTS],
        normalize_embeddings=True,
        show_progress_bar=False,
        convert_to_numpy=True,
    )
    query_vectors = model.encode(
        [query["text"] for query in EVALUATION_QUERIES],
        normalize_embeddings=True,
        show_progress_bar=False,
        convert_to_numpy=True,
    )
    scores = query_vectors @ document_vectors.T
    rows = []
    for query, row_scores in zip(EVALUATION_QUERIES, scores):
        order = np.argsort(-row_scores)
        expected_index = next(
            index for index, document in enumerate(DOCUMENTS)
            if document["id"] == query["expected"]
        )
        expected_rank = int(np.where(order == expected_index)[0][0]) + 1
        negative_indices = [index for index in order if index != expected_index]
        hardest_negative_index = int(negative_indices[0])
        margin = float(row_scores[expected_index] - row_scores[hardest_negative_index])
        rows.append(
            {
                "query": query["text"],
                "expectedDocId": query["expected"],
                "expectedRank": expected_rank,
                "returnedDocId": DOCUMENTS[int(order[0])]["id"],
                "positiveScore": round(float(row_scores[expected_index]), 6),
                "hardestNegativeDocId": DOCUMENTS[hardest_negative_index]["id"],
                "hardestNegativeScore": round(float(row_scores[hardest_negative_index]), 6),
                "margin": round(margin, 6),
                "top1": expected_rank == 1,
            }
        )
    margins = [row["margin"] for row in rows]
    return {
        "top1": sum(row["top1"] for row in rows),
        "queries": len(rows),
        "top1Rate": round(sum(row["top1"] for row in rows) / len(rows), 4),
        "meanTrueMargin": round(float(np.mean(margins)), 6),
        "minimumTrueMargin": round(float(np.min(margins)), 6),
        "failures": [row for row in rows if not row["top1"]],
        "rows": rows,
    }


def train_variant(name: str, pairs: list[tuple[str, str]]) -> tuple[dict, SentenceTransformer]:
    set_seed(SEED)
    model = load_model()
    initial_loss = objective_loss(model, pairs)
    features = [
        model.tokenize([pair[position] for pair in pairs])
        for position in (0, 1)
    ]
    labels = torch.zeros(len(pairs), dtype=torch.float32)
    loss_model = losses.MultipleNegativesRankingLoss(model=model)
    optimizer = torch.optim.AdamW(model.parameters(), lr=LEARNING_RATE)
    training_losses = []
    started = time.perf_counter()
    for epoch in range(EPOCHS):
        set_seed(SEED + epoch)
        model.train()
        loss_model.train()
        optimizer.zero_grad(set_to_none=True)
        loss = loss_model(features, labels)
        loss.backward()
        optimizer.step()
        training_losses.append(round(float(loss.detach().item()), 6))
    elapsed = time.perf_counter() - started
    final_loss = objective_loss(model, pairs)
    return (
        {
            "name": name,
            "initialObjectiveLoss": round(initial_loss, 6),
            "finalObjectiveLoss": round(final_loss, 6),
            "objectiveLossChange": round(final_loss - initial_loss, 6),
            "trainingLossByEpoch": training_losses,
            "trainingSeconds": round(elapsed, 3),
        },
        model,
    )


def main() -> None:
    if not HF_HOME.exists():
        raise RuntimeError(f"Offline cache directory is missing: {HF_HOME}")
    set_seed(SEED)
    clean_pairs = pairs_for(list(range(len(DOCUMENTS))))
    contaminated_pairs = pairs_for(CONTAMINATED_TARGET_INDEX)

    base_model = load_model()
    base = {
        "cleanObjectiveLoss": round(objective_loss(base_model, clean_pairs), 6),
        "contaminatedObjectiveLoss": round(objective_loss(base_model, contaminated_pairs), 6),
        "evaluation": evaluate(base_model),
    }
    del base_model
    gc.collect()

    clean_training, clean_model = train_variant("clean-positive-pairs", clean_pairs)
    clean_training["evaluation"] = evaluate(clean_model)
    del clean_model
    gc.collect()

    contaminated_training, contaminated_model = train_variant(
        "50-percent-contaminated-positive-pairs", contaminated_pairs
    )
    contaminated_training["evaluation"] = evaluate(contaminated_model)
    del contaminated_model
    gc.collect()

    result = {
        "experiment": "Chapter 10 positive-pair quality under MultipleNegativesRankingLoss",
        "predictionBeforeRun": "Both training variants can reduce the objective they are given, but only clean positive pairs should preserve or improve true held-out retrieval margins.",
        "controlledVariable": "Four of eight positive targets are swapped between semantically adjacent intents; model revision, anchors, corpus, evaluation queries, seed, optimizer, learning rate, epochs and batch composition remain fixed.",
        "sourceNotebook": {
            "chapter": 10,
            "upstreamCommit": "ea3390819997999a51983677b80b3aac4dc50ada",
            "operativeCells": [5, 8, 10, 12, 14, 15, 18, 25, 27, 32, 34, 40, 41, 42, 43, 48, 49, 53, 57, 68, 69, 73, 74, 75],
            "integrityFinding": "Cell 41 passes all three MNLI labels to MultipleNegativesRankingLoss. That loss consumes the sentence columns and does not use the class label, so neutral and contradiction rows are treated as positive pairs.",
            "savedStsSpearmanCosine": {
                "notebookFineTunedMiniLM": 0.8484667083117318,
                "notebookOriginalMiniLM": 0.8671637433378804,
            },
        },
        "fixedConditions": {
            "documents": len(DOCUMENTS),
            "trainingPairs": len(clean_pairs),
            "contaminatedPairs": sum(
                expected != actual
                for expected, actual in enumerate(CONTAMINATED_TARGET_INDEX)
            ),
            "evaluationQueries": len(EVALUATION_QUERIES),
            "seed": SEED,
            "epochs": EPOCHS,
            "learningRate": LEARNING_RATE,
            "batchSize": len(clean_pairs),
            "device": "cpu",
        },
        "model": {
            "id": MODEL_ID,
            "revision": MODEL_REVISION,
            "localFilesOnly": True,
            "pooling": "pretrained SentenceTransformer mean pooling",
            "embeddingDimensions": 384,
            "normalizationAtEvaluation": "L2",
        },
        "environment": {
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "python": platform.python_version(),
            "torch": torch.__version__,
            "sentenceTransformers": __import__("sentence_transformers").__version__,
            "numpy": np.__version__,
            "offlineMode": all(
                os.environ.get(name) == "1"
                for name in ("HF_HUB_OFFLINE", "TRANSFORMERS_OFFLINE", "HF_DATASETS_OFFLINE")
            ),
            "hfHome": str(HF_HOME),
        },
        "documents": DOCUMENTS,
        "trainingPairs": {
            "clean": [
                {"anchor": anchor, "targetDocId": DOCUMENTS[index]["id"]}
                for index, anchor in enumerate(TRAIN_ANCHORS)
            ],
            "contaminated": [
                {
                    "anchor": anchor,
                    "targetDocId": DOCUMENTS[target_index]["id"],
                    "isSemanticallyCorrect": index == target_index,
                }
                for index, (anchor, target_index) in enumerate(
                    zip(TRAIN_ANCHORS, CONTAMINATED_TARGET_INDEX)
                )
            ],
        },
        "results": {
            "base": base,
            "cleanTraining": clean_training,
            "contaminatedTraining": contaminated_training,
        },
        "interpretationBoundary": [
            "This is an eight-intent English synthetic retrieval test, not a claim about general benchmark quality.",
            "The experiment isolates pair quality; it does not compare all Chapter 10 loss functions or reproduce the 50,000-row GPU runs.",
            "A lower MultipleNegativesRankingLoss only shows better fit to the supplied diagonal pairs, even when some pairs are semantically wrong.",
            "The source Notebook's saved STS scores and this local retrieval test use different data, so their numeric values must not be compared directly.",
            "No model, dataset or package was downloaded; the script fails if the pinned model is absent from the existing local cache.",
        ],
    }

    output_path = EXPERIMENT_DIR / "results" / "pair-quality-results.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(result, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "base": base["evaluation"],
                "clean": clean_training,
                "contaminated": contaminated_training,
                "resultPath": str(output_path),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
