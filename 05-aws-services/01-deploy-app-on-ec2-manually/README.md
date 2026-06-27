# Deploy web application on EC2 instance (manually)

## Overview

In this project, I created and configured an EC2 instance on AWS, installed Docker on the server, and deployed a containerized application by pulling its image from a private Docker Hub repository.

## Technologies Used

- **Cloud Provider:** AWS
- **Containerization:** Docker
- **Operating System:** Amazon Linux
- **Container Registry:** Docker Hub (private repository)

## Prerequisites

The application image was already available in my private Docker Hub repository. I used [this repository](https://github.com/brice-tossim/twn-java-maven-app.git) and pushed the image via a Jenkins CI pipeline configured in [this branch](../../04-build-automation-ci-cd-with-jenkins/05-auto-increment-app-version) (the full documentation is explained there).

## EC2 Instance Creation

- Navigated to the EC2 service from the AWS dashboard by searching for "EC2" in the search bar.
- Clicked on "Launch an instance" to start the creation process and configured the instance with the following settings:
  - **Name:** A descriptive name for the instance (e.g., `my-ec2-instance`).
  - **AMI:** Amazon Linux.
  - **Instance type:** A free-tier eligible instance type (e.g., `t2.micro`).
  - **Key pair:** Created a new key pair and saved the `.pem` file on the local machine. This file was used later to connect to the EC2 server via SSH.
  - **Network settings:**
    - Used the default VPC.
    - No specific preference for the subnet.
    - Enabled auto-assign public IP.
    - Configured the security group to allow SSH traffic (port 22) from my IP and a custom TCP rule on the port exposed by the application image hosted in the private Docker registry.
  - Left the rest of the configuration as default.
- Clicked on "Launch instance" to create the EC2 instance.

## SSH Connection

- Updated the permissions of the `.pem` key pair file on the local machine so that only the owner could read it:

```sh
chmod 400 <key-pair-file>.pem
```

- Connected to the server via SSH using the public IP address (available in the EC2 instance details on the AWS console):

```sh
ssh -i <key-pair-file>.pem ec2-user@<public-ip>
```

Note: The default SSH user for an Amazon Linux AMI is `ec2-user`.

## Docker Installation

- Updated the package repository list and installed Docker:

```sh
sudo yum update -y
sudo yum install -y docker
```

- Added the current user to the `docker` group to run Docker commands without `sudo`:

```sh
sudo usermod -aG docker $USER
```

- Logged out of the SSH session and reconnected so that the new group membership took effect:

```sh
exit
ssh -i <key-pair-file>.pem ec2-user@<public-ip>
```

- Enabled and started the Docker service:

```sh
sudo systemctl enable docker
sudo systemctl start docker
```

## Image Pull and Container Execution

- Authenticated to Docker Hub to access the private repository:

```sh
docker login
```

- Pulled the application image from the private repository:

```sh
docker pull <repository-name>:<tag>
```

- Ran the container, mapping the host port to the container port:

```sh
docker run -d -p <host-port>:<container-port> <repository-name>:<tag>
```

## Verification

- Accessed the application from a browser using the EC2 instance public IP and the exposed port:

```text
http://<public-ip>:<host-port>
```

## Troubleshooting

- **Problem: Application not accessible in the browser using the right IP + port**

Everything seems to be working fine, the container is running without any issue but when you try to access the application in the browser using the right IP and port, it doesn't work.

This might be due to the fact that the port on which the application is running is not open in the security group.

Make sure to allow inbound traffic on the application port in the security group of the EC2 instance from the AWS console.
