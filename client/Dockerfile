# Frontend Dockerfile - Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# 👇 Build-time envs
ARG REACT_APP_GOOGLE_CLIENT_ID
ARG VITE_API_BASE_URL

ENV REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install simple HTTP server to serve static files
RUN npm install -g serve

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 8081

# Health check – check the app inside the container
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:8081', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"
# Start the application
CMD ["serve", "-s", "dist", "-l", "8081"]