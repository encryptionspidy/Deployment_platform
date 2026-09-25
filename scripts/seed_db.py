#!/usr/bin/env bash
# ==============================================================================
# scripts/seed_db.py — Seed demo data into PostgreSQL for Deploy Platform
# ==============================================================================
"""
Usage:
    python scripts/seed_db.py

Populates mock users, connected repositories, and deployment histories across
the last several hours. This allows instantaneous visualization of the Next.js
dashboard, SLI/SLO metrics, and Grafana graphs without waiting for real webhooks.
"""

import sys
import os
from datetime import datetime, timedelta
import random

# Add services/dashboard-backend to sys.path so we can import models
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "services", "dashboard-backend")))

try:
    from app.db.models import SessionLocal, init_db, User, UserCredential, Project, Deployment
    from app.core.crypto import encrypt_token
except ImportError as e:
    print(f"❌ Failed to import models: {e}")
    print("Ensure dependencies are installed: cd services/dashboard-backend && pip install -r requirements.txt")
    sys.exit(1)


def seed():
    print("🌱 Initializing database schema...")
    init_db()
    db = SessionLocal()

    try:
        # 1. Create or retrieve demo user
        user = db.query(User).filter(User.github_username == "encryptionspidy").first()
        if not user:
            user = User(
                github_id=98765432,
                github_username="encryptionspidy",
                created_at=datetime.utcnow() - timedelta(days=7),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"✅ Created User: {user.github_username} (ID: {user.id})")
        else:
            print(f"ℹ️ User {user.github_username} already exists (ID: {user.id})")

        # 2. Add User Credential
        cred = db.query(UserCredential).filter(UserCredential.user_id == user.id).first()
        if not cred:
            cred = UserCredential(
                user_id=user.id,
                encrypted_access_token=encrypt_token("ghp_mock_token_for_local_demo_testing_12345"),
                created_at=datetime.utcnow() - timedelta(days=7),
            )
            db.add(cred)
            db.commit()
            print("✅ Added encrypted mock GitHub credentials")

        # 3. Add Demo Projects
        demo_repos = [
            "encryptionspidy/LogVision",
            "encryptionspidy/IMAP-Email-Server",
            "encryptionspidy/demo-webapp",
        ]

        for repo_name in demo_repos:
            project = db.query(Project).filter(Project.user_id == user.id, Project.repo_full_name == repo_name).first()
            if not project:
                project = Project(
                    user_id=user.id,
                    repo_full_name=repo_name,
                    github_webhook_id=random.randint(100000, 999999),
                    created_at=datetime.utcnow() - timedelta(days=3),
                )
                db.add(project)
                db.commit()
                print(f"✅ Registered Project: {repo_name}")

        # 4. Add Historical Deployments for SLO / Grafana charts
        statuses = ["success", "success", "success", "success", "failed", "pending_approval"]
        print("🚀 Generating historical deployment records...")

        now = datetime.utcnow()
        for i in range(25):
            minutes_ago = random.randint(5, 360)
            started_at = now - timedelta(minutes=minutes_ago)
            duration_secs = random.randint(45, 180)
            finished_at = started_at + timedelta(seconds=duration_secs)

            repo = random.choice(demo_repos)
            commit_sha = "".join(random.choices("0123456789abcdef", k=40))
            status = random.choice(statuses)

            critical_vulns = 0
            high_vulns = random.randint(0, 3)

            if status == "pending_approval":
                critical_vulns = random.randint(1, 4)
                live_url = None
            elif status == "success":
                live_url = f"http://localhost:{random.randint(30040, 30090)}"
            else:
                live_url = None

            deployment = Deployment(
                repo=repo,
                commit_sha=commit_sha,
                status=status,
                image_tag=f"{repo.replace('/', '-').lower()}:{commit_sha[:7]}",
                logs=f"Simulated build and deploy logs for {repo} at commit {commit_sha[:7]}...",
                live_url=live_url,
                critical_vulns=critical_vulns,
                high_vulns=high_vulns,
                started_at=started_at,
                finished_at=finished_at,
            )
            db.add(deployment)

        db.commit()
        total_deployments = db.query(Deployment).count()
        print(f"🎉 Database successfully seeded! Total deployments in DB: {total_deployments}")

    except Exception as err:
        db.rollback()
        print(f"❌ Error during seeding: {err}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
