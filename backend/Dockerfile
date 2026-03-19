# Backend API — Node 22 Alpine
# Build context: repo root (paths relative to project root)
FROM node:22-alpine

WORKDIR /app

# Copy package files (from fitness-app/backend when context is repo root)
COPY fitness-app/backend/package.json fitness-app/backend/package-lock.json* ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy application code
COPY fitness-app/backend/ . 

EXPOSE 5001

CMD ["node", "server.js"]
