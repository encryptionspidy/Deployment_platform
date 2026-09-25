# =====================================================================
# setup-deploy-platform.ps1
# Scaffolds the full production-style folder structure for the
# "deploy-platform" project (Vercel-style deploy pipeline + SRE/SLO stack)
#
# Usage:
#   1. Open PowerShell in the folder where you want the project created
#   2. Run: .\setup-deploy-platform.ps1
# =====================================================================

$root = "deploy-platform"

Write-Host "Creating project root: $root" -ForegroundColor Cyan
New-Item -ItemType Directory -Path $root -Force | Out-Null
Set-Location $root

# ---------------------------------------------------------------------
# ROOT LEVEL FILES
# ---------------------------------------------------------------------
# README.md          -> project overview, setup instructions, architecture summary
# docker-compose.yml -> spins up Postgres, Redis, Prometheus, Grafana locally in one command
# .env.example        -> template for secrets/config (DB url, GitHub OAuth keys, etc.) without real values
# .gitignore          -> excludes venvs, node_modules, .env, __pycache__, etc. from git
New-Item -ItemType File -Path "README.md" -Force | Out-Null
New-Item -ItemType File -Path "docker-compose.yml" -Force | Out-Null
New-Item -ItemType File -Path ".env.example" -Force | Out-Null
New-Item -ItemType File -Path ".gitignore" -Force | Out-Null

# ---------------------------------------------------------------------
# SERVICES — each is an independently deployable backend service
# ---------------------------------------------------------------------
New-Item -ItemType Directory -Path "services" -Force | Out-Null

# --- webhook-receiver ---
# Job: accept GitHub push webhooks, validate signature, push a build job to the queue.
# Kept intentionally lightweight so it responds fast and never blocks on build work.
$whr = "services/webhook-receiver"
New-Item -ItemType Directory -Path "$whr/app/api/routes" -Force | Out-Null
New-Item -ItemType Directory -Path "$whr/app/core" -Force | Out-Null
New-Item -ItemType Directory -Path "$whr/app/queue" -Force | Out-Null
New-Item -ItemType Directory -Path "$whr/app/metrics" -Force | Out-Null
New-Item -ItemType Directory -Path "$whr/tests" -Force | Out-Null

New-Item -ItemType File -Path "$whr/app/main.py" -Force | Out-Null                  # FastAPI app entrypoint, mounts routers + metrics
New-Item -ItemType File -Path "$whr/app/api/routes/webhook.py" -Force | Out-Null    # POST /webhook/github endpoint handler
New-Item -ItemType File -Path "$whr/app/core/config.py" -Force | Out-Null           # env vars / settings (Pydantic BaseSettings)
New-Item -ItemType File -Path "$whr/app/core/security.py" -Force | Out-Null         # verifies GitHub webhook HMAC signature
New-Item -ItemType File -Path "$whr/app/queue/publisher.py" -Force | Out-Null       # pushes validated build job onto Redis/RabbitMQ
New-Item -ItemType File -Path "$whr/app/metrics/instrumentation.py" -Force | Out-Null # wires up prometheus-fastapi-instrumentator
New-Item -ItemType File -Path "$whr/Dockerfile" -Force | Out-Null                   # container build spec for this service
New-Item -ItemType File -Path "$whr/requirements.txt" -Force | Out-Null             # fastapi, uvicorn, redis, prometheus-fastapi-instrumentator, etc.
New-Item -ItemType File -Path "$whr/pyproject.toml" -Force | Out-Null               # project metadata / tooling config (black, ruff, etc.)

# --- build-worker ---
# Job: consume jobs from the queue, clone the user's repo, docker build it, deploy it.
# This is where the actual "build and ship the app" logic lives.
$bw = "services/build-worker"
New-Item -ItemType Directory -Path "$bw/app/queue" -Force | Out-Null
New-Item -ItemType Directory -Path "$bw/app/builder" -Force | Out-Null
New-Item -ItemType Directory -Path "$bw/app/db" -Force | Out-Null
New-Item -ItemType Directory -Path "$bw/app/metrics" -Force | Out-Null
New-Item -ItemType Directory -Path "$bw/tests" -Force | Out-Null

