"""FastAPI shim speaking docs/wire.md on :8000. Stateless; artifacts loaded once."""
from __future__ import annotations

import json
import time
import uuid
from typing import Any

import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from mlpipe.config import ARTIFACTS_DIR, supervisor_config
from mlpipe.orchestrator import TurnContext, run_turn
from mlpipe.schemas import ChatMessage, Choice, CompletionResponse, Usage
from mlpipe.supervisor import phrase_findings

_MODEL = "dx-local"


def build_app(ctx: TurnContext | None = None) -> FastAPI:
    app = FastAPI(title="dx-local")
    app.state.ctx = ctx

    @app.middleware("http")
    async def bearer_guard(request: Request, call_next: Any) -> Any:
        import os as _os

        expected = _os.environ.get("SHIM_API_TOKEN", "")
        if expected and request.url.path != "/healthz":
            auth = request.headers.get("authorization", "")
            if auth != f"Bearer {expected}":
                return JSONResponse(
                    status_code=401,
                    content={"error": {"message": "unauthorized", "type": "auth_error"}},
                )
        return await call_next(request)

    @app.get("/healthz")
    def healthz() -> dict[str, Any]:
        return {
            "status": "ok",
            "experts_loaded": bool(app.state.ctx),
            "supervisor_configured": bool(supervisor_config()[0] and supervisor_config()[2]),
        }

    @app.post("/v1/chat/completions")
    async def chat_completions(body: dict[str, Any]) -> JSONResponse:
        messages = body.get("messages") or []
        if (
            not isinstance(messages, list)
            or not messages
            or not all(isinstance(m, dict) and isinstance(m.get("role"), str) for m in messages)
        ):
            raise HTTPException(status_code=422, detail="malformed messages")
        if app.state.ctx is None:
            return JSONResponse(
                status_code=503,
                content={
                    "error": {"message": "artifacts not loaded", "type": "service_unavailable"}
                },
            )
        transcript = [
            ChatMessage(role=m["role"], content=m.get("content", "")) for m in messages
        ]
        result = run_turn(transcript, app.state.ctx)

        base_url, api_key, model = supervisor_config()
        if result.status.value == "differential" and base_url:
            from mlpipe.schemas import ExpertOutput, SupervisorPayload

            payload = SupervisorPayload(
                candidates=[d.condition_name for d in result.differentials],
                expert_outputs=[
                    ExpertOutput(
                        name="fused",
                        condition_probs={
                            d.condition_code: d.probability for d in result.differentials
                        },
                    )
                ],
                transcript=transcript,
                follow_up_question=result.follow_up_question or "",
            )
            phrased = phrase_findings(payload, base_url, api_key, model)
            if phrased is not None:
                by_name = {p["condition_name"]: p for p in phrased.get("differentials", [])}
                for d in result.differentials:
                    extra = by_name.get(d.condition_name)
                    if extra:
                        object.__setattr__(d, "reasoning", str(extra.get("reasoning", d.reasoning)))
                        object.__setattr__(
                            d,
                            "suggested_actions",
                            [str(a) for a in (extra.get("suggested_actions") or [])],
                        )
                        object.__setattr__(
                            d,
                            "suggested_medicines",
                            [str(m) for m in (extra.get("suggested_medicines") or [])],
                        )

        inner = result.model_dump_json()
        envelope = CompletionResponse(
            id=f"chatcmpl-dx-{uuid.uuid4().hex[:8]}",
            created=int(time.time()),
            model=_MODEL,
            choices=[
                Choice(
                    index=0,
                    message=ChatMessage(role="assistant", content=inner),
                    finish_reason="stop",
                )
            ],
            usage=Usage(),
        )
        return JSONResponse(content=json.loads(envelope.model_dump_json()))

    return app


