"""Retrain E1/E2 + stack + calibration on the combined v1+v2 corpus.

Loads v1 processed splits and the v2 generated corpus, dedups globally, then
re-splits strat-by-pathology (deterministic, SEED). Trains E1 (logreg),
E2 (LightGBM), an out-of-fold stack meta-learner, temperature scaling and
Mondrian conformal thresholds, and writes the full artifact set including
ask_table, vocab, calib and MANIFEST. Reproduces the exact Kaggle recipe.
"""
from __future__ import annotations

import hashlib
import json
import sys
import time
import zlib
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score

from mlpipe.calibrate import apply_temperature, ece, fit_temperature
from mlpipe.config import ARTIFACTS_DIR, DDXPLUS_DIR, SEED
from mlpipe.conformal import calibrate_conformal
from mlpipe.data import assert_no_cross_split_dupes, dedup, load_processed
from mlpipe.experts.e2_lgbm import E2_PARAMS
from mlpipe.experts.features import Vocab, build_vocab

V2_CORPUS = DDXPLUS_DIR / "v2_corpus"
V1_SPLITS = ("processed_train.csv", "processed_validate.csv", "processed_test.csv")
V2_SPLITS = ("v2_train.csv", "v2_validate.csv", "v2_test.csv")


def load_all() -> dict[str, pd.DataFrame]:
    frames: list[pd.DataFrame] = []
    for f in V1_SPLITS:
        frames.append(load_processed(DDXPLUS_DIR / f))
    for f in V2_SPLITS:
        frames.append(load_processed(V2_CORPUS / f))
    pooled = dedup(pd.concat(frames, ignore_index=True))

    buckets: dict[str, list[pd.DataFrame]] = {"train": [], "validate": [], "test": []}
    for pathology, group in pooled.groupby("PATHOLOGY", sort=False):
        group_seed = (SEED + zlib.crc32(str(pathology).encode())) % 2**32
        idx = np.random.default_rng(group_seed).permutation(len(group))
        n = len(group)
        cut1, cut2 = int(n * 0.8), int(n * 0.9)
        for split, sel in (
            ("train", idx[:cut1]),
            ("validate", idx[cut1:cut2]),
            ("test", idx[cut2:]),
        ):
            buckets[split].append(group.iloc[np.sort(sel)])
    parts = {k: pd.concat(v, ignore_index=True) for k, v in buckets.items()}
    assert_no_cross_split_dupes(*parts.values())
    return parts


def design_matrix(df: pd.DataFrame, vocab: Vocab) -> np.ndarray:
    index = {c: i for i, c in enumerate(vocab["evidence_codes"])}
    n = len(index)
    X = np.zeros((len(df), n + 3), dtype=np.float32)
    ages = df["AGE"].to_numpy()
    for r, evs in enumerate(df["EVIDENCES"]):
        for code in evs:
            j = index.get(code)
            if j is not None:
                X[r, j] = 1.0
        X[r, n] = float(ages[r]) if ages[r] == ages[r] else 0.0
    X[:, n + 1] = (df["SEX"] == "M").to_numpy()
    X[:, n + 2] = (df["SEX"] == "F").to_numpy()
    return X


def labels(df: pd.DataFrame, classes: tuple[str, ...]) -> np.ndarray:
    lut = {c: i for i, c in enumerate(classes)}
    return np.array([lut[p] for p in df["PATHOLOGY"]], dtype=np.int64)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def build_ask_table(train_df: pd.DataFrame, classes: tuple[str, ...], vocab: Vocab) -> dict:
    from mlpipe.policy import build_presence_table

    return build_presence_table(train_df, {"evidence_codes": vocab["evidence_codes"],
                                           "pathologies": classes})


