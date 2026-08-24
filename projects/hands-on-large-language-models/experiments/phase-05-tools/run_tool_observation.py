#!/usr/bin/env python3
"""Chapter 7 controlled calculator-observation experiment.

The model, tasks, output contract, chat template and greedy decoding stay fixed.
The only changed component is whether Python's Decimal result is included as a
tool observation before the model writes the final response.
"""

from __future__ import annotations

import argparse
import json
import os
import platform
import re
import sys
import time
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any

import psutil
import torch
import transformers
from transformers import AutoModelForCausalLM, AutoTokenizer


UPSTREAM_COMMIT = "ea3390819997999a51983677b80b3aac4dc50ada"
DEFAULT_MODEL = "HuggingFaceTB/SmolLM2-135M-Instruct"
NUMBER_PATTERN = re.compile(r"(?<![A-Za-z0-9_.])-?[0-9]+(?:[.][0-9]+)?")

PILOT_TASKS = [
    {"id": "pilot-01", "usd": "137.00", "rate": "0.83"},
    {"id": "pilot-02", "usd": "249.00", "rate": "0.76"},
    {"id": "pilot-03", "usd": "58.00", "rate": "1.17"},
    {"id": "pilot-04", "usd": "412.00", "rate": "0.64"},
]

FORMAL_TASKS = [
    {"id": "formal-01", "usd": "163.00", "rate": "0.87"},
    {"id": "formal-02", "usd": "287.00", "rate": "0.74"},
    {"id": "formal-03", "usd": "94.00", "rate": "1.13"},
    {"id": "formal-04", "usd": "521.00", "rate": "0.68"},
    {"id": "formal-05", "usd": "346.00", "rate": "0.91"},
    {"id": "formal-06", "usd": "79.00", "rate": "1.21"},
    {"id": "formal-07", "usd": "438.00", "rate": "0.66"},
    {"id": "formal-08", "usd": "152.00", "rate": "0.95"},
    {"id": "formal-09", "usd": "619.00", "rate": "0.72"},
    {"id": "formal-10", "usd": "233.00", "rate": "1.08"},
    {"id": "formal-11", "usd": "47.00", "rate": "0.89"},
    {"id": "formal-12", "usd": "374.00", "rate": "0.81"},
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--max-new-tokens", type=int, default=32)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).parent / "results" / "tool-observation-results.json",
    )
    return parser.parse_args()


