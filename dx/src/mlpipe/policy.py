"""Next-best-question selection by expected information gain.

Naive-Bayes branch model: given fused posterior w over conditions and an
empirical presence table P(evidence | condition), each candidate question's
expected posterior entropy is computed over yes/no branches.
"""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

_EPS = 1e-12

VocabLike = dict[str, Any]


def entropy(w: np.ndarray) -> float:
    mask = w > 0
    return float(-(w[mask] * np.log(w[mask])).sum())


def information_gain(w: np.ndarray, table_col: dict[int, float]) -> float:
    h_before = entropy(w)
    p_yes = float(np.sum(w * np.array([table_col.get(i, 0.0) for i in range(len(w))])))
    like_yes = np.array([table_col.get(i, 0.0) for i in range(len(w))])
    like_no = 1.0 - like_yes
    w_yes = w * like_yes
    w_no = w * like_no
    h_yes = entropy(w_yes / w_yes.sum()) if w_yes.sum() > _EPS else h_before
    h_no = entropy(w_no / w_no.sum()) if w_no.sum() > _EPS else h_before
    return h_before - (p_yes * h_yes + (1 - p_yes) * h_no)


def select_question(
    posterior: np.ndarray,
    presence_table: dict[str, dict[int, float]],
    questions: dict[str, str],
    asked: set[str],
) -> tuple[str, str] | None:
    """Return (code, question_text) with max expected info gain, or None."""
    best: tuple[float, str] | None = None
    for code in sorted(questions):
        if code in asked or code not in presence_table:
            continue
        gain = information_gain(posterior, presence_table[code])
        if gain <= _EPS:
            continue
        if best is None or gain > best[0]:
            best = (gain, code)
    if best is None:
        return None
    code = best[1]
    return code, questions[code]


def build_presence_table(
    df: pd.DataFrame,
    vocab: VocabLike,
) -> dict[str, dict[int, float]]:
    """P(any variant of base evidence present | condition), from training rows.

    Value-suffixed codes (E_54_@_V_180) collapse to their base (E_54); a row
    reporting several variants of one base counts that base once.
    """
    classes = {name: i for i, name in enumerate(vocab["pathologies"])}
    records: list[tuple[int, int, str]] = []
    for rid, pathology, evidences in zip(
        range(len(df)), df["PATHOLOGY"], df["EVIDENCES"], strict=True
    ):
        bases = {code.split("_@_")[0] for code in evidences}
        records.extend((rid, classes[pathology], base) for base in sorted(bases))
    exploded = pd.DataFrame(records, columns=["rid", "cls", "base"])
    counts = exploded.drop_duplicates(["rid", "base"]).groupby(["base", "cls"]).size()
    totals = df["PATHOLOGY"].map(classes).value_counts()
    table: dict[str, dict[int, float]] = {}
    for base in vocab["evidence_codes"]:
        per_class: dict[int, float] = {}
        for cls_idx in range(len(vocab["pathologies"])):
            n_total = int(totals.get(cls_idx, 0))
            n_present = int(counts.get((base, cls_idx), 0))
            per_class[cls_idx] = n_present / n_total if n_total else 0.0
        table[base] = per_class
    return table
