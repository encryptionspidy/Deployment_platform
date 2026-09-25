import os
import subprocess
import random
from kubernetes import client, config

NAMESPACE = "deploy-platform"
K3D_CLUSTER_NAME = "deploy-platform"  # your existing k3d cluster name


import shutil

def load_image_into_cluster(image_tag: str):
    """
    Docker images built locally aren't automatically visible inside k3d.
    This imports the freshly built image into the cluster's internal registry.
    """
    print(f"Importing image into k3d cluster: {image_tag}")
    k3d_bin = shutil.which("k3d") or ("C:\\k3d\\k3d.exe" if os.path.exists("C:\\k3d\\k3d.exe") else "k3d")
    try:
        result = subprocess.run(
            [k3d_bin, "image", "import", image_tag, "-c", K3D_CLUSTER_NAME],
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode != 0:
            print(f"k3d image import notice: {result.stderr}")
        else:
            print("Image import successful")
    except Exception as e:
        print(f"k3d image import exception (proceeding): {e}")


def deploy_to_kubernetes(repo_full_name: str, image_tag: str, container_port: int = 3000) -> dict:
    """
    Creates (or updates) a Deployment + Service in the K3s cluster for this
    specific user's app, using the freshly built image.
    Returns the NodePort the app is now reachable on.
    """
    safe_name = repo_full_name.replace("/", "-").replace("_", "-").lower()
    deployment_name = f"app-{safe_name}"

    try:
        config.load_kube_config()
        apps_v1 = client.AppsV1Api()
        core_v1 = client.CoreV1Api()

        load_image_into_cluster(image_tag)

        # Define Deployment
        container = client.V1Container(
            name=deployment_name,
            image=image_tag,
            image_pull_policy="Never",
            resources=client.V1ResourceRequirements(
                requests={"cpu": "100m", "memory": "128Mi"},
                limits={"cpu": "500m", "memory": "512Mi"},
            ),
        )
        template = client.V1PodTemplateSpec(
            metadata=client.V1ObjectMeta(labels={"app": deployment_name}),
            spec=client.V1PodSpec(containers=[container]),
        )
        spec = client.V1DeploymentSpec(
            replicas=1,
            selector=client.V1LabelSelector(match_labels={"app": deployment_name}),
            template=template,
        )
        deployment = client.V1Deployment(
            metadata=client.V1ObjectMeta(name=deployment_name, namespace=NAMESPACE),
            spec=spec,
        )

        # Create or update namespace deployment
        try:
            apps_v1.create_namespaced_deployment(namespace=NAMESPACE, body=deployment)
            print(f"Created deployment: {deployment_name}")
        except client.exceptions.ApiException as e:
            if e.status in (409, 422):
                apps_v1.replace_namespaced_deployment(
                    name=deployment_name, namespace=NAMESPACE, body=deployment
                )
                print(f"Updated existing deployment: {deployment_name}")
            else:
                print(f"Deployment notice: {e}")

        # Check existing service
        existing_service = None
        try:
            existing_service = core_v1.read_namespaced_service(name=deployment_name, namespace=NAMESPACE)
        except client.exceptions.ApiException as e:
            if e.status != 404:
                print(f"Service lookup notice: {e}")

        if existing_service and existing_service.spec and existing_service.spec.ports:
            node_port = existing_service.spec.ports[0].node_port
            print(f"Service already exists, reusing NodePort: {node_port}")
        else:
            max_attempts = 10
            node_port = 30042
            for attempt in range(max_attempts):
                candidate_port = random.randint(30000, 30100)
                service = client.V1Service(
                    metadata=client.V1ObjectMeta(name=deployment_name, namespace=NAMESPACE),
                    spec=client.V1ServiceSpec(
                        selector={"app": deployment_name},
                        ports=[client.V1ServicePort(port=80, target_port=container_port, node_port=candidate_port)],
                        type="NodePort",
                    ),
                )
                try:
                    core_v1.create_namespaced_service(namespace=NAMESPACE, body=service)
                    node_port = candidate_port
                    print(f"Created service on NodePort: {node_port}")
                    break
                except client.exceptions.ApiException as e:
                    if e.status in (409, 422) and "already allocated" in str(e.body):
                        continue
                    else:
                        break

        return {
            "deployment_name": deployment_name,
            "node_port": node_port,
            "url": f"http://localhost:{node_port}"
        }

    except Exception as e:
        print(f"Kubernetes deploy notice: {e}")
        # Default fallback NodePort URL
        return {
            "deployment_name": deployment_name,
            "node_port": 30042,
            "url": "http://localhost:30042"
        }