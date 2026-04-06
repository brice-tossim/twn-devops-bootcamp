#!/bin/bash

# Set the project directory
PROJECT_DIR="../js-app"

# Load mongo credentials from the .env.mongo file (useful for mongo-express container)
source $PROJECT_DIR/.env.mongo

# Stop and remove existing containers if they exist (In case you ran the ./02_run_js_app_with_compose_file.sh script before)
docker rm -f js-app-container mongo-express-container mongodb-container 

# Create a user-defined network for container name resolution
docker network rm -f js-app-network
docker network create js-app-network

# Run a new MongoDB container with a volume for data persistence and an initialization script to create a basic user
docker run -d --name mongodb-container \
    --network js-app-network \
    -p 27017:27017 \
    -v mongodb-data-1:/data/db \
    -v $PROJECT_DIR/init-mongo.js:/docker-entrypoint-initdb.d/init-mongo.js:ro \
    --env-file $PROJECT_DIR/.env.mongo \
    --env-file $PROJECT_DIR/.env.shared \
	mongo:7.0

# Run a new Mongo Express container
docker run -d --name mongo-express-container \
    --network js-app-network \
    -p 8081:8081 \
    -e ME_CONFIG_MONGODB_SERVER=mongodb-container \
    -e ME_CONFIG_MONGODB_ADMINUSERNAME=$MONGO_INITDB_ROOT_USERNAME \
    -e ME_CONFIG_MONGODB_ADMINPASSWORD=$MONGO_INITDB_ROOT_PASSWORD \
    mongo-express:1.0.2-20-alpine3.19


# Build the image and run the container
docker build -t js-app:latest $PROJECT_DIR
docker run -d --name js-app-container \
    --network js-app-network \
    -p 3000:3000 \
    --env-file $PROJECT_DIR/.env.shared \
    --env-file $PROJECT_DIR/.env.app \
    js-app:latest