New-Item -ItemType File -Path "$bw/app/main.py" -Force | Out-Null                   # worker/consumer loop entrypoint (no HTTP server needed)
New-Item -ItemType File -Path "$bw/app/queue/consumer.py" -Force | Out-Null         # pulls next job off Redis/RabbitMQ
New-Item -ItemType File -Path "$bw/app/builder/docker_build.py" -Force | Out-Null   # clones repo, runs `docker build` on it
New-Item -ItemType File -Path "$bw/app/builder/deployer.py" -Force | Out-Null       # deploys built image to Kubernetes (or docker run locally)
New-Item -ItemType File -Path "$bw/app/db/models.py" -Force | Out-Null              # SQLAlchemy model for deployment records (status, timestamps, logs)
New-Item -ItemType File -Path "$bw/app/metrics/instrumentation.py" -Force | Out-Null # exposes build success/failure/duration metrics
New-Item -ItemType File -Path "$bw/Dockerfile" -Force | Out-Null
New-Item -ItemType File -Path "$bw/requirements.txt" -Force | Out-Null              # fastapi (optional), docker sdk, redis, sqlalchemy, kubernetes client

# --- dashboard-backend ---
# Job: the API the frontend talks to. Serves auth, project/deployment data from
# Postgres, and live SLI/SLO numbers by querying Prometheus directly.
$db = "services/dashboard-backend"
New-Item -ItemType Directory -Path "$db/app/api/routes" -Force | Out-Null
New-Item -ItemType Directory -Path "$db/app/core" -Force | Out-Null
New-Item -ItemType Directory -Path "$db/app/db/migrations" -Force | Out-Null
New-Item -ItemType Directory -Path "$db/app/clients" -Force | Out-Null
New-Item -ItemType Directory -Path "$db/app/metrics" -Force | Out-Null
New-Item -ItemType Directory -Path "$db/tests" -Force | Out-Null

New-Item -ItemType File -Path "$db/app/main.py" -Force | Out-Null                   # FastAPI entrypoint for the dashboard API
New-Item -ItemType File -Path "$db/app/api/routes/auth.py" -Force | Out-Null        # login, session handling, GitHub OAuth callback
New-Item -ItemType File -Path "$db/app/api/routes/projects.py" -Force | Out-Null    # CRUD for connected repos/projects
New-Item -ItemType File -Path "$db/app/api/routes/deployments.py" -Force | Out-Null # deployment history + build logs endpoints
New-Item -ItemType File -Path "$db/app/api/routes/slo.py" -Force | Out-Null         # returns live SLI/SLO/error-budget/burn-rate data
New-Item -ItemType File -Path "$db/app/core/config.py" -Force | Out-Null            # env vars / settings
New-Item -ItemType File -Path "$db/app/core/auth.py" -Force | Out-Null              # GitHub OAuth flow + JWT/session logic
New-Item -ItemType File -Path "$db/app/db/models.py" -Force | Out-Null              # User, Project, Deployment, Incident tables
New-Item -ItemType File -Path "$db/app/db/session.py" -Force | Out-Null             # SQLAlchemy engine/session setup
New-Item -ItemType File -Path "$db/app/clients/prometheus_client.py" -Force | Out-Null # wraps Prometheus HTTP query API calls
New-Item -ItemType File -Path "$db/app/metrics/instrumentation.py" -Force | Out-Null
New-Item -ItemType File -Path "$db/Dockerfile" -Force | Out-Null
New-Item -ItemType File -Path "$db/requirements.txt" -Force | Out-Null              # fastapi, sqlalchemy, alembic, httpx, authlib, etc.

