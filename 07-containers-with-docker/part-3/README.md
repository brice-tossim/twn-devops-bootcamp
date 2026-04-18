# Build and push a custom docker image to AWS ECR

## Overview

In this project, I configured the AWS CLI and used Docker to build, push, and pull a custom image to a private Amazon Elastic Container Registry (ECR).

## Technologies Used

- **Cloud Provider:** AWS
- **Container Registry:** Amazon ECR
- **Containerization:** Docker
- **Tools:** AWS CLI

## Prerequisites

- Installed the AWS CLI on the local machine.
- Configured the environment using the `aws configure` command.

## Repository Setup and Image Publishing

- Accessed Amazon ECR through the AWS Console.
- Created a private repository for the custom Docker image.
- Retrieved the required authentication and build steps via the "View push commands" button in the repository details. Globally, the steps should look like this:
  - Authenticated to the AWS Docker registry using the provided `docker login` command.
  - Built the image on the local machine.
  - Tag the image.
  - Pushed the image to the newly created AWS ECR repository.

## Image Retrieval

Verified access by pulling the image from the registry with the following command:

```sh
docker pull <your-aws-ecr-url>/<your-image-name>:<tag>
```
