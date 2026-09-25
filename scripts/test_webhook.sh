#!/usr/bin/env bash
# ==============================================================================
# scripts/test_webhook.sh — Simulate a GitHub Push Webhook Request
# ==============================================================================
# Usage:
#   ./scripts/test_webhook.sh [repo_name] [commit_sha]
# Examples:
#   ./scripts/test_webhook.sh
#   ./scripts/test_webhook.sh encryptionspidy/LogVision 5a13839bfa095be040cbd2b7dbd89459f8a8ad58
#   ./scripts/test_webhook.sh encryptionspidy/IMAP-Email-Server auto
# ==============================================================================

set -e

REPO="${1:-encryptionspidy/LogVision}"
COMMIT="${2:-auto}"
SECRET="${GITHUB_WEBHOOK_SECRET:-my-permanent-secret-123}"
TARGET_URL="${WEBHOOK_RECEIVER_URL:-http://localhost:8000/webhook/github}"

# Generate random SHA if 'auto' or omitted
if [ "$COMMIT" = "auto" ] || [ -z "$COMMIT" ]; then
    COMMIT=$(head -c 20 /dev/urandom | sha1sum | awk '{print $1}')
fi

PAYLOAD=$(cat <<EOF
{
  "repository": {
    "full_name": "$REPO"
  },
  "head_commit": {
    "id": "$COMMIT"
  }
}
EOF
)

# Calculate HMAC-SHA256 signature
SIG="sha256=$(printf '%s' "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')"

echo "📡 Sending simulated GitHub push webhook..."
echo "   -> Target URL:  $TARGET_URL"
echo "   -> Repository:  $REPO"
echo "   -> Commit SHA:  $COMMIT"
echo "   -> Signature:   $SIG"
echo ""

HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$TARGET_URL" \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: $SIG" \
  -d "$PAYLOAD")

BODY=$(echo "$HTTP_RESPONSE" | sed '$d')
STATUS=$(echo "$HTTP_RESPONSE" | tail -n 1)

if [ "$STATUS" -ge 200 ] && [ "$STATUS" -lt 300 ]; then
    echo "✅ Success! HTTP $STATUS: $BODY"
    echo "Check build-worker logs to watch the build and deployment progress."
else
    echo "❌ Failed! HTTP $STATUS: $BODY"
    exit 1
fi
