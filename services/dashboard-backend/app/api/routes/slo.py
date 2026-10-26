from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timedelta
import httpx
import os
from dotenv import load_dotenv
from app.db.models import SessionLocal, Project, Deployment
from app.core.deps import get_current_user_with_token

load_dotenv()

router = APIRouter()

PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://localhost:9090")
SLO_TARGET = 95.0


async def query_prometheus(promql_query: str):
    """Runs a PromQL query against Prometheus HTTP API. Returns float or None."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{PROMETHEUS_URL}/api/v1/query",
                params={"query": promql_query},
                timeout=5.0,
            )
            data = response.json()

        result = data.get("data", {}).get("result", [])
        if not result:
            return None
        return float(result[0]["value"][1])
    except Exception:
        return None


def compute_slo_from_postgres():
    """
    Fallback: compute 1-hour rolling SLI/SLO/error-budget directly from PostgreSQL
    when Prometheus is empty or unreachable. Eliminates the N/A display bug.
    """
    db = SessionLocal()
    try:
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        deployments = db.query(Deployment).filter(
            Deployment.started_at > one_hour_ago
        ).all()

        total = len(deployments)
        if total == 0:
            return None, SLO_TARGET, None, None

        successful = len([d for d in deployments if d.status == "success"])
        sli = round((successful / total) * 100, 2)
        error_budget = round(sli - SLO_TARGET, 2)
        burn_rate = round((1 - sli / 100) / (1 - SLO_TARGET / 100), 2)
        return sli, SLO_TARGET, error_budget, burn_rate
    finally:
        db.close()


@router.get("/slo")
async def get_slo_status():
    """
    Returns platform-wide live SLI, SLO target, error budget, and burn rate.
    Queries Prometheus first; automatically falls back to PostgreSQL rolling
    window if Prometheus returns empty data or is unreachable.
    """
    sli = await query_prometheus("sli:deployment_success_rate:current")
    slo_target = await query_prometheus("slo:deployment_success_rate:target")
    error_budget = await query_prometheus("slo:error_budget:remaining_percent")
    burn_rate = await query_prometheus("slo:error_budget_burn_rate:1h")

    # Fallback to PostgreSQL if Prometheus has no data
    if sli is None:
        sli, slo_target_pg, error_budget, burn_rate = compute_slo_from_postgres()
        if slo_target is None:
            slo_target = slo_target_pg

    return {
        "sli_current_percent": sli,
        "slo_target_percent": slo_target if slo_target is not None else SLO_TARGET,
        "error_budget_remaining_percent": error_budget,
        "burn_rate": burn_rate,
    }


@router.get("/slo/{project_id}")
def get_project_slo(project_id: int, request: Request):
    """
    Calculates SLI/SLO/Error Budget for ONE specific project.
    Requires authentication and validates the project belongs to the requesting user.
    """
    # Enforce authentication
    auth_data = get_current_user_with_token(request)
    current_user = auth_data["user"]

    db = SessionLocal()
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # Enforce authorization — users can only see their own project SLOs
        if project.user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Not authorized to view this project's SLO metrics",
            )

        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        deployments = db.query(Deployment).filter(
            Deployment.repo == project.repo_full_name,
            Deployment.started_at > one_hour_ago,
        ).all()

        total = len(deployments)
        successful = len([d for d in deployments if d.status == "success"])
        sli = round((successful / total) * 100, 2) if total > 0 else None

        error_budget = round(sli - SLO_TARGET, 2) if sli is not None else None
        burn_rate = (
            round(((1 - sli / 100) / (1 - SLO_TARGET / 100)), 2)
            if sli is not None
            else None
        )

        return {
            "project_id": project_id,
            "repo": project.repo_full_name,
            "sli_current_percent": sli,
            "slo_target_percent": SLO_TARGET,
            "error_budget_remaining_percent": error_budget,
            "burn_rate": burn_rate,
            "sample_size": total,
        }
    finally:
        db.close()
