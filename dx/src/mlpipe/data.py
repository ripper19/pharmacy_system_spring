"""M1 data layer: load, canonicalize, dedup and report DDXPlus patient splits."""

from __future__ import annotations

import ast
import json
import zlib
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from mlpipe.config import DDXPLUS_DIR, PATIENT_FILES, SEED

REQUIRED_COLUMNS: tuple[str, ...] = ("PATHOLOGY", "AGE", "SEX", "EVIDENCES")

type DupKey = tuple[str, int | None, str | None, frozenset[str]]
type DisplayKey = tuple[int | None, str | None, str]


def _first_missing_column(columns: Any) -> str | None:
    for column in REQUIRED_COLUMNS:
        if column not in columns:
            return column
    return None


def load_patients(split: str) -> pd.DataFrame:
    if split not in PATIENT_FILES:
        raise ValueError(f"unknown split {split!r}; expected one of {sorted(PATIENT_FILES)}")
    df = pd.read_csv(DDXPLUS_DIR / PATIENT_FILES[split])
    missing = _first_missing_column(df.columns)
    if missing is not None:
        raise ValueError(f"missing required column: {missing}")
    return df


def _age_value(raw: Any) -> int | None:
    if raw is None or pd.isna(raw):
        return None
    return int(raw)


def _sex_value(raw: object) -> str | None:
    initial = str(raw).strip().upper()[:1]
    return initial if initial in ("M", "F") else None


def _evidence_value(cell: object) -> tuple[str, ...]:
    if cell is None or pd.isna(cell) or str(cell).strip() == "":
        return ()
    # DDXPlus stores Python list reprs (single quotes), not strict JSON.
    return tuple(sorted(ast.literal_eval(str(cell))))


def canonicalize(df: pd.DataFrame) -> pd.DataFrame:
    missing = _first_missing_column(df.columns)
    if missing is not None:
        raise ValueError(f"missing required column: {missing}")
    return pd.DataFrame(
        {
            "PATHOLOGY": [str(v) for v in df["PATHOLOGY"]],
            "AGE": pd.array([_age_value(v) for v in df["AGE"]], dtype="Int64"),
            "SEX": pd.Series([_sex_value(v) for v in df["SEX"]], dtype="object"),
            "EVIDENCES": [_evidence_value(v) for v in df["EVIDENCES"]],
        }
    )


def _dup_keys(df: pd.DataFrame) -> Iterator[DupKey]:
    for pathology, age, sex, evidences in zip(
        df["PATHOLOGY"], df["AGE"], df["SEX"], df["EVIDENCES"], strict=True
    ):
        yield (
            str(pathology),
            None if pd.isna(age) else int(age),
            sex if isinstance(sex, str) else None,
            frozenset(evidences),
        )


def dedup(df: pd.DataFrame) -> pd.DataFrame:
    seen: set[DupKey] = set()
    keep: list[Any] = []
    for idx, key in zip(df.index, _dup_keys(df), strict=True):
        if key not in seen:
            seen.add(key)
            keep.append(idx)
    return df.loc[keep]


def assert_no_cross_split_dupes(*dfs: pd.DataFrame) -> None:
    owner: dict[DupKey, int] = {}
    offenders: dict[DupKey, DisplayKey] = {}
    for i, df in enumerate(dfs):
        for key in _dup_keys(df):
            first_seen_in = owner.setdefault(key, i)
            if first_seen_in != i:
                offenders[key] = (key[1], key[2], key[0])
    if offenders:
        example = next(iter(offenders.values()))
        raise ValueError(f"{len(offenders)} duplicate keys across splits, e.g. {example}")


def dataset_report(splits: dict[str, pd.DataFrame]) -> dict[str, dict[str, Any]]:
    return {
        "totals": {name: len(df) for name, df in splits.items()},
        "per_class": {
            name: {str(k): int(v) for k, v in df["PATHOLOGY"].value_counts().items()}
            for name, df in splits.items()
        },
    }


def save_processed(df: pd.DataFrame, path: Path) -> None:
    raw_shaped = pd.DataFrame(
        {
            "PATHOLOGY": list(df["PATHOLOGY"]),
            "AGE": list(df["AGE"]),
            "SEX": list(df["SEX"]),
            "EVIDENCES": [
                json.dumps(list(row), separators=(",", ":")) for row in df["EVIDENCES"]
            ],
        }
    )
    raw_shaped.to_csv(path, index=False)


def load_processed(path: Path) -> pd.DataFrame:
    raw = pd.read_csv(path, dtype={"PATHOLOGY": "string"})
    return canonicalize(raw)


def build_all() -> dict[str, Any]:
    pooled = pd.concat(
        [dedup(canonicalize(load_patients(split))) for split in PATIENT_FILES],
        ignore_index=True,
    )
    pooled = dedup(pooled)  # official DDXPlus split has cross-split signature collisions
    buckets: dict[str, list[pd.DataFrame]] = {
        "train": [],
        "validate": [],
        "test": [],
    }
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
    for split, df in parts.items():
        save_processed(df, DDXPLUS_DIR / f"processed_{split}.csv")
    report: dict[str, Any] = dataset_report(parts)
    report["note"] = (
        "official DDXPlus split contained cross-split duplicate patient signatures; "
        "globally deduped then stratified 80/10/10 re-split "
        f"(seed {SEED}) before saving"
    )
    (DDXPLUS_DIR / "dataset_report.json").write_text(json.dumps(report))
    return report