def main() -> int:
    t0 = time.time()
    splits = load_all()
    vocab = build_vocab(splits["train"])
    classes = vocab["pathologies"]
    n_cls = len(classes)
    print(f"splits={ {k: len(v) for k, v in splits.items()} } "
          f"classes={n_cls} features={len(vocab['evidence_codes']) + 3}", flush=True)

    X = {s: design_matrix(df, vocab) for s, df in splits.items()}
    y = {s: labels(df, classes) for s, df in splits.items()}

    print("training E1 logreg...", flush=True)
    e1 = LogisticRegression(C=10.0, max_iter=1000, random_state=SEED).fit(X["train"], y["train"])
    p1_v = np.asarray(e1.predict_proba(X["validate"]), dtype=np.float64)
    p1_t = np.asarray(e1.predict_proba(X["test"]), dtype=np.float64)

    print("training E2 lightgbm...", flush=True)
    import lightgbm as lgb

    params = {**E2_PARAMS, "num_class": n_cls}
    e2 = lgb.train(params, lgb.Dataset(X["train"], label=y["train"]), num_boost_round=150)
    p2_v = np.asarray(e2.predict(X["validate"]), dtype=np.float64)
    p2_t = np.asarray(e2.predict(X["test"]), dtype=np.float64)

    print("fitting temperatures + stack + conformal...", flush=True)
    t1 = fit_temperature(p1_v, y["validate"])
    t2 = fit_temperature(p2_v, y["validate"])
    p1v = apply_temperature(p1_v, t1)
    p2v = apply_temperature(p2_v, t2)
    meta = LogisticRegression(C=1.0, max_iter=500).fit(
        np.hstack([p1v, p2v]), y["validate"]
    )
    fused_v = meta.predict_proba(np.hstack([p1v, p2v]))
    thresholds = calibrate_conformal(fused_v, y["validate"], alpha=0.05, min_per_class=10)

    # --- evaluate fused stack on held-out test ---
    p1tv = apply_temperature(p1_t, t1)
    p2tv = apply_temperature(p2_t, t2)
    fused_t = meta.predict_proba(np.hstack([p1tv, p2tv]))
    acc = float((fused_t.argmax(1) == y["test"]).mean())
    mf1 = float(f1_score(y["test"], fused_t.argmax(1), average="macro"))
    ece_val = ece(fused_t, y["test"])
    print(f"STACK test acc={acc:.4f} macro-F1={mf1:.4f} ECE={ece_val:.4f}", flush=True)

    print("building ask_table...", flush=True)
    ask_table = build_ask_table(splits["train"], classes, vocab)
    class_counts = {c: int(v) for c, v in splits["train"]["PATHOLOGY"].value_counts().items()}

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    vocab_path = ARTIFACTS_DIR / "vocab.json"
    vocab_path.write_text(json.dumps({"evidence_codes": list(vocab["evidence_codes"]),
                                      "pathologies": list(classes)}))
    e1_path = ARTIFACTS_DIR / "e1_logreg.joblib"
    joblib.dump(e1, e1_path)
    e2_path = ARTIFACTS_DIR / "e2_lgbm.txt"
    e2.save_model(str(e2_path))
    stack_path = ARTIFACTS_DIR / "stack.joblib"
    joblib.dump(meta, stack_path)
    ask_path = ARTIFACTS_DIR / "ask_table.json"
    ask_path.write_text(json.dumps(ask_table))
    calib_path = ARTIFACTS_DIR / "calib.json"
    calib_path.write_text(json.dumps({
        "t1": t1, "t2": t2,
        "conformal": {str(k): v for k, v in thresholds.items() if k != -1},
        "marginal": thresholds[-1],
    }))
    counts_path = ARTIFACTS_DIR / "class_counts.json"
    counts_path.write_text(json.dumps(class_counts))
    metrics_path = ARTIFACTS_DIR / "metrics.json"
    metrics_path.write_text(json.dumps({
        "n_classes": n_cls, "stack_acc": acc, "macro_f1": mf1, "ece": ece_val,
    }))

    manifest: dict[str, str] = {}
    for p in sorted([vocab_path, e1_path, e2_path, stack_path, ask_path, calib_path]):
        manifest[p.name] = sha256(p)
    (ARTIFACTS_DIR / "MANIFEST.sha256.json").write_text(json.dumps(manifest, indent=1))

    print(f"DONE in {time.time()-t0:.0f}s  acc={acc:.4f} mf1={mf1:.4f} ece={ece_val:.4f}",
          flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
