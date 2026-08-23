"""Create a deterministic, code-derived inventory of the upstream notebooks."""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]
UPSTREAM_DIR = PROJECT_DIR / "upstream"
OUTPUT_PATH = PROJECT_DIR / "analysis" / "notebook-inventory.json"


REFERENCE_PATTERNS = {
    "models": [
        re.compile(r"from_pretrained\(\s*[furb]*[\"']([^\"']+/[^\"']+)[\"']"),
        re.compile(r"SentenceTransformer\(\s*[furb]*[\"']([^\"']+)[\"']"),
        re.compile(r"model\s*=\s*[furb]*[\"']([^\"']+/[^\"']+)[\"']"),
    ],
    "datasets": [
        re.compile(r"load_dataset\(\s*[furb]*[\"']([^\"']+)[\"']"),
    ],
}

TECHNIQUE_MARKERS = {
    "tokenization": ("AutoTokenizer", "convert_ids_to_tokens"),
    "text_generation": ("AutoModelForCausalLM", "text-generation"),
    "embeddings": ("SentenceTransformer", "AutoModel"),
    "classification": ("LogisticRegression", "SequenceClassification", "zero-shot-classification"),
    "clustering": ("HDBSCAN", "UMAP"),
    "topic_modeling": ("BERTopic",),
    "prompt_engineering": ("chat_template", "Llama.from_pretrained"),
    "agents": ("AgentExecutor", "create_react_agent"),
    "vector_search": ("faiss", "BM25Okapi"),
    "rag": ("RetrievalQA",),
    "multimodal": ("CLIPModel", "Blip2ForConditionalGeneration"),
    "embedding_training": ("SentenceTransformerTrainer", "MultipleNegativesRankingLoss"),
    "fine_tuning": ("Trainer(", "SFTTrainer("),
    "lora": ("LoraConfig", "get_peft_model"),
    "preference_tuning": ("DPOTrainer", "DPOConfig"),
}


def git_head() -> str:
    return subprocess.check_output(
        ["git", "-C", str(UPSTREAM_DIR), "rev-parse", "HEAD"],
        text=True,
    ).strip()


def extract_references(code: str, patterns: list[re.Pattern[str]]) -> list[str]:
    values: set[str] = set()
    for pattern in patterns:
        values.update(match.group(1) for match in pattern.finditer(code))
    return sorted(values)


def analyze_notebook(path: Path) -> dict[str, object]:
    notebook = json.loads(path.read_text(encoding="utf-8"))
    cells = notebook.get("cells", [])
    code_cells = [cell for cell in cells if cell.get("cell_type") == "code"]
    markdown_cells = [cell for cell in cells if cell.get("cell_type") == "markdown"]
    code = "\n".join("".join(cell.get("source", [])) for cell in code_cells)

    imports = sorted(
        {
            line.strip()
            for line in code.splitlines()
            if re.match(r"^(?:from\s+\S+\s+import|import\s+\S+)", line.strip())
        }
    )
    techniques = sorted(
        name
        for name, markers in TECHNIQUE_MARKERS.items()
        if any(marker in code for marker in markers)
    )

    raw_bytes = path.read_bytes()
    return {
        "path": path.relative_to(UPSTREAM_DIR).as_posix(),
        "sha256": hashlib.sha256(raw_bytes).hexdigest(),
        "codeCells": len(code_cells),
        "markdownCells": len(markdown_cells),
        "imports": imports,
        "modelReferences": extract_references(code, REFERENCE_PATTERNS["models"]),
        "datasetReferences": extract_references(code, REFERENCE_PATTERNS["datasets"]),
        "techniques": techniques,
    }


def main() -> None:
    notebooks = sorted(UPSTREAM_DIR.glob("chapter*/*.ipynb"))
    if not notebooks:
        raise SystemExit("No chapter notebooks found. Initialize the upstream submodule first.")

    entries = [analyze_notebook(path) for path in notebooks]
    inventory = {
        "schemaVersion": 1,
        "upstream": "https://github.com/HandsOnLLM/Hands-On-Large-Language-Models",
        "upstreamCommit": git_head(),
        "summary": {
            "notebooks": len(entries),
            "codeCells": sum(int(item["codeCells"]) for item in entries),
            "markdownCells": sum(int(item["markdownCells"]) for item in entries),
        },
        "notebooks": entries,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(inventory, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUTPUT_PATH} ({len(entries)} notebooks)")


if __name__ == "__main__":
    main()
