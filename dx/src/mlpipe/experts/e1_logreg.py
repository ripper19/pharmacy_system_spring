"""E1 — L2 multinomial logistic regression anchor expert."""
from __future__ import annotations

import numpy as np
from sklearn.linear_model import LogisticRegression

from mlpipe.config import SEED


def train_e1(X: np.ndarray, y: np.ndarray, C: float = 10.0) -> LogisticRegression:
    return LogisticRegression(C=C, max_iter=500, random_state=SEED).fit(X, y)


def predict_proba(model: LogisticRegression, X: np.ndarray) -> np.ndarray:
    return np.asarray(model.predict_proba(X), dtype=np.float64)
