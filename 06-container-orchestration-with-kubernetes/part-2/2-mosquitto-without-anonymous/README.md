# Secure Mosquitto on Kubernetes with username and password authentication

## Overview

In this project, I deployed an Eclipse Mosquitto MQTT broker on a local Kubernetes cluster (Minikube), secured with username and password authentication. Anonymous access is disabled, so a client must provide valid credentials before it can subscribe to or publish on a topic.

Most of the setup mirrors the anonymous deployment: a dedicated namespace, a ConfigMap holding `mosquitto.conf`, and a LoadBalancer service that exposes the broker. The difference here is that anonymous access is turned off, the configuration references a password file, and the credentials are supplied to the pod through a Kubernetes Secret.

This documentation covers authentication only. It does not cover topic-level authorization (ACL) or transport encryption (TLS). Both are mentioned at the end as further hardening steps.

## Technologies Used

- **Container Orchestration:** Kubernetes
- **Local Cluster:** Minikube
- **Message Broker:** Eclipse Mosquitto (MQTT)
- **Secret Management:** Kubernetes Secret
- **CLI Tools:** kubectl, Mosquitto client tools (`mosquitto_sub`, `mosquitto_pub`, `mosquitto_passwd`)

## Prerequisites

- A running Minikube cluster with `kubectl` configured to target it.
- The Mosquitto tools installed on the local machine. They provide `mosquitto_sub`, `mosquitto_pub`, and `mosquitto_passwd`, which is used to generate the password file.

Installed the Mosquitto tools on macOS with Homebrew. This pulls in the broker along with the client commands (`mosquitto_sub`, `mosquitto_pub`, `mosquitto_passwd`, and others):

```sh
brew install mosquitto
```

