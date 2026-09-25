from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
import httpx
from app.db.models import SessionLocal, Project, Deployment

router = APIRouter()

PROMETHEUS_URL = "http://localhost:9090"


async def query_prometheus(promql_query: str):
    """Runs a single PromQL query against Prometheus's HTTP API and returns the value."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{PROMETHEUS_URL}/api/v1/query",
                params={"query": promql_query},
                timeout=5.0
            )
            data = response.json()

        result = data.get("data", {}).get("result", [])
        if not result:
            return None
        return float(result[0]["value"][1])
    except Exception:
        return None


@router.get("/slo")
async def get_slo_status():
    """
    Returns platform-wide live SLI, SLO target, error budget, and burn rate.
    """
    sli = await query_prometheus("sli:deployment_success_rate:current")
    slo_target = await query_prometheus("slo:deployment_success_rate:target")
    error_budget = await query_prometheus("slo:error_budget:remaining_percent")
    burn_rate = await query_prometheus("slo:error_budget_burn_rate:1h")

    return {
        "sli_current_percent": sli,
        "slo_target_percent": slo_target if slo_target is not None else 95.0,
        "error_budget_remaining_percent": error_budget,
        "burn_rate": burn_rate,
    }


@router.get("/slo/{project_id}")
def get_project_slo(project_id: int):
    """
    Calculates SLI/SLO/Error Budget for ONE specific project,
    using a rolling window of that project's own deployment history.
    """
    db = SessionLocal()
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        deployments = db.query(Deployment).filter(
            Deployment.repo == project.repo_full_name,
            Deployment.started_at > one_hour_ago
        ).all()

        total = len(deployments)
        successful = len([d for d in deployments if d.status == "success"])
        sli = round((successful / total) * 100, 2) if total > 0 else None

        SLO_TARGET = 95.0
        error_budget = round(sli - SLO_TARGET, 2) if sli is not None else None
        burn_rate = round(((1 - sli / 100) / (1 - SLO_TARGET / 100)), 2) if sli is not None else None

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