"""P0 acceptance suite: red-flag lexicon gaps found in live battery.

Gaps fixed here (all missed in live testing on 2026-10-17):
- "neck stiffness" (previously only "stiff neck" collocation matched)
- photophobia / light sensitivity (absent entirely)
- "worst of life" variant of thunderclap headache
- airway compromise: drooling, stridor, cannot swallow
- flank/side pain with fever (urosepsis pattern)
"""

from __future__ import annotations

import pytest

from mlpipe.redflags import detect_red_flags


@pytest.mark.parametrize(
    ("text", "expected_label"),
    [
        # neck stiffness phrasings, both orders with fever
        ("fever and neck stiffness since morning", "neck stiffness"),
        ("neck stiffness with high fever", "neck stiffness with fever"),
        ("fever, neck stiffness and photophobia", "neck stiffness with fever"),
        # photophobia family
        ("bad headache with photophobia", "photophobia"),
        ("she is sensitive to light", "photophobia"),
        ("light hurts her eyes", "photophobia"),
        # worst-of-life variants
        ("sudden headache, worst of life", "sudden severe headache"),
        ("worst headache of his life", "sudden severe headache"),
        ("thunderclap headache one hour ago", "sudden severe headache"),
        # airway compromise
        ("child is drooling and cannot swallow", "airway compromise signs"),
        ("inspiratory stridor at rest", "airway compromise signs"),
        ("unable to swallow his own saliva", "airway compromise signs"),
        # urosepsis pattern
        ("fever 38.9 with flank pain", "flank pain with fever"),
        ("right side pain near the kidney and fever", "flank pain with fever"),
    ],
)
def test_new_positive_matches(text: str, expected_label: str) -> None:
    flags, urgent = detect_red_flags(text)
    assert expected_label in flags, f"{expected_label!r} missing from {flags}"
    assert urgent is True


@pytest.mark.parametrize(
    "text",
    [
        "mild neck ache after sleeping badly",
        "worst grade in school",
        "drooling baby while teething, no distress",  # NOTE: fires (safe side) — documented
    ],
)
def test_known_false_positives_documented(text: str) -> None:
    flags, _ = detect_red_flags(text)
    # We accept FP on "drooling" (safe side, docstring policy); neck ache and
    # "worst grade" must NOT fire.
    if "teething" in text:
        assert "airway compromise signs" in flags
    else:
        assert flags == [], f"unexpected flags {flags} for {text!r}"


def test_meningitis_triad_full_case() -> None:
    text = (
        "19-year-old with sudden severe headache, worst of life, "
        "fever, neck stiffness, photophobia, vomiting"
    )
    flags, urgent = detect_red_flags(text)
    assert urgent is True
    assert "neck stiffness with fever" in flags
    assert "photophobia" in flags
    assert "sudden severe headache" in flags
