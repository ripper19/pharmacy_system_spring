"""P1 acceptance suite: negation-aware red flags.

Live demo (2026-10-17): the ask-loop answers "no difficulty breathing, no
drooling" and the flag layer fired 'severe breathing difficulty' + 'airway
compromise signs' — false urgency on every negative answer. P1 rule: a flag
fires from a match whose preceding ~30 chars contain no negation cue; any
positive occurrence still fires (safe side).
"""

from __future__ import annotations

import pytest

from mlpipe.redflags import detect_red_flags


@pytest.mark.parametrize(
    ("text", "label_not_fired"),
    [
        ("no difficulty breathing at rest", "severe breathing difficulty"),
        ("patient denies chest pain", "chest pain"),
        ("not short of breath while walking", "severe breathing difficulty"),
        ("no drooling and swallowing normally", "airway compromise signs"),
        ("never fainted, no syncope", "fainting/unconsciousness"),
        ("she has no confusion, fully oriented", "confusion"),
    ],
)
def test_negated_phrase_does_not_fire(text: str, label_not_fired: str) -> None:
    flags, urgent = detect_red_flags(text)
    assert label_not_fired not in flags, f"{label_not_fired!r} fired on negated text"


def test_negative_answer_pair_fires_nothing() -> None:
    flags, urgent = detect_red_flags("No difficulty breathing, no drooling.")
    assert flags == []
    assert urgent is False


@pytest.mark.parametrize(
    ("text", "label"),
    [
        ("crushing chest pain for an hour", "crushing chest pain"),
        ("he says she can't breathe", "severe breathing difficulty"),
        ("complains of shortness of breath", "severe breathing difficulty"),
        ("started without chest pain but now has chest pain", "chest pain"),
        ("fever with neck stiffness", "neck stiffness with fever"),
    ],
)
def test_positive_and_mixed_still_fire(text: str, label: str) -> None:
    flags, urgent = detect_red_flags(text)
    assert label in flags
    assert urgent is True
