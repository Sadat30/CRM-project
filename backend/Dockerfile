# Backend Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies with verbose output and no optional deps
RUN npm install --production --no-optional --loglevel=verbose || \
    (echo "npm install failed, trying with cache clean..." && \
     npm cache clean --force && \
     npm install --production --no-optional)

# Copy application code
COPY . .

# Create uploads directory with proper permissions
RUN mkdir -p uploads/voice && \
    chown -R node:node /app

# Switch to non-root user for security
USER node

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "server.js"]

