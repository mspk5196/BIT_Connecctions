# Backend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 6000

# Health check – check the /health endpoint inside the container
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:6000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1
# Run the application
CMD ["node", "b2.js"]