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
echo "=== [4/4] Ensuring .env Configuration Files Exist ==="
if [ ! -f "services/dashboard-backend/.env" ]; then
    cat <<EOF > services/dashboard-backend/.env
# Copy from ../../.env.example and fill in real values
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
SESSION_SECRET=change_me_to_a_long_random_string_in_production
ENCRYPTION_KEY=generate_with_python3_-c_from_cryptography_import_Fernet_print_Fernet_generate_key_decode
WEBHOOK_TARGET_URL=http://localhost:8000/webhook/github
GITHUB_WEBHOOK_SECRET=change_me_to_a_random_secret
DATABASE_URL=postgresql://devops:devops123@localhost:5433/deploy_platform
REDIS_HOST=localhost
REDIS_PORT=6379
PROMETHEUS_URL=http://localhost:9090
ENABLE_DEMO_LOGIN=false
EOF
    echo "   -> Created services/dashboard-backend/.env (fill in real secrets before running)"
fi

if [ ! -f "services/build-worker/.env" ]; then
    cat <<EOF > services/build-worker/.env
ENCRYPTION_KEY=must_match_dashboard_backend_ENCRYPTION_KEY
DATABASE_URL=postgresql://devops:devops123@localhost:5433/deploy_platform
REDIS_HOST=localhost
REDIS_PORT=6379
EOF
    echo "   -> Created services/build-worker/.env (fill in real ENCRYPTION_KEY)"
fi

if [ ! -f "services/webhook-receiver/.env" ]; then
    cat <<EOF > services/webhook-receiver/.env
GITHUB_WEBHOOK_SECRET=change_me_to_match_webhook_secret
REDIS_HOST=localhost
REDIS_PORT=6379
EOF
    echo "   -> Created services/webhook-receiver/.env (fill in GITHUB_WEBHOOK_SECRET)"
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
