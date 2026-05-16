#!/bin/bash

PROJECT_DIR="../js-app"

# Stop and remove existing containers if they exist (In case you ran the ./01_run_js_app_without_compose_file.sh script before)
docker rm -f js-app-container mongo-express-container mongodb-container

# Run the application using docker-compose
docker-compose -f $PROJECT_DIR/compose.yml down
docker-compose -f $PROJECT_DIR/compose.yml --env-file $PROJECT_DIR/.env.mongo up -d