"""P1 acceptance suite: age/sex clarification question.

Gap (2026-10-17): age/sex are parser-only — if the narrative omits them the
models receive (None, None) forever and the ask-loop never interrogates them.
P1: when age or sex is missing (and not urgent, and not already asked), the
turn asks for age/sex using marker code @age_sex. Echoed question suppresses
re-asking even if the answer fails to supply them.
"""

from __future__ import annotations

from types import SimpleNamespace

import numpy as np

from mlpipe.orchestrator import run_turn
from mlpipe.schemas import ChatMessage


def _ctx() -> object:
    from mlpipe.orchestrator import TurnContext

    return TurnContext(
        ontology=SimpleNamespace(evidences={}),
        classes=("ConditionA", "ConditionB"),
        experts=[lambda ev, age, sex: np.array([0.5, 0.5])],  # unconfident
        ask_table={"E_TEST": {0: 0.9, 1: 0.1}},
        questions={"E_TEST": "Do you have a fever?"},
        thresholds={0: 0.9, 1: 0.9, -1: 0.9},
    )


def test_asks_age_sex_when_missing() -> None:
    result = run_turn([ChatMessage(role="user", content="patient has fever")], _ctx())
    assert result.follow_up_question is not None
    assert "[code:@age_sex]" in result.follow_up_question
    assert "old" in result.follow_up_question


def test_no_age_question_when_present() -> None:
    result = run_turn(
        [ChatMessage(role="user", content="6-year-old girl with fever")], _ctx()
    )
    q = result.follow_up_question or ""
    assert "[code:@age_sex]" not in q


def test_no_reask_after_echo_even_if_answer_lacks_age() -> None:
    result = run_turn(
        [
            ChatMessage(role="user", content="patient has fever"),
            ChatMessage(
                role="assistant",
                content="How old is the patient (in years), and what is their sex? [code:@age_sex]",
            ),
            ChatMessage(role="user", content="not sure exactly"),
        ],
        _ctx(),
    )
    q = result.follow_up_question or ""
    assert "[code:@age_sex]" not in q


def test_answer_supplies_age_sex() -> None:
    result = run_turn(
        [
            ChatMessage(role="user", content="patient has fever"),
            ChatMessage(
                role="assistant",
                content="How old is the patient (in years), and what is their sex? [code:@age_sex]",
            ),
            ChatMessage(role="user", content="he is a 40-year-old man"),
        ],
        _ctx(),
    )
    # age/sex now present; loop returns to evidence questions, not age.
    q = result.follow_up_question or ""
    assert "[code:@age_sex]" not in q
    assert "[code:E_TEST]" in q


def test_urgent_suppresses_age_question() -> None:
    result = run_turn(
        [ChatMessage(role="user", content="crushing chest pain, sweating")], _ctx()
    )
    assert result.follow_up_question is None
    assert result.needs_urgent_care is True
