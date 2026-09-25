#!/usr/bin/env bash
# ==============================================================================
# start.sh — One-command startup for the entire Deploy Platform
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

cleanup() {
    echo ""
    echo "🛑 Shutting down background microservices..."
    kill $PID_WEBHOOK $PID_EXPORTER $PID_BACKEND $PID_WORKER $PID_FRONTEND 2>/dev/null || true
    echo "✅ Background services stopped."
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Check if venvs exist; if not, prompt to run setup-linux.sh
if [ ! -d "services/webhook-receiver/venv" ] || [ ! -d "services/build-worker/venv" ]; then
    echo "⚠️ Virtual environments not detected. Running initial setup..."
    ./setup-linux.sh
fi

echo "======================================================================"
echo "🚀 [1/3] Starting Docker Infrastructure (Postgres, Redis, Prometheus, Grafana)..."
echo "======================================================================"
docker compose up -d

echo "⏳ Waiting for PostgreSQL and Redis to be ready..."
sleep 6

echo ""
echo "======================================================================"
echo "🚀 [2/3] Launching Backend Microservices..."
echo "======================================================================"

# 1. Webhook Receiver (Port 8000)
(cd services/webhook-receiver && ./venv/bin/uvicorn app.main:app --port 8000) &
PID_WEBHOOK=$!
echo "   -> [Port 8000] Webhook Receiver started (PID: $PID_WEBHOOK)"

# 2. Metrics Exporter (Port 8001)
(cd services/metrics-exporter && ./venv/bin/uvicorn app.main:app --port 8001) &
PID_EXPORTER=$!
echo "   -> [Port 8001] Metrics Exporter started (PID: $PID_EXPORTER)"

# 3. Dashboard Backend API (Port 8002)
(cd services/dashboard-backend && ./venv/bin/uvicorn app.main:app --port 8002) &
PID_BACKEND=$!
echo "   -> [Port 8002] Dashboard Backend API started (PID: $PID_BACKEND)"

# 4. Build Worker (Redis queue consumer)
(cd services/build-worker && ./venv/bin/python -m app.main) &
PID_WORKER=$!
echo "   -> [Background] Build Worker consumer started (PID: $PID_WORKER)"

echo ""
echo "======================================================================"
echo "🚀 [3/3] Starting Next.js Frontend Dashboard (Port 3000)..."
echo "======================================================================"
(cd frontend && npm run dev) &
PID_FRONTEND=$!

echo ""
echo "======================================================================"
echo "✨ ALL DEPLOY PLATFORM SERVICES RUNNING ✨"
echo "======================================================================"
echo "🖥️  Frontend Dashboard UI:  http://localhost:3000"
echo "🔌 Dashboard API & Docs:   http://localhost:8002 (Swagger: /docs)"
echo "🪝 Webhook Receiver:       http://localhost:8000"
echo "📊 Metrics Exporter:       http://localhost:8001/metrics"
echo "📈 Prometheus Server:      http://localhost:9090"
echo "📉 Grafana Dashboards:     http://localhost:3001 (admin/admin)"
echo "🐘 PostgreSQL DB:          localhost:5433 (user: devops, db: deploy_platform)"
echo "⚡ Redis Queue:            localhost:6379"
echo "======================================================================"
echo "💡 Tip: To seed demo data run: python3 scripts/seed_db.py"
echo "💡 Tip: To test webhooks run:   ./scripts/test_webhook.sh"
echo "======================================================================"
echo "Press [Ctrl + C] anytime to stop all services."
echo ""

wait
