# Build a CI Pipeline with Jenkins

## Overview

This project documents the configuration of a complete CI pipeline in Jenkins for a Java application. The setup is split across four documents, each covering a specific part of the configuration.

## Documentation Guide

1. [General Configuration](./1_general_config.md): Covers the foundational setup, including Maven build tools, GitHub integration with a fine-grained personal access token, and Docker registry credentials.

2. [Freestyle Project](./2_freestyle_project.md): Walks through creating a Jenkins Freestyle project to build, test, and deploy the Java application, using both the Maven plugin and a native Maven installation inside the Jenkins container.

3. [Pipeline Project](./3_pipeline_project.md): Demonstrates how to define the build process as code using a `Jenkinsfile`, with stages for testing, packaging, and pushing the Docker image to a private registry.

4. [Multibranch Pipeline Project](./4_multibranch_pipeline_project.md): Configures a Multibranch Pipeline that automatically discovers and builds every branch in the repository containing a `Jenkinsfile`.

## Recommended Reading Order

Start with the [General Configuration](./1_general_config.md) document, as it sets up the credentials and tools required by all the other projects. The remaining three documents can then be followed in order or independently, depending on the type of job you want to configure.
