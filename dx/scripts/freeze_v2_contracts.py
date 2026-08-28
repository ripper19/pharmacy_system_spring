"""Freeze v2 contracts from hand-authored condition sources.

Merges scripts/v2_conditions_source*.py modules with the frozen v1 files,
validates every invariant, and writes release_conditions_v2.json /
release_evidences_v2.json in schema-identical (v1) shape plus additive
fields. Deterministic; no network, no LLM.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ML_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ML_ROOT / "scripts"
DATA_DIR = ML_ROOT / "data" / "ddxplus"
OLD_CONDITIONS = DATA_DIR / "release_conditions.json"
OLD_EVIDENCES = DATA_DIR / "release_evidences.json"
OUT_CONDITIONS = DATA_DIR / "release_conditions_v2.json"
OUT_EVIDENCES = DATA_DIR / "release_evidences_v2.json"

WORD_RE = re.compile(r"[a-z]+")
STOP = {
    "do", "you", "have", "a", "the", "get", "got", "feel", "feeling", "are",
    "is", "there", "your", "any", "of", "been", "did", "does", "was", "were",
    "to", "and", "or", "in", "on", "it", "its", "this", "that", "with",
}
# Triggers so generic they fire on nearly any transcript.
BANNED_TRIGGERS = {"pain", "problems", "trouble", "issues", "symptoms"}
MAX_CODES_PER_TRIGGER = 12


def trigger_of(question_en: str) -> str | None:
    """Mirror the runtime extractor: up to two significant tokens, AND-joined."""
    q = question_en.lower().rstrip("?").strip()
    for prefix in (
        "do you have ", "have you ", "do you feel ", "are you ", "did you ",
        "does the person have ", "does the ", "is there ",
    ):
        if q.startswith(prefix):
            q = q[len(prefix):]
            break
    toks = [t for t in WORD_RE.findall(q) if t not in STOP][:2]
    return " ".join(toks) if toks else None


def blank_evidence(code: str, question_en: str, is_antecedent: bool) -> dict:
    return {
        "name": code,
        "code_question": code,
        "question_fr": "",
        "question_en": question_en,
        "is_antecedent": is_antecedent,
        "default_value": 0,
        "value_meaning": {},
        "possible-values": [],
        "data_type": "B",
    }


def load_sources() -> dict[str, list[dict]]:
    systems: dict[str, list[dict]] = {}
    for path in sorted(SCRIPTS.glob("v2_conditions_source*.py")):
        namespace: dict = {}
        exec(path.read_text(), namespace)  # noqa: S102 - trusted local source
        exported: dict[str, list[dict]] = namespace.get("SYSTEMS", {})
        for system, entries in exported.items():
            assert isinstance(entries, list) and entries, path.name
            systems.setdefault(system, []).extend(entries)
    return systems


def main() -> int:
    old_conditions = json.loads(OLD_CONDITIONS.read_text())
    old_evidences = json.loads(OLD_EVIDENCES.read_text())
    old_names = {c["cond-name-eng"] for c in old_conditions.values()}

    known_questions: dict[str, str] = {}
    for code, entry in old_evidences.items():
        q = str(entry.get("question_en") or "").lower().strip()
        if q:
            known_questions.setdefault(q, code)

    new_evidences: dict[str, dict] = {}
    trigger_map: dict[str, list[str]] = {}
    ev_seq = 1000
    cond_seq = 1000
    new_conditions: dict[str, dict] = {}

    def resolve_or_add(phrase: str, *, antecedent: bool) -> str:
        phrase = phrase.strip()
        question = (
            f"Have you ever been diagnosed with {phrase}?"
            if antecedent
            else f"Do you have {phrase}?"
        )
        key = question.lower()
        if key in known_questions:
            return known_questions[key]
        for code, entry in new_evidences.items():
            if entry["question_en"].lower() == key:
                return code
        nonlocal ev_seq
        trig = trigger_of(question)
        assert trig, f"no trigger token: {question}"
        assert trig not in BANNED_TRIGGERS, (
            f"generic trigger '{trig}' in '{question}' — rephrase finding"
        )
        code = f"E_V2_{ev_seq}"
        ev_seq += 1
        new_evidences[code] = blank_evidence(code, question, antecedent)
        base_trig_map = trigger_map.setdefault(trig, [])
        if not base_trig_map or base_trig_map[-1] != code:
            pass
        return code

    for system, entries in sorted(load_sources().items()):
        for c in entries:
            name = str(c["name"]).strip()
            assert name not in old_names, f"{name} duplicates a v1 condition"
            assert name not in {
                cc["cond-name-eng"] for cc in new_conditions.values()
            }, f"duplicate {name}"
            core = [resolve_or_add(str(f), antecedent=False) for f in c["core"]]
            periph = [
                resolve_or_add(str(f), antecedent=False)
                for f in c.get("peripheral", c.get("periph", []))
            ]
            ants = [
                resolve_or_add(str(f), antecedent=True)
                for f in c.get("risks", [])
            ]
            cond_seq += 1
            new_conditions[name] = {
                "condition_name": name,
                "cond-name-fr": "",
                "cond-name-eng": name,
                "icd10-id": str(c["icd10"]),
                "symptoms": sorted(set(core + periph)),
                "antecedents": sorted(set(ants)),
                "severity": int(c["severity"]),
                "system": system,
                "prevalence_tier": int(c["tier"]),
                "v2_core": sorted(set(core)),
            }
        print(f"{system}: {len(entries)} conditions frozen", flush=True)

    merged_conditions = {**old_conditions, **new_conditions}
    merged_evidences = {**old_evidences, **new_evidences}

    # ---- validation gates ----
    names = [c["cond-name-eng"] for c in merged_conditions.values()]
    assert len(names) == len(set(names)), "duplicate condition names"
    icds = [c["icd10-id"] for c in new_conditions.values()]
    assert len(icds) == len(set(icds)), "duplicate ICD-10 among new conditions"
    referenced = {
        e
        for c in new_conditions.values()
        for e in c["symptoms"] + c["antecedents"]
    }
    missing = referenced - set(merged_evidences)
    assert not missing, f"dangling evidence refs: {sorted(missing)[:5]}"
    for name, c in new_conditions.items():
        assert c["v2_core"], f"{name}: no core findings"
        assert set(c["v2_core"]) <= set(c["symptoms"])
        assert 1 <= c["severity"] <= 4
        assert c["prevalence_tier"] in (1, 2, 3)
    for code, entry in new_evidences.items():
        trig = trigger_of(entry["question_en"])
        assert trig and all(t.isalpha() for t in trig.split()), \
            f"bad trigger for {code}: {trig!r}"

    # trigger collision audit over non-antecedent evidences only (antecedent
    # questions all start "Have you ever..." and are excluded from the
    # runtime trigger table by design).
    for code, entry in new_evidences.items():
        if entry["is_antecedent"]:
            continue
        trig = trigger_of(entry["question_en"]) or ""
        trigger_map.setdefault(trig, []).append(code)
    overloaded = {
        t: cs for t, cs in trigger_map.items() if len(cs) > MAX_CODES_PER_TRIGGER
    }
    assert not overloaded, (
        f"triggers exceeding {MAX_CODES_PER_TRIGGER} codes: "
        + ", ".join(f"{t}({len(cs)})" for t, cs in overloaded.items())
    )

    total_new_target = sum(len(v) for v in load_sources().values())
    assert len(new_conditions) == total_new_target, "some entries dropped"

    OUT_CONDITIONS.write_text(json.dumps(merged_conditions, indent=1))
    OUT_EVIDENCES.write_text(json.dumps(merged_evidences, indent=1))
    print(
        f"WROTE {OUT_CONDITIONS.name}: {len(merged_conditions)} conditions "
        f"(+{len(new_conditions)}); {OUT_EVIDENCES.name}: "
        f"{len(merged_evidences)} evidences (+{len(new_evidences)})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
