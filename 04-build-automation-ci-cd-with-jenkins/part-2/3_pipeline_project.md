# Create a Pipeline Project in Jenkins

## Overview

In this project, I configured a Jenkins Pipeline project using a `Jenkinsfile` to automate building, testing, and deploying a Java application.

A Pipeline project in Jenkins allows defining the entire build process as code (Pipeline-as-Code), which can be version-controlled alongside the application source code.

## Prerequisites

Before configuring the Pipeline project, ensure the general configuration steps outlined in the [General Configuration Document](./1_general_config.md) are completed, including GitHub and Docker registry credential setup.

## Maven Installation

- Accessed the running Jenkins container as root to install Maven directly:

```bash
docker exec -it -u 0 <jenkins-container-name> bash
apt-get update
apt-get install -y maven
```

## Pipeline Script Configuration

The pipeline execution is defined in a `Jenkinsfile` located in the `basic-jenkisfile-script` branch of the project repository. It consists of three primary stages: running tests, packaging the JAR file, and building/pushing the Docker image.

The `Jenkinsfile` configuration:

```groovy
pipeline {
    agent any

    stages {
        stage('Test') {
            steps {
                echo 'Running tests...'
                sh 'mvn test'
            }
        }
        stage('Build jar') {
            steps {
                echo 'Building the jar file...'
                sh 'mvn clean package'
            }
        }
        stage('Build and push docker image') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: <docker-credentials-id>,
                        usernameVariable: 'DOCKER_USERNAME',
                        passwordVariable: 'DOCKER_PASSWORD'
                    )]) {
                        sh '''
                            echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin
                            docker build -t java-maven-app:latest .
                            docker tag java-maven-app:latest <docker-repo>/java-maven-app:latest
                            docker push <docker-repo>/java-maven-app:latest
                        '''
                }
            }
        }
    }
}
```

Note: <docker-credentials-id> must match the exact ID created in Jenkins for the Docker registry, and <docker-repo> must reflect the destination Docker repository.

## Jenkins Job Setup

- Navigated to Jenkins and created a new job, selecting "Pipeline".
- In the "Pipeline" configuration section, selected "Pipeline script from SCM" to pull the `Jenkinsfile` directly from the repository.
- Configured Source Code Management to use Git, providing the repository URL and GitHub credentials.
- Specified the exact branch containing the pipeline script (e.g., `basic-jenkinsfile-script`).
- Set the Script Path to `Jenkinsfile` (the default location in the repository root).

## Verification

- Saved the configuration and triggered a manual build by clicking "Build Now".
- Verified the execution through the Jenkins UI, ensuring all stages completed successfully and the Docker image was pushed to the registry.
