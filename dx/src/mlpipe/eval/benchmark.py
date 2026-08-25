"""M6 benchmark: full-chain metrics on the held-out test split.

Usage: python -m mlpipe.eval.benchmark [--max N] [--out PATH]
Requires trained artifacts in ml/artifacts/ (vocab, e1, e2, ask_table[, calib]).
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import numpy as np

from mlpipe.config import ARTIFACTS_DIR
from mlpipe.service import load_context


def macro_f1(y_true: np.ndarray, y_pred: np.ndarray, n_classes: int) -> float:
    f1s = []
    for c in range(n_classes):
        tp = int(((y_pred == c) & (y_true == c)).sum())
        fp = int(((y_pred == c) & (y_true != c)).sum())
        fn = int(((y_pred != c) & (y_true == c)).sum())
        denom = 2 * tp + fp + fn
        f1s.append(2 * tp / denom if denom else 0.0)
    return float(np.mean(f1s))


def topk(y_true: np.ndarray, probas: np.ndarray, k: int) -> float:
    top = np.argsort(-probas, axis=1, kind="stable")[:, :k]
    hits = (top == y_true[:, None]).any(axis=1)
    return float(hits.mean())


def tail_recall_at_k(
    y_true: np.ndarray,
    probas: np.ndarray,
    counts: np.ndarray,
    k: int,
    frac: float = 0.2,
) -> float:
    """Recall@k restricted to the rarest `frac` of classes."""
    rare = np.argsort(counts)[: max(1, int(len(counts) * frac))]
    mask = np.isin(y_true, rare)
    if not mask.any():
        return float("nan")
    top = np.argsort(-probas[mask], axis=1, kind="stable")[:, :k]
    hits = (top == y_true[mask][:, None]).any(axis=1)
    return float(hits.mean())


def ece(probas: np.ndarray, y: np.ndarray, n_bins: int = 15) -> float:
    conf = probas.max(axis=1)
    correct = (probas.argmax(axis=1) == y).astype(float)
    bins = np.minimum((conf * n_bins).astype(int), n_bins - 1)
    total = len(y)
    value = 0.0
    for b in range(n_bins):
        m = bins == b
        if m.any():
            gap = abs(float(conf[m].mean()) - float(correct[m].mean()))
            value += m.sum() / total * gap
    return value


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max", type=int, default=20_000, help="test rows to score")
    parser.add_argument("--out", default=str(ARTIFACTS_DIR / "benchmark.json"))
    args = parser.parse_args()

    from mlpipe.config import DDXPLUS_DIR
    from mlpipe.data import load_processed

    ctx = load_context(include_e3=False)
    if ctx is None:
        raise SystemExit("artifacts missing — run training first")

    test_df = load_processed(DDXPLUS_DIR / "processed_test.csv").head(args.max)
    lut = {c: i for i, c in enumerate(ctx.classes)}
    y = np.array([lut[p] for p in test_df["PATHOLOGY"]])
    counts_path = ARTIFACTS_DIR / "class_counts.json"
    if counts_path.exists():
        raw_counts = json.loads(counts_path.read_text())
        train_counts = np.array([float(raw_counts.get(c, 0)) for c in ctx.classes])
    else:
        train_counts = None

    rows = [
        (
            tuple(ev),
            None if ag != ag else int(ag),
            sx,
        )
        for ev, ag, sx in zip(test_df["EVIDENCES"], test_df["AGE"], test_df["SEX"], strict=True)
    ]
    t0 = time.time()
    if ctx.batch_scorer is not None:
        P = np.asarray(ctx.batch_scorer(rows), dtype=np.float64)
    else:
        P = np.asarray([ctx.experts[0](*r) for r in rows])
    latency_ms = (time.time() - t0) * 1000 / max(1, len(test_df))

    report = {
        "n_test": int(len(y)),
        "top1": topk(y, P, 1),
        "top3": topk(y, P, 3),
        "top5": topk(y, P, 5),
        "macro_f1": macro_f1(y, P.argmax(axis=1), len(ctx.classes)),
        "tail_recall@5_rare20pct": (
            tail_recall_at_k(y, P, train_counts, 5) if train_counts is not None else None
        ),
        "ece_15bins": ece(P, y),
        "latency_ms_per_case_cpu": round(latency_ms, 2),
        "classes": len(ctx.classes),
    }
    Path(args.out).write_text(json.dumps(report, indent=1))
    print(json.dumps(report, indent=1))


if __name__ == "__main__":
    main()
