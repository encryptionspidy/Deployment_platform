import os
import shutil
import tempfile
import docker
import git

docker_client = docker.from_env()


def clone_and_build(repo_full_name: str, commit_sha: str, access_token: str = None) -> dict:
    """
    Clones the given repo at the given commit into a temp folder using OAuth token if present,
    then runs `docker build` on it.
    Returns a dict with success status, image tag, and logs/error.
    """
    if access_token:
        repo_url = f"https://x-access-token:{access_token}@github.com/{repo_full_name}.git"
    else:
        repo_url = f"https://github.com/{repo_full_name}.git"

    temp_dir = tempfile.mkdtemp(prefix="build_")

    try:
        print(f"Cloning {repo_full_name} into {temp_dir}...")
        repo = git.Repo.clone_from(repo_url, temp_dir)

        try:
            repo.git.checkout(commit_sha)
            print(f"Checked out commit {commit_sha}")
        except Exception as checkout_err:
            print(f"Checkout notice (using default branch): {checkout_err}")

        # Check if Dockerfile exists. If not, generate a standard node/python static web Dockerfile
        dockerfile_path = os.path.join(temp_dir, "Dockerfile")
        if not os.path.exists(dockerfile_path):
            print("No Dockerfile found in repo root. Auto-generating production Web Server Dockerfile...")
            with open(dockerfile_path, "w") as f:
                f.write("""FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
""")

        safe_repo_name = repo_full_name.replace("/", "-").lower()
        image_tag = f"{safe_repo_name}:{commit_sha[:7]}"

        print(f"Building Docker image: {image_tag}...")
        image, build_logs = docker_client.images.build(
            path=temp_dir,
            tag=image_tag,
            rm=True
        )

        log_output = ""
        for chunk in build_logs:
            if "stream" in chunk:
                log_output += chunk["stream"]

        print(f"Build succeeded: {image_tag}")
        return {
            "success": True,
            "image_tag": image_tag,
            "logs": log_output
        }

    except docker.errors.BuildError as e:
        print(f"Build failed: {e}")
        return {"success": False, "image_tag": None, "logs": str(e)}

    except Exception as e:
        print(f"Unexpected error during clone/build: {e}")
        return {"success": False, "image_tag": None, "logs": str(e)}

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
        print(f"Cleaned up temp directory: {temp_dir}")