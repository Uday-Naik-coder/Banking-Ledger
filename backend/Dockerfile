# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# ---- Production Stage ----
FROM node:20-alpine

WORKDIR /app

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only production node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY package.json ./
COPY server.js ./
COPY src/ ./src/

# Switch to non-root user
USER appuser

# Expose the backend port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the server
CMD ["node", "server.js"]

