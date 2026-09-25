import hmac
import hashlib


def verify_signature(payload_body: bytes,signature_header: str,secret:str) -> bool:
    """
    Verifies that the payload was signed by GitHub using the shared secret.
    GitHub sends the signature in the 'X-Hub-Signature-256' header as: sha256=<hash>
    """

    if not signature_header:
        return False
    
    expected_signature = "sha256=" + hmac.new(
        key = secret.encode("utf-8"),
        msg = payload_body,
        digestmod=hashlib.sha256
    ).hexdigest()


    return hmac.compare_digest(expected_signature,signature_header)