# Multi-stage: slim runtime image for the serving API.
FROM python:3.11-slim AS base
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app

# Install CPU torch wheel explicitly to keep the image small; override for GPU images.
COPY pyproject.toml README.md ./
COPY src ./src
RUN pip install --upgrade pip && pip install .

EXPOSE 8000
ENV MODEL_PATH=/models/model.pt MODEL_VERSION=dev
# Non-root for security.
RUN useradd -m appuser && chown -R appuser /app
USER appuser

HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health').status==200 else 1)"

CMD ["uvicorn", "badminton.serving.app:app", "--host", "0.0.0.0", "--port", "8000"]
