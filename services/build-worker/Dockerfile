# ==============================================================================
# build-worker — Production Multi-Stage Dockerfile
# ==============================================================================
# NOTE: This service needs access to the Docker socket to build images.
# In docker-compose, mount /var/run/docker.sock:/var/run/docker.sock

# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --prefix=/install --no-cache-dir -r requirements.txt

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Install git (required for cloning repositories) and docker CLI
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user — must be in docker group to access socket
RUN groupadd --gid 1001 appuser && \
    useradd --uid 1001 --gid 1001 --no-create-home appuser

COPY --from=builder /install /usr/local

COPY app/ ./app/

USER appuser

CMD ["python", "-m", "app.main"]
