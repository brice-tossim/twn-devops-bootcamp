# Build and push a custom docker image to a Nexus private docker registry

## Overview

In this project, I provisioned a Linux server to run Nexus Repository Manager as a containerized service and configured it as a private Docker registry. I created Docker proxy, hosted, and group repositories within Nexus, configured user access, and successfully built, tagged, and pushed a multi-architecture custom Docker image to the private registry.

## Technologies Used

- Repository Manager: Nexus (Containerized)
- Containerization: Docker, Docker Compose
- Cloud Provider: DigitalOcean
- Operating System: Linux (Ubuntu 24.04 LTS x64)

## Infrastructure Details

- Allocated a DigitalOcean Droplet with 8 GB RAM, 4 vCPUs, and 160 GB storage.
- Configured firewall inbound rules to allow SSH (port 22) for server management, HTTP (port 8081) for the Nexus web interface, and additional custom ports for the Docker repositories.
- Provisioned a dedicated admin user with sudo privileges for secure server management.

## Docker and Nexus Setup

- Installed Docker and Docker Compose on the Ubuntu server and added the admin user to the docker group.

```sh
ssh <admin-user>@<server-ip>
sudo apt update
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker <admin-user>
sudo systemctl enable docker
sudo systemctl start docker
exit    # Exit so that the new group membership takes effect
```

- Copied the `compose.yml` file to the server and deployed the Nexus container.

```sh
scp compose.yml <admin-user>@<server-ip>:/home/<admin-user>/
ssh <admin-user>@<server-ip>
docker-compose -f compose.yml up -d
docker ps    # Verify that the nexus container is running
```

- Retrieved the initial Nexus admin password from within the running container to perform the initial setup.

```sh
docker exec -it nexus cat /nexus-data/admin.password
```

## Nexus Repository Configuration

- Created three distinct Docker repositories in Nexus using different HTTP ports:
  - Docker Proxy Repository: Configured to proxy and cache images from "https://registry-1.docker.io".
  - Docker Hosted Repository: Created to store custom-built Docker images.
  - Docker Group Repository: Configured to group the proxy and hosted repositories, providing a single endpoint for pulling images.

- Set up a custom Nexus role containing privileges to view each of the three Docker repositories (e.g `nx-repository-view-docker-<repo-name>-*`).

- Assigned this role to a dedicated Nexus user for authenticated Docker registry access (previously did [here](https://github.com/brice-tossim/twn-devops-bootcamp/tree/main/06-artifact-repository-manager-with-nexus#nexus-user-configuration)).

- Enabled "Docker Bearer Token Realm" in the Nexus security settings (Settings > Security > Realms) to allow authentication via the Docker CLI.

## Container Port Update

- Updated the `compose.yml` file existing in the server to expose the custom HTTP ports configured for the Docker repositories.

```yaml
services:
  nexus:
    image: sonatype/nexus3:3.90.2
    container_name: nexus
    environment:
      - INSTALL4J_ADD_VM_PARAMS=-Xms2g -Xmx2g -XX:MaxDirectMemorySize=1g
    ports:
      - "8081:8081"
      - "<your-nexus-docker-proxy-repo-port>:<your-nexus-docker-proxy-repo-port>"
      - "<your-nexus-docker-hosted-repo-port>:<your-nexus-docker-hosted-repo-port>"
      - "<your-nexus-docker-group-repo-port>:<your-nexus-docker-group-repo-port>"
    restart: always
    volumes:
      - nexus-data:/nexus-data

volumes:
  nexus-data:
```

Note: If you configured a firewall for your server, make sure to allow traffic on the ports you set for the docker repositories.

- Rebuilt and restarted the Nexus container to apply the port exposures.

```sh
docker-compose -f compose.yml down
docker-compose -f compose.yml up -d
```

## Docker Client Configuration

- Configured the local Docker daemon to allow connections to the insecure registry endpoints by adding the Nexus server IP and ports to the `insecure-registries` configuration. Additional infos [here](https://distribution.github.io/distribution/about/insecure/):

```json
{
  "insecure-registries": [
    "<nexus-server-ip>:<nexus-docker-hosted-repo-port>",
    "<nexus-server-ip>:<nexus-docker-group-repo-port>"
  ]
}
```

## Image Building and Publishing

- Built a multi-architecture Docker image using the `--platform` flag to ensure compatibility across Linux `amd64` and `arm64` architectures.

- Tagged the image with the Nexus hosted repository URL.

```sh
docker build --platform linux/amd64,linux/arm64 -t <your-image-name>:<tag> <path-to-your-project-that-has-a-dockerfile>

docker tag <your-image-name>:<tag> <your-nexus-server-ip>:<your-nexus-docker-hosted-repo-port>/<your-image-name>:<tag>
```

- Authenticated to the Nexus Docker registry using the credentials of the user I previously created and pushed the custom image.

```sh
docker login <your-nexus-server-ip>:<your-nexus-docker-hosted-repo-port>
docker push <your-nexus-server-ip>:<your-nexus-docker-hosted-repo-port>/<your-image-name>:<tag>
```

## Verification

- Verified the successful upload by viewing the pushed image in the Nexus web interface under the hosted repository.

- Pulled the custom image via the group repository endpoint to ensure routing and permissions functioned correctly.

```sh
docker pull <your-nexus-server-ip>:<your-nexus-docker-group-repo-port>/<your-image-name>:<tag>
```

## Troubleshooting

- Unable to push to the Nexus docker registry.
  - Ensure you configured the `insecure-registries`.
  - Ensure you expose all necessary ports in the `compose.yml` file and rebuild it.
