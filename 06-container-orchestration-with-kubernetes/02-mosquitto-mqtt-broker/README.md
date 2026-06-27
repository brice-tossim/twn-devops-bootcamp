# Mosquitto MQTT broker on Kubernetes

## Overview

This documents setting up an Eclipse Mosquitto MQTT broker on a local Kubernetes cluster (Minikube), split into two projects that share the same base configuration and differ only in how clients are allowed to connect.

Both projects use a dedicated namespace, a ConfigMap holding `mosquitto.conf`, and a LoadBalancer service that exposes the broker on port `1883` (reached through `minikube tunnel`). The second project builds on the first by disabling anonymous access and requiring authentication.

## Projects

1. [1-mosquitto-with-anonymous](./1-mosquitto-with-anonymous): Deployed Mosquitto with anonymous access enabled (`allow_anonymous true`). Any client can subscribe to or publish on a topic without credentials. Covers the namespace, the ConfigMap-based configuration, the deployment, and the LoadBalancer service, tested with `mosquitto_sub` and `mosquitto_pub`.

2. [2-mosquitto-without-anonymous](./2-mosquitto-without-anonymous): Deployed Mosquitto with anonymous access disabled (`allow_anonymous false`) and username/password authentication. Credentials are generated with `mosquitto_passwd`, stored in a Kubernetes Secret, and mounted into the pod, so clients must authenticate before subscribing or publishing.

## Recommended Reading Order

Start with [1-mosquitto-with-anonymous](./1-mosquitto-with-anonymous), as it establishes the base setup (namespace, ConfigMap, deployment, and service). Then move to [2-mosquitto-without-anonymous](./2-mosquitto-without-anonymous), which reuses that base and adds the authentication layer (password file plus Secret).
