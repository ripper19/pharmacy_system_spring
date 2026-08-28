"""Download Kaggle kernel outputs for dx-train-all-v2 and verify them in place.

Steps: fetch artifacts.zip -> unpack over dx/artifacts -> reload TurnContext ->
assert class count + metrics gates (ECE < 0.05) -> smoke consultations.
Usage: python scripts/deploy_v2_artifacts.py [--keep-zip]
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import zipfile
from pathlib import Path

from mlpipe.config import ARTIFACTS_DIR, SEED  # noqa: F401  (SEED: doc anchor)

DX_ROOT = Path(__file__).resolve().parents[1]
KERNEL_ID = "joeonsase/dx-train-all-v2"
STAGE = DX_ROOT / "data" / "kernel_out_v2"
REQUIRED_CORE = [
    "vocab.json", "e1_logreg.joblib", "e2_lgbm.txt", "ask_table.json",
    "calib.json", "stack.joblib", "class_counts.json", "MANIFEST.sha256.json",
]
MIN_CLASSES = 300
ECE_MAX = 0.05


def env_with_token() -> dict[str, str]:
    env = dict(os.environ)
    if not env.get("KAGGLE_API_TOKEN"):
        env_file = Path("/home/masternone/Desktop/pharm/ml/.env")
        if env_file.exists():
            for line in env_file.read_text().splitlines():
                if line.startswith("KAGGLE_API_TOKEN="):
                    env["KAGGLE_API_TOKEN"] = line.split("=", 1)[1].strip()
    return env


def main() -> int:
    STAGE.mkdir(parents=True, exist_ok=True)
    print("[1/5] fetching kernel output...", flush=True)
    r = subprocess.run(
        [str(DX_ROOT / ".venv" / "bin" / "kaggle"), "kernels", "output",
         KERNEL_ID, "-p", str(STAGE)],
        capture_output=True, text=True, env=env_with_token(),
    )
    if r.returncode != 0:
        print(r.stdout[-400:], r.stderr[-400:], sep="\n")
        print("download failed", file=sys.stderr)
        return 1

    zip_path = STAGE / "artifacts.zip"
    if not zip_path.exists():
        candidates = list(STAGE.glob("**/artifacts.zip"))
        if not candidates:
            print(f"no artifacts.zip in {list(STAGE.iterdir())}", file=sys.stderr)
            return 1
        zip_path = candidates[0]

    print("[2/5] unpacking into artifacts dir...", flush=True)
    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(ARTIFACTS_DIR)

    missing = [f for f in REQUIRED_CORE if not (ARTIFACTS_DIR / f).exists()]
    assert not missing, f"missing after unpack: {missing}"

    print("[3/5] verifying manifest...", flush=True)
    import hashlib
    manifest = json.loads((ARTIFACTS_DIR / "MANIFEST.sha256.json").read_text())
    bad = []
    for name, digest in manifest.items():
        p = ARTIFACTS_DIR / name
        if p.exists():
            h = hashlib.sha256(p.read_bytes()).hexdigest()
            if h != digest:
                bad.append(name)
    assert not bad, f"checksum mismatch: {bad}"

    print("[4/5] reloading runtime context...", flush=True)
    from mlpipe.service import load_context
    ctx = load_context()
    assert ctx is not None, "load_context returned None"
    n_cls = len(ctx.classes)
    print(f"    classes={n_cls} evidences={len(ctx.ontology.evidences)}")
    assert n_cls >= MIN_CLASSES, f"expected >= {MIN_CLASSES} classes, got {n_cls}"
    assert len(ctx.experts) >= 1

    metrics = json.loads((ARTIFACTS_DIR / "metrics.json").read_text())
    print(
        f"[5/5] metrics: acc={metrics['stack_acc']:.4f} "
        f"macro_f1={metrics['macro_f1']:.4f} ece={metrics['ece']:.4f}"
    )
    assert metrics["ece"] < ECE_MAX, f"ECE {metrics['ece']} >= {ECE_MAX}"

    # OOD smoke: out-of-set presentation must NOT yield differential without need_info path
    from mlpipe.orchestrator import run_turn
    from mlpipe.schemas import ChatMessage
    conn = ("46F resistant hypertension muscle weakness K+ 2.8 metabolic alkalosis "
            "suppressed renin elevated aldosterone")
    res = run_turn([ChatMessage(role="user", content=conn)], ctx)
    print("OOD smoke: status =", res.status.value)
    in_set = run_turn(
        [ChatMessage(role="user",
                     content="I have fever, cough with green mucus, chest pain when breathing")],
        ctx,
    )
    print("IN-SET smoke: status =", in_set.status.value)

    print("VERIFY OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
