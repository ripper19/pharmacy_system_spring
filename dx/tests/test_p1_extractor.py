"""P1 acceptance suite: lay-synonym trigger normalization.

Live battery (2026-10-17): "burning pain on urination" fired nothing because
the dysuria evidence trigger is the token pair "burning urinating"; the word
"photophobia" fired nothing because triggers use "light sensitivity". P1 adds
a phrase-synonym rewrite + token-fold layer so lay narrative matches ontology
question vocabulary. Negation survives the rewrite.
"""

from __future__ import annotations

import pytest

from mlpipe.extractor import extract_evidences


@pytest.fixture(scope="module")
def ontology():
    from mlpipe.ontology import load_ontology

    return load_ontology()


@pytest.fixture(scope="module")
def codes_with_trigger(ontology):
    from mlpipe.extractor import build_trigger_table

    table = build_trigger_table(ontology)

    def _codes(trigger: str) -> set[str]:
        return {c for c, t in table.items() if t == trigger}

    return _codes


class TestUrinationSynonyms:
    def test_burning_urination_lay(self, ontology, codes_with_trigger) -> None:
        out = extract_evidences("burning pain on urination", ontology)
        assert codes_with_trigger("burning when") & set(out)

    def test_pain_when_urinating(self, ontology, codes_with_trigger) -> None:
        out = extract_evidences("pain when urinating since yesterday", ontology)
        assert codes_with_trigger("burning when") & set(out)

    def test_stinging_when_peeing(self, ontology, codes_with_trigger) -> None:
        out = extract_evidences("stinging when peeing", ontology)
        assert codes_with_trigger("burning when") & set(out)

    def test_negated_dysuria_still_suppressed(self, ontology, codes_with_trigger) -> None:
        out = extract_evidences("no burning when urinating", ontology)
        assert not (codes_with_trigger("burning when") & set(out))

    def test_plain_urinating_unchanged(self, ontology, codes_with_trigger) -> None:
        out = extract_evidences("burning when urinating", ontology)
        assert codes_with_trigger("burning when") & set(out)


class TestLightSensitivitySynonyms:
    def test_photophobia_word(self, ontology, codes_with_trigger) -> None:
        out = extract_evidences("bad headache with photophobia", ontology)
        assert codes_with_trigger("light sensitivity") & set(out)

    def test_sensitive_to_light(self, ontology, codes_with_trigger) -> None:
        out = extract_evidences("she is sensitive to light", ontology)
        assert codes_with_trigger("light sensitivity") & set(out)

    def test_negated_photophobia_suppressed(self, ontology, codes_with_trigger) -> None:
        out = extract_evidences("no photophobia, eyes fine", ontology)
        assert not (codes_with_trigger("light sensitivity") & set(out))
