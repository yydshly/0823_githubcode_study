#!/usr/bin/env python3
"""Chapter 6 controlled one-shot prompt experiment.

The model, JSON contract, tasks, chat template and greedy decoding stay fixed.
The only changed component is whether the prompt includes one worked example.
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
from typing import Any

import psutil
import torch
import transformers
from transformers import AutoModelForCausalLM, AutoTokenizer


UPSTREAM_COMMIT = "ea3390819997999a51983677b80b3aac4dc50ada"
DEFAULT_MODEL = "HuggingFaceTB/SmolLM2-135M-Instruct"
EXPECTED_KEYS = {"character", "armor", "weapon"}
EXAMPLE = {"character": "Ivo", "armor": "leather coat", "weapon": "iron dagger"}

PILOT_TASKS = [
    {"id": "pilot-01", "character": "Mira", "armor": "bronze mail", "weapon": "oak bow"},
    {"id": "pilot-02", "character": "Tova", "armor": "linen guard", "weapon": "glass wand"},
    {"id": "pilot-03", "character": "Rex", "armor": "storm plate", "weapon": "ash spear"},
    {"id": "pilot-04", "character": "Luma", "armor": "silk hood", "weapon": "river staff"},
]

FORMAL_TASKS = [
    {"id": "formal-01", "character": "Nia", "armor": "moon cloak", "weapon": "copper wand"},
    {"id": "formal-02", "character": "Tor", "armor": "iron helm", "weapon": "bone axe"},
    {"id": "formal-03", "character": "Vale", "armor": "fur mantle", "weapon": "steel sling"},
    {"id": "formal-04", "character": "Emi", "armor": "linen tunic", "weapon": "reed flute"},
    {"id": "formal-05", "character": "Bo", "armor": "obsidian plate", "weapon": "sun hammer"},
    {"id": "formal-06", "character": "Ari", "armor": "crystal veil", "weapon": "wind blade"},
    {"id": "formal-07", "character": "Lux", "armor": "wool coat", "weapon": "ivory bow"},
    {"id": "formal-08", "character": "Sen", "armor": "amber vest", "weapon": "frost knife"},
    {"id": "formal-09", "character": "Juno", "armor": "brass cuirass", "weapon": "pine lance"},
    {"id": "formal-10", "character": "Kato", "armor": "raven cape", "weapon": "stone mace"},
    {"id": "formal-11", "character": "Faye", "armor": "coral jacket", "weapon": "silver hook"},
    {"id": "formal-12", "character": "Rem", "armor": "velvet hood", "weapon": "ember whip"},
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--max-new-tokens", type=int, default=64)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).parent / "results" / "prompt-engineering-results.json",
    )
    return parser.parse_args()


def make_prompt(task: dict[str, str], with_example: bool) -> str:
    instruction = (
        "You convert RPG facts into JSON. Return JSON only with exactly these keys: "
        "character, armor, weapon. Copy each value exactly from the facts."
    )
    example = ""
    if with_example:
        example = (
            "\n\nExample facts:\n"
            f"Character: {EXAMPLE['character']}\nArmor: {EXAMPLE['armor']}\nWeapon: {EXAMPLE['weapon']}\n"
            "Example JSON:\n"
            + json.dumps(EXAMPLE, separators=(",", ":"))
        )
    facts = (
        "\n\nFacts to convert:\n"
        f"Character: {task['character']}\nArmor: {task['armor']}\nWeapon: {task['weapon']}"
    )
    return instruction + example + facts


def generate(
    model: AutoModelForCausalLM,
    tokenizer: AutoTokenizer,
    prompt: str,
    max_new_tokens: int,
) -> tuple[str, int, float]:
    messages = [{"role": "user", "content": prompt}]
    encoded = tokenizer.apply_chat_template(
        messages,
        tokenize=True,
        add_generation_prompt=True,
        return_tensors="pt",
    )
    started = time.perf_counter()
    with torch.inference_mode():
        generated = model.generate(
            encoded,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            pad_token_id=tokenizer.eos_token_id,
        )
    elapsed = time.perf_counter() - started
    new_tokens = generated[0, encoded.shape[-1] :]
    text = tokenizer.decode(new_tokens, skip_special_tokens=True).strip()
    return text, int(new_tokens.shape[-1]), elapsed


def evaluate_output(text: str, task: dict[str, str]) -> dict[str, Any]:
    parsed = None
    parse_error = None
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as error:
        parse_error = f"{error.msg} at line {error.lineno} column {error.colno}"

    json_object = isinstance(parsed, dict)
    exact_schema = json_object and set(parsed) == EXPECTED_KEYS
    string_types = exact_schema and all(isinstance(parsed[key], str) for key in EXPECTED_KEYS)
    exact_fields = {
        key: bool(json_object and parsed.get(key) == task[key])
        for key in sorted(EXPECTED_KEYS)
    }
    normalized_fields = {
        key: bool(
            json_object
            and isinstance(parsed.get(key), str)
            and parsed[key].strip() == task[key]
        )
        for key in sorted(EXPECTED_KEYS)
    }
    copied_example_fields = {
        key: bool(json_object and parsed.get(key) == EXAMPLE[key])
        for key in sorted(EXPECTED_KEYS)
    }
    exact_field_count = sum(exact_fields.values())
    normalized_field_count = sum(normalized_fields.values())
    copied_example_count = sum(copied_example_fields.values())
    return {
        "validJsonObject": json_object,
        "exactSchema": exact_schema,
        "stringTypes": string_types,
        "exactFields": exact_fields,
        "exactFieldCount": exact_field_count,
        "normalizedFields": normalized_fields,
        "normalizedFieldCount": normalized_field_count,
        "copiedExampleFields": copied_example_fields,
        "copiedExampleCount": copied_example_count,
        "fullRecordExact": json_object and exact_schema and string_types and exact_field_count == 3,
        "fullRecordNormalized": json_object and exact_schema and string_types and normalized_field_count == 3,
        "parseError": parse_error,
        "parsedValue": parsed,
    }


def summarize(rows: list[dict[str, Any]]) -> dict[str, Any]:
    task_count = len(rows)
    field_count = task_count * len(EXPECTED_KEYS)
    counts = {
        "validJsonObjects": sum(row["evaluation"]["validJsonObject"] for row in rows),
        "exactSchemas": sum(row["evaluation"]["exactSchema"] for row in rows),
        "fullRecordsExact": sum(row["evaluation"]["fullRecordExact"] for row in rows),
        "fullRecordsNormalized": sum(row["evaluation"]["fullRecordNormalized"] for row in rows),
        "exactFields": sum(row["evaluation"]["exactFieldCount"] for row in rows),
        "normalizedFields": sum(row["evaluation"]["normalizedFieldCount"] for row in rows),
        "copiedExampleFields": sum(row["evaluation"]["copiedExampleCount"] for row in rows),
        "tasksWithExampleCopy": sum(row["evaluation"]["copiedExampleCount"] > 0 for row in rows),
    }
    return {
        "taskCount": task_count,
        "fieldCount": field_count,
        "counts": counts,
        "rates": {
            "validJson": round(counts["validJsonObjects"] / task_count, 4),
            "exactSchema": round(counts["exactSchemas"] / task_count, 4),
            "fullRecordExact": round(counts["fullRecordsExact"] / task_count, 4),
            "fullRecordNormalized": round(counts["fullRecordsNormalized"] / task_count, 4),
            "exactField": round(counts["exactFields"] / field_count, 4),
            "normalizedField": round(counts["normalizedFields"] / field_count, 4),
            "exampleCopiedField": round(counts["copiedExampleFields"] / field_count, 4),
        },
        "meanGeneratedTokens": round(sum(row["generatedTokens"] for row in rows) / task_count, 2),
        "totalGenerationSeconds": round(sum(row["elapsedSeconds"] for row in rows), 3),
    }


def run_dataset(
    dataset_name: str,
    tasks: list[dict[str, str]],
    model: AutoModelForCausalLM,
    tokenizer: AutoTokenizer,
    max_new_tokens: int,
) -> dict[str, Any]:
    variants = []
    for variant_id, with_example in (("schema-only", False), ("schema-plus-one-shot", True)):
        rows = []
        for task in tasks:
            prompt = make_prompt(task, with_example)
            output, generated_tokens, elapsed = generate(model, tokenizer, prompt, max_new_tokens)
            rows.append(
                {
                    "taskId": task["id"],
                    "expected": {key: task[key] for key in sorted(EXPECTED_KEYS)},
                    "prompt": prompt,
                    "output": output,
                    "generatedTokens": generated_tokens,
                    "elapsedSeconds": round(elapsed, 3),
                    "evaluation": evaluate_output(output, task),
                }
            )
        variants.append(
            {
                "id": variant_id,
                "withOneShotExample": with_example,
                "summary": summarize(rows),
                "cases": rows,
            }
        )
    return {"name": dataset_name, "variants": variants}


def comparison(dataset: dict[str, Any]) -> dict[str, Any]:
    schema_only = dataset["variants"][0]["summary"]["counts"]
    one_shot = dataset["variants"][1]["summary"]["counts"]
    return {
        "fullRecordsExactChange": one_shot["fullRecordsExact"] - schema_only["fullRecordsExact"],
        "exactFieldsChange": one_shot["exactFields"] - schema_only["exactFields"],
        "validJsonChange": one_shot["validJsonObjects"] - schema_only["validJsonObjects"],
        "exampleCopiedFieldsChange": one_shot["copiedExampleFields"] - schema_only["copiedExampleFields"],
    }


def main() -> int:
    args = parse_args()
    started = time.perf_counter()
    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
    torch.manual_seed(42)

    load_started = time.perf_counter()
    tokenizer = AutoTokenizer.from_pretrained(args.model)
    model = AutoModelForCausalLM.from_pretrained(args.model)
    model.eval()
    load_seconds = time.perf_counter() - load_started

    pilot = run_dataset("four-record feasibility pilot", PILOT_TASKS, model, tokenizer, args.max_new_tokens)
    pilot_comparison = comparison(pilot)
    if (
        pilot_comparison["exactFieldsChange"] > 0
        and pilot_comparison["exampleCopiedFieldsChange"] == 0
    ):
        prediction_kind = "improvement"
        formal_prediction = (
            "The one-shot variant will increase exact field accuracy without copying example values."
        )
    elif (
        pilot_comparison["exactFieldsChange"] < 0
        and pilot_comparison["exampleCopiedFieldsChange"] > 0
    ):
        prediction_kind = "anchoring"
        formal_prediction = (
            "The one-shot variant will reduce exact field accuracy and copy at least one example value."
        )
    else:
        prediction_kind = "unclear"
        formal_prediction = "The formal run will test whether any pilot direction repeats on disjoint records."
    formal = run_dataset("twelve disjoint formal records", FORMAL_TASKS, model, tokenizer, args.max_new_tokens)
    formal_comparison = comparison(formal)
    formal_matches_prediction = (
        prediction_kind == "improvement"
        and formal_comparison["exactFieldsChange"] > 0
        and formal_comparison["exampleCopiedFieldsChange"] == 0
    ) or (
        prediction_kind == "anchoring"
        and formal_comparison["exactFieldsChange"] < 0
        and formal_comparison["exampleCopiedFieldsChange"] > 0
    )
    outcome = "confirmed" if formal_matches_prediction else "not confirmed"

    result = {
        "schemaVersion": 1,
        "experiment": "chapter-06-one-shot-json-extraction",
        "status": "pass",
        "recordedAt": datetime.now(timezone.utc).isoformat(),
        "source": {
            "upstreamCommit": UPSTREAM_COMMIT,
            "notebook": "chapter06/Chapter 6 - Prompt Engineering.ipynb",
            "mirroredCells": [4, 6, 17, 18, 33, 34, 38, 39],
        },
        "question": "When the JSON contract is already explicit, does adding one example improve reliability or anchor a small model to the example values?",
        "predictionBeforePilot": [
            "Both variants should often produce parseable JSON because the same schema instruction is fixed.",
            "A one-shot example may improve format consistency but can anchor a 135M model to example values.",
            "JSON validity, schema validity and field accuracy must be scored separately.",
        ],
        "formalPredictionAfterPilot": formal_prediction,
        "controlledVariables": {
            "model": args.model,
            "modelRevision": getattr(model.config, "_commit_hash", None),
            "example": EXAMPLE,
            "formalTaskCount": len(FORMAL_TASKS),
            "decoding": {"doSample": False, "maxNewTokens": args.max_new_tokens, "seed": 42},
            "chatTemplate": "model-native apply_chat_template",
            "changedVariable": "presence of one worked input-output example",
        },
        "pilot": {**pilot, "comparison": pilot_comparison},
        "formal": {**formal, "comparison": formal_comparison},
        "hypothesisAssessment": {"outcome": outcome},
        "timing": {
            "modelLoadSeconds": round(load_seconds, 3),
            "totalSeconds": round(time.perf_counter() - started, 3),
        },
        "environment": {
            "python": sys.version.split()[0],
            "platform": platform.platform(),
            "offlineMode": all(
                os.environ.get(name) == "1"
                for name in ("HF_HUB_OFFLINE", "TRANSFORMERS_OFFLINE")
            ),
            "logicalCpuCount": psutil.cpu_count(logical=True),
            "memoryGiB": round(psutil.virtual_memory().total / 1024**3, 2),
            "packages": {
                "torch": torch.__version__,
                "transformers": transformers.__version__,
                "psutil": psutil.__version__,
            },
        },
        "sourceIntegrityFindings": [
            "Notebook cell 13 overwrites the long article with a placeholder, while saved cell 15 output still summarizes the old article.",
            "Notebook cell 24 is fully commented out but retains a saved generated answer.",
            "Notebook cells 7 and 8 enable sampling without a seed or repeated trials, so their different jokes do not isolate temperature from top-p.",
            "Notebook cell 34 is a schema scaffold inside one user message, not a complete user-assistant one-shot example.",
            "Only notebook cell 39 calls json.loads; printing JSON-like text in cells 33 and 34 is not output verification.",
        ],
        "boundaries": [
            "SmolLM2-135M-Instruct is a cached CPU proxy for the upstream Phi-3-mini-4k-instruct model.",
            "The formal comparison uses twelve synthetic RPG records and one example; it cannot establish that one-shot prompting is generally helpful or harmful.",
            "Greedy decoding makes this run reproducible but does not measure sampled-output variance or creative quality.",
            "Raw model text is scored without JSON repair; normalized field accuracy only strips leading and trailing whitespace.",
            "The llama.cpp grammar path is excluded because changing the backend would confound a prompt-only comparison.",
        ],
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
