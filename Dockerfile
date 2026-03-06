# Multi-stage build for production
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY copy-public.js ./

# Install dependencies
RUN npm ci

# Copy source code and public folder
COPY src ./src
COPY public ./public

# Build TypeScript and copy public folder
RUN npm run build

# Production stage
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy public folder for static files
COPY public ./public

# Copy simple-server.js
COPY simple-server.js ./simple-server.js

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "simple-server.js"]
