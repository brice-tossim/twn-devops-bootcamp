# Use a lightweight Node.js image based on Alpine Linux for better performance and smaller image size
FROM node:25-alpine3.22

# Set the working directory (automatically created if it doesn't exist)
WORKDIR /home/app

# Change ownership of the working directory to the unprivileged 'node' user
RUN chown node:node /home/app

# Switch to the non-root "node" user to run the application securely
USER node

# Copy package.json and package-lock.json to leverage Docker layer caching
COPY --chown=node:node ./app/package*.json ./

# Install app dependencies using the package-lock.json file to ensure consistent installs
RUN npm ci

# Copy the rest of the application code to the working directory
COPY --chown=node:node ./app ./

# Expose the port that the app will run on
EXPOSE 3000

# Start the app
CMD ["node", "server.js"]