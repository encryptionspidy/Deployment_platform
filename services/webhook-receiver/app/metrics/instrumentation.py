"""
Prometheus metrics instrumentation for the webhook-receiver service.
Import and use these metrics in the route handlers.
"""
from prometheus_client import Counter, Histogram

# ── Counters ────────────────────────────────────────────────────────────────

webhooks_received_total = Counter(
    "webhooks_received_total",
    "Total number of GitHub webhook POST requests received",
    ["event_type"],  # label: 'push', 'ping', 'unknown'
)

webhooks_invalid_signature_total = Counter(
    "webhooks_invalid_signature_total",
    "Total number of webhook requests rejected due to invalid HMAC signature",
)

webhooks_processed_total = Counter(
    "webhooks_processed_total",
    "Total number of webhooks that were successfully queued for build",
    ["repo"],
)

# ── Histograms ───────────────────────────────────────────────────────────────

webhook_processing_duration_seconds = Histogram(
    "webhook_processing_duration_seconds",
    "Time spent processing (verifying + queuing) a webhook request",
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0],
)
