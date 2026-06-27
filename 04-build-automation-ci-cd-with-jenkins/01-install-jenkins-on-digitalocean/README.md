# Install Jenkins on DigitalOcean

## Overview

In this project, I provisioned an Ubuntu Droplet on DigitalOcean and deployed Jenkins as a Docker container. I configured a custom Jenkins image equipped with the Docker CLI, initialized the server, and installed the necessary plugins to support CI/CD pipeline automation.

## Technologies Used

- **CI/CD Tool:** Jenkins
- **Containerization:** Docker, Docker Compose
- **Cloud Provider:** DigitalOcean
- **Operating System:** Linux (Ubuntu 24.04 (LTS) x64)
- **Build Tools:** Maven

## Infrastructure Setup

- Provisioned a DigitalOcean Droplet with a minimum of 4 GB RAM and 2 vCPUs.
- Configured SSH key access and allowed inbound traffic on port 8080 for the Jenkins web interface.
- Created a dedicated admin user with `sudo` privileges for server management and package installation. This [doc](../../01-cloud-and-infrastructure-as-service-basics/01-deploy-app-on-digitalocean-droplet/README.md#create-users) covers the user creation process.

## Server Preparation

- Installed Docker and Docker Compose on the server.
- Added the admin user to the `docker` group to enable interaction with the Docker daemon without root privileges. This [doc](../../03-containers-with-docker/02-push-image-to-nexus-private-registry/README.md#docker-and-nexus-setup) covers the group addition process.
- Installed the `unzip` utility to extract the Jenkins deployment files:

```sh
sudo apt update
sudo apt install -y unzip
```

## Jenkins Deployment

- Transferred the `jenkins.zip` archive from the local machine to the server. The archive contains the `compose.yml` file and the `jenkins/` directory with the `Dockerfile` that built a custom image containing the Docker CLI, the `entrypoint.sh` script that bootstrapped the container as the `jenkins` user, and the `fix-docker-gid.sh` script that aligned Docker socket permissions at runtime so Jenkins could access the host's Docker daemon.

```sh
# On your local machine
scp jenkins.zip <admin-user>@<server-ip>:/home/<admin-user>/

# Then SSH into the server if not already connected and unzip the file
ssh <admin-user>@<server-ip>
unzip jenkins.zip
```

- Deployed the custom Jenkins container using Docker Compose and verified its execution:

```sh
docker-compose -f compose.yml up -d
docker ps    # Verify that the jenkins container is running
```

## Initialization and Configuration

- Navigated to `http://<server-ip>:8080` to access the Jenkins initialization page.
- Retrieved the initial administrative password from within the running container:

```sh
docker exec -it jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

- Unlocked Jenkins using the retrieved password.
- Completed the setup wizard by installing the suggested plugins and creating the primary administrative user account.
- After the setup, Jenkins was fully operational and ready for further configuration to support CI/CD pipelines.
