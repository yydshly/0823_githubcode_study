"""Compare lexical and dense retrieval on one fixed, labelled mini knowledge base."""

from __future__ import annotations

import json
import math
import os
import platform
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import sklearn
import torch
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction import _stop_words


MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"
MODEL_REVISION = "1110a243fdf4706b3f48f1d95db1a4f5529b4d41"
TOP_K = 3
SEED = 42

CORPUS = [
    {"id": "password", "text": "Reset a forgotten password from Settings > Security. We send a recovery link to the account email."},
    {"id": "receipt", "text": "Download payment receipts as PDF from Billing > Transactions after a charge is completed."},
    {"id": "csv_export", "text": "Export report tables as CSV from Analytics > Reports. Filters are preserved in the downloaded file."},
    {"id": "quiet_hours", "text": "Quiet hours pause mobile and email notifications on a daily schedule configured under Notification preferences."},
    {"id": "invite", "text": "Workspace owners invite colleagues from Members. Invitations expire after seven days."},
    {"id": "delete", "text": "Deleting an account starts a 30-day recovery period. Personal data is erased after that period."},
    {"id": "offline", "text": "Offline mode keeps the 50 most recently opened notes available without an internet connection."},
    {"id": "upload", "text": "Each attachment can be at most 25 MB. Larger files must be shared with an external link."},
    {"id": "refund", "text": "Refund requests are accepted within 14 days of purchase through Billing support."},
    {"id": "token", "text": "API access tokens expire 90 days after creation and can be rotated from Developer settings."},
    {"id": "two_factor", "text": "Two-factor recovery codes can replace an unavailable authenticator. Each code works once."},
    {"id": "timezone", "text": "Change the workspace time zone under Preferences > Locale to correct calendar event times."},
]

QUERY_PAIRS = [
    ("password", "How do I reset a forgotten password?", "I cannot remember my sign-in secret. How can I regain access?"),
    ("receipt", "Where can I download a payment receipt?", "Where can I get proof of a completed purchase?"),
    ("csv_export", "How do I export report tables as CSV?", "How can I move analytics rows into a spreadsheet?"),
    ("quiet_hours", "How do I configure quiet hours for notifications?", "Can I silence alerts while I am asleep?"),
    ("invite", "How do workspace owners invite colleagues?", "How can I bring coworkers into our shared area?"),
    ("delete", "What happens after deleting an account?", "If I close my profile, how long is my information kept?"),
    ("offline", "Which notes are available in offline mode?", "What can I read on a plane without a connection?"),
    ("upload", "What is the maximum attachment size?", "What is the biggest file I can send here?"),
    ("refund", "When are refund requests accepted?", "What is the deadline for asking for my money back?"),
    ("token", "When do API access tokens expire?", "How long will a developer credential keep working?"),
    ("two_factor", "How do two-factor recovery codes work?", "I lost my authenticator phone. Is there another way in?"),
    ("timezone", "Where do I change the workspace time zone?", "My meeting times shifted after travel. Which locale setting fixes them?"),
]

UNSUPPORTED_QUERIES = [
    "What is the cafeteria lunch menu today?",
    "Which health insurance plan covers dental surgery?",
    "How many satellites are currently orbiting Mars?",
]


def tokenize(text: str) -> list[str]:
    """Match the Notebook's lowercase, punctuation-stripped, stop-word-filtered BM25 idea."""
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    return [token for token in tokens if token not in _stop_words.ENGLISH_STOP_WORDS]



class BM25Okapi:
    """Small, transparent implementation of the scoring formula used by rank_bm25."""

    def __init__(self, corpus: list[list[str]], k1: float = 1.5, b: float = 0.75, epsilon: float = 0.25):
        self.k1 = k1
        self.b = b
        self.doc_freqs = [Counter(document) for document in corpus]
        self.doc_len = np.asarray([len(document) for document in corpus], dtype=np.float32)
        self.corpus_size = len(corpus)
        self.avgdl = float(np.mean(self.doc_len))
        document_frequency = Counter(token for document in corpus for token in set(document))
        self.idf = {
            token: math.log(self.corpus_size - frequency + 0.5) - math.log(frequency + 0.5)
            for token, frequency in document_frequency.items()
        }
        average_idf = sum(self.idf.values()) / len(self.idf)
        floor = epsilon * average_idf
        self.idf = {token: (floor if value < 0 else value) for token, value in self.idf.items()}

    def get_scores(self, query_tokens: list[str]) -> np.ndarray:
        scores = np.zeros(self.corpus_size, dtype=np.float32)
        length_norm = self.k1 * (1 - self.b + self.b * self.doc_len / self.avgdl)
        for token in query_tokens:
            frequencies = np.asarray([document.get(token, 0) for document in self.doc_freqs], dtype=np.float32)
            scores += self.idf.get(token, 0.0) * frequencies * (self.k1 + 1) / (frequencies + length_norm)
        return scores

def ranking_rows(scores: np.ndarray) -> list[dict]:
    order = np.argsort(-scores)
    return [
        {"rank": rank, "docId": CORPUS[index]["id"], "score": round(float(scores[index]), 6)}
        for rank, index in enumerate(order, start=1)
    ]


def evaluate(ranking: list[dict], expected_id: str) -> dict:
    expected_rank = next(row["rank"] for row in ranking if row["docId"] == expected_id)
    return {
        "expectedDocId": expected_id,
        "expectedRank": expected_rank,
        "hitAt1": expected_rank == 1,
        "hitAt3": expected_rank <= TOP_K,
        "reciprocalRank": round(1 / expected_rank, 6),
        "top": ranking[:TOP_K],
    }


