# Deploy Mosquitto on Kubernetes without authentication

## Overview

In this project, I deployed an Eclipse Mosquitto MQTT broker on a local Kubernetes cluster (Minikube), configured to accept anonymous connections.

The broker configuration is supplied through a ConfigMap mounted into the pod, and the broker is exposed outside the cluster through a LoadBalancer service. This is the unauthenticated setup, where any client can subscribe to or publish on a topic without providing credentials.

To keep the resources isolated, I grouped everything under a dedicated namespace, following the same approach used in the MongoDB project.

## Technologies Used

- **Container Orchestration:** Kubernetes
- **Local Cluster:** Minikube
- **Message Broker:** Eclipse Mosquitto (MQTT)
- **CLI Tools:** kubectl, Mosquitto client tools (`mosquitto_sub`, `mosquitto_pub`)

## Prerequisites

- A running Minikube cluster with `kubectl` configured to target it.
- The Mosquitto tools installed on the local machine to communicate with the broker. They provide the `mosquitto_sub` and `mosquitto_pub` commands used for testing.

Installed the Mosquitto tools on macOS with Homebrew. This pulls in the broker along with the client commands (`mosquitto_sub`, `mosquitto_pub`, `mosquitto_passwd`, and others):

```sh
brew install mosquitto
```

Note: On other operating systems, installed the equivalent Mosquitto package using the instructions on the official download page (https://mosquitto.org/download/). The package name and command vary by distribution, so refer to that page to get the `mosquitto_sub` and `mosquitto_pub` commands for your system.

## Namespace Configuration

Created a dedicated namespace to group all the resources of this project in a single partition.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mosquitto-app-anonymous
```

## ConfigMap Configuration

Defined a ConfigMap that holds the broker configuration in a `mosquitto.conf` file, as recommended by the Mosquitto documentation. The configuration sets where the data is persisted, where the logs are written, the listener port, and enables anonymous access.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mosquitto-cm
  namespace: mosquitto-app-anonymous
data:
  mosquitto.conf: |
    persistence true
    persistence_location /mosquitto/data/
    log_dest file /mosquitto/log/mosquitto.log
    listener 1883
    allow_anonymous true
```

Note: `allow_anonymous true` is what makes this setup unauthenticated. Clients can subscribe and publish without any credentials.

## Deployment and Service Configuration

Created the Deployment to run the `eclipse-mosquitto` image and mounted the ConfigMap as a read-only volume at `/mosquitto/config`, which is the path Mosquitto reads its configuration from. Exposed the broker outside the cluster through a LoadBalancer service on port `1883`.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mosquitto-depl
  namespace: mosquitto-app-anonymous
  labels:
    app: mosquitto
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mosquitto
  template:
    metadata:
      labels:
        app: mosquitto
    spec:
      containers:
      - name: mosquitto
        image: eclipse-mosquitto:latest
        ports:
          - containerPort: 1883
        volumeMounts:
        - name: mosquitto-config
          mountPath: "/mosquitto/config"
          readOnly: true
      volumes:
      - name: mosquitto-config
        configMap:
          name: mosquitto-cm
---
apiVersion: v1
kind: Service
metadata:
  name: mosquitto-svc
  namespace: mosquitto-app-anonymous
  labels:
    app: mosquitto
spec:
  type: LoadBalancer
  selector:
    app: mosquitto
  ports:
    - protocol: TCP
      port: 1883
      targetPort: 1883
      nodePort: 30001
```

## Applying the Manifests

Applied all the manifests at once by passing the folder to `kubectl apply`, instead of applying each file individually. Running this from the directory containing the manifests:

```sh
kubectl apply -f .
```

Note: `kubectl` processes the files in lexical order of their names, which is why the manifests are prefixed with `0-`, `1-`, and `2-`. This guarantees the namespace is created before the ConfigMap, and the ConfigMap before the Deployment that mounts it.

Verified that the pod was running:

```sh
kubectl get pods -n mosquitto-app-anonymous
```

## Verification

Since the cluster runs on Minikube, a LoadBalancer service does not receive an external IP on its own. Opened a tunnel so that Minikube assigns one to the service:

```sh
minikube tunnel
```

In a separate terminal, retrieved the external IP of the service from the `EXTERNAL-IP` column:

```sh
kubectl get svc mosquitto-svc -n mosquitto-app-anonymous
```

Started a subscriber on a test topic using the external IP:

```sh
mosquitto_sub -h <external-ip> -p 1883 -t test/topic
```

In another terminal, published a message to the same topic:

```sh
mosquitto_pub -h <external-ip> -p 1883 -t test/topic -m "Hello"
```

The message appeared in the subscriber terminal, confirming that the broker was reachable and accepting anonymous connections.

## Troubleshooting

- **Problem 1: The service `EXTERNAL-IP` stays in `<pending>` state**

  On Minikube, a LoadBalancer service only receives an external IP while `minikube tunnel` is running. Make sure the tunnel is active and keep it running in its own terminal while testing.

- **Problem 2: Connection refused or the broker rejects the client**

  First confirmed that the configuration was actually mounted inside the pod by reading the file the broker uses. Retrieved the pod name with `kubectl get pods -n mosquitto-app-anonymous`, then:

  ```sh
  kubectl exec -it <mosquitto-pod> -n mosquitto-app-anonymous -- cat /mosquitto/config/mosquitto.conf
  ```

  If everything set in the ConfigMap appears there, then inspected the broker log, which usually reports the exact cause of the refusal:

  ```sh
  kubectl exec -it <mosquitto-pod> -n mosquitto-app-anonymous -- cat /mosquitto/log/mosquitto.log
  ```

  For example, when the `listener` directive is missing, the broker starts in local-only mode and the log shows:

  ```text
  Starting in local only mode. Connections will only be possible from clients running on this machine.
  Create a configuration file which defines a listener to allow remote access.
  ```

  Seeing this line means the listener is not set, so remote clients cannot connect. After fixing the ConfigMap, restarted the deployment to remount the updated configuration:

  ```sh
  kubectl rollout restart deployment mosquitto-depl -n mosquitto-app-anonymous
  ```

  Also verified that `allow_anonymous true` is present in the mounted `mosquitto.conf`, otherwise the broker rejects unauthenticated clients.
