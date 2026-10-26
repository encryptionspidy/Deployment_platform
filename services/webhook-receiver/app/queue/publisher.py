import redis
import json
from app.core.config import settings

redis_client = redis.Redis(host=settings.REDIS_HOST, port=settings.REDIS_PORT, db=0)

QUEUE_NAME = "build_jobs"


def publish_build_job(repo_name: str, commit_sha: str):
    """
    Pushes a build job onto the Redis queue.
    The build-worker service will pop jobs off this same list.
    """
    job = {
        "repo": repo_name,
        "commit": commit_sha
    }
    redis_client.rpush(QUEUE_NAME, json.dumps(job))
    # Log only repo/commit prefix - never log secrets or tokens
    print(f"Published job to queue: repo={repo_name} commit={commit_sha[:7]}")
