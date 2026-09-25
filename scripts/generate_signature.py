import hmac
import hashlib

secret = "my-test-secret"  # must match GITHUB_WEBHOOK_SECRET exactly
payload = '{"repo": "test-repo", "commit": "abc123"}'

signature = "sha256=" + hmac.new(
    key=secret.encode("utf-8"),
    msg=payload.encode("utf-8"),
    digestmod=hashlib.sha256
).hexdigest()

print(signature)