# --- shared ---
# Job: code reused across multiple services (e.g. Pydantic schemas both
# webhook-receiver and build-worker need) so it isn't duplicated 3 times.
New-Item -ItemType Directory -Path "services/shared/schemas" -Force | Out-Null
New-Item -ItemType Directory -Path "services/shared/utils" -Force | Out-Null

# ---------------------------------------------------------------------
# INFRA — infrastructure-as-code, kept separate from application code
# ---------------------------------------------------------------------
New-Item -ItemType Directory -Path "infra/kubernetes/namespaces" -Force | Out-Null
New-Item -ItemType Directory -Path "infra/kubernetes/deployments" -Force | Out-Null
New-Item -ItemType Directory -Path "infra/kubernetes/services" -Force | Out-Null
New-Item -ItemType Directory -Path "infra/kubernetes/ingress" -Force | Out-Null

New-Item -ItemType File -Path "infra/kubernetes/deployments/webhook-receiver.yaml" -Force | Out-Null  # K8s Deployment spec for webhook-receiver
New-Item -ItemType File -Path "infra/kubernetes/deployments/build-worker.yaml" -Force | Out-Null      # K8s Deployment spec for build-worker
New-Item -ItemType File -Path "infra/kubernetes/deployments/dashboard-backend.yaml" -Force | Out-Null # K8s Deployment spec for dashboard-backend

New-Item -ItemType Directory -Path "infra/prometheus" -Force | Out-Null
New-Item -ItemType File -Path "infra/prometheus/prometheus.yml" -Force | Out-Null       # scrape configs: which services/pods to scrape metrics from
New-Item -ItemType File -Path "infra/prometheus/recording-rules.yml" -Force | Out-Null  # pre-calculated SLI, SLO, error budget, burn rate formulas
New-Item -ItemType File -Path "infra/prometheus/alert-rules.yml" -Force | Out-Null      # conditions that trigger an alert (e.g. high burn rate)

New-Item -ItemType Directory -Path "infra/alertmanager" -Force | Out-Null
New-Item -ItemType File -Path "infra/alertmanager/alertmanager.yml" -Force | Out-Null   # where/how alerts get sent (email, Slack, webhook, etc.)

New-Item -ItemType Directory -Path "infra/grafana/dashboards" -Force | Out-Null
New-Item -ItemType File -Path "infra/grafana/dashboards/slo-overview.json" -Force | Out-Null # pre-built Grafana dashboard definition (importable JSON)

# ---------------------------------------------------------------------
# FRONTEND — scaffold only for now, build after backend is validated
# ---------------------------------------------------------------------
New-Item -ItemType Directory -Path "frontend/app" -Force | Out-Null        # Next.js app router pages
New-Item -ItemType Directory -Path "frontend/components" -Force | Out-Null # reusable UI components
New-Item -ItemType Directory -Path "frontend/lib" -Force | Out-Null        # API client helpers, utils
New-Item -ItemType Directory -Path "frontend/public" -Force | Out-Null     # static assets

New-Item -ItemType File -Path "frontend/package.json" -Force | Out-Null
New-Item -ItemType File -Path "frontend/next.config.js" -Force | Out-Null

# ---------------------------------------------------------------------
# SCRIPTS — dev/test helper scripts, not part of any deployed service
# ---------------------------------------------------------------------
New-Item -ItemType Directory -Path "scripts" -Force | Out-Null
New-Item -ItemType File -Path "scripts/seed_db.py" -Force | Out-Null       # inserts fake users/projects/deployments for local testing
New-Item -ItemType File -Path "scripts/test_webhook.sh" -Force | Out-Null  # curl script that simulates a real GitHub push webhook payload

Write-Host ""
Write-Host "Done. Project structure created under .\$root" -ForegroundColor Green
Write-Host "Next: open the folder in VS Code with 'code .' and start with services/webhook-receiver" -ForegroundColor Yellow
