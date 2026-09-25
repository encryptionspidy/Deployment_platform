# 🚀 Deploy Platform

> **Modern, Self-Hosted CI/CD Platform & Site Reliability Engineering (SRE) Observability Engine.**  
> *Push code to GitHub $\rightarrow$ Platform automatically builds, scans for vulnerabilities, deploys to Kubernetes, and monitors reliability in real time.*

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Architecture & Workflow](#-architecture--workflow)
- [Project Directory Structure](#-project-directory-structure)
- [Technology Stack](#-technology-stack)
- [Prerequisites](#-prerequisites)
- [Quick Start (One Command)](#-quick-start-one-command)
- [Step-by-Step Manual Startup](#-step-by-step-manual-startup)
- [Simulating & Testing Deployments](#-simulating--testing-deployments)
- [SRE Metrics & SLO Tracking](#-sre-metrics--slo-tracking)
- [Security Scanning & Approval Workflow](#-security-scanning--approval-workflow)
- [Kubernetes & Helm Deployment](#-kubernetes--helm-deployment)
- [Service Port & URL Directory](#-service-port--url-directory)
- [Troubleshooting & FAQ](#-troubleshooting--faq)

---

## 🌟 Overview

Deploy Platform is an enterprise-grade, self-hosted deployment automation system designed to bridge developer workflows with SRE observability best practices:

- ⚡ **Zero-Touch CI/CD Pipeline**: Accepts GitHub push webhooks and orchestrates automated Docker container builds.
- 🛡️ **Built-in Vulnerability Scanning**: Integrated with **Trivy** to scan containers for CVEs before deployment.
- 🚦 **Manual Approval Gates**: Automatically places high-risk or critical-vulnerability builds on hold for developer review.
- ☸️ **Kubernetes Orchestration**: Automatically deploys and exposes workloads via dynamic Kubernetes services.
- 📊 **Native SRE Metrics**: Tracks **SLI (Service Level Indicators)**, **SLO targets (95%)**, **Error Budgets**, and **Burn Rates** via **Prometheus** and **Grafana**.
- 🎨 **Modern Dashboard UI**: Next.js 15 dashboard for managing connected repositories, viewing build logs, and monitoring uptime.

---

## 🏗️ Architecture & Workflow

```
                        Developer / GitHub
                                │
                        (git push webhook)
                                ▼
               ┌─────────────────────────────────┐
               │  Webhook Receiver (:8000)       │
               │  - HMAC-SHA256 verification     │
               └────────────────┬────────────────┘
                                │ (publishes job)
                                ▼
               ┌─────────────────────────────────┐
               │  Redis Queue (:6379)            │
               └────────────────┬────────────────┘
                                │ (consumes job)
                                ▼
               ┌─────────────────────────────────┐
               │  Build Worker (Background)      │
               │  1. Clone repo (OAuth Token)    │
               │  2. Docker Image Build          │
               │  3. Trivy Security Scan (CVEs)  │
               │  4. Deploy to Kubernetes (k3d)  │
               │  5. Save to PostgreSQL (:5433)  │
               └────────┬───────────────┬────────┘
                        │               │
         ┌──────────────┘               └──────────────┐
         ▼                                             ▼
┌──────────────────────────────┐        ┌──────────────────────────────┐
│  Metrics Exporter (:8001)    │        │  Dashboard Backend (:8002)   │
│  - Queries rolling SLI stats │        │  - GitHub OAuth 2.0          │
│  - Exposes /metrics endpoint │        │  - Project & Repo Management │
└──────────────┬───────────────┘        │  - Security Approval API     │
               │                        └──────────────┬───────────────┘
               ▼                                       │
┌──────────────────────────────┐                       ▼
│  Prometheus (:9090)          │        ┌──────────────────────────────┐
│  - Time-series metric store  │        │  Next.js Frontend (:3000)    │
└──────────────┬───────────────┘        │  - Live Deployment Console   │
               │                        │  - SLO & Error Budget Gauges │
               ▼                        └──────────────────────────────┘
┌──────────────────────────────┐
│  Grafana Dashboard (:3001)   │
│  - SLO health & burn rates   │
└──────────────────────────────┘
```

---

## 📁 Project Directory Structure

```
deploy-platform/
├── docker-compose.yml              # PostgreSQL, Redis, Prometheus, Grafana
├── setup-linux.sh                  # One-command dependency installer
├── start.sh                        # One-command full platform launcher
├── .env.example                    # Environment variable template
├── .gitignore                      # Git exclusion rules
│
├── services/                       # Python microservices
│   ├── webhook-receiver/           # FastAPI webhook listener (Port 8000)
│   ├── build-worker/               # Redis job consumer, Docker & Trivy builder
│   ├── metrics-exporter/           # Prometheus SLI/SLO metrics exporter (Port 8001)
│   └── dashboard-backend/          # Dashboard REST API & GitHub OAuth (Port 8002)
│
├── frontend/                       # Next.js 15 App Router web dashboard (Port 3000)
│   ├── app/                        # Pages: Dashboard, Login, Design Previews
│   ├── components/                 # React UI widgets, charts, and tables
│   └── lib/                        # API clients and TypeScript types
│
├── infra/                          # Monitoring & orchestration configs
│   ├── prometheus/                 # Prometheus config, alerts, and SLI recording rules
│   ├── grafana/                    # Pre-built Grafana dashboards and provisioning
│   ├── alertmanager/               # Alertmanager configuration
│   └── kubernetes/                 # Base Kubernetes manifests
│
├── deploy-platform-chart/          # Production Helm chart for Kubernetes deployment
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
│
└── scripts/                        # Automation & testing utilities
    ├── seed_db.py                  # Seeds mock deployment history into PostgreSQL
    ├── test_webhook.sh             # Sends signed GitHub push webhooks via curl
    ├── trigger_deployment.py       # Interactive CLI to trigger builds
    └── generate_signature.py       # HMAC signature generator
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Backend Services** | Python 3.11+, FastAPI, SQLAlchemy, Redis-py, Uvicorn |
| **Frontend UI** | Next.js 15 (App Router), React 18, TypeScript, Tailwind CSS, Lucide |
| **Data Persistence** | PostgreSQL 15, Redis 7 (In-Memory Queue) |
| **Observability** | Prometheus, Grafana, Alertmanager, custom Metrics Exporter |
| **Security & Scanning**| Trivy (Container CVE scanner), Fernet (Token encryption), HMAC-SHA256 |
| **Orchestration** | Docker, Docker Compose, Kubernetes / k3d, Helm |

---

## 📋 Prerequisites

Ensure your system has the following tools installed:

1. **Docker & Docker Compose**: `docker --version` (v20+)
2. **Python 3.10+**: `python3 --version`
3. **Node.js 18+ & npm**: `node --version` and `npm --version`
4. *(Optional)* **k3d / Kubernetes CLI (`kubectl`)**: For local Kubernetes deployments.
5. *(Optional)* **Trivy**: For local vulnerability scanning CLI (`trivy --version`).

---

## 🚀 Quick Start (One Command)

### 1. Setup Dependencies
Run the automated setup script to configure Python virtual environments, install npm packages, and generate default environment configs:

```bash
./setup-linux.sh
```

### 2. Start the Entire Platform
Launch the Docker infrastructure and all 5 platform microservices with a single command:

```bash
./start.sh
```

Once running, access the dashboard at:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🖥️ Step-by-Step Manual Startup

If you prefer running services in separate terminals (ideal for live demonstrations and debugging):

### Terminal 1: Infrastructure
```bash
docker compose up -d
```
*Starts PostgreSQL (`:5433`), Redis (`:6379`), Prometheus (`:9090`), and Grafana (`:3001`).*

### Terminal 2: Webhook Receiver
```bash
cd services/webhook-receiver
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### Terminal 3: Build Worker
```bash
cd services/build-worker
source venv/bin/activate
python -m app.main
```

### Terminal 4: Metrics Exporter
```bash
cd services/metrics-exporter
source venv/bin/activate
uvicorn app.main:app --reload --port 8001
```

### Terminal 5: Dashboard Backend API
```bash
cd services/dashboard-backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8002
```

### Terminal 6: Next.js Frontend
```bash
cd frontend
npm run dev
```

---

## 🧪 Simulating & Testing Deployments

### 1. Seed Demo Data (Instant UI & Grafana Graphs)
To populate historical deployments, project records, and mock users without waiting for real builds:

```bash
python3 scripts/seed_db.py
```

### 2. Trigger an Automated Webhook Build
Simulate a real GitHub push event with a cryptographic HMAC signature:

```bash
./scripts/test_webhook.sh encryptionspidy/LogVision
```

Or run the interactive Python helper:

```bash
python3 scripts/trigger_deployment.py
```

---

## 📊 SRE Metrics & SLO Tracking

The platform natively computes Service Level Objectives based on Google SRE principles:

- **SLI (Service Level Indicator)**: Percentage of successful deployments over a rolling 1-hour time window:
  $$\text{SLI} = \left( \frac{\text{Successful Deployments}}{\text{Total Deployments}} \right) \times 100$$
- **SLO Target**: Default configured to **95.0%**.
- **Error Budget Remaining**: Allowed failure allowance before breaching the objective.
- **Burn Rate**: Speed at which the error budget is being depleted ($> 1.0$ indicates dangerous burn).

Access the live metrics dashboard:
- **Grafana**: [http://localhost:3001](http://localhost:3001) *(Login: `admin` / `admin`)*
- **Prometheus Targets**: [http://localhost:9090/targets](http://localhost:9090/targets)

---

## 🔒 Security Scanning & Approval Workflow

1. When a build job arrives, **Build Worker** builds the container and runs **Trivy**.
2. If `critical_vulns > 0`:
   - Deployment status is marked as **`pending_approval`**.
   - The workload is **held** from being deployed to Kubernetes.
   - The user receives an action prompt on the Dashboard UI.
3. Developers can review the CVE count and click **Approve** (accept risk and deploy) or **Reject** (abort build).

---

## ☸️ Kubernetes & Helm Deployment

To deploy Deploy Platform itself onto a Kubernetes cluster using the bundled Helm chart:

```bash
# Verify the chart
helm lint ./deploy-platform-chart

# Install or upgrade on Kubernetes
helm upgrade --install deploy-platform ./deploy-platform-chart \
  --namespace deploy-platform \
  --create-namespace \
  --values ./deploy-platform-chart/values.yaml
```

---

## 🌐 Service Port & URL Directory

| Service | Address | Description |
|---|---|---|
| **Frontend Dashboard** | `http://localhost:3000` | Web UI Console |
| **Dashboard API** | `http://localhost:8002` | REST API (Swagger docs: `/docs`) |
| **Webhook Receiver** | `http://localhost:8000` | GitHub Webhook Ingestion Point |
| **Metrics Exporter** | `http://localhost:8001/metrics` | Prometheus Scrape Endpoint |
| **Prometheus UI** | `http://localhost:9090` | Time-Series Metrics Explorer |
| **Grafana UI** | `http://localhost:3001` | SRE Dashboards (`admin`/`admin`) |
| **PostgreSQL DB** | `localhost:5433` | User: `devops`, DB: `deploy_platform` |
| **Redis Queue** | `localhost:6379` | Queue Name: `build_jobs` |

---

## ❓ Troubleshooting & FAQ

#### 1. Port Collision on Port 5432
> **Fix**: Deploy Platform binds PostgreSQL to host port `5433` to prevent conflicts with standard local Postgres installations.

#### 2. Webhook Signature Verification Fails (HTTP 401)
> **Fix**: Verify that `GITHUB_WEBHOOK_SECRET` in `services/webhook-receiver/.env` matches the secret used in GitHub or `scripts/test_webhook.sh` (default: `my-permanent-secret-123`).

#### 3. Resetting the Local Database
```bash
docker compose down -v
docker compose up -d
python3 scripts/seed_db.py
```

---

## 📄 License
MIT License. Built for seamless team onboarding and automated continuous delivery.