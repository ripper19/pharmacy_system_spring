"""E3 DistilBERT: narrative expert. Torch loads lazily; absent artifact = absent expert."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np


def align_probs(probs_e3: np.ndarray, e3_labels: list[str], classes: tuple[str, ...]) -> np.ndarray:
    """Map E3's label-ordered probabilities into the canonical class order."""
    lut = {name: i for i, name in enumerate(classes)}
    out = np.zeros(len(classes), dtype=np.float64)
    for j, name in enumerate(e3_labels):
        idx = lut.get(name)
        if idx is not None:
            out[idx] = float(probs_e3[j])
    total = out.sum()
    return out / total if total > 0 else np.full(len(classes), 1.0 / len(classes))


class NarrativeExpert:
    def __init__(self, checkpoint_dir: Path, ontology: Any) -> None:
        import json

        from transformers import (
            AutoModelForSequenceClassification,  # noqa: F401
            AutoTokenizer,
        )

        self.dir = checkpoint_dir
        tok = AutoTokenizer.from_pretrained(str(checkpoint_dir))
        model = AutoModelForSequenceClassification.from_pretrained(str(checkpoint_dir))
        self.tokenizer = tok
        self.model = model
        self.model.eval()
        labels = json.loads((checkpoint_dir / ".." / "labels.json").read_text())
        self.e3_labels = labels["pathologies"]
        self.ontology = ontology

    def __call__(
        self,
        evidences: tuple[str, ...],
        age: int | None,
        sex: str | None,
        classes: tuple[str, ...],
    ) -> np.ndarray:  # noqa: E501
        from mlpipe.narrative import render_narrative

        text = render_narrative(age, sex, evidences, self.ontology)
        inputs = self.tokenizer(text, truncation=True, max_length=128, return_tensors="pt")
        with torch_no_grad():  # noqa: F821
            logits = self.model(**inputs).logits[0]
        probs = softmax_np(np.asarray(logits.numpy(), dtype=np.float64))
        return np.asarray(align_probs(probs, self.e3_labels, classes))


def torch_no_grad() -> Any:
    import torch

    return torch.no_grad()


def softmax_np(z: np.ndarray) -> np.ndarray:
    z = z - z.max()
    e = np.exp(z)
    return np.asarray(e / e.sum())
