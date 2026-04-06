# Run an app with and without containerization

## Overview

In this project, I configured and executed a Node.js application alongside a MongoDB database. I implemented two deployment strategies: one running individual Docker containers manually via a shell script, and another using Docker Compose for orchestrated deployment.

## Technologies Used

- Containerization: Docker, Docker Compose
- Database: MongoDB (mongo:7.0), Mongo Express
- Runtime: Node.js
- Scripting: Bash, JavaScript (MongoDB initialization)

## Setup and Execution

- Installed Docker and Docker Compose on the local machine.
- Split configuration securely across multiple files:
  - `.env.mongo`: Stored MongoDB root credentials exclusively.
  - `.env.shared`: Managed shared variables (database credentials, database name).
  - `.env.app`: Handled application-specific variables, such as `PORT`.

Note: Although I pushed the three `.env` files for this project, security best practices require excluding environment files from version control. Only template files with placeholder values should be committed.

- Deployed the stack without Docker Compose using the provided shell script:

```sh
./01_run_js_app_without_compose_file.sh
```

- Deployed the stack using Docker Compose with the alternative script:

```sh
./02_run_js_app_with_compose_file.sh
```

## Database Security Configuration

- Implemented a best-practice security model by avoiding the root user for application database operations.
- Utilized a JavaScript initialization script executed automatically upon the first startup of the `mongo:7.0` container to create a dedicated user with scoped `readWrite` permissions.

## Troubleshooting

- **Database connection error on localhost**:

  If the application (http://localhost:3000) or Mongo Express (http://localhost:8081) failed to connect to the database, I ensured all containers operated on the same Docker network.

- **Credentials desynchronization after `.env.shared` updates**:

  Updating database credentials in the `.env.shared` file caused connection failures because the existing MongoDB volume retained the original credentials. Instead of deleting the volume (which causes data loss), I accessed the MongoDB shell to manually create the new user and drop the old one:

  ```sh
  docker exec -it <container> mongosh admin -u <root_user> -p <root_password>
  ```

  ```js
  use admin

  db.createUser({
    user: "<new_user>",
    pwd: "<new_password>",
    roles: [{ role: "readWrite", db: "<database_name>" }]
  })

  db.dropUser("<old_user>")
  ```

- **MongoDB container fails to start:**

  When logs displayed `MongoshInvalidInputError: [COMMON-10001] Missing required argument at position 0 (Database.getSiblingDB)`, I verified that all required environment variables were correctly set in the .env files prior to initialization.
