"""Consultation turn logic. Stateless: full transcript in, result out."""
from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import numpy as np

from mlpipe.config import (
    ABSTAIN_MARGIN,
    ABSTAIN_MAX_SET_SIZE,
    ABSTAIN_MIN_EXPERT_AGREEMENT,
    ABSTAIN_PROB_THRESHOLD,
    LIKELIHOOD_HIGH,
    LIKELIHOOD_MEDIUM,
)
from mlpipe.extractor import extract_evidences, parse_asked
from mlpipe.policy import select_question
from mlpipe.redflags import detect_red_flags
from mlpipe.schemas import ChatMessage, ConsultationResult, Differential, Likelihood, TurnStatus

ExpertFn = Callable[[tuple[str, ...], int | None, str | None], np.ndarray]


@dataclass
class TurnContext:
    ontology: Any
    classes: tuple[str, ...]
    experts: list[ExpertFn]
    ask_table: dict[str, dict[int, float]]
    questions: dict[str, str]
    thresholds: dict[int, float]  # conformal thresholds incl. MARGINAL(-1)
    batch_scorer: Any | None = None  # vectorized scoring for offline eval


def _likelihood(p: float) -> Likelihood:
    if p >= LIKELIHOOD_HIGH:
        return Likelihood.HIGH
    if p >= LIKELIHOOD_MEDIUM:
        return Likelihood.MEDIUM
    return Likelihood.LOW


def run_turn(transcript: list[ChatMessage], ctx: TurnContext) -> ConsultationResult:
    user_msgs = [m.content for m in transcript if m.role == "user"]
    assistant_msgs = [m.content for m in transcript if m.role == "assistant"]
    last_user = user_msgs[-1] if user_msgs else ""

    flags, urgent = detect_red_flags(last_user + " " + " ".join(user_msgs[:-1]))
    evidences = extract_evidences(" ".join(user_msgs), ctx.ontology)
    # stateless continuity: frontend echoes prior questions (with markers)
    asked = parse_asked(assistant_msgs) | parse_asked(user_msgs)

    probas = [
        np.asarray(fn(evidences, None, None), dtype=np.float64) for fn in ctx.experts
    ]
    fused = np.mean(probas, axis=0) if probas else np.array([])
    ranked = sorted(range(len(fused)), key=lambda i: (-fused[i], i))
    top1 = float(fused[ranked[0]])
    top2 = float(fused[ranked[1]]) if len(ranked) > 1 else 0.0
    margin = top1 - top2
    agreement = sum(
        1 for p in probas if len(p) and int(np.argmax(p)) == ranked[0]
    )
    set_members = [
        c for c in range(len(fused))
        if (1.0 - fused[c]) <= ctx.thresholds.get(c, ctx.thresholds.get(-1, 0.9))
    ]

    question: str | None = None
    if not urgent:
        pick = select_question(fused, ctx.ask_table, ctx.questions, asked)
        question = f"{pick[1]} [code:{pick[0]}]" if pick else None

    confident = (
        bool(evidences)
        and top1 >= ABSTAIN_PROB_THRESHOLD
        and len(set_members) <= ABSTAIN_MAX_SET_SIZE
        and margin >= ABSTAIN_MARGIN
        and agreement >= min(ABSTAIN_MIN_EXPERT_AGREEMENT, len(probas))
    )
    if urgent:
        status = TurnStatus.DIFFERENTIAL
    elif confident:
        status = TurnStatus.DIFFERENTIAL
    elif question is not None:
        status = TurnStatus.NEED_INFO
    else:
        status = TurnStatus.ABSTAIN

    if status is not TurnStatus.NEED_INFO:
        question = None

    differentials: list[Differential] = []
    reasons: list[str] = []
    if status == TurnStatus.DIFFERENTIAL:
        names = ctx.classes
        for idx in ranked[:5]:
            p = float(fused[idx])
            if p < 0.02 and len(differentials) >= 3:
                break
            differentials.append(
                Differential(
                    condition_code=names[idx],
                    condition_name=names[idx],
                    probability=p,
                    likelihood=_likelihood(p),
                )
            )
    elif status == TurnStatus.ABSTAIN:
        if not evidences:
            reasons.append("no known findings matched the transcript")
        else:
            reasons.append(
                f"top condition confidence {top1:.2f} "
                f"{'below' if top1 < ABSTAIN_PROB_THRESHOLD else 'above'} "
                f"threshold {ABSTAIN_PROB_THRESHOLD}"
            )
        if len(set_members) > ABSTAIN_MAX_SET_SIZE:
            reasons.append(
                f"plausible set spans {len(set_members)} conditions; findings too overlapping"
            )
        if not set_members:
            reasons.append("no condition cleared the conformal threshold")
        if margin < ABSTAIN_MARGIN:
            reasons.append(
                f"top-2 margin {margin:.2f} below {ABSTAIN_MARGIN}; ranking unstable"
            )
        if agreement < ABSTAIN_MIN_EXPERT_AGREEMENT:
            reasons.append(
                f"only {agreement}/{len(probas)} experts support the leading condition"
            )

    return ConsultationResult(
        status=status,
        differentials=differentials,
        red_flags=flags,
        needs_urgent_care=urgent,
        abstain_reasons=reasons,
        follow_up_question=question,
    )
