# zen-send server Dockerfile
# Multi-stage build for optimized production image

FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

WORKDIR /app

# Copy workspace files for dependency installation
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY config ./config
COPY packages ./packages
COPY apps/server/package.json ./apps/server/
COPY apps/server/tsconfig.json ./apps/server/
COPY apps/server/src ./apps/server/src
COPY apps/server/drizzle.config.ts ./apps/server/
COPY apps/server/.env.example ./apps/server/

# Install dependencies (production only for smaller image)
RUN pnpm install --frozen-lockfile --prod=false

# Build workspace packages in dependency order
RUN pnpm --filter @zen-send/dto --filter @zen-send/logger --filter @zen-send/shared -r build

# Build server
RUN pnpm --filter @zen-send/server build

# Production stage
FROM node:22-alpine AS production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

WORKDIR /app

# Copy package files for production deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY config ./config
COPY packages ./packages
COPY apps/server/package.json ./apps/server/
COPY apps/server/src ./apps/server/src
COPY apps/server/drizzle.config.ts ./apps/server/
COPY apps/server/.env.example ./apps/server/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built server from builder
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/packages/dto/dist ./packages/dto/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/logger/dist ./packages/logger/dist

# Copy server source (needed for runtime)
COPY config ./config
COPY apps/server/src ./apps/server/src
COPY apps/server/public ./apps/server/public
COPY apps/server/drizzle.config.ts ./apps/server/
COPY apps/server/.env.example ./apps/server/

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Expose port
EXPOSE 3110

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3110/api/health || exit 1

# Start server
CMD ["node", "apps/server/dist/index.js"]
