"""E2 — LightGBM gradient-boosted trees expert.

Hyperparameters are pinned: the golden fixtures in
tests/test_experts_tabular.py were generated with exactly these values.
"""
from __future__ import annotations

from typing import Any

import lightgbm as lgb
import numpy as np

from mlpipe.config import SEED

E2_PARAMS: dict[str, Any] = {
    "objective": "multiclass",
    "learning_rate": 0.1,
    "num_leaves": 7,
    "min_data_in_leaf": 2,
    "seed": SEED,
    "deterministic": True,
    "force_col_wise": True,
    "num_threads": 2,
    "verbose": -1,
}
E2_ROUNDS = 30


def train_e2(X: np.ndarray, y: np.ndarray, num_boost_round: int = E2_ROUNDS) -> lgb.Booster:
    params = {**E2_PARAMS, "num_class": int(len(np.unique(y)))}
    return lgb.train(params, lgb.Dataset(X, label=y), num_boost_round=num_boost_round)


def predict_proba(model: lgb.Booster, X: np.ndarray) -> np.ndarray:
    return np.asarray(model.predict(X), dtype=np.float64)
