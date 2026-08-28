"""Transcript -> evidence codes. Deterministic keyword rule over ontology keys.

Candidates: non-antecedent roots (code_question == code). Trigger: first
significant token of the rewritten question, matched on word boundaries.
"""
from __future__ import annotations

import re
from typing import Any

MARKER_RE = re.compile(r"\s*\[code:[A-Za-z0-9_@]+\]")
_WORD_RE = re.compile(r"[a-z]+")
_STOP = {
    "do", "you", "have", "a", "the", "get", "got", "feel", "feeling", "are",
    "is", "there", "your", "any", "of", "been", "did", "does", "was", "were",
    "to", "and", "or", "in", "on", "it", "its", "this", "that", "with",
}
_PREFIXES = (
    "do you have ",
    "have you ",
    "do you feel ",
    "are you ",
    "did you ",
    "does the person have ",
    "does the ",
    "is there ",
)


def _significant_tokens(text: str) -> list[str]:
    return [t for t in _WORD_RE.findall(text.lower()) if t not in _STOP]


def _trigger_tokens(question_en: str) -> list[str]:
    q = question_en.lower().rstrip("?").strip()
    for prefix in _PREFIXES:
        if q.startswith(prefix):
            q = q[len(prefix):]
            break
    return _significant_tokens(q)[:2]


def build_trigger_table(ontology: Any) -> dict[str, str]:
    """code -> up to two significant tokens (space-joined AND-trigger)."""
    table: dict[str, str] = {}
    for code, entry in ontology.evidences.items():
        if entry.is_antecedent:
            continue
        tokens = _trigger_tokens(entry.question)
        if tokens:
            table[code] = " ".join(tokens)
    return table


def extract_evidences(text: str, ontology: Any) -> tuple[str, ...]:
    text = strip_markers(text)
    words = set(_WORD_RE.findall(text.lower()))
    triggers = build_trigger_table(ontology)
    # AND-semantics: fire only when every trigger token appears somewhere
    # in the transcript, which disambiguates shared leads like "vomiting"
    # vs "vomiting blood".
    fired = [
        code
        for code, trig in triggers.items()
        if all(tok in words for tok in trig.split())
    ]
    return tuple(sorted(fired))


_CODE_RE = re.compile(r"\[code:([A-Za-z0-9_@]+)\]")


def parse_asked(messages: list[str]) -> set[str]:
    asked: set[str] = set()
    for msg in messages:
        asked.update(_CODE_RE.findall(msg))
    return asked


def strip_markers(text: str) -> str:
    out = MARKER_RE.sub("", text)
    return out.strip() if out != text else text.rstrip()