def summarize(rows: list[dict], method: str, group: str) -> dict:
    selected = [row[method] for row in rows if row["group"] == group]
    return {
        "queries": len(selected),
        "top1": sum(item["hitAt1"] for item in selected),
        "top1Rate": round(sum(item["hitAt1"] for item in selected) / len(selected), 4),
        "top3": sum(item["hitAt3"] for item in selected),
        "top3Rate": round(sum(item["hitAt3"] for item in selected) / len(selected), 4),
        "mrr": round(sum(item["reciprocalRank"] for item in selected) / len(selected), 4),
    }


def main() -> None:
    np.random.seed(SEED)
    torch.manual_seed(SEED)

    model = SentenceTransformer(
        MODEL_ID,
        revision=MODEL_REVISION,
        device="cpu",
        local_files_only=True,
    )
    corpus_texts = [item["text"] for item in CORPUS]
    dense_corpus = model.encode(corpus_texts, normalize_embeddings=True, show_progress_bar=False)
    bm25 = BM25Okapi([tokenize(text) for text in corpus_texts])

    labelled_queries = []
    for expected_id, lexical, paraphrase in QUERY_PAIRS:
        labelled_queries.extend(
            [
                {"id": f"{expected_id}-lexical", "group": "lexical", "text": lexical, "expectedId": expected_id},
                {"id": f"{expected_id}-paraphrase", "group": "paraphrase", "text": paraphrase, "expectedId": expected_id},
            ]
        )

    query_vectors = model.encode(
        [item["text"] for item in labelled_queries],
        normalize_embeddings=True,
        show_progress_bar=False,
    )

    rows = []
    for item, vector in zip(labelled_queries, query_vectors):
        dense_scores = dense_corpus @ vector
        lexical_scores = np.asarray(bm25.get_scores(tokenize(item["text"])))
        rows.append(
            {
                "id": item["id"],
                "group": item["group"],
                "query": item["text"],
                "bm25": evaluate(ranking_rows(lexical_scores), item["expectedId"]),
                "dense": evaluate(ranking_rows(dense_scores), item["expectedId"]),
            }
        )

    unsupported_vectors = model.encode(UNSUPPORTED_QUERIES, normalize_embeddings=True, show_progress_bar=False)
    unsupported = []
    for query, vector in zip(UNSUPPORTED_QUERIES, unsupported_vectors):
        dense_ranking = ranking_rows(dense_corpus @ vector)
        bm25_ranking = ranking_rows(np.asarray(bm25.get_scores(tokenize(query))))
        unsupported.append(
            {
                "query": query,
                "note": "No corpus document answers this query; both retrievers still return a ranking.",
                "bm25Top": bm25_ranking[:TOP_K],
                "denseTop": dense_ranking[:TOP_K],
                "denseTop1Margin": round(dense_ranking[0]["score"] - dense_ranking[1]["score"], 6),
            }
        )

    summaries = {
        method: {group: summarize(rows, method, group) for group in ("lexical", "paraphrase")}
        for method in ("bm25", "dense")
    }
    failures = [
        {
            "queryId": row["id"],
            "method": method,
            "expectedDocId": row[method]["expectedDocId"],
            "expectedRank": row[method]["expectedRank"],
            "returnedDocId": row[method]["top"][0]["docId"],
        }
        for row in rows
        for method in ("bm25", "dense")
        if not row[method]["hitAt1"]
    ]

    result = {
        "experiment": "Chapter 8 controlled semantic-search comparison",
        "predictionBeforeRun": "BM25 should remain strong when queries reuse corpus words; dense retrieval should recover more paraphrases. Neither method can abstain without an added policy.",
        "controlledVariable": "retrieval representation and scoring only: Notebook-style BM25 tokens versus normalized MiniLM embeddings with cosine similarity",
        "fixedConditions": {"corpusDocuments": len(CORPUS), "labelledQueries": len(rows), "queryGroups": ["lexical", "paraphrase"], "topK": TOP_K, "seed": SEED},
        "sourceNotebook": {"chapter": 8, "upstreamCommit": "ea3390819997999a51983677b80b3aac4dc50ada", "operativeCells": [6, 8, 10, 12, 14, 15, 16, 19, 21, 23, 27, 35, 37, 39, 40]},
        "model": {"id": MODEL_ID, "revision": MODEL_REVISION, "device": "cpu", "normalization": "L2", "similarity": "cosine via dot product"},
        "environment": {
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "python": platform.python_version(),
            "torch": torch.__version__,
            "sentenceTransformers": __import__("sentence_transformers").__version__,
            "scikitLearn": sklearn.__version__,
            "numpy": np.__version__,
            "offlineMode": os.environ.get("HF_HUB_OFFLINE") == "1" and os.environ.get("TRANSFORMERS_OFFLINE") == "1",
        },
        "corpus": CORPUS,
        "summary": summaries,
        "labelledResults": rows,
        "top1Failures": failures,
        "unsupportedProbes": unsupported,
        "interpretationBoundary": [
            "This measures retrieval ranking on one small English synthetic corpus, not production search quality.",
            "The local MiniLM proxy is not the Cohere or BGE model used in the Notebook, so scores are not interchangeable.",
            "A top similarity score is relative to this corpus and is not proof that the corpus contains an answer.",
            "No generator is used; retrieval quality and generated-answer quality remain separate stages.",
        ],
    }

    output_path = Path(__file__).parent / "results" / "semantic-search-results.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(json.dumps({"summary": summaries, "failures": failures, "unsupported": unsupported}, indent=2))
    print(f"\nSaved {output_path}")


if __name__ == "__main__":
    main()
