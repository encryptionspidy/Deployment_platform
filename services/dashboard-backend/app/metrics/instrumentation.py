"""
Prometheus metrics instrumentation for the dashboard-backend service.
Wired via middleware in main.py.
"""
from prometheus_client import Counter, Histogram

# ── Request Metrics ───────────────────────────────────────────────────────────

http_requests_total = Counter(
    "http_requests_total",
    "Total HTTP requests received by the dashboard-backend",
    ["method", "endpoint", "status_code"],
)

http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency for the dashboard-backend",
    ["method", "endpoint"],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5],
)

http_errors_total = Counter(
    "http_errors_total",
    "Total HTTP 4xx and 5xx error responses from the dashboard-backend",
    ["method", "endpoint", "status_code"],
)

# ── Business Metrics ─────────────────────────────────────────────────────────

deployments_approved_total = Counter(
    "deployments_approved_total",
    "Total deployments approved via the manual approval gate",
)

deployments_rejected_total = Counter(
    "deployments_rejected_total",
    "Total deployments rejected at the security review gate",
)

projects_connected_total = Counter(
    "projects_connected_total",
    "Total GitHub repositories connected via the projects API",
)
