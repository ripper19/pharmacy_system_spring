"""Frozen contract: data models and medical-safety strings.

The DISCLAIMER strings must never be altered by agents.
Inner JSON keys are snake_case and match the Spring DTO aliases defined in
docs/wire.md; changing any field name breaks the wire contract.
"""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field

DISCLAIMER = (
    "Educational decision-support for licensed pharmacy staff. "
    "Not a substitute for a clinician's diagnosis. Refer emergencies to a hospital."
)

MOCK_DISCLAIMER = "MOCK MODE — no supervisor configured. " + DISCLAIMER


class Likelihood(StrEnum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class TurnStatus(StrEnum):
    NEED_INFO = "need_info"
    DIFFERENTIAL = "differential"
    ABSTAIN = "abstain"


class PatientCase(BaseModel):
    age: int | None = None
    sex: str | None = None  # "M" | "F" | None
    evidences: tuple[str, ...] = ()  # canonical DDXPlus evidence codes, e.g. ("E_10@1",)
    narrative: str = ""


class ExpertOutput(BaseModel):
    name: str  # "e1_logreg" | "e2_lgbm" | "e3_bert"
    condition_probs: dict[str, float]  # condition code -> calibrated probability
    top_features: list[str] = Field(default_factory=list)


class Differential(BaseModel):
    condition_code: str
    condition_name: str
    probability: float = Field(ge=0.0, le=1.0)
    likelihood: Likelihood
    reasoning: str = ""
    suggested_actions: list[str] = Field(default_factory=list)
    suggested_medicines: list[str] = Field(default_factory=list)


class ConsultationResult(BaseModel):
    status: TurnStatus
    differentials: list[Differential] = Field(default_factory=list)
    red_flags: list[str] = Field(default_factory=list)
    needs_urgent_care: bool = False
    abstain_reasons: list[str] = Field(default_factory=list)
    follow_up_question: str | None = None
    disclaimer: str = DISCLAIMER


class ChatMessage(BaseModel):
    role: str
    content: str


class SupervisorPayload(BaseModel):
    """Exactly what the cloud LLM receives — nothing more."""

    candidates: list[str]  # allowed condition names (enum); anything else is invalid
    expert_outputs: list[ExpertOutput]
    transcript: list[ChatMessage]
    follow_up_question: str  # chosen by policy; supervisor may reword, not replace


class Usage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class Choice(BaseModel):
    index: int = 0
    message: ChatMessage
    finish_reason: str = "stop"


class CompletionResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: list[Choice]
    usage: Usage = Usage()
