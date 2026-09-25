#!/usr/bin/env python3
# ==============================================================================
# scripts/trigger_deployment.py — Interactive / Scriptable Deployment Trigger
# ==============================================================================
"""
Usage:
    python scripts/trigger_deployment.py [repo] [commit]

Interactive mode:
    python scripts/trigger_deployment.py
"""

import sys
import os
import time
import secrets
import hashlib
import hmac
import json
import requests

DEFAULT_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET", "my-permanent-secret-123")
DEFAULT_URL = os.getenv("WEBHOOK_RECEIVER_URL", "http://localhost:8000/webhook/github")


def generate_sha():
    return hashlib.sha1(f"commit-{time.time()}-{secrets.token_hex(4)}".encode()).hexdigest()


def send_webhook(repo: str, commit: str, secret: str = DEFAULT_SECRET, url: str = DEFAULT_URL):
    payload = json.dumps({
        "repository": {"full_name": repo},
        "head_commit": {"id": commit}
    })

    signature = "sha256=" + hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    headers = {
        "Content-Type": "application/json",
        "X-Hub-Signature-256": signature
    }

    print(f"\n🚀 Sending webhook for '{repo}' (commit: {commit[:7]})...")
    try:
        res = requests.post(url, data=payload, headers=headers, timeout=10)
        if res.status_code == 200:
            print(f"✅ Webhook Accepted [HTTP 200]: {res.json()}")
            print(f"👀 Watch build worker terminal or refresh Dashboard at http://localhost:3000/dashboard\n")
        else:
            print(f"⚠️ Webhook Response [{res.status_code}]: {res.text}\n")
    except Exception as e:
        print(f"❌ Failed to reach Webhook Receiver at {url}: {e}\n")


def main():
    if len(sys.argv) >= 2:
        repo = sys.argv[1]
        commit = sys.argv[2] if len(sys.argv) >= 3 else generate_sha()
    else:
        print("=" * 60)
        print("🛠️  Deploy Platform — Webhook Trigger Utility")
        print("=" * 60)
        print("Presets:")
        print("  1) encryptionspidy/LogVision")
        print("  2) encryptionspidy/IMAP-Email-Server")
        print("  3) Custom repository")
        choice = input("\nSelect preset [1-3, default=1]: ").strip() or "1"

        if choice == "1":
            repo = "encryptionspidy/LogVision"
        elif choice == "2":
            repo = "encryptionspidy/IMAP-Email-Server"
        else:
            repo = input("Enter repo full name (owner/name): ").strip()

        commit_input = input("Enter commit SHA (leave blank for random): ").strip()
        commit = commit_input if commit_input else generate_sha()

    send_webhook(repo, commit)


if __name__ == "__main__":
    main()
