# ==========================================
# Stage 1: Build Frontend (React + Vite)
# ==========================================
FROM node:20-alpine AS client-builder

WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
# Build production assets (VITE_API_URL empty by default => uses relative /api)
RUN npm run build

# ==========================================
# Stage 2: Install Backend Dependencies
# ==========================================
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --omit=dev

# ==========================================
# Stage 3: Final Production Image
# ==========================================
FROM node:20-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

ENV NODE_ENV=production

# Copy backend dependencies and source code
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY backend/package.json ./package.json
COPY backend/server.js ./server.js
COPY backend/src ./src

# Copy built frontend into public directory
COPY --from=client-builder /app/client/dist ./public

# Fix ownership
RUN chown -R appuser:appgroup /app

USER appuser

# Render sets PORT dynamically (defaults to 3000 if not set)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/api/health || exit 1

CMD ["node", "server.js"]

