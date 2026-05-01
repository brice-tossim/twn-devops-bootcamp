# General Jenkins Configuration

## Overview

In this project, I configured Jenkins to support building and deploying applications by setting up Maven build tools, integrating a GitHub repository, and securing credentials for a private Docker registry.

## Build Tools Configuration

Configured Maven build capabilities in Jenkins using two approaches depending on the pipeline type:

- Plugin Manager: Utilized the built-in Jenkins capabilities (or added them via the plugin manager). This method is convenient but limited to what the plugin supports. We'll use this method for the Freestyle project setup.
- Container Installation: Installed build tools directly inside the container. This method offers granular control over the build environment. We'll use this method for the Freestyle project, Pipeline project and Multibranch Pipeline project setups.

## GitHub Integration

Integrated Jenkins with a GitHub repository using secure authentication:

- Created a fine-grained personal access token on GitHub, scoped specifically to the target repository.
- Added the GitHub token to Jenkins under Settings > Credentials > System > Credentials > Add credentials.
- Selected the "Username with password" credential type, using the GitHub username and the generated token as the password. Assigned it a distinct ID (e.g., github-access).

## Docker Registry Configuration

Configured Jenkins to authenticate with a private Docker registry (e.g., Docker Hub) for image pushing:

- Verified the existence of a destination repository in the private registry.
- Added the registry authentication credentials to Jenkins under Settings > Credentials > System > Credentials > Add credentials.
- Selected the "Username with password" credential type, entering the registry username and password/token, and assigned it an identifiable ID (e.g., docker-access).
