#!/usr/bin/env python3
"""Low-cost runtime smoke tests for chapters 1-3.

This intentionally uses a 135M proxy model for generation/logits/cache tests.
It validates the notebook code paths without claiming Phi-3 parity.
"""

from __future__ import annotations

import argparse
import json
import os
import platform
import statistics
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import psutil
import torch
import transformers
from transformers import AutoModelForCausalLM, AutoTokenizer


UPSTREAM_COMMIT = "ea3390819997999a51983677b80b3aac4dc50ada"
PROXY_MODEL = "HuggingFaceTB/SmolLM2-135M-Instruct"
TOKENIZER_MODELS = [
    "bert-base-uncased",
    "bert-base-cased",
    "gpt2",
    "google/flan-t5-small",
    "microsoft/Phi-3-mini-4k-instruct",
]
TOKENIZER_TEXT = """English and CAPITALIZATION 🎵 鸟
12.0*50=600
Two tabs:\t\tThree tabs:\t\t\t"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).parent / "results" / "smoke-results.json",
    )
    return parser.parse_args()


def gpu_inventory() -> list[dict[str, str]]:
    command = [
        "nvidia-smi",
        "--query-gpu=name,memory.total,driver_version",
        "--format=csv,noheader,nounits",
    ]
    try:
        output = subprocess.check_output(command, text=True, timeout=10).strip()
    except (OSError, subprocess.SubprocessError):
        return []
    devices = []
    for line in output.splitlines():
        name, memory_mb, driver = [part.strip() for part in line.split(",", 2)]
        devices.append(
            {"name": name, "memoryMiB": memory_mb, "driverVersion": driver}
        )
    return devices


def tokenizer_smoke() -> dict:
    rows = []
    for model_id in TOKENIZER_MODELS:
        started = time.perf_counter()
        try:
            tokenizer = AutoTokenizer.from_pretrained(model_id)
            encoded = tokenizer(TOKENIZER_TEXT, add_special_tokens=True)
            token_ids = encoded["input_ids"]
            tokens = tokenizer.convert_ids_to_tokens(token_ids)
            rows.append(
                {
                    "model": model_id,
                    "status": "pass",
                    "elapsedSeconds": round(time.perf_counter() - started, 3),
                    "tokenCount": len(token_ids),
                    "firstTokens": tokens[:24],
                    "roundTripPreview": tokenizer.decode(token_ids)[:180],
                }
            )
        except Exception as error:  # preserve per-model failure evidence
            rows.append(
                {
                    "model": model_id,
                    "status": "fail",
                    "elapsedSeconds": round(time.perf_counter() - started, 3),
                    "error": f"{type(error).__name__}: {error}",
                }
            )
    passed = sum(row["status"] == "pass" for row in rows)
    return {
        "id": "ch02-tokenizer-comparison",
        "status": "pass" if passed >= 4 else "fail",
        "sourceChapter": 2,
        "input": TOKENIZER_TEXT,
        "passedModels": passed,
        "totalModels": len(rows),
        "models": rows,
    }


def timed_generation(model, inputs, use_cache: bool, repetitions: int = 2) -> list[float]:
    timings = []
    for _ in range(repetitions):
        started = time.perf_counter()
        with torch.inference_mode():
            model.generate(
                **inputs,
                max_new_tokens=20,
                do_sample=False,
                use_cache=use_cache,
                pad_token_id=model.config.eos_token_id,
            )
        timings.append(round(time.perf_counter() - started, 4))
    return timings


def proxy_model_smoke() -> list[dict]:
    process = psutil.Process()
    load_started = time.perf_counter()
    tokenizer = AutoTokenizer.from_pretrained(PROXY_MODEL)
    model = AutoModelForCausalLM.from_pretrained(PROXY_MODEL)
    model.eval()
    load_seconds = round(time.perf_counter() - load_started, 3)
    parameter_count = sum(parameter.numel() for parameter in model.parameters())
    parameter_bytes = sum(
        parameter.numel() * parameter.element_size() for parameter in model.parameters()
    )

    messages = [{"role": "user", "content": "Create a funny joke about chickens."}]
    rendered = tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )
    generation_inputs = tokenizer(rendered, return_tensors="pt")
    started = time.perf_counter()
    with torch.inference_mode():
        generated = model.generate(
            **generation_inputs,
            max_new_tokens=48,
            do_sample=False,
            use_cache=True,
            pad_token_id=tokenizer.eos_token_id,
        )
    generation_seconds = round(time.perf_counter() - started, 3)
    new_tokens = generated[0, generation_inputs["input_ids"].shape[1] :]
    generated_text = tokenizer.decode(new_tokens, skip_special_tokens=True).strip()

    logits_prompt = "The capital of France is"
    logits_inputs = tokenizer(logits_prompt, return_tensors="pt")
    with torch.inference_mode():
        logits_output = model(**logits_inputs, use_cache=True)
    next_token_id = int(logits_output.logits[0, -1].argmax().item())
    next_token = tokenizer.decode([next_token_id])
    first_layer_key = logits_output.past_key_values[0][0]

    cache_prompt = (
        "The capital of France is Paris. " * 16
        + "A concise answer to the next question is"
    )
    cache_inputs = tokenizer(cache_prompt, return_tensors="pt")
    timed_generation(model, cache_inputs, use_cache=True, repetitions=1)
    with_cache = timed_generation(model, cache_inputs, use_cache=True)
    without_cache = timed_generation(model, cache_inputs, use_cache=False)

    shared = {
        "proxyModel": PROXY_MODEL,
        "evidenceBoundary": (
            "Code-path proxy only; this does not validate Phi-3 output quality, "
            "memory use, or performance."
        ),
        "modelLoadSeconds": load_seconds,
        "parameterCount": parameter_count,
        "parameterMemoryMiB": round(parameter_bytes / 1024**2, 2),
        "processRssMiBAfterTests": round(process.memory_info().rss / 1024**2, 2),
    }
    return [
        {
            "id": "ch01-instruction-generation-proxy",
            "status": "pass" if generated_text else "fail",
            "sourceChapter": 1,
            **shared,
            "input": messages[0]["content"],
            "output": generated_text,
            "newTokenCount": int(new_tokens.shape[0]),
            "generationSeconds": generation_seconds,
        },
        {
            "id": "ch03-next-token-logits-proxy",
            "status": "pass",
            "sourceChapter": 3,
            **shared,
            "input": logits_prompt,
            "logitsShape": list(logits_output.logits.shape),
            "argmaxTokenId": next_token_id,
            "argmaxToken": next_token,
        },
        {
            "id": "ch03-kv-cache-proxy",
            "status": "pass",
            "sourceChapter": 3,
            **shared,
            "inputTokenCount": int(cache_inputs["input_ids"].shape[1]),
            "pastKeyValueLayers": len(logits_output.past_key_values),
            "firstLayerKeyShape": list(first_layer_key.shape),
            "withCacheSeconds": with_cache,
            "withoutCacheSeconds": without_cache,
            "withCacheMedianSeconds": round(statistics.median(with_cache), 4),
            "withoutCacheMedianSeconds": round(statistics.median(without_cache), 4),
            "timingInterpretation": (
                "A smoke measurement, not a benchmark; tiny CPU models can be "
                "dominated by framework overhead."
            ),
        },
    ]


def main() -> int:
    args = parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    started = time.perf_counter()
    torch.manual_seed(0)
    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
    result = {
        "schemaVersion": 1,
        "experiment": "phase-01-foundations",
        "runAtUtc": datetime.now(timezone.utc).isoformat(),
        "upstreamCommit": UPSTREAM_COMMIT,
        "environment": {
            "python": sys.version.split()[0],
            "platform": platform.platform(),
            "processor": platform.processor(),
            "logicalCpuCount": psutil.cpu_count(logical=True),
            "physicalMemoryGiB": round(psutil.virtual_memory().total / 1024**3, 2),
            "gpus": gpu_inventory(),
            "executionDevice": "cpu",
            "packages": {
                "torch": torch.__version__,
                "transformers": transformers.__version__,
                "numpy": np.__version__,
            },
            "hfHome": os.environ.get("HF_HOME", ""),
        },
        "tests": [],
        "limitations": [
            "Phi-3-mini-4k-instruct weights were not loaded.",
            "No paid API or gated model was used.",
            "Proxy-model timing is not comparable to the upstream Phi-3 notebook.",
        ],
    }
    result["tests"].append(tokenizer_smoke())
    try:
        result["tests"].extend(proxy_model_smoke())
    except Exception as error:
        result["tests"].append(
            {
                "id": "proxy-model-suite",
                "status": "fail",
                "error": f"{type(error).__name__}: {error}",
            }
        )
    result["elapsedSeconds"] = round(time.perf_counter() - started, 3)
    result["status"] = (
        "pass"
        if result["tests"]
        and all(test["status"] == "pass" for test in result["tests"])
        else "fail"
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0 if result["status"] == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
