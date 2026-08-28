"""Boot-time artifact fetch for the deployed shim.

Downloads Kaggle-trained model artifacts (kernel outputs) using
KAGGLE_API_TOKEN, then unpacks into ARTIFACTS_DIR. Idempotent: skips when a
previous run in this container already produced them.

Env:
  KAGGLE_API_TOKEN   (required)
  INCLUDE_E3         "true" to also pull the DistilBERT checkpoint (~260MB,
                     needs >=1GB RAM instance). Default: false.
  ARTIFACTS_DIR      default /app/artifacts
"""

from __future__ import annotations

import os
import subprocess
import sys
import zipfile
from pathlib import Path

ART = Path(os.environ.get("ARTIFACTS_DIR", "/app/artifacts"))
INCLUDE_E3 = os.environ.get("INCLUDE_E3", "false").lower() == "true"

REQUIRED_CORE = ["vocab.json", "e1_logreg.joblib", "e2_lgbm.txt", "ask_table.json", "calib.json"]
KERNELS = [("joeonsase/dx-train-all-v2", False)]
if INCLUDE_E3:
    KERNELS.append(("joeonsase/dx-train-e3-v2", True))


def already_present() -> bool:
    ok = all((ART / f).exists() for f in REQUIRED_CORE)
    if INCLUDE_E3:
        ok = ok and (ART / "e3_bert" / "model.safetensors").exists()
    return ok


def fetch(kernel_id: str, dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    print(f"[fetch] kaggle kernels output {kernel_id}", flush=True)
    result = subprocess.run(
        ["kaggle", "kernels", "output", kernel_id, "-p", str(dest)],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(result.stdout[-500:], result.stderr[-500:], sep="\n", file=sys.stderr)
        raise SystemExit(f"kaggle download failed for {kernel_id}")


def unpack(zip_path: Path, dest: Path) -> None:
    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(dest)


def main() -> None:
    if already_present():
        print("[fetch] artifacts already present — skipping (no Kaggle call)")
        return
    if not os.environ.get("KAGGLE_API_TOKEN"):
        raise SystemExit(
            "artifacts missing and KAGGLE_API_TOKEN unset — "
            "either commit artifacts/ or provide the token to download them"
        )

    ART.mkdir(parents=True, exist_ok=True)
    for kernel_id, _is_e3 in KERNELS:
        short = kernel_id.split("/")[-1]
        dl = Path("/tmp/dl") / short
        fetch(kernel_id, dl)
        zips = sorted(dl.glob("artifacts*.zip"))
        if not zips:
            raise SystemExit(f"no artifacts zip in {kernel_id} output")
        for zp in zips:
            unpack(zp, ART)
            print(f"[fetch] unpacked {zp.name}")

    missing = [f for f in REQUIRED_CORE if not (ART / f).exists()]
    if missing:
        raise SystemExit(f"core artifacts missing after fetch: {missing}")
    if INCLUDE_E3 and not (ART / "e3_bert" / "model.safetensors").exists():
        raise SystemExit("INCLUDE_E3=true but e3_bert/model.safetensors absent")
    print("[fetch] artifacts ready:", sorted(p.name for p in ART.iterdir()))


if __name__ == "__main__":
    main()
