"""Mondrian (class-conditional) conformal prediction sets."""
from __future__ import annotations

import math

import numpy as np

MARGINAL = -1


def _quantile(scores: np.ndarray, alpha: float) -> float:
    rank = math.ceil((len(scores) + 1) * (1 - alpha))
    if rank > len(scores):
        return math.inf
    return float(np.sort(scores)[rank - 1])


def calibrate_conformal(
    probas: np.ndarray,
    labels: np.ndarray,
    alpha: float,
    min_per_class: int,
) -> dict[int, float]:
    """Return {class_code: threshold} plus {MARGINAL: fallback_threshold}.

    Nonconformity score is 1 - p_true; a class is in the prediction set while
    its score does not exceed its threshold.
    """
    all_scores = 1.0 - probas[np.arange(len(labels)), labels]
    thresholds: dict[int, float] = {}
    for c in np.unique(labels):
        scores = all_scores[labels == c]
        if len(scores) >= min_per_class:
            q = _quantile(scores, alpha)
        else:
            q = _quantile(all_scores, alpha)
        thresholds[int(c)] = q
    thresholds[MARGINAL] = _quantile(all_scores, alpha)
    return thresholds


def prediction_set(row_probas: np.ndarray, thresholds: dict[int, float]) -> tuple[int, ...]:
    members = [
        c
        for c in range(len(row_probas))
        if (1.0 - float(row_probas[c])) <= thresholds.get(c, thresholds[MARGINAL])
    ]
    if not members:
        return (int(row_probas.argmax()),)
    return tuple(members)
