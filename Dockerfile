# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose ports for all services
EXPOSE 6001 6002 6003 6004

# Start all services
CMD ["npm", "start"]