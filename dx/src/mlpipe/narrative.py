"""Deterministic evidence-to-narrative rendering shared by E3 training/inference.

Same inputs always produce the same sentence; evidence order in the narrative
is sorted by code so text is independent of caller ordering.
"""
from __future__ import annotations

from typing import Any

_REWRITES = (
    ("Do you have ", "The patient has "),
    ("Do you feel ", "The patient feels "),
    ("Are you ", "The patient is "),
    ("Does the ", "The "),
    ("Do you ", "The patient "),
)


def _statement(question_en: str, value_en: str | None) -> str:
    stmt = question_en.strip()
    for prefix, replacement in _REWRITES:
        if stmt.startswith(prefix):
            stmt = replacement + stmt[len(prefix):]
            break
    if stmt.endswith("?"):
        stmt = stmt[:-1] + "."
    if value_en is not None:
        stmt = f"{stmt[:-1]} (detail: {value_en})."
    return stmt


def render_narrative(
    age: int | None,
    sex: str | None,
    evidences: tuple[str, ...],
    ontology: Any,
) -> str:
    who = "A patient"
    if age is not None and sex in ("M", "F"):
        who = f"A {age}-year-old {'man' if sex == 'M' else 'woman'}"
    elif age is not None:
        who = f"A patient aged {age}"
    parts = [f"{who}."]
    for code in sorted(evidences):
        base, _, suffix = code.partition("_@_")
        entry = ontology.evidences[base]
        value_en: str | None = None
        if suffix:
            value_en = str(entry.value_meaning.get(suffix, {}).get("en", suffix))
        parts.append(_statement(entry.question, value_en))
    return " ".join(parts)
