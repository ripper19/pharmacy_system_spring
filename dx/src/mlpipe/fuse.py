"""Fusion: out-of-fold-stacked meta-learner + Jensen-Shannon disagreement."""
from __future__ import annotations

import numpy as np
from sklearn.linear_model import LogisticRegression

_EPS = 1e-12


def _jsd(p: np.ndarray, q: np.ndarray) -> float:
    m = 0.5 * (p + q)

    def kl(a: np.ndarray, b: np.ndarray) -> float:
        mask = a > 0
        return float(np.sum(a[mask] * np.log(a[mask] / b[mask])))

    return 0.5 * (kl(p, m) + kl(q, m))


def disagreement(experts: list[np.ndarray]) -> np.ndarray:
    """Mean pairwise JSD across experts, per row (natural log scale)."""
    out = np.zeros(experts[0].shape[0])
    for row in range(out.size):
        pairs = [
            _jsd(e[row], f[row])
            for i, e in enumerate(experts)
            for f in experts[i + 1:]
        ]
        out[row] = float(np.mean(pairs)) if pairs else 0.0
    return out


def _design(experts: list[np.ndarray]) -> np.ndarray:
    return np.hstack([np.clip(e, _EPS, None) for e in experts])


def stack_fit(oof_experts: list[np.ndarray], labels: np.ndarray) -> LogisticRegression:
    return LogisticRegression(C=1.0, max_iter=200).fit(_design(oof_experts), labels)


def stack_predict(model: LogisticRegression, experts: list[np.ndarray]) -> np.ndarray:
    return np.asarray(model.predict_proba(_design(experts)), dtype=np.float64)