def load_context(include_e3: bool | None = None) -> TurnContext | None:
    """Load trained artifacts from ARTIFACTS_DIR; None when unavailable.

    include_e3 defaults to the INCLUDE_E3 env var ("true" enables the BERT
    expert; the deploy plan must provide torch+transformers in that case).
    """
    if include_e3 is None:
        from mlpipe.config import env

        include_e3 = env("INCLUDE_E3", "false").lower() == "true"
    try:
        import joblib  # type: ignore[import-untyped]
        import lightgbm as lgb

        from mlpipe.experts.features import featurize
        from mlpipe.ontology import load_ontology

        vocab = json.loads((ARTIFACTS_DIR / "vocab.json").read_text())
        e1 = joblib.load(ARTIFACTS_DIR / "e1_logreg.joblib")
        e2 = lgb.Booster(model_file=str(ARTIFACTS_DIR / "e2_lgbm.txt"))
        ask_table = json.loads((ARTIFACTS_DIR / "ask_table.json").read_text())
        ontology = load_ontology()

        classes: tuple[str, ...] = tuple(vocab["pathologies"])
        v = {"evidence_codes": tuple(vocab["evidence_codes"]), "pathologies": classes}

        calib_path = ARTIFACTS_DIR / "calib.json"
        t1 = t2 = 1.0
        thresholds: dict[int, float] = {i: 0.9 for i in range(len(classes))}
        thresholds[-1] = 0.9
        stack = None
        if calib_path.exists():
            calib = json.loads(calib_path.read_text())
            t1, t2 = float(calib["t1"]), float(calib["t2"])
            for k, q in calib.get("conformal", {}).items():
                thresholds[int(k)] = float(q)
            thresholds[-1] = float(calib.get("marginal", 0.9))
            stack_path = ARTIFACTS_DIR / "stack.joblib"
            if stack_path.exists():
                stack = joblib.load(stack_path)

        def apply_t(p: Any, temperature: float) -> Any:
            from mlpipe.calibrate import apply_temperature

            row = np.asarray(p, dtype=np.float64).reshape(1, -1)
            return apply_temperature(row, temperature)[0]

        def pred_e1(evidences: tuple[str, ...], age: int | None, sex: str | None) -> Any:
            x = featurize(evidences, age, sex, v).reshape(1, -1)  # type: ignore[arg-type]
            return apply_t(e1.predict_proba(x)[0], t1)

        def pred_e2(evidences: tuple[str, ...], age: int | None, sex: str | None) -> Any:
            x = featurize(evidences, age, sex, v).reshape(1, -1)  # type: ignore[arg-type]
            return apply_t(e2.predict(x)[0], t2)

        experts: list[Any] = [pred_e1, pred_e2]

        def fused_expert(
            evidences: tuple[str, ...], age: int | None, sex: str | None
        ) -> Any:
            probas = [fn(evidences, age, sex) for fn in experts]
            if stack is not None:
                return np.asarray(
                    stack.predict_proba(np.hstack([p.reshape(1, -1) for p in probas]))[0],
                    dtype=np.float64,
                )
            return np.mean(probas, axis=0)

        all_experts: list[Any] = [fused_expert]

        e3_dir = ARTIFACTS_DIR / "e3_bert"
        if include_e3 and e3_dir.exists():
            from mlpipe.experts.e3_bert import NarrativeExpert

            e3 = NarrativeExpert(e3_dir, ontology)

            def e3_expert(
                evidences: tuple[str, ...], age: int | None, sex: str | None
            ) -> Any:
                return e3(evidences, age, sex, classes)

            all_experts.append(e3_expert)

        def batch_scorer(rows: list[tuple[tuple[str, ...], int | None, str | None]]) -> Any:
            from mlpipe.calibrate import apply_temperature

            xs = np.stack(
                [featurize(ev, ag, sx, v) for ev, ag, sx in rows]  # type: ignore[arg-type]
            )
            p1v = apply_temperature(
                np.asarray(e1.predict_proba(xs), dtype=np.float64), t1
            )
            p2v = apply_temperature(np.asarray(e2.predict(xs), dtype=np.float64), t2)
            if stack is not None:
                return np.asarray(stack.predict_proba(np.hstack([p1v, p2v])), dtype=np.float64)
            return (p1v + p2v) / 2.0

        return TurnContext(
            ontology=ontology,
            classes=classes,
            experts=all_experts,
            ask_table={b: {int(k): p for k, p in per.items()} for b, per in ask_table.items()},
            questions={
                c: o.question for c, o in ontology.evidences.items() if not o.is_antecedent
            },
            thresholds=thresholds,
            batch_scorer=batch_scorer,
        )
    except Exception:
        import traceback

        traceback.print_exc()
        return None


app = build_app(ctx=load_context())
