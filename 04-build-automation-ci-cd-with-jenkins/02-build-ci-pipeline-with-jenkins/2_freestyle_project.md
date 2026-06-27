# Create a Freestyle Project in Jenkins

## Overview

In this project, I configured a Jenkins Freestyle project to automate the build, test, and deployment of a Java application.

A Freestyle project is a core feature in Jenkins that provides a web-based GUI to configure sequential build steps without requiring a Jenkinsfile.

I implemented the build process using two different approaches: utilizing the Jenkins Maven plugin and executing Maven directly from within the Jenkins container.

## Prerequisites

Before configuring the Freestyle project, ensure the general configuration steps outlined in the [General Configuration Document](./1_general_config.md) are completed, including GitHub and Docker registry credential setup.

## Project Configuration

- Navigated to Jenkins and created a new job, selecting "Freestyle project".
- Configured Source Code Management to use Git, providing the target repository URL and the previously configured GitHub credentials.
- Configured secret text variables to securely pass Docker registry credentials to the build shell:
  - Under the "Build Environment" section, checked "Use secret text(s) or file(s)".
  - Added a "Username and password (separated)" binding.
  - Assigned variable names (e.g., `DOCKER_USERNAME` and `DOCKER_PASSWORD`) and linked them to the existing Docker registry credentials.

## Build Execution Approaches

### Using Jenkins Maven plugin

- Configured the Maven installation globally under Settings > Tools > Maven > Add Maven.
- Added an "Invoke top-level Maven targets" build step to run tests, selecting the configured Maven version and setting the goal to `test`.
- Added a second "Invoke top-level Maven targets" build step to package the application, setting the goal to `package`.
- Added an "Execute shell" build step to build and push the Docker image:

```bash
docker build -t java-maven-app:latest .
docker tag java-maven-app:latest <your-docker-repo>/java-maven-app:latest
echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin
docker push <your-docker-repo>/java-maven-app:latest
```

### Without using Maven plugin

- Accessed the running Jenkins container as root to install Maven directly:

```bash
docker exec -it -u 0 <jenkins-container-name> bash
apt-get update
apt-get install -y maven
```

- Verified the installation by running `mvn -v` inside the container.
- Added an "Execute shell" build step in the Jenkins job to run the tests and package the application using native Maven commands:

```bash
mvn test
mvn package
```

- Added another "Execute shell" build step to handle the Docker build and push sequence, identical to the plugin approach:

```bash
docker build -t java-maven-app:latest .
docker tag java-maven-app:latest <your-docker-repo>/java-maven-app:latest
echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin
docker push <your-docker-repo>/java-maven-app:latest
```

## Verification

- Saved the configuration and triggered a manual build by clicking "Build Now".
- Monitored the console output in the Jenkins UI to verify that the tests passed, the `.jar` file was created, and the Docker image was successfully pushed to the private registry.

## Troubleshooting

- "Error response from daemon: Get 'https://registry-1.docker.io/v2/': unauthorized: incorrect username or password":
  - If the pipeline fails during the `docker login` step, verify that the Docker registry credentials are correct in the Jenkins global credentials store.
  - Ensure that the specific credentials selected during the secret text configuration in the project's "Build Environment" precisely match the intended registry credentials.
  