# Complete the CI/CD pipeline using AWS services (ECR, EC2, Docker Compose)

## Overview

In this project, I extended the CI/CD pipeline to publish the Docker image to a private AWS Elastic Container Registry (ECR) instead of Docker Hub, and to deploy the image from ECR to an AWS EC2 instance through Docker Compose. The pipeline still increments the patch version, runs tests, builds the JAR, builds and pushes a versioned Docker image, deploys it to the EC2 instance, and commits the version change back to the source branch.

The project used in this pipeline lives on the [`feat/push-onto-aws-ecr-and-deploy-onto-aws-ec2`](https://github.com/brice-tossim/twn-java-maven-app/tree/feat/push-onto-aws-ecr-and-deploy-onto-aws-ec2) branch.

## Technologies Used

- **CI/CD Tool:** Jenkins (Multibranch Pipeline)
- **Cloud Provider:** AWS (ECR, EC2)
- **Containerization:** Docker, Docker Compose
- **Container Registry:** AWS Elastic Container Registry (ECR)
- **Operating System:** Linux
- **Build Tool:** Maven
- **Language:** Java
- **Version Control:** Git

## Prerequisites

This project builds directly on the previous [Docker Compose CI/CD project](../03-cicd-deploy-to-ec2-with-docker-compose) and only highlights the differences. Make sure all the steps from that project (multibranch pipeline configuration, SSH credential, SSH Agent plugin, EC2 instance setup including Docker and Docker Compose installation, EC2 security group rules) are completed before applying the changes below.

In addition, a new EC2 instance was provisioned for this project, following the same setup steps as in the previous projects (instance creation, SSH credential in Jenkins, security group rules for SSH from the Jenkins IP and inbound traffic on port 8081).

## AWS CLI Setup

The AWS CLI is required on the local machine to retrieve the ECR authentication token used by Jenkins:

- Installed the AWS CLI by following the [official AWS documentation](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html), which provides installers for macOS, Linux, and Windows.
- Configured the CLI with the AWS credentials of the account hosting the ECR repository:

```sh
aws configure
```

- Provided the AWS access key ID, secret access key, default region (e.g., `us-west-2`), and default output format (e.g., `json`) when prompted.

## AWS ECR Repository Creation

- Navigated to the ECR service in the AWS console and clicked on "Create repository".
- Configured the repository with the following settings:
  - **Repository name:** `<your-ecr-repo-name>` (in this project, `learning/java-maven-app`). ECR repository names can include `/` as a logical separator.
  - **Tag mutability:** Mutable, so that existing tags can be overwritten if needed.
- Left the remaining options as default and clicked on "Create".

Note 1: The "Create a repository" flow on ECR creates a private repository by default. There is no visibility option to configure in this flow. To create a public repository instead, use the "Public registry" option in the ECR sidebar.

Note 2: Once the repository is created, the "View push commands" button on the repository details page displays the exact `docker login`, `docker build`, `docker tag`, and `docker push` commands tailored to the AWS account ID and region. These commands are useful as a reference when configuring the pipeline.

## Jenkins Credentials Update

The pipeline authenticates to ECR using two Jenkins credentials: an updated `docker-access` credential and a new `aws-ecr-host` secret text credential.

### Update the `docker-access` Credential

The existing `docker-access` credential previously used for Docker Hub was updated to authenticate against AWS ECR:

- Navigated to the credential settings of the multibranch pipeline and edited the existing `docker-access` credential.
- Updated the fields with the following values:
  - **Kind:** Username with password.
  - **Username:** `AWS` (this is a fixed value required by AWS ECR authentication, not a personal username).
  - **Password:** The output of the following command, run on the local machine:

```sh
aws ecr get-login-password --region <your-aws-region>
```

- Saved the credential.

Note 1: Replace `<your-aws-region>` with the AWS region where the ECR repository was created (e.g., `us-west-2`).

Note 2: Overwriting the existing `docker-access` credential breaks any other pipeline still relying on the previous Docker Hub credential. A better approach is to create a new credential (e.g., with ID `ecr-access`) instead of overwriting the existing one, and update the `credentialsId` field in the Jenkinsfile of this project to point to the new credential. This keeps the previous Docker Hub pipelines functional.

### Create the `aws-ecr-host` Secret Text Credential

A new secret text credential was created to store the ECR registry host, so it can be reused as an environment variable in the Jenkinsfile:

- Navigated to the credential settings of the multibranch pipeline and clicked on "Add credentials".
- Filled in the following fields:
  - **Kind:** Secret text.
  - **ID:** `aws-ecr-host`.
  - **Secret:** The ECR registry host URL (e.g., `<your-aws-account-id>.dkr.ecr.<your-aws-region>.amazonaws.com`).
- Saved the credential.

## Jenkinsfile Changes

The Jenkinsfile follows the same structure as the previous project, with changes spread across the `environment` block, the `Build and push docker image` stage, and the `Deploy on AWS EC2` stage.

### Environment Block

A new `AWS_ECR_HOST` environment variable was added, loaded from the secret text credential created above. The `IMAGE_NAME` was also updated to match the ECR repository name:

```groovy
environment {
    IMAGE_NAME = "<your-ecr-repo-name>"
    AWS_ECR_HOST = credentials('aws-ecr-host')
}
```

### Build and Push Docker Image Stage

The image is now built locally, retagged with the ECR host prefix, and pushed to ECR:

```groovy
stage('Build and push docker image') {
    steps {
        script {
            env.FULL_IMAGE_NAME = "$IMAGE_NAME:$IMAGE_VERSION"
            env.ECR_IMAGE_NAME = "$AWS_ECR_HOST/$FULL_IMAGE_NAME"

            withCredentials([
                usernamePassword(
                    credentialsId: 'docker-access',
                    usernameVariable: 'DOCKER_USERNAME',
                    passwordVariable: 'DOCKER_PASSWORD'
                )]) {
                    sh '''
                        echo $DOCKER_PASSWORD | docker login --username $DOCKER_USERNAME --password-stdin $AWS_ECR_HOST
                        docker build -t $FULL_IMAGE_NAME .
                        docker tag $FULL_IMAGE_NAME $ECR_IMAGE_NAME
                        docker push $ECR_IMAGE_NAME
                    '''
                }
        }
    }
}
```

The changes compared to the previous stage are the following:

- A new `ECR_IMAGE_NAME` variable was introduced, combining `AWS_ECR_HOST` and `FULL_IMAGE_NAME`. This is the fully qualified name required by ECR.
- The `docker login` command now takes `$AWS_ECR_HOST` as an additional argument to authenticate against ECR.
- A new `docker tag` step retags the locally built image with the ECR host prefix before pushing.
- The push targets `$ECR_IMAGE_NAME` instead of `$FULL_IMAGE_NAME`.

### Deploy on AWS EC2 Stage

The `DEPLOY_COMMAND` was updated to pass the ECR host as an additional argument to the `deploy-cmd.sh` script. The image name passed to the script is now the ECR-qualified one:

```groovy
env.DEPLOY_COMMAND = "bash /home/ec2-user/deploy-cmd.sh $DOCKER_USERNAME $AWS_ECR_HOST $ECR_IMAGE_NAME"
```

### Commit Version Change Stage

The branch targeted by the `git push` command was updated to the new feature branch:

```groovy
git push origin HEAD:<your-branch-name>
```

Note: Replace `<your-branch-name>` with the branch where the pipeline runs and where the version change will be pushed back (in this project, `feat/push-onto-aws-ecr-and-deploy-onto-aws-ec2`).

## Deployment Script Changes

The `deploy-cmd.sh` script was updated to accept the ECR host as a second argument and pass it to the `docker login` command:

```bash
#!/usr/bin/env bash
set -e

DOCKER_USERNAME=$1
AWS_ECR_HOST=$2
export FULL_IMAGE_NAME=$3

echo "Deploying Docker image: $FULL_IMAGE_NAME"

docker login -u "$DOCKER_USERNAME" --password-stdin $AWS_ECR_HOST
docker-compose -f compose.yml down || true
docker-compose -f compose.yml up -d

echo "Docker image deployed successfully"
```

The changes compared to the previous script are the following:

- A new `AWS_ECR_HOST` parameter is read from `$2`.
- `FULL_IMAGE_NAME` is now read from `$3` instead of `$2`.
- The `docker login` command targets `$AWS_ECR_HOST` so the EC2 instance authenticates against ECR.

The `compose.yml` file is unchanged from the previous project.

## Verification

- Pushed a change to the `feat/push-onto-aws-ecr-and-deploy-onto-aws-ec2` branch and verified that the full pipeline executed successfully through the Jenkins UI. If the GitHub webhook is not configured (for example, when the Jenkins droplet is recreated on each session to save costs), the pipeline can alternatively be triggered manually by clicking the "Scan Repository Now" button under the multibranch pipeline configuration.
- Accessed the deployed application from a browser using the EC2 public IP and the exposed host port:

```text
http://<ec2-public-ip>:8081
```

## Troubleshooting

- **Problem: `docker login` fails with an authorization error in either the `Build and push docker image` stage or the `Deploy on AWS EC2` stage**

  The token returned by `aws ecr get-login-password` is valid for 12 hours only. Once it expires, every `docker login` attempt against ECR fails, which causes the pipeline to break in the build/push stage (from Jenkins) or in the deploy stage (from the EC2 instance).

  To fix this, regenerate the token on the local machine and update the password of the `docker-access` credential in Jenkins:

```sh
aws ecr get-login-password --region <your-aws-region>
```
