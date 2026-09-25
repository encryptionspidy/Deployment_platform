import redis
import json
import time

redis_client = redis.Redis(host="localhost", port=6379, db=0)
QUEUE_NAME = "build_jobs"

def consume_jobs():
    """
    Continuously waits for jobs on the build_jobs queue and processes them
    one at a time. blpop blocks until a job is available (efficient — no
    busy-waiting/polling).
    """
    print("Build worker started. Waiting for jobs...")
    while True:
        # blpop pops from the LEFT end, blocking until something is available
        # timeout=0 means wait forever
        result = redis_client.blpop(QUEUE_NAME, timeout=0)
        _, raw_job = result  # blpop returns (queue_name, value)

        try:
            job = json.loads(raw_job)
            print(f"Picked up job: {job}")
            process_job(job)
        except json.JSONDecodeError:
            print(f"Skipping non-JSON item in queue: {raw_job}")

def process_job(job: dict):
    """
    Placeholder for now — will later trigger an actual docker build + deploy.
    """
    repo = job.get("repo")
    commit = job.get("commit")
    print(f"Would now build repo '{repo}' at commit '{commit}'")
    # Simulate some work happening
    time.sleep(2)
    print(f"Finished processing job for '{repo}'")