# ==============================================================================
# IBVAP — Intelligent Border Video Analytics Platform
# Multi-Stage Frontend Dockerfile (Vite + React 18 -> Nginx 1.27 Alpine)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Static Production Assets
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies with lockfile caching
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Copy source code and build production bundle
COPY . .
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Nginx Server
# ------------------------------------------------------------------------------
FROM nginx:1.27-alpine AS production

# Remove default Nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy built production assets from Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom reverse-proxy and SPA routing Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose HTTP port
EXPOSE 80

# Health check
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost/healthz || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
