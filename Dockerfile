# Dockerfile
FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps && \
    npm install -g typescript rimraf npm-run-all

# Copy source code
COPY . .

# Clean and rebuild
RUN npm run build

EXPOSE 8000

# Use production start command
CMD ["npm", "start"]