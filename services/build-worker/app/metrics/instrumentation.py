"""
Prometheus metrics instrumentation for the build-worker service.
Import and use these metrics in consumer.py / process_job().
"""
from prometheus_client import Counter, Gauge, Histogram

# ── Gauge ────────────────────────────────────────────────────────────────────

build_jobs_active = Gauge(
    "build_jobs_active",
    "Number of build jobs currently being processed",
)

# ── Counters ─────────────────────────────────────────────────────────────────

build_jobs_total = Counter(
    "build_jobs_total",
    "Total build jobs processed, labelled by outcome",
    ["status"],  # labels: 'success', 'failed', 'pending_approval', 'timeout'
)

build_jobs_dlq_total = Counter(
    "build_jobs_dlq_total",
    "Total build jobs moved to the Dead-Letter Queue",
)

build_retries_total = Counter(
    "build_retries_total",
    "Total number of build job retry attempts",
)

# ── Histograms ───────────────────────────────────────────────────────────────

build_duration_seconds = Histogram(
    "build_duration_seconds",
    "End-to-end wall-clock time for a build job from queue pop to completion",
    buckets=[10, 30, 60, 120, 180, 240, 300, 600],
)

docker_build_duration_seconds = Histogram(
    "docker_build_duration_seconds",
    "Time spent specifically in docker image build (excludes clone/scan/deploy)",
    buckets=[5, 10, 30, 60, 120, 180, 300],
)