def calculate(task: dict[str, str]) -> str:
    value = Decimal(task["usd"]) * Decimal(task["rate"])
    return str(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def make_prompt(task: dict[str, str], with_tool_observation: bool) -> tuple[str, str | None]:
    observation = calculate(task) if with_tool_observation else None
    prompt = (
        f"Convert {task['usd']} USD at rate {task['rate']} EUR for 1 USD. "
        "Return the EUR amount rounded to two decimal places. "
        "Put the final number at the end of your answer.\n"
    )
    if observation is None:
        prompt += "No calculator result is available. Calculate the amount yourself."
    else:
        prompt += (
            f"A calculator returned {observation}. "
            "Use this calculator result as the final amount."
        )
    return prompt, observation


def generate(
    model: AutoModelForCausalLM,
    tokenizer: AutoTokenizer,
    prompt: str,
    max_new_tokens: int,
) -> tuple[str, int, float]:
    encoded = tokenizer.apply_chat_template(
        [{"role": "user", "content": prompt}],
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
    output = tokenizer.decode(new_tokens, skip_special_tokens=True).strip()
    return output, int(new_tokens.shape[-1]), elapsed


def evaluate_output(output: str, expected: str) -> dict[str, Any]:
    numeric_tokens = NUMBER_PATTERN.findall(output)
    returned = numeric_tokens[-1] if numeric_tokens else None
    exact_amount = returned == expected
    numeric_amount = bool(returned and Decimal(returned) == Decimal(expected))
    return {
        "hasFinalNumericToken": returned is not None,
        "mentionsExpectedAmount": expected in numeric_tokens,
        "exactAmount": exact_amount,
        "numericAmount": numeric_amount,
        "returnedAmount": returned,
        "allNumericTokens": numeric_tokens,
    }


def summarize(rows: list[dict[str, Any]]) -> dict[str, Any]:
    task_count = len(rows)
    counts = {
        "responsesWithFinalNumber": sum(
            row["evaluation"]["hasFinalNumericToken"] for row in rows
        ),
        "responsesMentioningExpectedAmount": sum(
            row["evaluation"]["mentionsExpectedAmount"] for row in rows
        ),
        "exactAmounts": sum(row["evaluation"]["exactAmount"] for row in rows),
        "numericAmounts": sum(row["evaluation"]["numericAmount"] for row in rows),
    }
    return {
        "taskCount": task_count,
        "counts": counts,
        "rates": {key: round(value / task_count, 4) for key, value in counts.items()},
        "meanGeneratedTokens": round(sum(row["generatedTokens"] for row in rows) / task_count, 2),
        "totalGenerationSeconds": round(sum(row["elapsedSeconds"] for row in rows), 3),
    }


def run_dataset(
    name: str,
    tasks: list[dict[str, str]],
    model: AutoModelForCausalLM,
    tokenizer: AutoTokenizer,
    max_new_tokens: int,
) -> dict[str, Any]:
    variants = []
    for variant_id, with_tool in (
        ("model-only", False),
        ("python-calculator-observation", True),
    ):
        rows = []
        for task in tasks:
            expected = calculate(task)
            prompt, observation = make_prompt(task, with_tool)
            output, generated_tokens, elapsed = generate(
                model, tokenizer, prompt, max_new_tokens
            )
            rows.append(
                {
                    "taskId": task["id"],
                    "input": {"usd": task["usd"], "rate": task["rate"]},
                    "expectedAmount": expected,
                    "toolTrace": {
                        "executor": "Python decimal.Decimal" if with_tool else None,
                        "observation": observation,
                    },
                    "prompt": prompt,
                    "output": output,
                    "generatedTokens": generated_tokens,
                    "elapsedSeconds": round(elapsed, 3),
                    "evaluation": evaluate_output(output, expected),
                }
            )
        variants.append(
            {
                "id": variant_id,
                "withToolObservation": with_tool,
                "summary": summarize(rows),
                "cases": rows,
            }
        )
    return {"name": name, "variants": variants}


def comparison(dataset: dict[str, Any]) -> dict[str, int]:
    model_only = dataset["variants"][0]["summary"]["counts"]
    with_tool = dataset["variants"][1]["summary"]["counts"]
    return {
        "responsesWithFinalNumberChange": (
            with_tool["responsesWithFinalNumber"] - model_only["responsesWithFinalNumber"]
        ),
        "responsesMentioningExpectedAmountChange": (
            with_tool["responsesMentioningExpectedAmount"] - model_only["responsesMentioningExpectedAmount"]
        ),
        "exactAmountChange": with_tool["exactAmounts"] - model_only["exactAmounts"],
        "numericAmountChange": with_tool["numericAmounts"] - model_only["numericAmounts"],
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

    pilot = run_dataset(
        "four-task feasibility pilot", PILOT_TASKS, model, tokenizer, args.max_new_tokens
    )
    pilot_comparison = comparison(pilot)
    if pilot_comparison["exactAmountChange"] > 0:
        prediction_kind = "improvement"
        formal_prediction = (
            "Providing the Python calculator observation will increase exact amount accuracy."
        )
    elif pilot_comparison["exactAmountChange"] < 0:
        prediction_kind = "harm"
        formal_prediction = (
            "Providing the Python calculator observation will reduce exact amount accuracy."
        )
    else:
        prediction_kind = "no-change"
        formal_prediction = (
            "Providing the Python calculator observation will not change exact amount accuracy."
        )

    formal = run_dataset(
        "twelve disjoint formal tasks", FORMAL_TASKS, model, tokenizer, args.max_new_tokens
    )
    formal_comparison = comparison(formal)
    formal_direction = (
        "improvement"
        if formal_comparison["exactAmountChange"] > 0
        else "harm"
        if formal_comparison["exactAmountChange"] < 0
        else "no-change"
    )

    result = {
        "schemaVersion": 1,
        "experiment": "chapter-07-python-calculator-observation",
        "status": "pass",
        "recordedAt": datetime.now(timezone.utc).isoformat(),
        "source": {
            "upstreamCommit": UPSTREAM_COMMIT,
            "notebook": "chapter07/Chapter 7 - Advanced Text Generation Techniques and Tools.ipynb",
            "mirroredCells": [39, 40, 41, 42],
        },
        "question": "When the final answer prompt is fixed, what changes if Python's exact calculator result is included as a tool observation?",
        "predictionBeforePilot": [
            "Both variants should usually produce a final numeric token, even if the surrounding wording differs.",
            "Without a tool observation, multi-digit decimal multiplication may be numerically wrong.",
            "With an exact observation, the model still has to copy and format the value; the Python executor, not the model, performed the calculation.",
        ],
        "formalPredictionAfterPilot": formal_prediction,
        "controlledVariables": {
            "model": args.model,
            "modelRevision": getattr(model.config, "_commit_hash", None),
            "answerContract": "final numeric token, rounded to two decimal places",
            "formalTaskCount": len(FORMAL_TASKS),
            "decoding": {"doSample": False, "maxNewTokens": args.max_new_tokens, "seed": 42},
            "chatTemplate": "model-native apply_chat_template",
            "calculator": "Python decimal.Decimal with ROUND_HALF_UP to two places",
            "changedVariable": "presence of the exact Python calculator observation in the final answer prompt",
        },
        "pilot": {**pilot, "comparison": pilot_comparison},
        "formal": {**formal, "comparison": formal_comparison},
        "hypothesisAssessment": {
            "outcome": "confirmed" if formal_direction == prediction_kind else "not confirmed",
            "pilotDirection": prediction_kind,
            "formalDirection": formal_direction,
        },
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
            "Notebook cell 6 saves an empty raw llm.invoke response while the templated chain in cell 10 answers the same question; prompt framing changes the observed behavior.",
            "Notebook uses deprecated LLMChain throughout and saves a deprecation warning in cell 12.",
            "ConversationBufferWindowMemory k=2 forgets the original age after later turns; memory is selected prompt history, not a changed model state.",
            "ConversationSummaryMemory asks the same generative model to rewrite history, so the saved summary introduces privacy language and a gendered pronoun not supplied as facts.",
            "The agent example requires a placeholder OpenAI key, a live DuckDuckGo search and a time-sensitive ambiguous product price, so its saved answer is not a stable offline benchmark.",
        ],
        "boundaries": [
            "SmolLM2-135M-Instruct is a cached CPU proxy for the upstream Phi-3 llama.cpp and OpenAI models.",
            "The experiment isolates a provided tool observation; it does not evaluate whether the model can autonomously select the correct tool or write a parseable ReAct action.",
            "The twelve formal inputs are synthetic currency conversions with a supplied exchange rate; no web search or current market data is involved.",
            "The Python controller constructs the calculator call deterministically, Decimal executes it, and the language model only writes the final response.",
            "Greedy decoding supports repeatability but does not measure sampled-output variance.",
        ],
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
