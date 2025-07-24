FROM node:20-slim AS production

# Install security updates and curl for health checks
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y curl && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r mcpuser && useradd -r -g mcpuser mcpuser

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including tsx)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Change ownership to non-root user
RUN chown -R mcpuser:mcpuser /app

# Switch to non-root user
USER mcpuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

# Start the application using tsx
CMD ["npm", "start"] 