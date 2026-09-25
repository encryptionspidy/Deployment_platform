#!/usr/bin/env bash
# ==============================================================================
# setup-linux.sh — Automated Setup for Deploy Platform on Linux / macOS / WSL
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "======================================================================"
echo "🚀 Deploy Platform — Setup & Dependency Installation"
echo "======================================================================"

echo ""
echo "=== [1/4] Checking System Prerequisites ==="
command -v docker >/dev/null 2>&1 || { echo "❌ Docker not found. Please install Docker & Docker Compose."; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3 not found. Please install Python 3.10+."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found. Please install Node.js 18+ and npm."; exit 1; }

echo "✅ Docker, Python3 ($(python3 --version)), and Node.js ($(node --version)) detected."

echo ""
echo "=== [2/4] Setting up Python Virtual Environments for Microservices ==="
services=("webhook-receiver" "build-worker" "dashboard-backend" "metrics-exporter")

for svc in "${services[@]}"; do
    echo "📦 Configuring services/$svc..."
    if [ ! -d "services/$svc/venv" ]; then
        python3 -m venv "services/$svc/venv"
    fi
    services/$svc/venv/bin/pip install --upgrade pip --quiet
    if [ -f "services/$svc/requirements.txt" ]; then
        services/$svc/venv/bin/pip install -r "services/$svc/requirements.txt" --quiet
    fi
    echo "   -> services/$svc dependencies ready."
done

echo ""
echo "=== [3/4] Installing Next.js Frontend Dependencies ==="
if [ -d "frontend" ]; then
    echo "📦 Running npm install in frontend/..."
    (cd frontend && npm install --quiet)
    echo "   -> frontend dependencies ready."
fi

echo ""
echo "=== [4/4] Ensuring Default .env Configuration Files Exist ==="
if [ ! -f "services/dashboard-backend/.env" ]; then
    cat <<EOF > services/dashboard-backend/.env
GITHUB_CLIENT_ID=Ov23li6NUg4LHq6HoYFk
GITHUB_CLIENT_SECRET=f874f23cb2610dd6052033f48e684c34c8dba9cf
SESSION_SECRET=deploy_platform_secure_session_secret_998877
ENCRYPTION_KEY=JvPPQta6LlI-6UymvHBhQdqNM8N3yIIeo0F9T_6_vIo=
WEBHOOK_TARGET_URL=http://localhost:8000/webhook/github
GITHUB_WEBHOOK_SECRET=my-permanent-secret-123
DATABASE_URL=postgresql://devops:devops123@localhost:5433/deploy_platform
EOF
    echo "   -> Created services/dashboard-backend/.env"
fi

if [ ! -f "services/build-worker/.env" ]; then
    cat <<EOF > services/build-worker/.env
ENCRYPTION_KEY=JvPPQta6LlI-6UymvHBhQdqNM8N3yIIeo0F9T_6_vIo=
DATABASE_URL=postgresql://devops:devops123@localhost:5433/deploy_platform
EOF
    echo "   -> Created services/build-worker/.env"
fi

if [ ! -f "services/webhook-receiver/.env" ]; then
    cat <<EOF > services/webhook-receiver/.env
GITHUB_WEBHOOK_SECRET=my-permanent-secret-123
EOF
    echo "   -> Created services/webhook-receiver/.env"
fi

if [ ! -f "services/metrics-exporter/.env" ]; then
    cat <<EOF > services/metrics-exporter/.env
DATABASE_URL=postgresql://devops:devops123@localhost:5433/deploy_platform
EOF
    echo "   -> Created services/metrics-exporter/.env"
fi

chmod +x start.sh setup-linux.sh scripts/*.sh scripts/*.py 2>/dev/null || true

echo ""
echo "======================================================================"
echo "🎉 Setup complete! You can now launch the platform with:"
echo "   ./start.sh"
echo "======================================================================"
