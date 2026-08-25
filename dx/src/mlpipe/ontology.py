"""Frozen contract: DDXPlus ontology loader.

Maps release_conditions.json / release_evidences.json into canonical
code -> definition lookups used by every downstream module.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from mlpipe.config import EVIDENCES_PATH, ONTOLOGY_PATH


@dataclass(frozen=True)
class Condition:
    code: str
    name: str  # English name
    icd10: str
    severity: int  # lower = more severe


@dataclass(frozen=True)
class Evidence:
    code: str  # e.g. "E_10" or "E_10@1"
    question: str  # English question associated with the evidence
    data_type: str  # "B" binary | "C" categorical | "M" multi-choice
    is_antecedent: bool
    value_meaning: dict[str, dict[str, str]]  # value code -> {"fr": ..., "en": ...}


class Ontology:
    def __init__(
        self,
        conditions: dict[str, Condition],
        evidences: dict[str, Evidence],
    ) -> None:
        self.conditions = conditions
        self.evidences = evidences

    def condition_name(self, code: str) -> str:
        return self.conditions[code].name

    def condition_codes(self) -> tuple[str, ...]:
        return tuple(sorted(self.conditions))

    def is_antecedent(self, code: str) -> bool:
        base = code.split("_@_")[0]
        return self.evidences[base].is_antecedent

    def question_for(self, code: str) -> str:
        return self.evidences[code.split("_@_")[0]].question

    @property
    def symptom_codes(self) -> tuple[str, ...]:
        """Non-antecedent evidence codes (questions to ask the patient)."""
        return tuple(
            c for c, e in self.evidences.items() if not e.is_antecedent
        )


def load_ontology(
    conditions_path: Path = ONTOLOGY_PATH,
    evidences_path: Path = EVIDENCES_PATH,
) -> Ontology:
    raw_conditions = json.loads(conditions_path.read_text())
    raw_evidences = json.loads(evidences_path.read_text())

    conditions: dict[str, Condition] = {}
    for code, entry in raw_conditions.items():
        conditions[code] = Condition(
            code=code,
            name=entry["cond-name-eng"],
            icd10=str(entry.get("icd10-id", "")),
            severity=int(entry.get("severity", 0)),
        )

    evidences: dict[str, Evidence] = {}
    for code, entry in raw_evidences.items():
        evidences[code] = Evidence(
            code=code,
            question=entry.get("question_en", code),
            data_type=entry.get("data_type", "B"),
            is_antecedent=bool(entry.get("is_antecedent", False)),
            value_meaning=dict(entry.get("value_meaning", {})),
        )

    return Ontology(conditions=conditions, evidences=evidences)
