import os
import re
import shutil
import tempfile
import threading
import docker
import git
from app.core.config import settings

docker_client = docker.from_env()


def _sanitize_url(text: str) -> str:
    """Strip credentials from URLs to prevent token leakage in logs and error traces."""
    return re.sub(r"https?://[^@\s]+@", "https://", str(text))


def clone_and_build(repo_full_name: str, commit_sha: str, access_token: str = None) -> dict:
    """
    Clones the given repo at the given commit, then runs `docker build`.
    - Uses OAuth token for private repos (token is never logged).
    - Enforces a configurable build timeout (default 5 minutes).
    - All error messages are sanitized to strip credentials before logging.

    Returns a dict: {success: bool, image_tag: str|None, logs: str}
    """
    if access_token:
        repo_url = f"https://x-access-token:{access_token}@github.com/{repo_full_name}.git"
    else:
        repo_url = f"https://github.com/{repo_full_name}.git"

    safe_log_url = _sanitize_url(repo_url)  # safe for logging — no credentials
    temp_dir = tempfile.mkdtemp(prefix="build_")

    try:
        print(f"Cloning {repo_full_name} ({safe_log_url}) into {temp_dir}...")
        repo = git.Repo.clone_from(repo_url, temp_dir)

        try:
            repo.git.checkout(commit_sha)
            print(f"Checked out commit {commit_sha[:7]}")
        except Exception as checkout_err:
            # Sanitize in case gitpython embeds the clone URL in exception
            print(f"Checkout notice (using default branch): {_sanitize_url(str(checkout_err))}")

        # Auto-generate a simple Dockerfile if none exists in the repo
        dockerfile_path = os.path.join(temp_dir, "Dockerfile")
        if not os.path.exists(dockerfile_path):
            print("No Dockerfile found. Auto-generating nginx static server Dockerfile...")
            with open(dockerfile_path, "w") as f:
                f.write(
                    "FROM nginx:alpine\n"
                    "COPY . /usr/share/nginx/html\n"
                    "EXPOSE 80\n"
                    'CMD ["nginx", "-g", "daemon off;"]\n'
                )

        safe_repo_name = repo_full_name.replace("/", "-").lower()
        image_tag = f"{safe_repo_name}:{commit_sha[:7]}"
        timeout = settings.BUILD_TIMEOUT_SECONDS

        print(f"Building Docker image: {image_tag} (timeout: {timeout}s)...")

        build_result: dict = {"image": None, "logs": ""}
        build_exception: list = [None]

        def _do_build():
            try:
                image, build_logs = docker_client.images.build(
                    path=temp_dir,
                    tag=image_tag,
                    rm=True,
                )
                log_output = ""
                for chunk in build_logs:
                    if "stream" in chunk:
                        log_output += chunk["stream"]
                build_result["image"] = image
                build_result["logs"] = log_output
            except Exception as exc:
                build_exception[0] = exc

        build_thread = threading.Thread(target=_do_build, daemon=True)
        build_thread.start()
        build_thread.join(timeout=timeout)

        if build_thread.is_alive():
            msg = f"Build timed out after {timeout} seconds for {image_tag}."
            print(msg)
            return {"success": False, "image_tag": None, "logs": msg}

        if build_exception[0] is not None:
            error_str = _sanitize_url(str(build_exception[0]))
            print(f"Build failed: {error_str}")
            return {"success": False, "image_tag": None, "logs": error_str}

        if build_result["image"] is None:
            return {"success": False, "image_tag": None, "logs": "Build produced no image."}

        print(f"Build succeeded: {image_tag}")
        return {
            "success": True,
            "image_tag": image_tag,
            "logs": build_result["logs"],
        }

    except docker.errors.BuildError as e:
        error_str = _sanitize_url(str(e))
        print(f"Docker build error: {error_str}")
        return {"success": False, "image_tag": None, "logs": error_str}

    except Exception as e:
        error_str = _sanitize_url(str(e))
        print(f"Unexpected error during clone/build: {error_str}")
        return {"success": False, "image_tag": None, "logs": error_str}

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
        print(f"Cleaned up temp directory: {temp_dir}")
