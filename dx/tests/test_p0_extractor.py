"""P0 acceptance suite: extractor negation guard + age/sex parser.

Negation rule (P0): an evidence fires only when every trigger token has at
least one occurrence NOT preceded (within 3 words) by a negation cue. A
trigger whose every occurrence is negated ("no cough") is suppressed.

Age/sex rule (P0): parse_age_sex extracts age (years) and sex from narrative
text; returns (None, None) when absent.
"""

from __future__ import annotations

import pytest

from mlpipe.extractor import extract_evidences, parse_age_sex


@pytest.fixture(scope="module")
def ontology():
    from mlpipe.ontology import load_ontology

    return load_ontology()


@pytest.fixture(scope="module")
def codes_for(ontology):
    from mlpipe.extractor import build_trigger_table

    table = build_trigger_table(ontology)

    def _codes(token: str) -> set[str]:
        return {c for c, t in table.items() if t.split() == [token]}

    return _codes


class TestNegationGuard:
    def test_positive_cough_fires(self, ontology, codes_for) -> None:
        out = extract_evidences("bad cough since Monday", ontology)
        assert codes_for("cough") & set(out)

    def test_negated_cough_suppressed(self, ontology, codes_for) -> None:
        out = extract_evidences("fever and sore throat, no cough", ontology)
        assert not (codes_for("cough") & set(out))

    def test_denies_suppresses(self, ontology, codes_for) -> None:
        out = extract_evidences("patient denies fever", ontology)
        assert not (codes_for("fever") & set(out))

    def test_without_suppresses(self, ontology, codes_for) -> None:
        out = extract_evidences("fever without cough", ontology)
        assert not (codes_for("cough") & set(out))

    def test_negation_window_is_short(self, ontology, codes_for) -> None:
        # "no" several words away from "cough" must not suppress it
        out = extract_evidences(
            "no known allergies; a persistent productive cough for a week", ontology
        )
        assert codes_for("cough") & set(out)

    def test_mixed_occurrence_fires(self, ontology, codes_for) -> None:
        # one negated + one positive occurrence -> positive wins (safe side)
        out = extract_evidences(
            "no cough at first, but developed cough yesterday", ontology
        )
        assert codes_for("cough") & set(out)

    def test_positive_fever_still_fires_alongside_negated_cough(
        self, ontology, codes_for
    ) -> None:
        out = extract_evidences("high fever, no cough", ontology)
        assert codes_for("fever") & set(out)
        assert not (codes_for("cough") & set(out))


class TestParseAgeSex:
    @pytest.mark.parametrize(
        ("text", "age", "sex"),
        [
            ("Patient is a 6-year-old girl with fever", 6, "female"),
            ("41-year-old man with chest pain", 41, "male"),
            ("75-year-old woman, confused", 75, "female"),
            ("a 28 year old female with dysuria", 28, "female"),
            ("2-year-old boy, barking cough", 2, "male"),
            ("age 30 male with rash", 30, "male"),
            ("aged 65, male", 65, "male"),
            ("she has fever and cough", None, "female"),
            ("he reports sore throat", None, "male"),
            ("patient has a headache", None, None),
            ("", None, None),
        ],
    )
    def test_age_sex(self, text: str, age: int | None, sex: str | None) -> None:
        assert parse_age_sex(text) == (age, sex)
