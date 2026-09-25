import redis
import json

# Connects to Redis running on localhost:6379 (matches our docker run command)
redis_client = redis.Redis(host="localhost", port=6379, db=0)

QUEUE_NAME = "build_jobs"

def publish_build_job(repo_name: str, commit_sha: str):
    """
    Pushes a small job onto the Redis list (acting as a simple queue).
    The build-worker service will later pop jobs off this same list.
    """
    job = {
        "repo": repo_name,
        "commit": commit_sha
    }
    redis_client.rpush(QUEUE_NAME, json.dumps(job))
    print(f"Published job to queue: {job}")