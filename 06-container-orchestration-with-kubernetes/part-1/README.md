# Deploy MongoDB and Mongo Express into local K8s

## Overview

In this project, I deployed a MongoDB database and a Mongo Express web interface into a local Kubernetes cluster running on Minikube.

MongoDB stores the data, while Mongo Express provides a web-based admin UI to browse and manage that data. Each component was deployed as its own Deployment with a dedicated Service:

- The MongoDB Service uses the `ClusterIP` type so that it is only reachable from inside the cluster.
- The Mongo Express Service uses the `LoadBalancer` type so that it can be reached from outside the pods.

MongoDB credentials were stored in a Secret, which both the MongoDB and the Mongo Express pods consume (MongoDB to initialize the root user, Mongo Express to authenticate against MongoDB). The MongoDB connection URL, which is not sensitive, was stored in a ConfigMap. Finally, a dedicated Namespace was created to isolate all of these resources from the rest of the cluster.

## Technologies Used

- **Orchestration:** Kubernetes
- **Local Cluster:** Minikube
- **CLI:** kubectl
- **Database:** MongoDB
- **Admin UI:** Mongo Express
- **Configuration:** YAML manifests

## Prerequisites

- Installed Docker, which Minikube uses as its driver.
- Installed Minikube ([installation guide](https://minikube.sigs.k8s.io/docs/start)).
- Installed the `kubectl` CLI.

## Starting the Local Cluster

Started the local Kubernetes cluster with Minikube:

```sh
minikube start
```

Note: Minikube needs a driver to provision the cluster, and it picks Docker as the default driver when Docker is installed and running, so no `--driver` flag was needed here. Other drivers (e.g., `hyperkit`, `kvm2`, `virtualbox`) are available depending on the host.

Confirmed the cluster node was ready before applying any manifests:

```sh
kubectl get nodes
```

## Kubernetes Manifests

The setup is split across five YAML manifests, numbered `0` to `4` to reflect the order in which they should be applied:

- `0-namespace.yaml`: Created the `mongo-app` Namespace used to group every resource of this setup.
- `1-mongo-db-secret.yaml`: Defined the `mongodb-secret` Secret (type `Opaque`) holding the base64-encoded MongoDB root username and password.
- `2-mongo-db-depl-svc.yaml`: Declared the MongoDB Deployment and a `ClusterIP` Service (`mongodb-service`) exposing port `27017` internally. The root credentials are injected from the Secret via `secretKeyRef`.
- `3-mongo-express-cm.yaml`: Defined the `mongo-express-cm` ConfigMap holding the database URL (`mongodb-service:27017`), which is non-sensitive configuration.
- `4-mongo-express-depl-svc.yaml`: Declared the Mongo Express Deployment and a `LoadBalancer` Service (`mongo-express-service`) exposing port `8081` (also pinned to `nodePort` `30000`). Mongo Express reads the MongoDB credentials from the same Secret and the database URL from the ConfigMap, then builds its connection string from those values.

Note 1: The image fields use `mongo` and `mongo-express` without an explicit tag, which resolves to `latest`. Pinning a specific version (e.g., `mongo:7.0`) is recommended for reproducible deployments.

Note 2: Although the Secret is committed here for demonstration, base64 is encoding and not encryption. Real credentials should not be committed to version control. Only template manifests with placeholder values should be tracked.

## Deploying the Resources

Applied all the manifests at once from the directory containing them:

```sh
kubectl apply -f .
```

Note: `kubectl apply -f .` applies every manifest in the directory in alphanumeric filename order, which is exactly why the files are prefixed from `0` to `4`. Alternatively, the files can be applied one by one in the same order:

```sh
kubectl apply -f 0-namespace.yaml
kubectl apply -f 1-mongo-db-secret.yaml
kubectl apply -f 2-mongo-db-depl-svc.yaml
kubectl apply -f 3-mongo-express-cm.yaml
kubectl apply -f 4-mongo-express-depl-svc.yaml
```

The order matters because of the dependencies between the resources:

- The Namespace (`0`) must exist first, otherwise the resources that target the `mongo-app` namespace have nowhere to be created.
- The Secret (`1`) and the ConfigMap (`3`) must exist before the Deployments that consume them (`2` and `4`). A Deployment that references a missing Secret or ConfigMap will fail to start its pods.
- MongoDB (`2`) is deployed before Mongo Express (`4`) because Mongo Express connects to the `mongodb-service` on startup.

## Accessing Mongo Express

Opened the Mongo Express UI using the Minikube service command:

```sh
minikube service mongo-express-service -n mongo-app
```

Note: This command is specific to Minikube. On a real cloud provider, a `LoadBalancer` Service is automatically assigned an external IP by the cloud's load balancer. Minikube has no such load balancer, so the external IP of the Service stays in the `<pending>` state. `minikube service` works around this by opening a tunnel to the Service and returning a reachable URL (it can also open it directly in the browser).

## Verification

Confirmed that every pod was running and every service was created inside the `mongo-app` namespace:

```sh
kubectl get pods -n mongo-app
kubectl get svc -n mongo-app
```

- Verified that the `mongodb-deployment` and `mongo-express-deployment` pods reached the `Running` state.
- Verified that `mongodb-service` (ClusterIP) and `mongo-express-service` (LoadBalancer) were listed.
- Opened the Mongo Express URL returned by `minikube service` and confirmed that the UI loaded and connected to MongoDB.

## Troubleshooting

- **Mongo Express pod crashing or failing to connect to MongoDB**

  During the exercise, the Mongo Express pod failed to start correctly (crash / failed state). To debug, I inspected the pod logs:

  ```sh
  kubectl logs <pod-name> -n mongo-app
  ```

  The logs revealed that the referenced Secret was missing, so Mongo Express could not read the MongoDB credentials and the connection to the database failed. Applying the Secret manifest (`1-mongo-db-secret.yaml`) before the Deployments resolved the issue. This is the practical reason the manifests are numbered and applied in order: a Deployment that references a Secret or a ConfigMap that does not yet exist will not start.

  Note: To find the pod names first, run `kubectl get pods -n mongo-app`. If a pod has restarted, the logs of the previous container can be inspected with `kubectl logs <pod-name> -n mongo-app --previous`.
