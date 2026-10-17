"""Deterministic red-flag detection. Rules only — never model output.

P1 (2026-10-17): negation-aware — a match preceded (within ~30 chars) by a
negation cue ("no difficulty breathing", "denies chest pain") does not fire;
any non-negated occurrence still fires. Ambiguous or mixed phrasing errs on
the safe side.
"""
from __future__ import annotations

import re

_NEG_CUE_RE = re.compile(
    r"\b(?:no|not|never|without|denies|denied|deny|negative|lacks?)\b[^.!?]*$"
)

_PATTERNS: tuple[tuple[str, str], ...] = (
    (r"crushing chest (pain|pressure)", "crushing chest pain"),
    (r"chest pain|chest pressure", "chest pain"),
    (
        r"chest (feels )?tight(ness)?|tight(ness)? in (my |the )?chest|chest discomfort",
        "chest tightness/discomfort",
    ),
    (r"can'?t breathe|difficulty breathing|short(ness)? of breath", "severe breathing difficulty"),
    (r"breathless", "breathing difficulty"),
    (r"(coughing|vomiting|throwing) up blood|haemoptysis", "vomiting blood"),
    (r"blood in (stool|urine)", "blood in stool/urine"),
    (
        r"(worst|severe) headache of (my|his|her|their) life"
        r"|worst (headache |pain )?of (my |his |her |their )?life"
        r"|thunderclap headache",
        "sudden severe headache",
    ),
    (
        r"(stiff neck|neck stiff(ness)?|rigid neck).{0,40}(fever|febrile)"
        r"|(fever|febrile).{0,40}(stiff neck|neck stiff(ness)?|rigid neck)",
        "neck stiffness with fever",
    ),
    (r"stiff neck|neck stiff(ness)?|rigid neck", "neck stiffness"),
    (
        r"photo(phobia|phobic)|sensitiv(e|ity) to light|intoleran(t|ce) to light"
        r"|light hurts",
        "photophobia",
    ),
    (
        r"drool(ing|s)?|stridor|unable to swallow|cannot swallow|can'?t swallow",
        "airway compromise signs",
    ),
    (
        r"(flank|side|back) pain.{0,60}(fever|febrile)"
        r"|(fever|febrile).{0,60}(flank|side|back) pain",
        "flank pain with fever",
    ),
    (r"passed out|fainted|unconscious|syncope", "fainting/unconsciousness"),
    (r"confus(ed|ion)|disorient", "confusion"),
    (r"seizure|convulsion", "seizure"),
    (r"face droop|slurred speech|one[- ]sided weakness", "possible stroke signs"),
    (r"suicid", "self-harm risk"),
)


def _positive_match(pattern: str, lowered: str) -> bool:
    for m in re.finditer(pattern, lowered):
        if not _NEG_CUE_RE.search(lowered, max(0, m.start() - 30), m.start()):
            return True
    return False


def detect_red_flags(text: str) -> tuple[list[str], bool]:
    lowered = text.lower()
    flags: list[str] = []
    for pattern, label in _PATTERNS:
        if _positive_match(pattern, lowered) and label not in flags:
            flags.append(label)
    return flags, bool(flags)
