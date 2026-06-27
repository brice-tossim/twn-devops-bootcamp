# Configure Webhook to Trigger CI Pipeline automatically on every change

## Overview

In this project, I configured a GitHub webhook to automatically trigger Jenkins CI pipelines on every code change. I installed and configured the GitHub plugin on a containerized Jenkins server, set up the required credentials, and validated the integration across three different job types: Freestyle, Pipeline, and Multibranch Pipeline.

## Technologies Used

- **CI/CD Tool:** Jenkins
- **Version Control:** GitHub
- **Containerization:** Docker, Docker Compose
- **Cloud Provider:** DigitalOcean
- **Operating System:** Linux (Ubuntu 24.04 (LTS) x64)

## Prerequisites

- A running Jenkins server (the Jenkins server used in this project was deployed as a Docker container on a DigitalOcean Droplet, as covered in this [project](../01-install-jenkins-on-digitalocean)).
- If a firewall is configured on the Jenkins server, ensure that all IPv4 and IPv6 traffic is allowed on the Jenkins port. Otherwise, GitHub won't be able to deliver webhook events to Jenkins.

## GitHub Plugin Installation

- Installed the GitHub plugin directly on the Jenkins container using the Jenkins Plugin CLI.

```sh
docker exec jenkins jenkins-plugin-cli --plugins github:<version-number>
```

Note: The "How to install" button on the [GitHub plugin page](https://plugins.jenkins.io/github/) provides the available versions and additional installation methods.

- Restarted the Jenkins container to apply the plugin installation.

```sh
docker restart jenkins
```

## GitHub Personal Access Token Permissions

A GitHub personal access token was previously created to allow Jenkins to manually trigger builds on repository branches (covered in this [project](../02-build-ci-pipeline-with-jenkins/1_general_config.md)). To enable webhook management, the following permissions must be set on the token:

- **Commit statuses:** Read and write
- **Contents:** Read and write
- **Metadata:** Read only
- **Pull requests:** Read only
- **Webhooks:** Read and write

Note: The "Webhooks: Read and write" permission is required to allow Jenkins to push a hook configuration to the repository.

## Jenkins Credential Configuration

- Navigated to the Jenkins Credentials settings and created a new credential of type "Secret text".
- Used the GitHub personal access token as the value of the secret.
- Set the credential ID to `github-pat` (any name can be used; it only matters when selecting it during the GitHub server configuration).

## GitHub Server Configuration

- Under "Manage Jenkins" > "System", located the GitHub block.
- Clicked "Add GitHub Server" and configured it with the following values:
  - **Name:** Any name (the value is purely for display).
  - **API URL:** `https://api.github.com`
  - **Credentials:** Selected the `github-pat` secret text credential previously created.
  - **Manage hooks:** Ticked.
- Clicked "Test connection" to verify that the credential was working correctly.

## Webhook Registration

- Under the "Add GitHub Server" section, expanded the "Advanced" panel.
- Clicked the "Re-register hooks for all jobs" button. This automatically added the Jenkins webhook URL to the webhook settings of the relevant repositories on GitHub.

Note: Only jobs whose repository URL matches a GitHub server configured in Jenkins will have their hooks registered.

## Job Configuration for Automatic Triggering

The webhook configuration was tested across three different job types. The configuration steps differed slightly depending on the job type:

- **Freestyle project:** Under the job configuration, ticked the "GitHub hook trigger for GITScm polling" option in the "Triggers" section.
- **Pipeline job:** Under the job configuration, ticked the "GitHub hook trigger for GITScm polling" option in the "Triggers" section.
- **Multibranch Pipeline:** No additional trigger configuration was required. After a code change and push to the repository, the build was triggered automatically.

For each job type, the workflow was the same: configure the job, push a change to the repository, and verify that the build was automatically triggered on Jenkins.

## Troubleshooting

- **Problem 1: No webhook URL is set under the webhook settings of the repository**

  Make sure that the GitHub server configuration in Jenkins is correctly set, then click the "Re-register hooks for all jobs" button under the "Advanced" section.

- **Problem 2: "We couldn't deliver this payload: failed to connect to host"**

  Under the "Recent Deliveries" tab of the webhook on GitHub, if this error appears, it means a firewall on the Jenkins server is preventing GitHub from delivering the webhook payload. Make sure to allow all IPv4 and IPv6 traffic on the Jenkins port from the firewall settings (In the inbound rules) of your cloud provider dashboard.

- **Problem 3: The webhook check is green on GitHub, but the build is not triggered on Jenkins**

  Make sure that the repository URL is correctly configured under the job configuration in Jenkins. The name of your repository should be the same as the one configured in the job (Without the `.git` extension).
