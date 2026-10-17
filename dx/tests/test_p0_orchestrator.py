"""P0 acceptance suite: orchestrator wires parsed age/sex into experts.

Bug (2026-10-17 live battery): run_turn called every expert with
(evidences, None, None) — age/sex never reached the models, producing
bit-identical outputs for a 6-year-old girl and a 41-year-old man.
"""

from __future__ import annotations

from types import SimpleNamespace

import numpy as np

from mlpipe.extractor import build_trigger_table  # noqa: F401  (sanity import)
from mlpipe.orchestrator import TurnContext, run_turn
from mlpipe.schemas import ChatMessage


def _stub_ontology() -> SimpleNamespace:
    return SimpleNamespace(evidences={})


def _ctx(recorder: list) -> TurnContext:
    def expert(evidences, age, sex):
        recorder.append((evidences, age, sex))
        return np.array([0.95, 0.05])

    return TurnContext(
        ontology=_stub_ontology(),
        classes=("ConditionA", "ConditionB"),
        experts=[expert],
        ask_table={},
        questions={},
        thresholds={0: 0.9, 1: 0.9, -1: 0.9},
    )


def test_age_sex_reach_experts() -> None:
    recorder: list = []
    run_turn(
        [ChatMessage(role="user", content="6-year-old girl with fever, no cough")],
        _ctx(recorder),
    )
    assert recorder, "expert was never invoked"
    _, age, sex = recorder[0]
    assert age == 6
    assert sex == "female"


def test_adult_male_differs_from_child_female() -> None:
    r1: list = []
    r2: list = []
    run_turn(
        [ChatMessage(role="user", content="6-year-old girl with fever")], _ctx(r1)
    )
    run_turn(
        [ChatMessage(role="user", content="41-year-old man with fever")], _ctx(r2)
    )
    assert r1[0][1] == 6 and r1[0][2] == "female"
    assert r2[0][1] == 41 and r2[0][2] == "male"


def test_no_age_sex_when_absent() -> None:
    recorder: list = []
    run_turn(
        [ChatMessage(role="user", content="patient has a headache")], _ctx(recorder)
    )
    assert recorder[0][1] is None
    assert recorder[0][2] is None


def test_result_still_wellformed() -> None:
    recorder: list = []
    result = run_turn(
        [ChatMessage(role="user", content="30-year-old man with fever and cough")],
        _ctx(recorder),
    )
    assert result.status.value in {"differential", "need_info", "abstain"}
