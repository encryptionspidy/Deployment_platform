from fastapi import FastAPI, Request, HTTPException
from app.core.security import verify_signature
from app.core.config import settings
from app.queue.publisher import publish_build_job


app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello from webhook-receiver"}

@app.post("/webhook/github")
async def github_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256")

    if not verify_signature(body, signature, settings.GITHUB_WEBHOOK_SECRET):
        raise HTTPException(status_code=401, detail="Invalid signature")

    payload = await request.json()

    # GitHub's ping event has no 'repository'/'head_commit' the same way push does
    if "head_commit" in payload:
        repo_name = payload["repository"]["full_name"]
        commit_sha = payload["head_commit"]["id"]
        publish_build_job(repo_name, commit_sha)
    else:
        print("Received non-push event (likely a ping) — skipping queue publish")

    return {"status": "received"}
