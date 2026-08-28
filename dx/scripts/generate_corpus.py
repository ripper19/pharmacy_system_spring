"""Generate the v2 synthetic patient corpus (evidence-coded CSV rows).

For each condition, sample patients whose evidence sets follow the frozen
condition profile: core findings present with high probability, peripheral
findings with low probability, antecedents from risk factors. Age/sex are
sampled within plausible per-system ranges. Output matches the DDXPlus
release CSV schema so mlpipe.data loads it unchanged.

Deterministic given SEED. The LLM is NOT used here — profiles come entirely
from the frozen contracts; this script only samples.
"""
from __future__ import annotations

import argparse
import csv
import json
import random
from pathlib import Path

from mlpipe.config import SEED

ML_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ML_ROOT / "data" / "ddxplus"
CONDITIONS_V2 = DATA_DIR / "release_conditions_v2.json"
EVIDENCES_V2 = DATA_DIR / "release_evidences_v2.json"

AGE_RANGE_BY_TIER = {1: (18, 90), 2: (25, 85), 3: (35, 80)}
CORE_P = 0.80
PERIPH_P = 0.20
ANTECEDENT_P = 0.30
NOISE_EXTRA_EVIDENCES = 2


def sample_patient(
    rng: random.Random,
    name: str,
    cond: dict,
    evidences: dict[str, dict],
) -> dict:
    tier = int(cond.get("prevalence_tier", 2))
    lo, hi = AGE_RANGE_BY_TIER[tier]
    core = list(cond.get("v2_core", []))
    periph = [c for c in cond["symptoms"] if c not in set(core)]
    present = [c for c in core if rng.random() < CORE_P]
    present += [c for c in periph if rng.random() < PERIPH_P]
    present += [
        c for c in cond["antecedents"] if rng.random() < ANTECEDENT_P
    ]
    # small chance of unrelated noise findings to avoid unrealistically clean rows
    pool = [c for c in evidences if c not in set(present)]
    present += rng.sample(pool, min(NOISE_EXTRA_EVIDENCES, len(pool)))
    return {
        "AGE": rng.randint(lo, hi),
        "SEX": rng.choice(["F", "M"]),
        "PATHOLOGY": name,
        "EVIDENCES": repr(sorted(set(present))),
        "INITIAL_EVIDENCE": present[0] if present else "",
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-class", type=int, default=300)
    ap.add_argument("--outdir", type=Path, default=DATA_DIR / "v2_corpus")
    args = ap.parse_args()

    conditions = json.loads(CONDITIONS_V2.read_text())
    evidences = json.loads(EVIDENCES_V2.read_text())
    # v1 conditions keep their original release files for the training
    # mixture; this generator emits only NEW conditions.
    v2_conditions = {k: v for k, v in conditions.items() if "v2_core" in v}
    args.outdir.mkdir(parents=True, exist_ok=True)
    splits = {"train": 0.8, "validate": 0.1, "test": 0.1}
    handles = {
        split: (args.outdir / f"v2_{split}.csv").open("w", newline="")
        for split in splits
    }
    writers = {
        split: csv.DictWriter(
            h,
            fieldnames=["AGE", "SEX", "PATHOLOGY", "EVIDENCES", "INITIAL_EVIDENCE"],
        )
        for split, h in handles.items()
    }
    for w in writers.values():
        w.writeheader()

    rng = random.Random(SEED)
    counts: dict[str, int] = {}
    for name, cond in sorted(v2_conditions.items()):
        for _ in range(args.per_class):
            row = sample_patient(rng, name, cond, evidences)
            u = rng.random()
            split = (
                "train" if u < splits["train"]
                else "validate" if u < splits["train"] + splits["validate"]
                else "test"
            )
            writers[split].writerow(row)
            counts[name] = counts.get(name, 0) + 1

    for h in handles.values():
        h.close()
    assert min(counts.values()) == args.per_class
    print(
        f"wrote {sum(counts.values())} rows x {len(counts)} conditions "
        f"to {args.outdir}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
