"""Cloud supervisor LLM client: phrases findings, never adds conditions."""
from __future__ import annotations

import json
from typing import Any

import httpx

from mlpipe.schemas import SupervisorPayload


def _system_prompt() -> str:
    return (
        "You are a pharmacist's decision-support phrasing assistant. You receive "
        "expert model outputs and a transcript. Rewrite the ranked differentials "
        "into clear clinical language. Output STRICT JSON only: "
        '{"differentials": [{"condition_name": str, "reasoning": str, '
        '"suggested_actions": [str], "suggested_medicines": [str]}]}. '
        "You MUST only use condition names from the provided candidate list. "
        "Never introduce new conditions. Keep 2-5 entries, same order."
    )


def phrase_findings(
    payload: SupervisorPayload,
    base_url: str,
    api_key: str,
    model: str,
    transport: httpx.BaseTransport | None = None,
    timeout: float = 30.0,
) -> dict[str, Any] | None:
    """Return validated {"differentials": [...]} or None when unavailable.

    Guardrail: any condition_name outside payload.candidates is dropped
    unconditionally; if nothing survives, returns an empty list rather than
    inventing content.
    """
    if not (base_url and api_key and model):
        return None

    body = {
        "model": model,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": _system_prompt()},
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "candidates": payload.candidates,
                        "expert_outputs": [o.model_dump() for o in payload.expert_outputs],
                        "transcript": [m.model_dump() for m in payload.transcript],
                        "followup_question": payload.follow_up_question,
                    }
                ),
            },
        ],
    }
    try:
        with httpx.Client(base_url=base_url, timeout=timeout, transport=transport) as client:
            resp = client.post(
                "/v1/chat/completions",
                json=body,
                headers={"Authorization": f"Bearer {api_key}"},
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            parsed = json.loads(content)
    except Exception:
        return None
    if not isinstance(parsed, dict):
        return {"differentials": []}

    allowed = set(payload.candidates)
    kept = [
        d
        for d in parsed.get("differentials", [])
        if isinstance(d, dict) and d.get("condition_name") in allowed
    ]
    return {"differentials": kept}