Note: On other operating systems, installed the equivalent Mosquitto package using the instructions on the official download page (https://mosquitto.org/download/). The package name and command vary by distribution, so refer to that page to get the `mosquitto_sub`, `mosquitto_pub`, and `mosquitto_passwd` commands for your system.

## Namespace Configuration

Created a dedicated namespace to group all the resources of this project in a single partition.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mosquitto-app-secure
```

## ConfigMap Configuration

Defined a ConfigMap holding the broker configuration in a `mosquitto.conf` file. Compared to the anonymous setup, anonymous access is disabled and a `password_file` directive points to the path where the credentials are mounted in the pod.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mosquitto-cm
  namespace: mosquitto-app-secure
data:
  mosquitto.conf: |
    persistence true
    persistence_location /mosquitto/data/
    log_dest file /mosquitto/log/mosquitto.log
    listener 1883
    allow_anonymous false
    password_file /etc/mosquitto/password_file
```

Note: The path in the `password_file` directive must match the mount path of the Secret in the Deployment (`/etc/mosquitto/password_file`), otherwise the broker will not find the credentials.

## Password File and Secret Configuration

Created a local password file that registers the users allowed to subscribe and publish. The `-c` flag creates the file (and overwrites it if it already exists):

```sh
mosquitto_passwd -c passwd <username>
```

Note: The `passwd` file is created in the directory where the command is run. I ran it from the project root folder, so the file was created there alongside the manifests.

Added additional users by running the same command without `-c`, which appends a user instead of recreating the file:

```sh
mosquitto_passwd passwd <another-username>
```

Note: `-c` creates or overwrites the file. Omit it to append a user to an existing file.

Encoded the content of the password file in Base64 so it could be embedded in the Secret:

```sh
cat passwd | base64
```

Pasted the resulting value under the `password_file` key of the Secret. The Secret is created in the same namespace and consumed by the Deployment as a mounted volume.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mosquitto-secret
  namespace: mosquitto-app-secure
type: Opaque
data:
  password_file: |
    <base64-encoded-password-file>
```

Note: The value above is a placeholder. Real credentials should not be committed to version control. Generate the password file locally, encode it, and keep the actual Secret out of the repository (for example through a templated file with a placeholder value).

## Deployment and Service Configuration

Created the Deployment to run the `eclipse-mosquitto` image. Two volumes are mounted: the ConfigMap as a read-only volume at `/mosquitto/config`, and the Secret as a read-only file at `/etc/mosquitto/password_file` using `subPath` so that only the single file is mounted at that path. The service exposes the broker outside the cluster through a LoadBalancer on port `1883`.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mosquitto-depl
  namespace: mosquitto-app-secure
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
        - name: mosquitto-passwd
          mountPath: "/etc/mosquitto/password_file"
          subPath: password_file
          readOnly: true
      volumes:
      - name: mosquitto-config
        configMap:
          name: mosquitto-cm
      - name: mosquitto-passwd
        secret:
          secretName: mosquitto-secret
---
apiVersion: v1
kind: Service
metadata:
  name: mosquitto-svc
  namespace: mosquitto-app-secure
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

Applied all the manifests at once by passing the folder to `kubectl apply`, running this from the directory containing the manifests:

```sh
kubectl apply -f .
```

Note: `kubectl` processes the files in lexical order of their names, which is why the manifests are prefixed with `0-`, `1-`, `2-`, and `3-`. This guarantees the namespace exists before the ConfigMap and the Secret, and that both exist before the Deployment that mounts them.

Verified that the pod was running:

```sh
kubectl get pods -n mosquitto-app-secure
```

## Verification

Since the cluster runs on Minikube, a LoadBalancer service does not receive an external IP on its own. Opened a tunnel so that Minikube assigns one to the service:

```sh
minikube tunnel
```

In a separate terminal, retrieved the external IP of the service from the `EXTERNAL-IP` column:

```sh
kubectl get svc mosquitto-svc -n mosquitto-app-secure
```

Started a subscriber on a test topic, authenticating with one of the users registered in the password file:

```sh
mosquitto_sub -h <external-ip> -p 1883 -t test/topic -u <user> -P <password>
```

In another terminal, published a message to the same topic with valid credentials:

```sh
mosquitto_pub -h <external-ip> -p 1883 -t test/topic -m "Hello" -u <user> -P <password>
```

The message appeared in the subscriber terminal. Running either command without credentials, or with invalid ones, was rejected by the broker, confirming that authentication was enforced.

## Limitations and Further Hardening

This setup only enforces authentication. It does not restrict which topics a user can access, because no ACL is configured. As a result, any authenticated user can subscribe to or publish on any topic. For example, with users `userA` and `userB` registered in the password file, if a subscriber is created with `userA`, then `userB` can still publish on the topic that `userA` is subscribed to, and the other way around.

Two additional measures, not covered in this documentation, can harden the setup further:

- **ACL (Access Control List):** Restricts which users can publish to or subscribe from specific topics, so a publisher can be limited to a given topic.
- **TLS encryption:** Encrypts the messages in transit between clients and the broker, so credentials and payloads are not sent in clear text.

## Troubleshooting

- **Problem 1: The service `EXTERNAL-IP` stays in `<pending>` state**

  On Minikube, a LoadBalancer service only receives an external IP while `minikube tunnel` is running. Make sure the tunnel is active (it may prompt for the sudo password) and keep it running in its own terminal while testing.

- **Problem 2: The broker rejects the client with "Connection Refused: not authorised"**

  This usually means the credentials are wrong, or the password file was not mounted, or `allow_anonymous` was left as `true`. First confirmed that the configuration and the password file were actually present inside the pod. Retrieved the pod name with `kubectl get pods -n mosquitto-app-secure`, then:

  ```sh
  kubectl exec -it <mosquitto-pod> -n mosquitto-app-secure -- cat /mosquitto/config/mosquitto.conf
  kubectl exec -it <mosquitto-pod> -n mosquitto-app-secure -- cat /etc/mosquitto/password_file
  ```

  Verified that `allow_anonymous false` and the `password_file` directive were set in the mounted configuration, and that the password file contained the expected users. If anything was off, fixed the corresponding manifest and reapplied it, then restarted the deployment to remount the updated files:

  ```sh
  kubectl rollout restart deployment mosquitto-depl -n mosquitto-app-secure
  ```

  If the configuration and password file looked correct, inspected the broker log for the precise cause:

  ```sh
  kubectl exec -it <mosquitto-pod> -n mosquitto-app-secure -- cat /mosquitto/log/mosquitto.log
  ```

- **Problem 3: The pod keeps crashing (CrashLoopBackOff) and `kubectl exec` fails**

  When Mosquitto fails to start, the container restarts in a loop, so there is no running process to exec into and the previous checks cannot be run. To get inside the container and inspect the mounted files, I temporarily overrode the container command with a `sleep`, so the container stays alive without starting the broker.

  Note: `kubectl logs <mosquitto-pod> -n mosquitto-app-secure --previous` is not helpful for this setup. The configuration sets `log_dest file /mosquitto/log/mosquitto.log`, so Mosquitto writes its log to a file inside the container instead of to stdout, leaving the container log stream empty. On a container that crashed immediately, the command may also return an error such as `unable to retrieve container logs for docker://<container-id>`. Reading the log file directly with the `sleep` override below is the reliable approach here.

  Added the `command` field to the container in the Deployment manifest:

  ```yaml
  containers:
  - name: mosquitto
    image: eclipse-mosquitto:latest
    command: ["sleep", "3600"]
  ```

  Reapplied the manifests and waited for the pod to be running:

  ```sh
  kubectl apply -f .
  kubectl get pods -n mosquitto-app-secure
  ```

  With the pod alive, exec'd into it to read the mounted configuration, the password file, and the log, identified the cause, and applied the fix to the corresponding manifest.

  Once fixed, removed the `command: ["sleep", "3600"]` line and reapplied so that Mosquitto started normally again:

  ```sh
  kubectl apply -f .
  ```
  