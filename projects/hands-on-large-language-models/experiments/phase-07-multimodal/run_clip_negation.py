"""Reproduce Chapter 9 CLIP retrieval and probe one-word negation sensitivity."""

from __future__ import annotations

import hashlib
import json
import os
import platform
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import torch
import transformers
from PIL import Image
from transformers import CLIPModel, CLIPProcessor


MODEL_ID = "openai/clip-vit-base-patch32"
MODEL_REVISION = "3d74acf9a28c67741b2f4f2ea7635f0aaf6f0268"
SEED = 42

ITEMS = [
    {
        "id": "puppy",
        "filename": "puppy.png",
        "affirmative": "a puppy playing in the snow",
        "negated": "not a puppy playing in the snow",
    },
    {
        "id": "cat",
        "filename": "cat.png",
        "affirmative": "a pixelated image of a cute cat",
        "negated": "not a pixelated image of a cute cat",
    },
    {
        "id": "car",
        "filename": "car.png",
        "affirmative": "a supercar on the road with the sunset in the background",
        "negated": "not a supercar on the road with the sunset in the background",
    },
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def normalize(tensor: torch.Tensor) -> torch.Tensor:
    return tensor / tensor.norm(dim=-1, keepdim=True)


def rounded_matrix(matrix: np.ndarray) -> list[list[float]]:
    return [[round(float(value), 6) for value in row] for row in matrix]


def main() -> None:
    np.random.seed(SEED)
    torch.manual_seed(SEED)

    phase_dir = Path(__file__).resolve().parent
    project_dir = Path(__file__).resolve().parents[2]
    image_dir = project_dir / "upstream" / "chapter09" / "images"
    image_paths = [image_dir / item["filename"] for item in ITEMS]
    missing = [str(path) for path in image_paths if not path.exists()]
    if missing:
        raise FileNotFoundError(f"Missing pinned upstream images: {missing}")

    offline = os.environ.get("HF_HUB_OFFLINE") == "1" and os.environ.get("TRANSFORMERS_OFFLINE") == "1"
    processor = CLIPProcessor.from_pretrained(
        MODEL_ID,
        revision=MODEL_REVISION,
        local_files_only=offline,
    )
    model = CLIPModel.from_pretrained(
        MODEL_ID,
        revision=MODEL_REVISION,
        local_files_only=offline,
    ).to("cpu")
    model.eval()

    images = [Image.open(path).convert("RGB") for path in image_paths]
    affirmative = [item["affirmative"] for item in ITEMS]
    negated = [item["negated"] for item in ITEMS]

    with torch.inference_mode():
        image_inputs = processor(images=images, return_tensors="pt")
        affirmative_inputs = processor(text=affirmative, padding=True, return_tensors="pt")
        negated_inputs = processor(text=negated, padding=True, return_tensors="pt")
        image_embeddings = normalize(model.get_image_features(**image_inputs))
        affirmative_embeddings = normalize(model.get_text_features(**affirmative_inputs))
        negated_embeddings = normalize(model.get_text_features(**negated_inputs))

    affirmative_matrix = (image_embeddings @ affirmative_embeddings.T).cpu().numpy()
    negated_matrix = (image_embeddings @ negated_embeddings.T).cpu().numpy()
    six_caption_matrix = np.concatenate([affirmative_matrix, negated_matrix], axis=1)

    retrieval_rows = []
    polarity_rows = []
    six_caption_labels = [f"{item['id']}:affirmative" for item in ITEMS] + [
        f"{item['id']}:negated" for item in ITEMS
    ]
    for image_index, item in enumerate(ITEMS):
        affirmative_order = np.argsort(-affirmative_matrix[image_index])
        six_order = np.argsort(-six_caption_matrix[image_index])
        correct_rank = int(np.where(affirmative_order == image_index)[0][0]) + 1
        positive_score = float(affirmative_matrix[image_index, image_index])
        negated_score = float(negated_matrix[image_index, image_index])
        retrieval_rows.append(
            {
                "imageId": item["id"],
                "correctCaptionRank": correct_rank,
                "hitAt1": correct_rank == 1,
                "ranking": [
                    {
                        "rank": rank,
                        "captionId": ITEMS[caption_index]["id"],
                        "score": round(float(affirmative_matrix[image_index, caption_index]), 6),
                    }
                    for rank, caption_index in enumerate(affirmative_order, start=1)
                ],
            }
        )
        polarity_rows.append(
            {
                "imageId": item["id"],
                "affirmative": item["affirmative"],
                "negated": item["negated"],
                "affirmativeScore": round(positive_score, 6),
                "negatedScore": round(negated_score, 6),
                "affirmativeMinusNegated": round(positive_score - negated_score, 6),
                "negatedBeatsAffirmative": negated_score > positive_score,
                "allCaptionRanking": [
                    {
                        "rank": rank,
                        "caption": six_caption_labels[caption_index],
                        "score": round(float(six_caption_matrix[image_index, caption_index]), 6),
                    }
                    for rank, caption_index in enumerate(six_order, start=1)
                ],
            }
        )

    gaps = [row["affirmativeMinusNegated"] for row in polarity_rows]
    result = {
        "experiment": "Chapter 9 CLIP cross-modal retrieval and one-word negation probe",
        "predictionBeforeRun": "The three affirmative captions should retrieve their matching images. Adding only 'not' should lower the matching score, but the small change may leave false negated captions surprisingly close because CLIP similarity is not logical entailment.",
        "controlledVariable": "caption polarity only: each negative caption inserts the single word 'not' while image, model, preprocessing and all other caption tokens remain fixed",
        "fixedConditions": {
            "images": len(ITEMS),
            "affirmativeCaptions": len(ITEMS),
            "negatedCaptions": len(ITEMS),
            "seed": SEED,
            "imageSource": "pinned upstream chapter09/images directory",
        },
        "sourceNotebook": {
            "chapter": 9,
            "upstreamCommit": "ea3390819997999a51983677b80b3aac4dc50ada",
            "operativeCells": [4, 7, 8, 9, 10, 11, 13, 14, 16, 17, 18, 20],
            "generationBoundaryCells": [22, 24, 25, 28, 29, 32, 33, 34, 35, 38, 39, 40],
        },
        "model": {
            "id": MODEL_ID,
            "revision": MODEL_REVISION,
            "device": "cpu",
            "embeddingDimensions": int(image_embeddings.shape[1]),
            "normalization": "L2",
            "similarity": "cosine via dot product",
        },
        "environment": {
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "python": platform.python_version(),
            "torch": torch.__version__,
            "transformers": transformers.__version__,
            "numpy": np.__version__,
            "pillow": Image.__version__,
            "offlineMode": offline,
        },
        "assets": [
            {
                "id": item["id"],
                "path": f"upstream/chapter09/images/{item['filename']}",
                "sha256": sha256(path),
                "mode": image.mode,
                "size": list(image.size),
                "notebookProvenance": "Notebook comment describes repository examples as AI-generated; generator and original prompt are not recorded.",
            }
            for item, path, image in zip(ITEMS, image_paths, images)
        ],
        "summary": {
            "affirmativeRetrievalTop1": sum(row["hitAt1"] for row in retrieval_rows),
            "affirmativeRetrievalTotal": len(retrieval_rows),
            "negatedBeatsAffirmative": sum(row["negatedBeatsAffirmative"] for row in polarity_rows),
            "meanAffirmativeMinusNegated": round(float(np.mean(gaps)), 6),
            "minimumAffirmativeMinusNegated": round(float(np.min(gaps)), 6),
            "maximumAffirmativeMinusNegated": round(float(np.max(gaps)), 6),
        },
        "affirmativeSimilarityMatrix": rounded_matrix(affirmative_matrix),
        "negatedSimilarityMatrix": rounded_matrix(negated_matrix),
        "retrievalResults": retrieval_rows,
        "negationResults": polarity_rows,
        "interpretationBoundary": [
            "This is a three-image mechanism probe, not a general CLIP benchmark.",
            "The images are repository examples described only as AI-generated; their generator and prompts are unavailable.",
            "Cosine similarity measures proximity in CLIP's shared embedding space, not truth, logical entailment or calibrated probability.",
            "BLIP-2 captioning and visual question answering are not executed; their generation quality is a separate capability.",
            "The Notebook's BLIP-2 checkpoint logs approximately 15.5 GB of shards and is outside this CPU practice boundary.",
        ],
    }

    output_path = phase_dir / "results" / "clip-negation-results.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"summary": result["summary"], "negationResults": polarity_rows}, indent=2))
    print(f"\nSaved {output_path}")


if __name__ == "__main__":
    main()
