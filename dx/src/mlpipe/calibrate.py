"""Calibration: temperature scaling, one-vs-rest isotonic, ECE."""
from __future__ import annotations

from collections.abc import Callable

import numpy as np
from scipy.optimize import minimize
from sklearn.isotonic import IsotonicRegression

_EPS = 1e-12


def _softmax(z: np.ndarray) -> np.ndarray:
    z = z - z.max(axis=1, keepdims=True)
    out = np.exp(z)
    return out / out.sum(axis=1, keepdims=True)


def _tempered_nll(log_t: np.ndarray, probas: np.ndarray, labels: np.ndarray) -> float:
    t = float(np.exp(log_t[0]))
    z = np.log(np.clip(probas, _EPS, None)) / t
    return float(-np.log(_softmax(z)[np.arange(len(labels)), labels] + _EPS).sum())


def fit_temperature(probas: np.ndarray, labels: np.ndarray) -> float:
    result = minimize(
        _tempered_nll,
        x0=np.array([0.0]),
        args=(probas, labels),
        method="L-BFGS-B",
        bounds=[(-5.0, 5.0)],
        tol=1e-12,
    )
    return float(np.exp(result.x[0]))


def apply_temperature(probas: np.ndarray, temperature: float) -> np.ndarray:
    return _softmax(np.log(np.clip(probas, _EPS, None)) / temperature)


def ece(probas: np.ndarray, labels: np.ndarray, n_bins: int = 15) -> float:
    confidence = probas.max(axis=1)
    correct = (probas.argmax(axis=1) == labels).astype(np.float64)
    bins = np.minimum((confidence * n_bins).astype(int), n_bins - 1)
    total = len(labels)
    value = 0.0
    for b in range(n_bins):
        mask = bins == b
        if not mask.any():
            continue
        gap = abs(float(confidence[mask].mean()) - float(correct[mask].mean()))
        value += mask.sum() / total * gap
    return value


def fit_isotonic_ovr(
    probas: np.ndarray,
    labels: np.ndarray,
) -> Callable[[np.ndarray], np.ndarray]:
    """Per-class isotonic mapping p -> empirical accuracy, renormalized."""
    n_classes = probas.shape[1]
    calibrators: list[IsotonicRegression] = []
    for k in range(n_classes):
        ir = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
        ir.fit(probas[:, k], (labels == k).astype(np.float64))
        calibrators.append(ir)

    def apply(p: np.ndarray) -> np.ndarray:
        cols = [
            np.asarray(calibrators[k].predict(p[:, k]), dtype=np.float64)
            for k in range(n_classes)
        ]
        mapped = np.stack(cols, axis=1)
        mapped = np.clip(mapped, _EPS, None)
        return np.asarray(mapped / mapped.sum(axis=1, keepdims=True), dtype=np.float64)

    return apply
