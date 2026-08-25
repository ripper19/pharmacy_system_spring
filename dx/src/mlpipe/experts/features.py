"""Shared feature space for tabular experts: multi-hot evidences + age + sex."""
from __future__ import annotations

from collections.abc import Iterable
from typing import TypedDict

import numpy as np
import pandas as pd


class Vocab(TypedDict):
    evidence_codes: tuple[str, ...]
    pathologies: tuple[str, ...]


def build_vocab(train_df: pd.DataFrame) -> Vocab:
    codes: set[str] = set()
    for row in train_df["EVIDENCES"]:
        codes.update(row)
    return Vocab(
        evidence_codes=tuple(sorted(codes)),
        pathologies=tuple(sorted(set(train_df["PATHOLOGY"]))),
    )


def featurize(
    evidences: Iterable[str],
    age: int | None,
    sex: str | None,
    vocab: Vocab,
) -> np.ndarray:
    present = set(evidences)
    vec = np.zeros(len(vocab["evidence_codes"]) + 3, dtype=np.float64)
    index = {c: i for i, c in enumerate(vocab["evidence_codes"])}
    for code in present:
        if code in index:
            vec[index[code]] = 1.0
    vec[-3] = float(age) if age is not None else 0.0
    vec[-2] = 1.0 if sex == "M" else 0.0
    vec[-1] = 1.0 if sex == "F" else 0.0
    return vec
