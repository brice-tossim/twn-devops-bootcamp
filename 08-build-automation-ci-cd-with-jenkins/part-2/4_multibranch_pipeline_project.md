# Create a Multibranch Project in Jenkins

## Overview

In this project, I configured a Jenkins Multibranch Pipeline project to automatically discover, manage, and build multiple branches within a Git repository.

This setup enables continuous integration by automatically executing builds for any branch containing a `Jenkinsfile`, eliminating the need for manual pipeline configuration per branch.

## Prerequisites

- Before configuring the Multibranch Pipeline project, ensure the general configuration steps outlined in the [General Configuration Document](./1_general_config.md) are completed, including GitHub and Docker registry credential setup.
- Installed `Maven` within the Jenkins container and ensured a `Jenkinsfile` was present in the target repository, as established in the [Pipeline Project Document](./3_pipeline_project.md).

## Configuration Steps

- Navigated to Jenkins and created a new "Multibranch Pipeline" project.
- Configured the Branch Sources:
  - Selected the appropriate Source Code Management (SCM) provider (e.g., "GitHub" or "Git").
  - Provided the target repository URL and the corresponding GitHub credentials.
- Under "Discover branches", selected the option to discover "All branches" to ensure Jenkins monitored the entire repository structure.
- Saved the configuration.
- Verified that Jenkins automatically scanned the repository and dynamically created individual pipeline jobs for every branch containing a `Jenkinsfile`. (If the automatic scan did not initiate, it could be triggered manually via "Scan Repository Now" in the project dashboard).

## Troubleshooting

- "Resource not accessible by personal access token" (HTTP 403)
During the repository scan, if the log displays an error indicating that the resource is not accessible, it is likely a permissions issue with the GitHub token. To resolve this, I ensured the fine-grained personal access token in GitHub was granted "Pull requests" permissions. This permission is necessary for Jenkins to successfully enumerate and discover all branches within the repository.
