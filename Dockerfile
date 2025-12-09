# Frontend Dockerfile - Multi-stage build
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Build arguments for environment variables
ARG VITE_API_BASE=http://localhost:4000/api
ARG VITE_SOCKET_URL=http://localhost:4000

# Set environment variables for build
ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

