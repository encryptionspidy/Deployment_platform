import os
import shutil
import subprocess
import json

TRIVY_PATH = shutil.which("trivy") or ("C:\\trivy\\trivy.exe" if os.path.exists("C:\\trivy\\trivy.exe") else "trivy")


def scan_image(image_tag: str) -> dict:
    """
    Runs a Trivy vulnerability scan against the built image and returns
    a summary: counts per severity, plus the full JSON report for storage.
    """
    print(f"Scanning image for vulnerabilities: {image_tag}")
    result = subprocess.run(
        [TRIVY_PATH, "image", "--format", "json", "--quiet", image_tag],
        capture_output=True,
        text=True,
        timeout=300
    )

    if result.returncode != 0:
        print(f"Trivy scan failed: {result.stderr}")
        return {"critical": 0, "high": 0, "medium": 0, "low": 0, "error": result.stderr}

    try:
        report = json.loads(result.stdout)
    except json.JSONDecodeError:
        return {"critical": 0, "high": 0, "medium": 0, "low": 0, "error": "Failed to parse Trivy output"}

    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for target in report.get("Results", []):
        for vuln in target.get("Vulnerabilities", []):
            severity = vuln.get("Severity", "").lower()
            if severity in counts:
                counts[severity] += 1

    print(f"Scan complete: {counts}")
    return counts