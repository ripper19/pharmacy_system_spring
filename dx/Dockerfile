# dx-shim — differential-diagnosis OpenAI-compatible service
# Render (or any Docker host) builds this; CMD is the startup command.
# Render injects PORT — we bind 0.0.0.0:${PORT:-8000}.
FROM python:3.13-slim

# LightGBM needs libgomp at runtime (slim image strips it)
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements-deploy.txt .
RUN pip install --no-cache-dir -r requirements-deploy.txt

COPY pyproject.toml ./
COPY src ./src
# frozen DDXPlus ontology (tiny, static) needed by load_ontology()
COPY data/ddxplus/release_conditions.json /app/data/ddxplus/release_conditions.json
COPY data/ddxplus/release_evidences.json /app/data/ddxplus/release_evidences.json
RUN pip install --no-cache-dir -e .

COPY scripts/fetch_artifacts.py ./scripts/fetch_artifacts.py

ENV PYTHONUNBUFFERED=1 \
    ARTIFACTS_DIR=/app/artifacts

EXPOSE 8000

# startup = fetch Kaggle-trained artifacts, then serve (PORT from Render)
CMD ["sh", "-c", "python scripts/fetch_artifacts.py && exec uvicorn mlpipe.service:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
