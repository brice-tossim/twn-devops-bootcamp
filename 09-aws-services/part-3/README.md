# Complete the CI/CD pipeline (Docker Compose, dynamic versioning)

## Overview

In this project, I built a variant of the previous CI/CD pipeline by replacing the direct `docker run` invocation in the deploy stage with a `docker-compose` setup. The pipeline still increments the patch version, runs tests, builds the JAR, builds and pushes a versioned Docker image, deploys it to an AWS EC2 instance, and commits the version change back to the source branch, but the container on the EC2 instance is now orchestrated through a `compose.yml` file.

The project used in this pipeline lives on the [`feat/use-compose-file-to-deploy-on-aws-ec2-server`](https://github.com/brice-tossim/twn-java-maven-app/tree/feat/use-compose-file-to-deploy-on-aws-ec2-server) branch.

## Technologies Used

- **CI/CD Tool:** Jenkins (Multibranch Pipeline)
- **Cloud Provider:** AWS (EC2)
- **Containerization:** Docker, Docker Compose
- **Container Registry:** Docker Hub (private repository)
- **Operating System:** Linux
- **Build Tool:** Maven
- **Language:** Java
- **Version Control:** Git

## Prerequisites

The full setup of this pipeline is documented in the previous [Docker-only project](https://github.com/brice-tossim/twn-devops-bootcamp/tree/main/09-aws-services/part-2), and this document only highlights the differences. Make sure all the steps from the previous project (EC2 instance setup, EC2 security group configuration, SSH credential configuration, SSH Agent plugin installation, and the multibranch pipeline configuration) are completed before applying the changes below.

## Docker Compose Installation on the EC2 Server

Since the base Docker package installed on the EC2 instance during the previous project does not include Docker Compose, the binary was installed separately on the EC2 server following [this gist](https://gist.github.com/npearce/6f3c7826c7499587f00957fee62f8ee9#docker-compose-install).

## EC2 Security Group Update

The new `compose.yml` exposes the application on host port `8081` (instead of `8080`). To make it reachable from a browser, an additional inbound rule was added to the EC2 security group:

- Navigated to the EC2 dashboard on the AWS console and opened the security group attached to the EC2 instance.
- Under "Inbound rules", clicked on "Edit inbound rules" and added a new rule with the following settings:
  - **Type:** Custom TCP
  - **Protocol:** TCP
  - **Port range:** 8081
  - **Source:** Anywhere-IPv4 (`0.0.0.0/0`).
- Saved the rule.

## Compose File

The `compose.yml` file was added at the root of the project repository:

```yaml
services:
  java-maven-app:
    image: ${FULL_IMAGE_NAME}
    ports:
      - "8081:8080"
```

The `${FULL_IMAGE_NAME}` variable is substituted at runtime by Docker Compose using the environment variable exported by the `deploy-cmd.sh` script.

## Deployment Script

The `deploy-cmd.sh` script was rewritten to use Docker Compose instead of the previous `docker pull`, `docker stop`, `docker rm`, and `docker run` sequence:

```bash
#!/usr/bin/env bash
set -e

DOCKER_USERNAME=$1
export FULL_IMAGE_NAME=$2

echo "Deploying Docker image: $FULL_IMAGE_NAME"

docker login -u "$DOCKER_USERNAME" --password-stdin
docker-compose -f compose.yml down || true
docker-compose -f compose.yml up -d

echo "Docker image deployed successfully"
```

The `FULL_IMAGE_NAME` variable is exported so that Docker Compose can substitute it inside `compose.yml`. The `docker-compose down` command (with `|| true` to avoid failing on the first run when no stack is up yet) stops and removes the previous container before the new one is brought up.

## Jenkinsfile Changes

The Jenkinsfile is identical to the one from the previous project, except for two changes:

- The `scp` command in the `Deploy on AWS EC2` stage now also transfers the `compose.yml` file to the EC2 instance, since `docker-compose` needs it locally to bring the container up:

```groovy
scp -o StrictHostKeyChecking=no deploy-cmd.sh compose.yml $EC2_HOST:/home/ec2-user/
```

- The `git push` command in the `Commit version change` stage now targets the new branch:

```groovy
git push origin HEAD:<your-branch-name>
```

Note: Replace `<your-branch-name>` with the branch where the pipeline runs and where the version change will be pushed back (in this project, `feat/use-compose-file-to-deploy-on-aws-ec2-server`).

## Verification

- Pushed a change to the `feat/use-compose-file-to-deploy-on-aws-ec2-server` branch and verified that the full pipeline executed successfully through the Jenkins UI. If the GitHub webhook is not configured (for example, when the Jenkins droplet is recreated on each session to save costs), the pipeline can alternatively be triggered manually by clicking the "Scan Repository Now" button under the multibranch pipeline configuration.
- Accessed the deployed application from a browser using the EC2 public IP and the new host port:

```text
http://<ec2-public-ip>:8081
```
