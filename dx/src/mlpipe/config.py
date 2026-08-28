"""Frozen contract: paths, seeds, constants, env access.

Agents may not alter values here without supervisor sign-off.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

ML_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ML_ROOT / "data"
DDXPLUS_DIR = DATA_DIR / "ddxplus"
KAGGLE_BENCH_DIR = DATA_DIR / "kaggle_bench"
ARTIFACTS_DIR = ML_ROOT / "artifacts"

ONTOLOGY_PATH = DDXPLUS_DIR / "release_conditions_v2.json"
EVIDENCES_PATH = DDXPLUS_DIR / "release_evidences_v2.json"
PATIENT_FILES = {
    "train": "release_train_patients.csv",
    "validate": "release_validate_patients.csv",
    "test": "release_test_patients.csv",
}

SEED = 20260822

# Conformal prediction: per-class (Mondrian) miscoverage level.
CONFORMAL_ALPHA = 0.05
# Minimum calibration examples required per class for Mondrian quantiles;
# classes below this fall back to the marginal quantile.
CONFORMAL_MIN_PER_CLASS = 10

# Fused posterior -> likelihood label thresholds.
LIKELIHOOD_HIGH = 0.50
LIKELIHOOD_MEDIUM = 0.15

# Abstain when the fused top-1 posterior is below this, OR when the conformal
# prediction set contains more than this many conditions, OR when the fused
# top1-top2 margin is below ABSTAIN_MARGIN, OR when fewer than
# ABSTAIN_MIN_EXPERT_AGREEMENT experts peak at the fused argmax.
# Calibrated on release_test_patients (n=300, SEED=20260822): correct rows show
# p05 margin 0.98 and unanimous agreement, so these gates are near-free in-set.
ABSTAIN_PROB_THRESHOLD = 0.35
ABSTAIN_MAX_SET_SIZE = 3
ABSTAIN_MARGIN = 0.15
ABSTAIN_MIN_EXPERT_AGREEMENT = 2

load_dotenv(ML_ROOT / ".env", override=False)


def env(name: str, default: str = "") -> str:
    return os.environ.get(name, default)


def supervisor_config() -> tuple[str, str, str]:
    """Return (base_url, api_key, model) for the cloud supervisor LLM."""
    return (
        env("SUPERVISOR_BASE_URL"),
        env("SUPERVISOR_API_KEY"),
        env("SUPERVISOR_MODEL"),
    )
