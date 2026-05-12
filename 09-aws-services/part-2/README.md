# Complete the CI/CD pipeline (Docker, dynamic versioning)

## Overview

In this project, I extended the existing CI pipeline to a complete CI/CD pipeline on Jenkins by adding a deployment stage that automatically delivers the freshly built Docker image to an AWS EC2 instance. The full pipeline now performs the following:

1. Increments the patch version of the application.
2. Runs the test suite.
3. Builds the JAR file.
4. Builds and pushes a versioned Docker image to a private Docker Hub repository.
5. Deploys the image to the EC2 server.
6. Commits the version change back to the source branch.

The project used in this pipeline lives on the [`feat/add-deployment-stage-into-aws-ec2-server`](https://github.com/brice-tossim/twn-java-maven-app/tree/feat/add-deployment-stage-into-aws-ec2-server) branch and contains everything required to run the pipeline, including the `deploy-cmd.sh` script invoked during deployment.

## Technologies Used

- **CI/CD Tool:** Jenkins (Multibranch Pipeline)
- **Cloud Provider:** AWS (EC2)
- **Containerization:** Docker
- **Container Registry:** Docker Hub (private repository)
- **Operating System:** Linux
- **Build Tool:** Maven
- **Language:** Java
- **Version Control:** Git

## Prerequisites

- The CI pipeline from the previous project is fully configured. The CI pipeline (incrementing the patch version, running tests, building the JAR, pushing the Docker image, and committing the version change) was set up and documented in this [project](https://github.com/brice-tossim/twn-devops-bootcamp/tree/main/08-build-automation-ci-cd-with-jenkins/part-5). This project extends that pipeline by adding the deployment stage only.
- An EC2 instance is already provisioned and ready to receive a Docker image. The EC2 setup (instance creation, SSH connection, Docker installation) was previously covered in this [project](https://github.com/brice-tossim/twn-devops-bootcamp/blob/main/09-aws-services/part-1/README.md), up to and including the [Docker Installation](https://github.com/brice-tossim/twn-devops-bootcamp/blob/main/09-aws-services/part-1/README.md#docker-installation) section. The "Image Pull and Container Execution" section is replaced by the deployment stage configured in this project.

## How the Deployment Works

Once the image was pushed and available on the private Docker Hub repository, the deployment was performed by SSHing into the EC2 instance from the Jenkins pipeline, logging in to the private Docker repository, pulling the freshly built image, and running it. In other words, a set of commands was executed on the EC2 instance from the Jenkins pipeline through an SSH session.

## EC2 Security Group Configuration

For Jenkins to be able to SSH into the EC2 instance during the deploy stage, the public IP address of the Jenkins server must be allowed in the inbound rules of the EC2 instance's security group:

- Navigated to the EC2 dashboard on the AWS console and selected the running EC2 instance.
- Opened the "Security" tab and clicked on the security group attached to the instance.
- Under "Inbound rules", clicked on "Edit inbound rules" and added a new rule with the following settings:
  - **Type:** SSH
  - **Protocol:** TCP
  - **Port range:** 22
  - **Source:** Custom, with the Jenkins server public IP in CIDR notation (e.g., `<jenkins-public-ip>/32`).
- Saved the rule.

Note: Without this rule, SSH connections initiated from the Jenkins server hang silently until they time out, which causes the deploy stage to fail.

## SSH Credential Configuration

To allow Jenkins to SSH into the EC2 instance, an SSH credential was created and scoped directly to the multibranch pipeline (rather than to the global Jenkins system):

- Navigated to the multibranch pipeline configuration page and clicked on "Credentials".
- Selected the multibranch pipeline scope (not the system scope) and clicked "Add credentials".
- Filled in the following fields:
  - **Kind:** SSH Username with private key.
  - **ID:** `ec2-server-key` (any name can be used; it must match the credential ID referenced in the `sshagent` block of the Jenkinsfile).
  - **Username:** `ec2-user` (the default SSH user for an Amazon Linux AMI).
  - **Private Key:** Selected "Enter directly" and pasted the content of the `.pem` key pair file downloaded when the EC2 instance was created.
- Saved the credential.

## SSH Agent Plugin Installation

The [SSH Agent Plugin](https://plugins.jenkins.io/ssh-agent/) was installed from the Jenkins plugin manager. This plugin, combined with the SSH credential created above, enables the pipeline to authenticate against the EC2 instance during the deploy stage.

## Jenkinsfile

The full pipeline is defined in the `Jenkinsfile` located at the root of the `feat/add-deployment-stage-into-aws-ec2-server` branch of the project repository:

```groovy
pipeline {
    agent any

    environment {
        IMAGE_NAME = "<your-docker-hub-username>/<your-image-name>"
    }

    stages {
        stage('Increment patch version') {
            steps {
                script {
                    echo "Incrementing patch version..."
                    sh '''
                        mvn build-helper:parse-version versions:set \
                            -DnewVersion=\\\${parsedVersion.majorVersion}.\\\${parsedVersion.minorVersion}.\\\${parsedVersion.nextIncrementalVersion} \
                            versions:commit
                    '''
                    def version = sh(
                        script: "mvn help:evaluate -Dexpression=project.version -q -DforceStdout",
                        returnStdout: true
                    ).trim()

                    env.IMAGE_VERSION = "$version-$BUILD_NUMBER"
                }
            }
        }
        stage('Run tests') {
            steps {
                echo 'Running tests...'
                sh 'mvn test'
            }
        }
        stage('Build JAR') {
            steps {
                echo 'Building the jar file...'
                sh 'mvn clean package'
            }
        }
        stage('Build and push docker image') {
            steps {
                script {
                    env.FULL_IMAGE_NAME = "$IMAGE_NAME:$IMAGE_VERSION"

                    withCredentials([
                        usernamePassword(
                            credentialsId: 'docker-access',
                            usernameVariable: 'DOCKER_USERNAME',
                            passwordVariable: 'DOCKER_PASSWORD'
                        )]) {
                            sh '''
                                echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin
                                docker build -t $FULL_IMAGE_NAME .
                                docker push $FULL_IMAGE_NAME
                            '''
                        }
                }
            }
        }
        stage('Deploy on AWS EC2') {
            steps {
                script {
                    echo 'Deploying on AWS EC2...'

                    withCredentials([
                        usernamePassword(
                            credentialsId: 'docker-access',
                            usernameVariable: 'DOCKER_USERNAME',
                            passwordVariable: 'DOCKER_PASSWORD'
                        )]) {
                            env.EC2_HOST = "ec2-user@<ec2-public-ip>"
                            env.DEPLOY_COMMAND = "bash /home/ec2-user/deploy-cmd.sh $DOCKER_USERNAME $FULL_IMAGE_NAME"

                            sshagent(['ec2-server-key']) {
                                sh '''
                                    scp -o StrictHostKeyChecking=no deploy-cmd.sh $EC2_HOST:/home/ec2-user/
                                    echo "$DOCKER_PASSWORD" | ssh -o StrictHostKeyChecking=no $EC2_HOST $DEPLOY_COMMAND
                                '''
                            }
                        }
                }
            }
        }
        stage('Commit version change') {
            steps {
                script {
                    withCredentials([
                        usernamePassword(
                            credentialsId: 'github-access',
                            usernameVariable: 'GITHUB_USERNAME',
                            passwordVariable: 'GITHUB_TOKEN'
                        )]) {
                            sh '''
                                git remote set-url origin https://$GITHUB_USERNAME:$GITHUB_TOKEN@github.com/$GITHUB_USERNAME/<your-repo-name>.git
                                git config user.name "Jenkins"
                                git config user.email "<your-jenkins-email>"
                                git add pom.xml
                                git commit -m "Increment patch version"
                                git push origin HEAD:<your-branch-name>
                            '''
                        }
                }
            }
        }
    }
}
```

Note: Replace `<your-docker-hub-username>/<your-image-name>` with the Docker Hub repository where the image will be pushed, `<ec2-public-ip>` with the actual public IP of the EC2 instance, `<your-repo-name>` with the name of the project repository, `<your-jenkins-email>` with the email configured in the "Ignore Committer Strategy" build strategy of the multibranch pipeline, and `<your-branch-name>` with the branch where the pipeline runs and where the version change will be pushed back.

## Deploy Stage Breakdown

The first four stages and the final commit stage were already covered in the previous [dynamic versioning project](https://github.com/brice-tossim/twn-devops-bootcamp/tree/main/08-build-automation-ci-cd-with-jenkins/part-5). The breakdown below focuses on the new `Deploy on AWS EC2` stage.

- **Wrapped the deployment instructions in Docker credentials:** The `withCredentials` block exposes the Docker Hub username and password as environment variables. These credentials are required because the EC2 instance must authenticate against the private Docker Hub repository before pulling the image.

- **Defined two environment variables:**
  - `EC2_HOST`: The SSH target, combining the SSH user (`ec2-user`) and the public IP of the EC2 instance.
  - `DEPLOY_COMMAND`: The command executed on the EC2 instance, which runs the `deploy-cmd.sh` script with the Docker username and the full image name (tag included) as arguments.

- **Used the SSH Agent Plugin:** The `sshagent(['ec2-server-key'])` block loads the SSH credential previously created and makes it available to the shell commands inside the block.

- **Copied the deployment script with `scp`:** The `scp` command transfers the `deploy-cmd.sh` file from the Jenkins workspace to the EC2 instance. The `-o StrictHostKeyChecking=no` option suppresses the interactive host key confirmation prompt that would otherwise block the pipeline.

- **Executed the deployment over SSH:** The Docker password is piped from Jenkins through SSH into the remote `deploy-cmd.sh` script, which reads it via the `--password-stdin` flag of `docker login`. Piping the password (rather than passing it as an argument) prevents it from appearing in shell history or process listings.

## Deployment Script

The `deploy-cmd.sh` script located at the root of the project repository contains the actual deployment commands executed on the EC2 instance:

```bash
#!/usr/bin/env bash
set -e

DOCKER_USERNAME=$1
FULL_IMAGE_NAME=$2

echo "Deploying Docker image: $FULL_IMAGE_NAME"

docker login -u "$DOCKER_USERNAME" --password-stdin
docker pull "$FULL_IMAGE_NAME"
docker stop java-maven-app || true
docker rm java-maven-app || true
docker run -d --name java-maven-app -p 8080:8080 "$FULL_IMAGE_NAME"

echo "Docker image deployed successfully"
```

The script logs in to Docker Hub, pulls the freshly built image, stops and removes any existing `java-maven-app` container (using `|| true` so that the script does not fail if the container does not exist), and runs the new image on port 8080.

## Verification

- Pushed a change to the `feat/add-deployment-stage-into-aws-ec2-server` branch and verified that the full pipeline executed successfully through the Jenkins UI.
- Accessed the deployed application from a browser using the EC2 public IP and the exposed port:

```text
http://<ec2-public-ip>:8080
```

## Troubleshooting

- **Problem: The Deploy stage hangs and eventually times out on the `scp` or `ssh` command**

  This happens when the Jenkins server public IP is not allowed in the inbound rules of the EC2 instance's security group. Without that rule, SSH connections from Jenkins to the EC2 instance are silently dropped, and the `scp` or `ssh` command in the deploy stage waits until the connection times out, causing the pipeline to fail.

  Make sure to add an inbound SSH (port 22) rule for the Jenkins server public IP in the EC2 security group from the AWS console, as described in the [EC2 Security Group Configuration](#ec2-security-group-configuration) section.
  