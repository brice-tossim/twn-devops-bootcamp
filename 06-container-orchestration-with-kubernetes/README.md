# K8s components

- Worker node: where the application runs. It can be a physical machine or a virtual machine. Example: EC2 instance, droplet server in digital ocean, etc.
- Pod: smallest deployable unit in a worker node, can contain one or more containers (e.g. your app + a log-shipper that reads the app's log file). A container is your packaged app (code + dependencies + minimal OS libs) bundled into an image so it runs the same anywhere.
  - Concrete mapping:  
    - On your laptop with Docker → you run a container.
    - On Kubernetes → you run a Pod that holds that container.
- Service: Stable IP/DNS in front of a group of pods. The IP is used by a pod to communicate with other pods. Without a service if a pod dies, a new IP is assigned to the new pod and the other pods will not be able to communicate with it if they are using the old IP. Example: 3 replicas of `api` -> one service `api-svc` for the 3 replicas of `api`. The other pods will communicate with `api-svc` instead of the individual pods. Types of services:
  - ClusterIP: internal only.
  - NodePort: exposes the service on every node's IP at a fixed port (rarely used directly in prod, more of a building block).
  - LoadBalancer: provisions a cloud load balancer (AWS NLB, GCP LB…) with a public IP. This is the typical "external" one.

    Note:  
    NodePort isn't really "internet-facing" the way LoadBalancer is. It's more "reachable from outside the cluster if you know a node's IP."

- Ingress: A way to expose a service to the internet using a domain name.

  Note:  
  Why you'd use it over a LoadBalancer Service: one LoadBalancer per service gets expensive fast (each one = a cloud LB = $$). Ingress lets you have one LoadBalancer routing many domains/paths to many services. So: "Smart HTTP router in front of services -> one entry point, many backends."

- ConfigMap: It's a source of non-sensitive configuration data. Can be env variables or a file mounted on the pod.
- Secret: It's a source of sensitive configuration data. Can be env variables or a file mounted on the pod. By default, the data are stored in base64 encoding, but it's not encrypted. For encryption, you can enable etcd encryption or use a third-party secret management tool, such as HashiCorp Vault, AWS Secrets Manager, etc.
- Volume: Storage mounted into a pod. Can be ephemeral (dies with the pod, e.g. emptyDir) or persistent (survives the pod, via PV + PVC).
- Deployment: Blueprint for interchangeable pods. Kubernetes can kill any one, create another with a random name, and nothing breaks. It defines the desired configuration of a pod, such as the number of replicas, the image to use, etc. It also manages the lifecycle of the pod, such as scaling up or down, rolling updates, etc. It's used for stateless applications, such as web servers.
- StatefulSet: It's like a deployment but each pod has an identity (a fixed name, fixed DNS, and its own dedicated disk that follows it around). It's used for stateful applications, such as databases.

  Note:  
  Deployment treats pods as identical copies. StatefulSet treats pods as named individuals with their own storage.

- DaemonSet: It's like a deployment but it's used to run a pod on every worker node. It's used for applications that need to run on every worker node, such as log collectors, monitoring agents, etc.

  Note 1:  
  Deployment = "N copies, anywhere." DaemonSet = "one copy, everywhere."

  Note 2:  
  Mental model: Does this pod need to be tied to a specific node to do its job?  
  Yes (it reads node-local files, kernel events, network interfaces) → DaemonSet.  
  No (it just handles requests) → Deployment.

# K8s architecture

- Worker node:
  - Container runtime
  - Kubelet
  - Kube-proxy
- Control plane:
  - API server: The entrypoint for all requests to kubernetes. Can be operate through CLI, UI, client, API, etc. It validates and processes the requests and updates the state of the cluster accordingly.
  - Scheduler: Responsible for assigning pods to worker nodes based on resource availability and other constraints.
  - Controller manager: Responsible for managing the controllers that ensure the desired state of the cluster is maintained. For example, if a pod dies, the controller manager will create a new pod to replace it.
  - etcd: A distributed key-value store that is used to store the state of the cluster (what the cluster looks like at any given time, what the cluster contains, what changes have been made, etc.). It's like a cluster brain. But it's not store thing like logs, metrics, data from the application, etc. It's only store the state of the cluster. It's used by the API server to store the state of the cluster and by the controller manager to watch for changes in the state of the cluster.
